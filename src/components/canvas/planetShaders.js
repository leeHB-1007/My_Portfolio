import { ROTATION_GLSL } from "../../journey/planets";

// GLSL ES 예약어(active, filter, input, output, sample, common, partition, using 등)를
// 식별자로 쓰지 않는다. 빌드에서는 잡히지 않고 실행 중 컴파일 오류가 난다.

// 행성·위성 표면: 은하 중심 방향 빛(낮/밤), fbm 띠·얼룩, 빛 받는 쪽 대기 림
export const bodyVertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vView;

  void main() {
    vObj = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const bodyFragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uLight;
  uniform float uDim;
  uniform float uGlow;
  uniform float uSpin;
  uniform float uDetail;
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vView;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 x) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      total += amp * noise3(x);
      x = x * 2.03 + vec3(1.7, 9.2, 3.1);
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    float cs = cos(uSpin);
    float sn = sin(uSpin);
    vec3 q = vec3(cs * vObj.x - sn * vObj.z, vObj.y, sn * vObj.x + cs * vObj.z);
    float warp = fbm(q * 2.2 * uDetail);
    float bands = sin((q.y * 5.5 + warp * 2.4) * 3.14159);
    float spots = fbm(q * 6.0 * uDetail + 4.0);
    float blend = clamp(0.5 + 0.35 * bands + 0.45 * (spots - 0.5), 0.0, 1.0);
    vec3 tone = mix(uColorA, uColorB, blend);

    vec3 n = normalize(vWorldNormal);
    float lambert = dot(n, uLight);
    float day = smoothstep(-0.15, 0.6, lambert);
    // 카메라는 행성 바깥쪽에서 은하 중심을 바라보므로 중심의 빛만 쓰면 밤 쪽만 보인다.
    // 카메라 쪽 위에서 비추는 주광을 더해 표면 무늬가 보이게 하고, 중심의 빛은 역광 테두리로 남긴다.
    vec3 viewDir = normalize(vView);
    float key = smoothstep(-0.25, 0.9, dot(n, normalize(viewDir + vec3(0.0, 0.55, 0.0))));
    vec3 lit = tone * (0.14 + 0.7 * key + 0.3 * day);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float rimLit = rim * (0.3 + 0.7 * smoothstep(-0.3, 0.4, lambert));
    vec3 color = lit * uGlow + uColorB * rimLit * 0.8;
    gl_FragColor = vec4(color * uDim, 1.0);
  }
`;

// 카메라를 향하는 원판(PlaneGeometry 2×2)에 그리는 가산 후광
export const haloVertexShader = /* glsl */ `
  uniform float uSize;
  varying vec2 vCoord;

  void main() {
    vCoord = position.xy;
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const haloFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uInner;
  uniform float uDim;
  varying vec2 vCoord;

  void main() {
    float d = length(vCoord);
    if (d > 1.0) discard;
    float glow = 1.0 - smoothstep(uInner, 1.0, d);
    gl_FragColor = vec4(uColor * glow * glow * uStrength * uDim, 1.0);
  }
`;

// 장식 고리(반투명 띠 무늬)
export const ringVertexShader = /* glsl */ `
  varying float vRadius;

  void main() {
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uDim;
  varying float vRadius;

  void main() {
    float x = (vRadius - uInnerRadius) / (uOuterRadius - uInnerRadius);
    float stripes = 0.55 + 0.45 * sin(x * 38.0) * sin(x * 11.0 + 1.3);
    float edge = smoothstep(0.0, 0.08, x) * (1.0 - smoothstep(0.85, 1.0, x));
    float gap = 1.0 - 0.8 * (1.0 - smoothstep(0.0, 0.03, abs(x - 0.62)));
    gl_FragColor = vec4(uColor * uDim, 0.55 * stripes * edge * gap);
  }
`;

// 행성 자리 비콘: 멀리서는 밝은 점(최소 3px), 다가가면(거리 3 → 1) 사라진다.
export const beaconVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uTarget;
  attribute float aIndex;
  attribute vec3 aTint;
  varying vec3 vTint;
  varying float vBright;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    float angle = ${ROTATION_GLSL};
    p.x = cos(angle) * r;
    p.z = sin(angle) * r;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = max(-mvPosition.z, 0.001);
    float isTarget = 1.0 - step(0.5, abs(aIndex - uTarget));
    float away = smoothstep(1.0, 3.0, dist);
    vBright = away * (0.55 + 0.45 * isTarget);
    vTint = aTint;
    gl_PointSize = max(0.35 * uScale / dist, 3.0) * (1.0 + 0.6 * isTarget) * step(0.001, away);
  }
`;

export const beaconFragmentShader = /* glsl */ `
  uniform float uDim;
  varying vec3 vTint;
  varying float vBright;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 18.0);
    float halo = exp(-d * d * 3.5) * (1.0 - d);
    gl_FragColor = vec4((vec3(1.0, 0.97, 0.92) * core + vTint * halo) * vBright * uDim, 1.0);
  }
`;
