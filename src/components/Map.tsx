// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize Mapbox with the API token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];

// Custom layer interface for TypeScript - defines the structure of our WebGL layer
// This interface extends Mapbox's custom layer capabilities with WebGL-specific properties
interface CustomLayer {
  id: string;
  type: 'custom';
  program?: any; // TODO :WebGLProgram - Holds compiled and linked shader programs
  buffer?: any; // TODO :Something - Stores vertex data for the triangle
  aPos?: any; // TODO number;
  onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

const MapboxExample = () => {
    // React refs to store references to the map container DOM element and the mapbox instance
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);    
  
    useEffect(() => {
      if (!mapContainerRef.current) return; // Add early return if container is not available
      
      mapboxgl.accessToken = 'pk.eyJ1Ijoic2R1cmFudDEyIiwiYSI6ImNtNmZnMmNjcjA0dm0yanB1azQwM3BkMHEifQ.eTnoL7f4DAXbCIKMAixH6w';
  
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        zoom: 12,
        center: LASSEN_CENTER,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        antialias: true,
        projection: 'mercator'
      });
  
      // Define a custom WebGL layer to draw a red triangle overlay
      const highlightLayer: CustomLayer = {
        id: 'highlight',
        type: 'custom',
  
        // onAdd is called when the layer is added to the map
        // This is where we initialize all WebGL resources
        onAdd: function (map:mapboxgl.Map, gl:any) {
          // Vertex shader: Transforms vertex positions using a matrix
          // u_matrix combines the view, projection, and model matrices
          // a_pos is the input vertex position
          const vertexSource = `
                      uniform mat4 u_matrix;
                      attribute vec2 a_pos;
                      void main() {
                          gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
                      }`;
  
          // Fragment shader: Defines the color of each pixel
          // This shader creates a semi-transparent red color
          const fragmentSource = `
                      void main() {
                          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.3);
                      }`;
  
          // Create and compile the vertex shader
          const vertexShader = gl.createShader(gl.VERTEX_SHADER);
          gl.shaderSource(vertexShader, vertexSource);
          gl.compileShader(vertexShader);
  
          // Create and compile the fragment shader
          const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
          gl.shaderSource(fragmentShader, fragmentSource);
          gl.compileShader(fragmentShader);
  
          // Create a shader program and link the shaders
          this.program = gl.createProgram();
          gl.attachShader(this.program, vertexShader);
          gl.attachShader(this.program, fragmentShader);
          gl.linkProgram(this.program);
  
          // Get the location of the vertex position attribute
          this.aPos = gl.getAttribLocation(this.program, 'a_pos');
  
          // Convert geographic coordinates to Mercator coordinates
          // These points define the vertices of our triangle
          const lassen = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.5049,
            lat: 40.4881
          });
          const brokeoff = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.559585,
            lat: 40.445564
          });
          const diamond = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.52414,
            lat: 40.44954
          });
  
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
            gl.STATIC_DRAW  // Hint that the data won't change frequently
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
  
      mapRef.current = map; // Store map instance for later use
  
      // Add our custom layer when the map loads
      // The 'building' parameter places our layer below the building layer
      map.on('load', () => {
        map.addLayer(highlightLayer, 'building');
      });
  
      // Cleanup function to remove the map when component unmounts
      return () => {
        map.remove();
      };
    }, []);  // Empty dependency array means this effect runs once on mount
  
    // Render a div container for the map
    return <div className="h-full w-full" ref={mapContainerRef} id="map"></div>;
  };
  
  export default MapboxExample;