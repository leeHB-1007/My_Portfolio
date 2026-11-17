import { ROTATION_GLSL } from "../../journey/planets";

// GLSL ES 예약어(active, filter, input, output, sample, common, partition, using 등)를
// 식별자로 쓰지 않는다. 빌드에서는 잡히지 않고 실행 중 컴파일 오류가 난다.

// 행성 표면 종류(uType)
export const SURFACE = { gas: 0, ringedGas: 1, ocean: 2, ice: 3, lava: 4, moon: 5 };

// 3D 값 노이즈, fbm, 능선 노이즈, 세포(Worley) 노이즈
const noiseChunk = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  vec3 hash33(vec3 p) {
    return vec3(hash3(p), hash3(p + 19.19), hash3(p + 47.47));
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

  float ridged(vec3 x) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      total += amp * (1.0 - abs(noise3(x) * 2.0 - 1.0));
      x = x * 2.1 + vec3(3.1, 1.3, 7.7);
      amp *= 0.5;
    }
    return total;
  }

  // 가장 가까운 세포 중심까지의 거리(크레이터용)
  float worley(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    float best = 8.0;
    for (int dz = -1; dz <= 1; dz++) {
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          vec3 cell = vec3(float(dx), float(dy), float(dz));
          vec3 point = cell + hash33(i + cell);
          best = min(best, length(point - f));
        }
      }
    }
    return best;
  }
`;

// 고리 밀도(0~1 반경 위치 x): 여러 겹의 띠 + 두 개의 틈
const ringDensityChunk = /* glsl */ `
  float ringDensity(float x) {
    if (x < 0.0 || x > 1.0) return 0.0;
    float bands = 0.55 + 0.25 * sin(x * 41.0) + 0.2 * sin(x * 97.0 + 1.3);
    float edge = smoothstep(0.0, 0.06, x) * (1.0 - smoothstep(0.9, 1.0, x));
    float gapA = smoothstep(0.0, 0.025, abs(x - 0.58));
    float gapB = 0.4 + 0.6 * smoothstep(0.0, 0.015, abs(x - 0.31));
    return clamp(bands, 0.0, 1.0) * edge * gapA * gapB;
  }
`;

// 행성·위성 표면
export const bodyVertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vObj = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const bodyFragmentShader = /* glsl */ `
  uniform float uType;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uGlowColor;
  uniform vec3 uRimColor;
  uniform vec3 uSun;
  uniform vec3 uCore;
  uniform float uDim;
  uniform float uSpin;
  uniform float uTime;
  uniform float uSeed;
  uniform float uScale;
  uniform float uRim;
  uniform float uBrightness;
  uniform vec3 uCenter;
  uniform vec3 uRingNormal;
  uniform vec2 uRingRadii;
  uniform float uRingShadow;
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  ${noiseChunk}
  ${ringDensityChunk}

  vec3 spinY(vec3 p, float a) {
    float cs = cos(a);
    float sn = sin(a);
    return vec3(cs * p.x - sn * p.z, p.y, sn * p.x + cs * p.z);
  }

  // 축 k를 중심으로 p를 a만큼 돌린다(폭풍 소용돌이)
  vec3 twist(vec3 p, vec3 k, float a) {
    float cs = cos(a);
    float sn = sin(a);
    return p * cs + cross(k, p) * sn + k * dot(k, p) * (1.0 - cs);
  }

  void main() {
    vec3 q = spinY(vObj, uSpin);
    vec3 seed = vec3(uSeed, uSeed * 1.31, uSeed * 0.71);
    vec3 albedo = uColorA;
    vec3 emission = vec3(0.0);
    float shine = 0.0;
    float clouds = 0.0;
    float landMask = 0.0;

    if (uType < 1.5) {
      // 가스 거성: 위도별 난류 띠(도메인 워핑) + 폭풍 소용돌이
      vec3 stormAxis = normalize(vec3(0.55, -0.28, 0.79));
      float storm = smoothstep(0.42, 0.0, distance(q, stormAxis));
      vec3 p = twist(q, stormAxis, storm * 4.5);
      vec3 warp = vec3(fbm(p * 1.4 + seed), fbm(p * 1.4 + seed + 5.2), fbm(p * 1.4 + seed + 9.1));
      float lat = p.y + 0.22 * (warp.x - 0.5);
      float turbulence = fbm(vec3(lat * 7.0 * uScale, warp.y * 1.6, warp.z * 1.6) + seed);
      float contrast = uType > 0.5 ? 0.55 : 1.0;
      float bands = 0.5 + contrast * (turbulence - 0.5) * 1.6 + contrast * 0.18 * sin(lat * 18.0 * uScale + warp.y * 4.0);
      albedo = mix(uColorA, uColorB, clamp(bands, 0.0, 1.0));
      albedo = mix(albedo, uColorC, storm * 0.75 + 0.18 * smoothstep(0.6, 0.85, fbm(p * 5.0 + seed)));
    } else if (uType < 2.5) {
      // 바다 행성: 대륙(노이즈 임계값), 바다 반사, 움직이는 구름, 밤면의 도시 불빛
      float height = fbm(q * 2.2 * uScale + seed);
      landMask = smoothstep(0.5, 0.53, height);
      vec3 ocean = mix(uColorA, uColorB, smoothstep(0.32, 0.5, height));
      vec3 land = mix(uColorC, vec3(0.42, 0.36, 0.26), smoothstep(0.55, 0.7, fbm(q * 6.0 + seed)));
      albedo = mix(ocean, land, landMask);
      albedo = mix(albedo, vec3(0.92, 0.95, 1.0), smoothstep(0.82, 0.9, abs(q.y)));
      shine = 1.0 - landMask;
      vec3 drift = vec3(uTime * 0.015, 0.0, uTime * 0.008);
      clouds = smoothstep(0.52, 0.78, fbm(spinY(q, uTime * 0.01) * 3.2 + drift + seed + 3.0));
    } else if (uType < 3.5) {
      // 얼음 거성: 옅은 띠
      float warp = fbm(q * 1.8 + seed);
      float bands = fbm(vec3(q.y * 4.0 * uScale + warp, warp, 0.0) + seed);
      albedo = mix(uColorA, uColorB, smoothstep(0.3, 0.7, bands));
      albedo = mix(albedo, uColorC, 0.25 * smoothstep(0.55, 0.8, fbm(q * 3.0 + seed)));
    } else {
      // 암석(용암 행성·위성): 크레이터, 균열
      float rock = fbm(q * 3.0 * uScale + seed);
      float crater = worley(q * 4.0 * uScale + seed);
      float bowl = smoothstep(0.0, 0.45, crater);
      float lip = smoothstep(0.38, 0.46, crater) * (1.0 - smoothstep(0.46, 0.58, crater));
      albedo = mix(uColorA, uColorB, rock);
      albedo = mix(albedo, uColorC, 0.25 * smoothstep(0.55, 0.8, fbm(q * 7.0 + seed)));
      albedo *= mix(0.62, 1.0, bowl) + lip * 0.35;
      if (uType < 4.5) {
        float crack = smoothstep(0.86, 0.97, ridged(q * 3.2 + seed));
        emission = uGlowColor * crack * 1.6;
      }
    }

    albedo *= uBrightness;

    vec3 n = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndl = dot(n, uSun);
    // 터미네이터: 낮·밤 경계를 분명하게, 밤 쪽은 아주 약한 주변광만
    float day = smoothstep(-0.06, 0.28, ndl);
    vec3 lit = albedo * (0.025 + 1.05 * max(ndl, 0.0) * day + 0.05 * day);

    // 고리가 행성에 드리우는 그림자(태양 방향으로 고리 평면과 만나는 점의 밀도)
    if (uRingShadow > 0.0) {
      float facing = dot(uSun, uRingNormal);
      if (abs(facing) > 0.001) {
        float along = dot(uCenter - vWorldPos, uRingNormal) / facing;
        if (along > 0.0) {
          vec3 hit = vWorldPos + uSun * along;
          float x = (length(hit - uCenter) - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
          lit *= 1.0 - uRingShadow * ringDensity(x);
        }
      }
    }

    // 바다의 반사 하이라이트
    vec3 halfway = normalize(uSun + viewDir);
    lit += vec3(1.0, 0.95, 0.85) * shine * pow(max(dot(n, halfway), 0.0), 70.0) * 0.9 * day;
    // 구름층과 밤면의 도시 불빛
    lit = mix(lit, vec3(1.0) * (0.03 + 1.0 * max(ndl, 0.0) * day), clouds * 0.85);
    float city = step(0.86, hash3(floor(q * 90.0 + seed))) * landMask * (1.0 - clouds);
    emission += vec3(1.0, 0.72, 0.38) * city * (1.0 - day) * 0.9;
    // 균열의 빛은 밤 쪽에서 더 또렷하게
    emission *= mix(1.0, 0.55, day);

    // 은하 중심 쪽 역광 테두리와 선택 강조용 림 라이트
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float back = fresnel * smoothstep(-0.2, 0.6, dot(n, uCore));
    vec3 color = lit + emission + uRimColor * back * 0.45 + vec3(1.0, 0.97, 0.92) * pow(fresnel, 0.8) * uRim;
    gl_FragColor = vec4(color * uDim, 1.0);
  }
`;

// 대기 껍질: 낮 쪽이 밝고 터미네이터에서 붉게 물드는 프레넬 산란(가산)
export const atmosphereVertexShader = bodyVertexShader;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uStrength;
  uniform float uDim;
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.4);
    float ndl = dot(n, uSun);
    float lit = smoothstep(-0.35, 0.45, ndl);
    float dusk = smoothstep(-0.3, 0.05, ndl) * (1.0 - smoothstep(0.05, 0.4, ndl));
    vec3 color = mix(uColor, vec3(1.0, 0.45, 0.25), dusk * 0.6);
    gl_FragColor = vec4(color * fresnel * lit * uStrength * uDim, 1.0);
  }
`;

// 카메라를 향하는 원판(PlaneGeometry 2×2). uRing > 0이면 가는 고리(선택 표시) 모양
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
  uniform float uRing;
  uniform float uDim;
  varying vec2 vCoord;

  void main() {
    float d = length(vCoord);
    if (d > 1.0) discard;
    float glow = 1.0 - smoothstep(uInner, 1.0, d);
    glow *= glow;
    if (uRing > 0.0) {
      float band = (d - 0.78) / 0.035;
      glow = exp(-band * band) + 0.15 * exp(-d * d * 3.0);
    }
    gl_FragColor = vec4(uColor * glow * uStrength * uDim, 1.0);
  }
`;

// 장식 고리: 밀도 띠·틈, 태양 빛, 행성이 고리에 드리우는 그림자
export const ringVertexShader = /* glsl */ `
  varying float vRadius;
  varying vec3 vWorldPos;

  void main() {
    vRadius = length(position.xy);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const ringFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uOpacity;
  uniform vec3 uSun;
  uniform vec3 uCenter;
  uniform float uPlanetRadius;
  uniform float uDim;
  varying float vRadius;
  varying vec3 vWorldPos;
  ${ringDensityChunk}

  void main() {
    float x = (vRadius - uInnerRadius) / (uOuterRadius - uInnerRadius);
    float density = ringDensity(x);
    if (density < 0.01) discard;
    // 태양 쪽으로 쏜 선이 행성과 만나면 그림자
    vec3 offset = vWorldPos - uCenter;
    float b = dot(offset, uSun);
    float c = dot(offset, offset) - uPlanetRadius * uPlanetRadius;
    float shadowed = (b < 0.0 && b * b - c > 0.0) ? 1.0 : 0.0;
    float light = mix(1.0, 0.12, shadowed);
    gl_FragColor = vec4(uColor * light * uDim, uOpacity * density);
  }
`;

// 위성 궤도선: 점선, 앞 자리(고리 각도 0) 근처만 밝게
export const orbitVertexShader = /* glsl */ `
  attribute float aAngle;
  varying float vAngle;

  void main() {
    vAngle = aAngle;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const orbitFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDim;
  varying float vAngle;

  void main() {
    float wrapped = atan(sin(vAngle), cos(vAngle));
    float near = exp(-wrapped * wrapped * 3.0);
    float dash = step(0.45, fract(vAngle * 36.0 / 6.2831853));
    float alpha = uOpacity * (0.22 + 0.78 * near) * mix(0.25, 1.0, dash);
    gl_FragColor = vec4(uColor * uDim, alpha);
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
