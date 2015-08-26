precision highp float;

varying vec2 fUv;
uniform sampler2D sampler;

void main(void) {
    vec4 color = vec4(1.0, 0.3, 0.6, 1.0);
    color *= texture2D(sampler, fUv).r;
    gl_FragColor = color;
}
