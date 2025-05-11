attribute vec4 a_position;
attribute float a_elevation;

attribute float a_elevation_nx; // elevation of neighbor in +x direction
attribute float a_elevation_nz; // elevation of neighbor in +z direction

varying vec4 v_color;

uniform mat4 u_matrix;
uniform float u_grid_spacing; // Distance between vertices in the grid
uniform float u_opacity;

void main() {
    // Calculate the slope using finite differences
    float slope_x = (a_elevation - a_elevation_nx ) / 25.0;
    float slope_z = (a_elevation - a_elevation_nz) / 25.0;

    // Compute aspect (azimuthal direction)
    float aspect = atan(slope_x, slope_z); // Range: -PI to PI

    // Map aspect to hue [0,1]
    float hue = (aspect + 3.14159265) / (2.0 * 3.14159265);

    // Simple HSV to RGB conversion (saturation=1, value=1)
    float r = abs(hue * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(hue * 6.0 - 2.0);
    float b = 2.0 - abs(hue * 6.0 - 4.0);
    vec3 color = clamp(vec3(r,g,b), 0.0, 1.0);

    float slope_mag = length(vec2(slope_x, slope_z));
    float intensity = smoothstep(0.0, 0.4, slope_mag);
    color *= intensity;

    // Pass the computed color to the fragment shader
    v_color = vec4(color, u_opacity*(slope_mag+0.4));
    
    // Set the position
    gl_Position = u_matrix * a_position;
}