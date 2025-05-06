attribute vec4 a_position;
attribute float a_elevation;

attribute float a_elevation_nx; // elevation of neighbor in +x direction
attribute float a_elevation_nz; // elevation of neighbor in +z direction

varying vec4 v_color;

uniform mat4 u_matrix;
uniform float u_grid_spacing; // Distance between vertices in the grid

void main() {
    // Calculate the slope using finite differences, and then shift the result to be between 0 and 1
    float slope_x = (a_elevation - a_elevation_nx ) / 25.0;
    float slope_z = (a_elevation - a_elevation_nz) / 25.0;
    
    // Color mapping based on slope angle
    vec3 color = vec3(0.5 + slope_x, 0.5 + slope_z, 0.5);

    // Pass the computed color to the fragment shader
    v_color = vec4(color, 0.5);
    
    // Set the position
    gl_Position = u_matrix * a_position;
}