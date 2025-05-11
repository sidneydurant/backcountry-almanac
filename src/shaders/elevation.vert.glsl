// NOTE: 'Attributes' are a way to pass data from the JavaScript code to the shader
attribute vec4 a_position;
attribute float a_elevation;

// NOTE: 'Varyings' are a way to pass data from the vertex shader to the fragment shader
varying vec4 v_color;

// NOTE: 'Uniforms' are effectively global variables that do not change across invocations
// of the shader for a single draw call.
uniform mat4 u_matrix;
uniform float u_opacity;

void main() {
    // Normalize elevation to a value between 0 and 1
    float normalized = mod(a_elevation / 1250.0, 1.0);

    // Initialize RGB components
    vec3 color;

    // Calculate rainbow pattern
    float hue = normalized * 5.0;
    float i = floor(hue);
    float f = hue - i;

    // Set RGB based on the section of the rainbow
    if (i < 1.0) { // Red to Yellow
        color = vec3(1.0, f, 0.0);
    } else if (i < 2.0) { // Yellow to Green
        color = vec3(1.0 - f, 1.0, 0.0);
    } else if (i < 3.0) { // Green to Cyan
        color = vec3(0.0, 1.0, f);
    } else if (i < 4.0) { // Cyan to Blue
        color = vec3(0.0, 1.0 - f, 1.0);
    } else if (i < 5.0) { // Blue to Magenta
        color = vec3(f, 0.0, 1.0);
    } else { // Magenta to Red
        color = vec3(1.0, 0.0, 1.0 - f);
    }

    // Pass the computed color to the fragment shader
    v_color = vec4(color, u_opacity);

    // Set the position
    gl_Position = u_matrix * a_position;
}