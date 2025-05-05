// This component creates an interactive map using Mapbox GL JS and adds a custom WebGL layer for visualization
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import GeoTIFF, { fromUrl, fromArrayBuffer, fromBlob } from 'geotiff';

// Set Mapbox API token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Default center coordinates for the map view (Lassen Volcanic National Park)
const LASSEN_CENTER: [number, number] = [-121.53, 40.46];


// TODO: convert to consistent lng, lat format (despite wsg-84, it seems that webgl and mapbox use lng, lat, so let's stick with that)


// TODO: split into util that precomputes what can be precomputed, and add error handling for out of bounds.
const response = await fetch('./src/assets/lassen-cropped-dem-data.tif');
const arrayBuffer = await response.arrayBuffer();
const tiff = await fromArrayBuffer(arrayBuffer);
const image = await tiff.getImage();
const rasters = await image.readRasters();
const raster = rasters[0];

// Helper functions
const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

function transform(a: number, b: number, M: number[], roundToInt = false): number[] {
  const round = (v: number) => (roundToInt ? v | 0 : v);
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b),
  ];
}

console.log(`Lassen Peak elevation = ${getElevationFromGPS(LASSEN_CENTER[1], LASSEN_CENTER[0])}`)

// Main function to get elevation from GPS coordinates
function getElevationFromGPS(lat: number, lng: number): number {

  // Get transformation matrices
  const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
  let [sx, sy, sz] = s;
  let [px, py, k, gx, gy, gz] = t;
  sy = -sy; // WGS-84 tiles have a "flipped" y component
  
  // Create transformation matrices
  const pixelToGPS = [gx, sx, 0, gy, 0, sy];
  console.log(`pixel to GPS transform matrix:`, pixelToGPS);

  const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
  console.log(`GPS to pixel transform matrix:`, gpsToPixel);
  
  // Convert GPS to pixel coordinates
  const [gx1, gy1, gx2, gy2] = image.getBoundingBox();
  console.log(`Looking up GPS coordinate (${lat.toFixed(6)},${lng.toFixed(6)})`);

  const [x, y] = transform(lng, lat, gpsToPixel, true);
  console.log(`Corresponding tile pixel coordinate: [${x}][${y}]`);

  // And as each pixel in the tile covers a geographic area, not a single
  // GPS coordinate, get the area that this pixel covers:
  const gpsBBox = [transform(x, y, pixelToGPS), transform(x + 1, y + 1, pixelToGPS)];
  console.log(`Pixel covers the following GPS area:`, gpsBBox);

  // Finally, retrieve the elevation associated with this pixel's geographic area:
  // const rasters = await image.readRasters();
  // const { width, [0]: raster } = rasters;
  const width = rasters.width;
  // const elevation:number = raster[x][y];
  const index = x + y * width;
  console.log(`Corresponding raster index: ${index}`)
  const elevation: number = raster[index];
  console.log(`The elevation at (${lat.toFixed(6)},${lng.toFixed(6)}) is ${elevation}m`);
  return elevation;
}




/**
 * Convert elevation value to a rainbow color in WebGL RGBA format
 * @param {number} elevation - The elevation value
 * @param {number} minElevation - Minimum elevation in dataset (defaults to 0)
 * @param {number} scale - how often (in meters) the pattern repeats
 * @param {number} alpha - Alpha/opacity value (defaults to 1.0)
 * @returns {number[]} - Color as [r, g, b, a] with values between 0.0 and 1.0
 */
function elevationToWebGLRainbow(elevation: number, scale: number = 1000, alpha: number = 1.0): number[] {
  // Normalize elevation to a value between 0 and 1
  const normalized = (elevation / scale)%1;
  
  // Use the normalized value to determine position in the rainbow
  // We'll create a smooth gradient across the rainbow spectrum
  let r, g, b;
  
  // Red to Yellow to Green to Cyan to Blue to Magenta
  const hue = normalized * 5.0;
  const i = Math.floor(hue);
  const f = hue - i;
  
  // Set RGB based on the section of the rainbow
  switch (i % 6) {
    case 0: // Red to Yellow
      r = 1.0;
      g = f;
      b = 0.0;
      break;
    case 1: // Yellow to Green
      r = 1.0 - f;
      g = 1.0;
      b = 0.0;
      break;
    case 2: // Green to Cyan
      r = 0.0;
      g = 1.0;
      b = f;
      break;
    case 3: // Cyan to Blue
      r = 0.0;
      g = 1.0 - f;
      b = 1.0;
      break;
    case 4: // Blue to Magenta
      r = f;
      g = 0.0;
      b = 1.0;
      break;
    case 5: // Magenta to Red
      r = 1.0;
      g = 0.0;
      b = 1.0 - f;
      break;
  }
  
  return [r, g, b, alpha];
}














interface CustomLayer {
  aColor?: number;
  aPos?: number;
  id: string;
  type: 'custom';
  program?: WebGLProgram;// Holds compiled and linked shader program
  posBuffer?: WebGLBuffer; // Stores vertex data for the triangle
  colorBuffer?: WebGLBuffer; // Stores color data for the triangle
  onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

// TODO: next step is to make the color based on elevation pulled from DEM data!
// TODO: load DEM data, and then be able to convert coordinates to an elevation
// TODO: convert elevation to a color

// then systematically go over a grid of points, and for each point, find the elevation, 
// and then convert that to a color and render the squares

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

    // Define a custom WebGL layer to draw colored squares
    const squaresLayer: CustomLayer = {
      id: 'colored-squares',
      type: 'custom',
      aColor: 0,

      // onAdd is called when the layer is added to the map
      // This is where we initialize all WebGL resources
      onAdd: function (map: mapboxgl.Map, gl: any) {
        // Vertex shader: Transforms vertex positions using a matrix
        // Now also receiving a color attribute that will be passed to the fragment shader
        const vertexSource = `
          uniform mat4 u_matrix;
          attribute vec2 a_pos;
          attribute vec4 a_color;
          varying vec4 v_color;
          
          void main() {
              gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
              v_color = a_color;
          }`;

        // Fragment shader: Uses the interpolated color from the vertex shader
        const fragmentSource = `
          precision mediump float;
          varying vec4 v_color;
          
          void main() {
              gl_FragColor = v_color;
          }`;

        // Create and compile the vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        // Create and compile the fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        // Create and link shader program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        // Get the location of the vertex position and color attributes
        this.aPos = gl.getAttribLocation(this.program, 'a_pos');
        this.aColor = gl.getAttribLocation(this.program, 'a_color');

        // Define square locations (center points)
        const squares = [
          { lng: -121.505, lat: 40.4881},    // Lassen Peak
          { lng: -121.510, lat: 40.4881},    // Lassen Peak
          { lng: -121.515, lat: 40.4881},    // Lassen Peak
          { lng: -121.520, lat: 40.4881},    // Lassen Peak
          { lng: -121.525, lat: 40.4881},    // Lassen Peak
          { lng: -121.559585, lat: 40.445564}, // Brokeoff Mountain
          { lng: -121.52414, lat: 40.44954},   // Diamond Peak
          { lng: -121.450, lat: 40.430},
          { lng: -121.600, lat: 40.500}
        ];

        //const boundingBox = [{ lng: -121.450, lat: 40.400}, { lng: -121.600, lat: 40.500}];

        // TODO: dynamically generate squares for the area of the map?
        // actually, instead I should directly create the mesh while iterating over lats and longs, instead of 

        // Size of each square in Mercator coordinate units
        const squareSize = 0.000007;

        // Arrays to store vertices and colors
        const vertices: number[] = [];
        const colors: number[] = [];

        // Generate vertices and colors for each square
        squares.forEach((square) => {
          // Convert center point to Mercator coordinates
          const center = mapboxgl.MercatorCoordinate.fromLngLat({lng: square.lng, lat: square.lat});
          
          // Calculate corner points for the square
          const x1 = center.x - squareSize;
          const y1 = center.y - squareSize;
          const x2 = center.x + squareSize;
          const y2 = center.y + squareSize;
          
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
          const color = elevationToWebGLRainbow(getElevationFromGPS(square.lat, square.lng), 3000, 0.3);
          for (let i = 0; i < 6; i++) {  // 6 vertices per square (2 triangles)
            colors.push(...color);
          }
        });

        // Create and bind position buffer
        this.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        // Create and bind color buffer
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        // Store the number of vertices
        this.vertexCount = vertices.length / 2;
      },

      // render is called on every frame when the map needs to be redrawn
      render: function (gl, matrix) {
        // Activate our shader program
        gl.useProgram(this.program);
        
        // Set the transformation matrix uniform
        gl.uniformMatrix4fv(
          gl.getUniformLocation(this.program, 'u_matrix'),
          false,
          matrix
        );
        
        // Bind position buffer and set up vertex attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
        
        // Bind color buffer and set up color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.aColor);
        gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 0, 0);
        
        // Enable transparency blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
      }
    };

    // Add our custom layer when the map loads
    map.on('load', () => {
      map.addLayer(squaresLayer, 'building');
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