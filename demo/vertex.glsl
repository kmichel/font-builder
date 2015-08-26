precision highp float;

attribute vec2 position;
attribute vec2 uv;
uniform mat3 viewMatrix;
varying vec2 fUv;

void main(void) {
    vec3 viewPosition = viewMatrix * vec3(position, 1.0);
    gl_Position = vec4(viewPosition.xy, 0.0, 1.0);
    fUv= uv;
}
