// Default fragment shader, used by all layers

precision mediump float;
varying vec4 v_color;

void main() {
    gl_FragColor = v_color;
}