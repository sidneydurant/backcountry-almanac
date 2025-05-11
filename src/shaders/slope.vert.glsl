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
    float slope_x = ((a_elevation_nx - a_elevation) / 13.0);
    float slope_z = ((a_elevation_nz - a_elevation) / 13.0);
    
    // Construct the normal vector (-slope_x, 1, -slope_z) and normalize it
    vec3 normal = normalize(vec3(-slope_x, 1.0, -slope_z));
    
    // Calculate angle between normal and vertical (Y) axis
    vec3 vertical = vec3(0.0, 1.0, 0.0);
    float cosAngle = dot(normal, vertical);
    
    // Get the slope angle in radians (0 = flat, π/2 = vertical cliff)
    float slopeAngle = acos(cosAngle);
    
    // Convert to degrees (0-90°) and normalize to 0-1 range
    float slopeAngleDegrees = slopeAngle * 57.2957795; // 180/π
    float normalizedSlope = slopeAngleDegrees / 90.0;
    
    // Color mapping based on slope angle
    vec3 color;
    
    if (normalizedSlope < 0.17) { // 0-15° (green shades)
        // Gradient from light to darker green
        color = vec3(0.0, 0.7 - normalizedSlope * 1.5, 0.0);
    } else if (normalizedSlope < 0.30) { // 15-27° (yellow)
        // Gradient from green to yellow
        color = mix(vec3(0.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (normalizedSlope - 0.17) / 0.13);
    } else if (normalizedSlope < 0.42) { // 27-38° (orange)
        // Gradient from yellow to orange
        color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.5, 0.0), (normalizedSlope - 0.30) / 0.12);
    } else if (normalizedSlope < 0.56) { // 38-50° (red)
        // Gradient from orange to red
        color = mix(vec3(1.0, 0.5, 0.0), vec3(0.8, 0.0, 0.0), (normalizedSlope - 0.42) / 0.14);
    } else if (normalizedSlope < 0.78) { // 50-70° (purple)
        // Gradient from red to purple
        color = mix(vec3(0.8, 0.0, 0.0), vec3(0.5, 0.0, 0.5), (normalizedSlope - 0.56) / 0.22);
    } else { // 70-90° (dark purple)
        // Gradient from purple to dark purple
        color = mix(vec3(0.5, 0.0, 0.5), vec3(0.2, 0.0, 0.3), (normalizedSlope - 0.78) / 0.22);
    }

    // Pass the computed color to the fragment shader
    v_color = vec4(color, u_opacity);
    
    // Set the position
    gl_Position = u_matrix * a_position;
}