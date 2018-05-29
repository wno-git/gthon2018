#define PROCESSING_COLOR_SHADER

varying vec4 vertColor;
varying vec4 vertTexCoord;

uniform vec2 resolution;

void main() {
    vec2 position = gl_FragCoord.xy / resolution;

    gl_FragColor = vec4(0, 0, position.y, 1);

}
