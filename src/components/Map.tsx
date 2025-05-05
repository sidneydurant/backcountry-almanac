// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox API token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];

interface CustomLayer {
  aColor: number;
  id: string;
  type: 'custom';
  program?: WebGLProgram;// Holds compiled and linked shader program
  buffer?: WebGLBuffer; // Stores vertex data for the triangle
  aPos?: number;
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
        zoom: 12,
        center: LASSEN_CENTER,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        antialias: true,
        projection: 'mercator'
      });
  
      // Define a custom WebGL layer to draw the irradiance map
      const irradianceLayer: CustomLayer = {
        id: 'irradiance',
        type: 'custom',
        aColor: 0,

        // onAdd is called when the layer is added to the map
        // This is where we initialize all WebGL resources
        onAdd: function (_: mapboxgl.Map, gl: WebGLRenderingContext) {
          // Vertex shader: Transforms vertex positions using a matrix
          // u_matrix combines the view, projection, and model matrices
          // a_pos is the input vertex position
          const vertexSource = `
                      uniform mat4 u_matrix;
                      attribute vec2 a_pos;
                      attribute vec4 a_color;
                      varying vec4 v_color;
                      void main() {
                          gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
                          v_color = a_color;
                      }`;

          // Fragment shader: Defines the color of each pixel
          // This shader creates a semi-transparent red color
          const fragmentSource = `
                      // varying vec4 v_color;
                      void main() {
                          gl_FragColor = vec4(0.5, 0.0, 0.0, 0.5); //v_color;
                      }`;

          // Create and compile the vertex shader
          const vertexShader = gl.createShader(gl.VERTEX_SHADER);
          if (!vertexShader) {
            throw new Error('Vertex shader creation failed');
          }
          gl.shaderSource(vertexShader, vertexSource);
          gl.compileShader(vertexShader);

          // Create and compile the fragment shader
          const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
          if (!fragmentShader) {
            throw new Error('Fragment shader creation failed');
          }
          gl.shaderSource(fragmentShader, fragmentSource);
          gl.compileShader(fragmentShader);

          // Create and link shader program
          this.program = gl.createProgram();
          gl.attachShader(this.program, vertexShader);
          gl.attachShader(this.program, fragmentShader);
          gl.linkProgram(this.program);

          // Get the location of the vertex position and color attributes
          this.aPos = gl.getAttribLocation(this.program, 'a_pos');
          this.aColor = gl.getAttribLocation(this.program, 'a_color'); // TODO: what does gl.getAttribLocation do?

          // Convert geographic coordinates to Mercator coordinates
          // These points define the vertices of our triangle
          const lassen = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.5049,
            lat: 40.4881,
          });
          const brokeoff = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.559585,
            lat: 40.445564
          });
          const diamond = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.52414,
            lat: 40.44954
          });

          // TODO: instead use an object that contains everything together, and then gets converted into
          // separate arrays for the vertices and colors
          const lassenColor = [1.0, 0.0, 0.0, 0.5];
          const brokeoffColor = [1.0, 1.0, 0.0, 0.5];
          const diamondColor = [1.0, 0.0, 1.0, 0.5];

          const squareSize = 0.00005;

          // Create a buffer and upload the vertex data
          // This buffer contains the x,y coordinates of our triangle
          this.buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
              lassen.x,
              lassen.y,
              brokeoff.x,
              brokeoff.y,
              diamond.x,
              diamond.y
            ]),
            gl.STATIC_DRAW // Hint that the data won't change frequently
          );
        },

        // render is called on every frame when the map needs to be redrawn
        render: function (gl, matrix) {
          // Activate our shader program
          gl.useProgram(this.program);

          // Set the transformation matrix uniform
          // This matrix converts from Mercator coordinates to screen coordinates
          gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
          );

          // Bind our vertex buffer and set up the vertex attributes
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
          gl.enableVertexAttribArray(this.aPos);
          gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);

          // Enable transparency blending
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

          // Draw the triangle using the first 3 vertices in the buffer
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
        }
      };
  
      // mapRef.current = map; // Store map instance for later use
  
      // Add our custom layer when the map loads
      // The 'building' parameter places our layer below the building layer
      map.on('load', () => {
        map.addLayer(irradianceLayer, 'building');
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