// TODO: add resource cleanup

import { OverlayType } from '../components/OverlaySettingsProvider';

// Import all shader sources
import elevationVertexShaderSource from '../shaders/elevation.vert.glsl?raw';
import slopeVertexShaderSource from '../shaders/slope.vert.glsl?raw';
import aspectVertexShaderSource from '../shaders/aspect.vert.glsl?raw';
import defaultFragmentShaderSource from '../shaders/default.frag.glsl?raw';

/**
 * Represents a compiled and linked WebGL shader program with attribute and uniform locations.
 */
export interface ShaderProgram {
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

/**
 * Manages the compilation, linking, and retrieval of WebGL shader programs for different overlay types.
 */
export class ShaderManager {
  private gl: WebGLRenderingContext;
  private programs: Map<OverlayType, ShaderProgram | null> = new Map();

  // TODO: ask about this
  /**
   * Creates a new ShaderManager for the given WebGL context.
   * @param gl - The WebGL rendering context
   */
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Gets or creates a shader program for the specified overlay type.
   * @param overlayType - The overlay visualization type
   * @returns The compiled ShaderProgram or null if not needed
   */
  getShaderProgram(overlayType: OverlayType): ShaderProgram | null {
    // Return existing program if already created
    if (this.programs.has(overlayType)) {
      return this.programs.get(overlayType) || null;
    }

    // Skip if overlay type is 'none'
    if (overlayType === 'none') {
      this.programs.set(overlayType, null);
      return null;
    }

    // Select the appropriate vertex shader source
    let vertexShaderSource: string;
    switch (overlayType) {
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
    this.programs.set(overlayType, program);
    return program;
  }

  /**
   * Compiles vertex and fragment shaders, links them into a WebGL program, and retrieves attribute/uniform locations.
   * @param vertexShaderSource - GLSL source code for the vertex shader
   * @param fragmentShaderSource - GLSL source code for the fragment shader
   * @returns The compiled ShaderProgram or null if compilation/linking fails
   */
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
      console.error('Vertex shader compilation error:', error);
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
      console.error('Fragment shader compilation error:', error);
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
      uniforms,
    };
  }
}
