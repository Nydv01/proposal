uniform float uTime;
uniform float uBendAmount;
uniform float uCylinderRadius;
uniform float uTwistK;
uniform float uTwistAmp;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vec3 pos = position;

  if (uBendAmount > 0.01) {
    float r = uCylinderRadius;
    float theta = pos.x / r;
    float y = pos.y;

    pos.y = y;
    pos.x = r * sin(theta);
    pos.z = r * (cos(theta) - 1.0);

    pos.x += cos(y * uTwistK) * uTwistAmp * uBendAmount;
    pos.z += sin(y * uTwistK) * uTwistAmp * uBendAmount;
  }

  pos.x += sin(pos.y * 1.8 + uTime * 1.5) * 0.04 * uBendAmount;
  pos.z += cos(pos.y * 1.5 + uTime * 1.2) * 0.03 * uBendAmount;

  vPosition = pos;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
