// TODO: separate out data parsing and WebGL rendering utilities
// TODO: add error handling in case shader creation fails
// TODO: finish consolidating terminology from [visualizationlayer, overlay, layer] > [overlay]

import mapboxgl from 'mapbox-gl';
import { ElevationDataProvider } from './elevationDataSource';
import { OverlayType } from '../components/OverlaySettingsProvider';
import { ShaderManager, ShaderProgram } from './shaderManager';

const elevationDataProvider = new ElevationDataProvider();
elevationDataProvider.initialize('/lassen-cropped-dem-data.tif');

/**
 * Represents a custom WebGL layer for visualizing elevation or overlay data on the map.
 * Contains buffer objects, shader references, and rendering logic.
 */
export interface CustomLayer {
  id: string;
  type: 'custom';
  shaderManager: ShaderManager | null;
  shaderProgram: ShaderProgram | null;
  overlayType: OverlayType;
  overlayOpacity: number;
  posBuffer: WebGLBuffer | null; // Stores vertex data for each triangle
  elevationBuffer: WebGLBuffer | null; // Stores elevation data for each vertex
  elevationNXBuffer: WebGLBuffer | null; // Stores elevation data for neighbor vertex in +X direction
  elevationNZBuffer: WebGLBuffer | null; // Stores elevation data for neighbor vertex in +Z direction
  gridSpacing: number;
  vertexCount: number;
  onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
  render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

/**
 * Creates a custom overlay with the specified type and opacity.
 * Handles buffer setup and rendering logic for elevation and overlay data.
 * @param overlayType - The overlay type ('elevation', 'slope', etc.)
 * @param overlayOpacity - The opacity of the overlay
 * @returns The configured CustomLayer object
 */
export const createOverlay = (overlayType: OverlayType, overlayOpacity: number): CustomLayer => {
  // Define a custom overlay that will be added to the map for data visualization
  const overlay: CustomLayer = {
    id: 'overlay',
    type: 'custom',
    shaderManager: null,
    shaderProgram: null,
    overlayType: overlayType,
    overlayOpacity: overlayOpacity,
    gridSpacing: 0,
    vertexCount: 0,
    posBuffer: null,
    elevationBuffer: null,
    elevationNXBuffer: null,
    elevationNZBuffer: null,

    /**
     * Called when the layer is added to the map. Initializes shaders and data buffers.
     * @param _map - The Mapbox GL map instance
     * @param gl - The WebGL rendering context
     */
    onAdd: function (_map: mapboxgl.Map, gl: WebGLRenderingContext) {
      // Initialize the shader manager
      this.shaderManager = new ShaderManager(gl);

      // Get shader program for the specified overlay type
      this.shaderProgram = this.shaderManager.getShaderProgram(this.overlayType);

      // If no program is needed (e.g., 'none' type), exit early
      if (!this.shaderProgram) {
        return;
      }

      console.log('Initializing overlay:', this.overlayType);

      // TODO: make the bounding box dynamic based on viewport
      const boundingBox = [
        { lng: -121.62, lat: 40.41 },
        { lng: -121.42, lat: 40.53 },
      ];

      // TODO: make the cell size dynamic based on viewport
      const cellSizeMercator = 0.00000175 / 8;
      const cellSizeGPS = 0.00125 / 8;

      // Store the cellSizeGPS value for use in the shader
      this.gridSpacing = cellSizeGPS; // This will be passed to the shader as u_grid_spacing
      // TODO this ^^ is currently unused - figure out what goes wrong when using it & fix

      // Arrays to store vertex positions and elevation data
      const vertices: number[] = [];
      const elevations: number[] = [];

      // Arrays to store neighbor elevations
      const elevationsNX: number[] = []; // Elevations of neighbors in +X direction
      const elevationsNZ: number[] = []; // Elevations of neighbors in +Z direction

      // Create a 2D grid to store all elevations for easy lookup
      const gridWidth = Math.ceil((boundingBox[1].lng - boundingBox[0].lng) / cellSizeGPS) + 1;
      const gridHeight = Math.ceil((boundingBox[1].lat - boundingBox[0].lat) / cellSizeGPS) + 1;
      const elevationGrid: number[][] = Array(gridWidth)
        .fill(0)
        .map(() => Array(gridHeight).fill(0));

      // First fill the elevation grid with all elevation values
      let xIndex = 0;
      for (let lng = boundingBox[0].lng; lng <= boundingBox[1].lng; lng += cellSizeGPS) {
        let yIndex = 0;
        for (let lat = boundingBox[0].lat; lat <= boundingBox[1].lat; lat += cellSizeGPS) {
          elevationGrid[xIndex][yIndex] = elevationDataProvider.getElevation(lng, lat);
          yIndex++;
        }
        xIndex++;
      }

      // TODO: separte vertex and elevation and neighbor generation into helper functions that are only called if the corresponding
      // attributes are required for the overlay type
      // Generate vertex positions and elevation data for each grid cell
      for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
          // Convert center point to Mercator coordinates
          const center = mapboxgl.MercatorCoordinate.fromLngLat({
            lng: boundingBox[0].lng + i * cellSizeGPS,
            lat: boundingBox[0].lat + j * cellSizeGPS,
          });

          // Calculate corner points for the grid cell
          const x1 = center.x - cellSizeMercator * 0.993;
          const y1 = center.y - cellSizeMercator * 1.305;
          const x2 = center.x + cellSizeMercator * 0.993;
          const y2 = center.y + cellSizeMercator * 1.305;

          // Each cell consists of two triangles (6 vertices total)
          // First triangle: top-left, bottom-left, bottom-right
          vertices.push(
            x1,
            y1, // top-left
            x1,
            y2, // bottom-left
            x2,
            y2 // bottom-right
          );

          // Second triangle: top-left, bottom-right, top-right
          vertices.push(
            x1,
            y1, // top-left
            x2,
            y2, // bottom-right
            x2,
            y1 // top-right
          );

          // Add elevation for each vertex (same elevation for all vertices in a square)
          // TODO: consider adding different elevations for each corner of the vertex (this should be precomputed once)
          const elevation = elevationGrid[i][j];
          for (let k = 0; k < 6; k++) {
            // 6 vertices per square (2 triangles)
            elevations.push(elevation);

            // Get elevation of neighbor in +X direction (with bounds checking)
            let nextXElevation = elevation; // Default to same elevation if at boundary
            if (i + 1 < gridWidth) {
              nextXElevation = elevationGrid[i + 1][j];
            }
            elevationsNX.push(nextXElevation);

            // Get elevation of neighbor in +Z direction (with bounds checking)
            let nextZElevation = elevation; // Default to same elevation if at boundary
            if (j + 1 < gridHeight) {
              nextZElevation = elevationGrid[i][j + 1];
            }
            elevationsNZ.push(nextZElevation);
          }
        }
      }

      // Create and bind position buffer
      this.posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      // Create and bind elevation buffer
      this.elevationBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevations), gl.STATIC_DRAW);

      // TODO: check if the shader needs neighbor elevations in X direction, if not, skip creating buffer
      this.elevationNXBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNXBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevationsNX), gl.STATIC_DRAW);

      // TODO: check if the shader needs neighbor elevations in X direction, if not, skip creating buffer
      this.elevationNZBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNZBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevationsNZ), gl.STATIC_DRAW);

      // Store the number of vertices
      this.vertexCount = vertices.length / 2;
    },

    /**
     * Called on every frame update when the map needs to be redrawn. Handles drawing the visualization.
     * @param gl - The WebGL rendering context
     * @param matrix - The transformation matrix for rendering
     */
    render: function (gl: WebGLRenderingContext, matrix: number[]) {
      if (!this.shaderProgram) {
        return;
      }

      const { program, attributes, uniforms } = this.shaderProgram;

      // Activate our shader program
      gl.useProgram(program);

      // Set the transformation matrix uniform
      if (uniforms['u_matrix']) {
        gl.uniformMatrix4fv(uniforms['u_matrix'], false, matrix);
      }

      // Set grid spacing uniform if available
      if (uniforms['u_grid_spacing']) {
        gl.uniform1f(uniforms['u_grid_spacing'], this.gridSpacing);
      }

      // Set opacity uniform if available
      if (uniforms['u_opacity']) {
        gl.uniform1f(uniforms['u_opacity'], this.overlayOpacity);
      }

      // Bind position buffer and set up position attribute
      // NOTE: webgl uses a state based approach, so you start by binding the buffer, and then specify which
      // attribute should read from "the current buffer". There is no "connect buffer X to attribute Y" function.
      // Operations work on what is currently "bound". So you see the same pattern where I fill the buffer data
      // above with the gl.bufferData calls made immediately after the bindBuffer calls.
      if (attributes['a_position'] > -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.enableVertexAttribArray(attributes['a_position']);
        gl.vertexAttribPointer(attributes['a_position'], 2, gl.FLOAT, false, 0, 0);
      }

      // Bind elevation buffer and set up elevation attribute
      if (attributes['a_elevation'] > -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationBuffer);
        gl.enableVertexAttribArray(attributes['a_elevation']);
        gl.vertexAttribPointer(attributes['a_elevation'], 1, gl.FLOAT, false, 0, 0);
      }

      // Set up neighbor elevation in X direction if needed
      if (attributes['a_elevation_nx'] > -1 && this.elevationNXBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNXBuffer);
        gl.enableVertexAttribArray(attributes['a_elevation_nx']);
        gl.vertexAttribPointer(attributes['a_elevation_nx'], 1, gl.FLOAT, false, 0, 0);
      }

      // Set up neighbor elevation in Z direction if needed
      if (attributes['a_elevation_nz'] > -1 && this.elevationNZBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNZBuffer);
        gl.enableVertexAttribArray(attributes['a_elevation_nz']);
        gl.vertexAttribPointer(attributes['a_elevation_nz'], 1, gl.FLOAT, false, 0, 0);
      }

      // Enable transparency blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw the triangles
      gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    },
  };

  return overlay;
};
