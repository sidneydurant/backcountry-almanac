attribute vec4 a_position;
attribute float a_elevation;

attribute float a_elevation_nx; // elevation of neighbor in +x direction
attribute float a_elevation_nz; // elevation of neighbor in +z direction

varying vec4 v_color;

uniform mat4 u_matrix;
uniform float u_grid_spacing; // Distance between vertices in the grid

void main() {
    // Calculate the slope using finite differences, and then shift the result to be between 0 and 1
    float slope_x = ((a_elevation_nx - a_elevation) / 25.0) + 0.5;
    float slope_z = ((a_elevation_nz - a_elevation) / 25.0) + 0.5;
    
    // Color mapping based on slope angle
    vec3 color = vec3(slope_x, slope_z, 0.0);

    // Pass the computed color to the fragment shader
    v_color = vec4(color, 0.3);
    
    // Set the position
    gl_Position = u_matrix * a_position;
}