// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ElevationDataProvider } from '../modules/elevationDataProvider';
import elevationVertexShaderSource from '../shaders/elevation.vert.glsl?raw'; // ?raw tells Vite to load the file as a string
import defaultFragmentShaderSource from '../shaders/default.frag.glsl?raw';

// Set Mapbox API token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];

const elevationDataProvider = new ElevationDataProvider();
elevationDataProvider.initialize('./src/assets/lassen-cropped-dem-data.tif');

interface CustomLayer {
  aElevation: number;
  aPosition: number;
  vertexCount: number;
  id: string;
  type: 'custom';
  program: WebGLProgram | null;// Holds compiled and linked shader program
  posBuffer: WebGLBuffer | null; // Stores vertex data for each triangle
  elevationBuffer: WebGLBuffer | null; // Stores elevation data for each vertex
  onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

const Map = () => {
  // React refs to store references to the map container DOM element and the mapbox instance
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // const mapRef = useRef<mapboxgl.Map | null>(null); // TODO: currently unused - may be used in the future

  useEffect(() => {
    if (!mapContainerRef.current) return; // Add early return if container is not available
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      zoom: 12.7,
      center: LASSEN_CENTER,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      antialias: true,
      projection: 'mercator'
    });

    // Define a custom WebGL layer to draw colored squares
    const elevationLayer: CustomLayer = {
      id: 'elevation',
      type: 'custom',
      aElevation: 0,
      aPosition: 0,
      vertexCount: 0,
      program: null,
      posBuffer: null,
      elevationBuffer: null,

      // onAdd is called when the layer is added to the map
      // This is where we initialize all WebGL resources
      onAdd: function (_map: mapboxgl.Map, gl: any) {

        // Create and compile the vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, elevationVertexShaderSource);
        gl.compileShader(vertexShader);

        // Create and compile the fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, defaultFragmentShaderSource);
        gl.compileShader(fragmentShader);

        // Create and link shader program
        this.program = gl.createProgram();

        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        // Check program linking
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          console.error('Shader program linking error:', gl.getProgramInfoLog(this.program));
          return;
        }
        
        // If we get here, everything compiled and linked successfully
        console.log('Shaders compiled and linked successfully!');

        // Get the location of the vertex position and elevation attributes
        this.aPosition = gl.getAttribLocation(this.program, 'a_position');
        this.aElevation = gl.getAttribLocation(this.program, 'a_elevation');
        // Log attribute locations to verify
        console.log('a_position location:', this.aPosition);
        console.log('a_elevation location:', this.aElevation);

        // TODO: make this configurable
        const boundingBox = [{ lng: -121.61, lat: 40.42}, { lng: -121.45, lat: 40.50}];

        const squareSizeMercator = 0.00000175; // TODO: stretch vertically to account for latitude
        const squareSizeGPS = 0.00125;

        // Arrays to store vertices and colors
        const vertices: number[] = [];
        const elevations: number[] = [];

        // Generate vertices and colors for each square
        for (let lng = boundingBox[0].lng; lng <= boundingBox[1].lng; lng += squareSizeGPS) {
          for (let lat = boundingBox[0].lat; lat <= boundingBox[1].lat; lat += squareSizeGPS) {
            // TODO: split into helper function
            // Convert center point to Mercator coordinates
            const center = mapboxgl.MercatorCoordinate.fromLngLat({lng: lng, lat: lat});
            
            // Calculate corner points for the square
            const x1 = center.x - squareSizeMercator;
            const y1 = center.y - squareSizeMercator;
            const x2 = center.x + squareSizeMercator;
            const y2 = center.y + squareSizeMercator;
            
            // Each square consists of two triangles (6 vertices total)
            // First triangle: top-left, bottom-left, bottom-right
            vertices.push(
              x1, y1,  // top-left
              x1, y2,  // bottom-left
              x2, y2   // bottom-right
            );
            
            // Second triangle: top-left, bottom-right, top-right
            vertices.push(
              x1, y1,  // top-left
              x2, y2,  // bottom-right
              x2, y1   // top-right
            );
            
            // Add colors for each vertex (same color for all vertices in a square)
            // TODO: consider adding different colors for each corner of the vertex (this should be precomputed once)
            // TODO: move computation into fragment shader instead of doing the elevation > color computation in JS
            // (although currently it's kind of fine because this is a one time computation, only done on initial load)
            const elevation = elevationDataProvider.getElevationFromGPS(lng, lat);
            for (let i = 0; i < 6; i++) {  // 6 vertices per square (2 triangles)
              elevations.push(elevation);
            }

          }
        }

        // Create and bind position buffer
        this.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        // Create and bind color buffer
        this.elevationBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevations), gl.STATIC_DRAW);
        
        // Store the number of vertices
        this.vertexCount = vertices.length / 2;
      },

      // render is called on every frame when the map needs to be redrawn
      render: function (gl, matrix) {

        if (!this.program) {
          console.error('Program not initialized');
          return;
        }

        // Activate our shader program
        gl.useProgram(this.program);
        
        // Set the transformation matrix uniform
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.program, 'u_matrix'),
          false,
          matrix
        );
        
        // Bind position buffer and set up vertex attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer?? null);
        gl.enableVertexAttribArray(this.aPosition);
        gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
        
        // Bind elevation buffer and set up elevation attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationBuffer ?? null);
        gl.enableVertexAttribArray(this.aElevation);
        gl.vertexAttribPointer(this.aElevation, 1, gl.FLOAT, false, 0, 0);
        
        // Enable transparency blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
      }
    };

    // Add our custom layer when the map loads
    map.on('load', () => {
      map.addLayer(elevationLayer, 'building');
    });

    // Cleanup function to remove the map when component unmounts
    return () => {
      map.remove();
    };
  }, []);  // Empty dependency array means this effect runs once on mount

  // Render a div container for the map
  return <div className="h-full w-full" ref={mapContainerRef} id="map"></div>;
};

export default Map;