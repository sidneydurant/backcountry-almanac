// This component creates an interactive map using Mapbox GL JS and adds a custom layer
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Initialize Mapbox with the API token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];

// Custom layer interface - necessary to use mapbox gl with typescript
interface CustomLayer {
  id: string;
  type: 'custom';
  program?: any; // TODO WebGLProgram;
  buffer?: any; // TODO
  aPos?: any; // TODO number;
  onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

const MapboxExample = () => {
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
  
      const highlightLayer: CustomLayer = {
        id: 'highlight',
        type: 'custom',
  
        onAdd: function (map:mapboxgl.Map, gl:any) {
          const vertexSource = `
                      uniform mat4 u_matrix;
                      attribute vec2 a_pos;
                      void main() {
                          gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
                      }`;
  
          const fragmentSource = `
                      void main() {
                          gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
                      }`;
  
          const vertexShader = gl.createShader(gl.VERTEX_SHADER);
          gl.shaderSource(vertexShader, vertexSource);
          gl.compileShader(vertexShader);
  
          const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
          gl.shaderSource(fragmentShader, fragmentSource);
          gl.compileShader(fragmentShader);
  
          this.program = gl.createProgram();
          gl.attachShader(this.program, vertexShader);
          gl.attachShader(this.program, fragmentShader);
          gl.linkProgram(this.program);
  
          this.aPos = gl.getAttribLocation(this.program, 'a_pos');
  
          const helsinki = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.5049,
            lat: 40.4881
          });
          const berlin = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.559585,
            lat: 40.445564
          });
          const kyiv = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: -121.52414,
            lat: 40.44954
          });
  
          this.buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
              helsinki.x,
              helsinki.y,
              berlin.x,
              berlin.y,
              kyiv.x,
              kyiv.y
            ]),
            gl.STATIC_DRAW
          );
        },
  
        render: function (gl, matrix) {
          gl.useProgram(this.program);
          gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
          );
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
          gl.enableVertexAttribArray(this.aPos);
          gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
        }
      };
  
      mapRef.current = map; // Save map instance to the ref
  
      map.on('load', () => {
        map.addLayer(highlightLayer, 'building');
      });
  
      return () => {
        map.remove();
      };
    }, []);
  
    return <div className="h-full w-full" ref={mapContainerRef} id="map"></div>;
  };
  
  export default MapboxExample;