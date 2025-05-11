import { VisualizationType } from '../components/VisualizationProvider';

// Import all shader sources
import elevationVertexShaderSource from '../shaders/elevation.vert.glsl?raw';
import slopeVertexShaderSource from '../shaders/slope.vert.glsl?raw';
import aspectVertexShaderSource from '../shaders/aspect.vert.glsl?raw';
import defaultFragmentShaderSource from '../shaders/default.frag.glsl?raw';

export interface ShaderProgram {
    program: WebGLProgram;
    attributes: Record<string, number>;
    uniforms: Record<string, WebGLUniformLocation>;
}

// TODO: add resource cleanup

export class ShaderManager {
    private gl: WebGLRenderingContext;
    private programs: Map<VisualizationType, ShaderProgram | null> = new Map();

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    // Get or create shader program for a specific visualization type
    getShaderProgram(visualizationType: VisualizationType): ShaderProgram | null {
        // Return existing program if already created
        if (this.programs.has(visualizationType)) {
            return this.programs.get(visualizationType) || null;
        }

        // Skip if visualization type is 'none'
        if (visualizationType === 'none') {
            this.programs.set(visualizationType, null);
            return null;
        }

        // Select the appropriate vertex shader source
        let vertexShaderSource: string;
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
            default:
                vertexShaderSource = elevationVertexShaderSource;
        }

        // Create the program
        const program = this.createShaderProgram(vertexShaderSource, defaultFragmentShaderSource);
        this.programs.set(visualizationType, program);
        return program;
    }

    // Create a shader program from vertex and fragment shader sources
    private createShaderProgram(vertexShaderSource: string, fragmentShaderSource: string): ShaderProgram | null {
        const gl = this.gl;
        
        // Create and compile the vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) {
            console.error('Failed to create vertex shader');
            return null;
        }
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
        if (!fragmentShader) {
            console.error('Failed to create fragment shader');
            gl.deleteShader(vertexShader);
            return null;
        }
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            // Something went wrong during compilation; get the error
            const error = gl.getShaderInfoLog(fragmentShader);
            console.error("Fragment shader compilation error:", error);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }

        // Create and link shader program
        const program = gl.createProgram();
        if (!program) {
            console.error('Failed to create shader program');
            return null;
        }
        
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // Check program linking
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }
        
        // If we get here, everything compiled and linked successfully
        console.log('Shaders compiled and linked successfully!');
        
        // Get the location of the shader attributes
        const attributes: Record<string, number> = {};
        attributes['a_position'] = gl.getAttribLocation(program, 'a_position');
        attributes['a_elevation'] = gl.getAttribLocation(program, 'a_elevation');
        attributes['a_elevation_nx'] = gl.getAttribLocation(program, 'a_elevation_nx');
        attributes['a_elevation_nz'] = gl.getAttribLocation(program, 'a_elevation_nz');
        
        // Get uniform locations
        const uniforms: Record<string, WebGLUniformLocation> = {};
        const gridSpacingLocation = gl.getUniformLocation(program, 'u_grid_spacing');
        const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
        const layerOpacity = gl.getUniformLocation(program, 'u_opacity');
        
        if (gridSpacingLocation) {
            uniforms['u_grid_spacing'] = gridSpacingLocation;
        }
        
        if (matrixLocation) {
            uniforms['u_matrix'] = matrixLocation;
        }

        if (layerOpacity) {
            uniforms['u_opacity'] = layerOpacity;
        }
        
        return {
            program,
            attributes,
            uniforms
        };
    }
}