import mapboxgl from 'mapbox-gl';
import elevationVertexShaderSource from '../shaders/elevation.vert.glsl?raw'; // ?raw tells Vite to load the file as a string
import slopeVertexShaderSource from '../shaders/slope.vert.glsl?raw';
import aspectVertexShaderSource from '../shaders/aspect.vert.glsl?raw';
import defaultFragmentShaderSource from '../shaders/default.frag.glsl?raw';
import { ElevationDataProvider } from '../modules/elevationDataProvider';
import { VisualizationType } from '../components/VisualizationContext';

// TODO: this file currently contains far too much. Separate out shader management, webgl utilities and & data parsing

const elevationDataProvider = new ElevationDataProvider();
elevationDataProvider.initialize('/lassen-cropped-dem-data.tif'); // TODO: add error handling

interface CustomLayer {
    aElevation: number;
    aElevationNX: number;
    aElevationNZ: number;
    uGridSpacing: number;
    gridSpacing: number;
    aPosition: number;
    vertexCount: number;
    id: string;
    type: 'custom';
    program: WebGLProgram | null; // Stores compiled and linked shader program
    posBuffer: WebGLBuffer | null; // Stores vertex data for each triangle
    elevationBuffer: WebGLBuffer | null; // Stores elevation data for each vertex
    elevationNXBuffer: WebGLBuffer | null; // Stores elevation data for neighbor vertex in +X direction
    elevationNZBuffer: WebGLBuffer | null; // Stores elevation data for neighbor vertex in +Z direction
    onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => void;
    render: (gl: WebGLRenderingContext, matrix: number[]) => void;
}

export const createVisualizationLayer = (visualizationType: VisualizationType): CustomLayer => {
    // Select the appropriate vertex shader based on the visualization type
    let vertexShaderSource: string | null;
    console.log('visualizationType', visualizationType);
    switch (visualizationType) {
        case 'elevation':
            vertexShaderSource = elevationVertexShaderSource;
            break;
        case 'slope':
            vertexShaderSource = slopeVertexShaderSource;
            break;
        case 'aspect':
            vertexShaderSource = aspectVertexShaderSource;
            break;
        case 'none':
            vertexShaderSource = null;
            break;
        default:
            vertexShaderSource = elevationVertexShaderSource;
    }

    // Define a custom WebGL layer that will be added to the map for data visualization
    const visualizationLayer: CustomLayer = {
        id: 'visualization',
        type: 'custom',
        aElevation: 0,
        aElevationNX: 0,
        aElevationNZ: 0,
        uGridSpacing: 0,
        gridSpacing: 0,
        aPosition: 0,
        vertexCount: 0,
        program: null,
        posBuffer: null,
        elevationBuffer: null,
        elevationNXBuffer: null,
        elevationNZBuffer: null,

        // onAdd is called when the layer is added to the map
        onAdd: function (_map: mapboxgl.Map, gl: any) {
            if (!vertexShaderSource) {
                return;
            }

            // Create and compile the vertex shader
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexShaderSource);
            gl.compileShader(vertexShader);
            
            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                // Something went wrong during compilation; get the error
                const error = gl.getShaderInfoLog(vertexShader);
                console.error("Vertex shader compilation error:", error);
                gl.deleteShader(vertexShader);
                return null;
            }

            // Create and compile the fragment shader
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, defaultFragmentShaderSource);
            gl.compileShader(fragmentShader);

            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                // Something went wrong during compilation; get the error
                const error = gl.getShaderInfoLog(vertexShader);
                console.error("Fragment shader compilation error:", error);
                gl.deleteShader(vertexShader);
                return null;
            }

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

            // Get the location of the shader attributes
            this.aPosition = gl.getAttribLocation(this.program, 'a_position');
            this.aElevation = gl.getAttribLocation(this.program, 'a_elevation');
            this.aElevationNX = gl.getAttribLocation(this.program, 'a_elevation_nx');
            this.aElevationNZ = gl.getAttribLocation(this.program, 'a_elevation_nz');

            // TODO: Add a new uniform for grid spacing TODO: figure out the math for getting this to match no matter the latitude/longitude/zoom
            this.uGridSpacing = gl.getUniformLocation(this.program, 'u_grid_spacing');

            // TODO: make the bounding box dynamic based on viewport
            const boundingBox = [{ lng: -121.64, lat: 40.40}, { lng: -121.42, lat: 40.54}];

            // TODO: make the cell size dynamic based on viewport
            const cellSizeMercator = 0.00000175/8;
            const cellSizeGPS = 0.00125/8;

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
            const elevationGrid: number[][] = Array(gridWidth).fill(0).map(() => Array(gridHeight).fill(0));
            
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
            // attributes are required for the visualization type
            // Generate vertex positions and elevation data for each grid cell
            for (let i = 0; i < gridWidth; i++) {
                for (let j = 0; j < gridHeight; j++) {
                    // Convert center point to Mercator coordinates
                    const center = mapboxgl.MercatorCoordinate.fromLngLat({lng: boundingBox[0].lng + i * cellSizeGPS, lat: boundingBox[0].lat + j * cellSizeGPS});
                    
                    // Calculate corner points for the grid cell
                    const x1 = center.x - cellSizeMercator*.993;
                    const y1 = center.y - cellSizeMercator*1.305;
                    const x2 = center.x + cellSizeMercator*.993;
                    const y2 = center.y + cellSizeMercator*1.305;
                    
                    // Each cell consists of two triangles (6 vertices total)
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
                    
                    // Add elevation for each vertex (same elevation for all vertices in a square)
                    // TODO: consider adding different elevations for each corner of the vertex (this should be precomputed once)
                    const elevation = elevationGrid[i][j];
                    for (let k = 0; k < 6; k++) {  // 6 vertices per square (2 triangles)
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

            if (this.aElevationNX > -1) {
                this.elevationNXBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNXBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevationsNX), gl.STATIC_DRAW);
            }
            
            if (this.aElevationNZ > -1) {
                this.elevationNZBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNZBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(elevationsNZ), gl.STATIC_DRAW);
            }

            // Store the number of vertices
            this.vertexCount = vertices.length / 2;
        },

        // render is called on every frame update when the map needs to be redrawn
        render: function (gl, matrix) {

            if (!this.program) {
                console.log('Program not initialized');
                return;
            }
            
            // Activate our shader program
            gl.useProgram(this.program);
            
            // Set the transformation matrix uniform
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrix'), false, matrix);
            
            // Bind position buffer and set up position attribute
            // NOTE: webgl uses a state based approach, so you start by binding the buffer, and then specify which
            // attribute should read from "the current buffer". There is no "connect buffer X to attribute Y" function.
            // Operations work on what is currently "bound". So you see the same pattern where I fill the buffer data
            // above with the gl.bufferData calls made immediately after the bindBuffer calls.
            gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer ?? null);
            gl.enableVertexAttribArray(this.aPosition);
            gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
            
            // Bind elevation buffer and set up elevation attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationBuffer ?? null);
            gl.enableVertexAttribArray(this.aElevation);
            gl.vertexAttribPointer(this.aElevation, 1, gl.FLOAT, false, 0, 0);
            
            // aElevationNX is only used for aspect & slope visualization
            if (this.aElevationNX > -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNXBuffer ?? null);
                gl.enableVertexAttribArray(this.aElevationNX);
                gl.vertexAttribPointer(this.aElevationNX, 1, gl.FLOAT, false, 0, 0);
            }
            
            // aElevationNZ is only used for aspect & slope visualization
            if (this.aElevationNZ > -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.elevationNZBuffer ?? null);
                gl.enableVertexAttribArray(this.aElevationNZ);
                gl.vertexAttribPointer(this.aElevationNZ, 1, gl.FLOAT, false, 0, 0);
            }
            
            // Enable transparency blending
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            // Draw the triangles
            gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
        }
    };

    return visualizationLayer;
};