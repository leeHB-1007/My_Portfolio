import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
} from "three";

import {
  createBlobAttributes,
  createDustAttributes,
  createGalaxyAttributes,
  createNebulaAttributes,
} from "./galaxyGeometry";
import { ROTATION_GLSL } from "../../journey/planets";

// 조정용 상수: 별 크기·밝기, 성운·먼지 알파, 중심광
const MAX_POINT_SIZE = 14;
const GALAXY_POINT_SIZE = 0.055;
const BACKGROUND_POINT_SIZE = 2.2;
const BLOB_POINT_SIZE = 420;
const NEBULA_POINT_SIZE = 1.25;
const NEBULA_MAX_SIZE = 340;
const NEBULA_ALPHA = 0.028;
const DUST_LANE_ALPHA = 0.32;
const BLOB_ALPHA = 0.004;
const CORE_SIZE = 1.7;
const CORE_COLOR = "#ffc98f";
const CORE_STRENGTH = 0.32;

// GLSL ES 예약어(active, filter, input, output, sample, common, partition, using 등)를 식별자로 쓰지 않는다.

// 은하 별: 가우시안 원형, 가까운 별은 크고 흐린 보케, 먼 별은 약간 어둡게, 큰 별은 회절 스파이크
const starVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uMaxSize;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpike;
  varying vec3 vColor;
  varying float vGain;
  varying float vSharp;
  varying float vSpike;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    // 안쪽이 더 빨리 도는 차등 회전. 항해 행성(PlanetSystem)과 카메라 목표 계산(rotateByTime)도 같은 식을 쓴다.
    float angle = ${ROTATION_GLSL};
    p.x = cos(angle) * r;
    p.z = sin(angle) * r;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = max(-mvPosition.z, 0.001);
    // 카메라가 원반 안으로 들어가므로 아주 가까운 입자는 화면을 덮지 않게 사라진다.
    float nearFade = smoothstep(0.08, 0.35, dist);
    float bokeh = 1.0 - smoothstep(0.35, 1.2, dist);
    float farDim = mix(1.0, 0.72, smoothstep(8.0, 26.0, dist));
    float size = uSize * aScale * uScale / dist * (1.0 + 0.45 * bokeh) * (1.0 + 1.4 * aSpike);
    gl_PointSize = min(size, uMaxSize * (1.0 + aSpike));

    vColor = aColor * (1.0 + 1.6 * aSpike);
    float twinkle = 0.85 + 0.15 * sin(uTime * 1.7 + aPhase);
    vGain = 0.56 * twinkle * nearFade * farDim * (1.0 - 0.6 * bokeh);
    vSharp = mix(9.0, 3.5, bokeh);
    vSpike = aSpike;
  }
`;

const starFragmentShader = /* glsl */ `
  uniform float uDim;
  varying vec3 vColor;
  varying float vGain;
  varying float vSharp;
  varying float vSpike;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d2 = dot(c, c) * 4.0;
    float glow = exp(-d2 * vSharp);
    if (vSpike > 0.5) {
      vec2 a = abs(c) * 2.0;
      glow += (exp(-a.x * 38.0) * (1.0 - a.y) + exp(-a.y * 38.0) * (1.0 - a.x)) * 0.55;
    }
    if (glow < 0.004) discard;
    gl_FragColor = vec4(vColor * glow * vGain * uDim, 1.0);
  }
`;

// 나선팔 구름: 발광 성운(가산)과 먼지(어두운 띠, 일반 혼합). 카메라 가까이에서는 사라진다.
const nebulaVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uMaxSize;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vGain;
  varying float vSeed;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    float angle = ${ROTATION_GLSL};
    p.x = cos(angle) * r;
    p.z = sin(angle) * r;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = max(-mvPosition.z, 0.001);
    gl_PointSize = min(uSize * aScale * uScale / dist, uMaxSize);
    vColor = aColor;
    vGain = smoothstep(0.6, 1.8, dist);
    vSeed = aPhase;
  }
`;

const cloudShape = /* glsl */ `
  float cloudHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float cloudNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), f.x),
      mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float cloudDensity(vec2 coord, float seed) {
    vec2 c = coord - vec2(0.5);
    float falloff = exp(-dot(c, c) * 9.0);
    vec2 q = coord * 3.0 + vec2(seed, seed * 1.7);
    float n = 0.6 * cloudNoise(q) + 0.4 * cloudNoise(q * 2.3 + 4.1);
    return falloff * smoothstep(0.25, 0.85, n);
  }
`;

const nebulaFragmentShader = /* glsl */ `
  uniform float uDim;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vGain;
  varying float vSeed;
  ${cloudShape}

  void main() {
    float density = cloudDensity(gl_PointCoord, vSeed);
    if (density < 0.01) discard;
    gl_FragColor = vec4(vColor * density * uAlpha * vGain * uDim, 1.0);
  }
`;

const dustLaneFragmentShader = /* glsl */ `
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vGain;
  varying float vSeed;
  ${cloudShape}

  void main() {
    float density = cloudDensity(gl_PointCoord, vSeed);
    if (density < 0.01) discard;
    gl_FragColor = vec4(vColor, density * uAlpha * vGain);
  }
`;

// 먼 배경: 화면 크기 기준의 작은 별과 은은한 색 얼룩
const backgroundVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMaxSize;
  uniform float uTwinkle;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vGain;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(uSize * aScale * uPixelRatio, uMaxSize);
    vColor = aColor;
    vGain = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * 1.3 + aPhase));
  }
`;

const backgroundFragmentShader = /* glsl */ `
  uniform float uDim;
  uniform float uSharp;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vGain;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float glow = exp(-dot(c, c) * 4.0 * uSharp);
    if (glow < 0.004) discard;
    gl_FragColor = vec4(vColor * glow * vGain * uAlpha * uDim, 1.0);
  }
`;

// 은하 중심의 따뜻한 빛 그라디언트(카메라를 향하는 원판)
const coreVertexShader = /* glsl */ `
  uniform float uSize;
  varying vec2 vCoord;

  void main() {
    vCoord = position.xy;
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPosition.xy += position.xy * uSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coreFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uDim;
  varying vec2 vCoord;

  void main() {
    float d = length(vCoord);
    if (d > 1.0) discard;
    float wide = exp(-d * d * 5.0) * (1.0 - d);
    float hot = exp(-d * d * 60.0);
    vec3 color = uColor * wide + vec3(1.0, 0.92, 0.82) * hot * 1.6;
    gl_FragColor = vec4(color * uStrength * uDim, 1.0);
  }
`;

const createGeometry = ({ count, positions, colors, scales, phases, spikes }) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new BufferAttribute(scales, 1));
  geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));
  if (spikes) geometry.setAttribute("aSpike", new BufferAttribute(spikes, 1));
  geometry.setDrawRange(0, count);
  return geometry;
};

// 성운(발광)과 먼지(어두운 띠)를 kinds로 나눠 두 지오메트리로 만든다.
const splitNebula = (nebula) => {
  const pick = (kind) => {
    const indices = [];
    nebula.kinds.forEach((value, i) => {
      if (value === kind) indices.push(i);
    });
    const take = (array, size) => {
      const out = new Float32Array(indices.length * size);
      indices.forEach((source, i) => {
        for (let k = 0; k < size; k += 1) out[i * size + k] = array[source * size + k];
      });
      return out;
    };
    return createGeometry({
      count: indices.length,
      positions: take(nebula.positions, 3),
      colors: take(nebula.colors, 3),
      scales: take(nebula.scales, 1),
      phases: take(nebula.phases, 1),
    });
  };
  return { emission: pick(0), dust: pick(1) };
};

const shader = (vertexShader, fragmentShader, uniforms, blending = AdditiveBlending) =>
  new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending,
  });

// uniforms: GalaxyCanvas가 만든 공유 객체({ uTime, uDim }). CameraRig가 uDim을 쓴다.
// baseCount만큼 버퍼를 만들고, 하향된 count는 drawRange로만 줄인다.
const Galaxy = ({ uniforms, baseCount, count }) => {
  const dpr = useThree((state) => state.viewport.dpr);
  const height = useThree((state) => state.size.height);

  const geometries = useMemo(() => {
    const nebula = splitNebula(createNebulaAttributes());
    return {
      stars: createGeometry(createGalaxyAttributes({ count: baseCount, seed: 1 })),
      background: createGeometry(createDustAttributes()),
      blobs: createGeometry(createBlobAttributes()),
      nebula: nebula.emission,
      dust: nebula.dust,
      core: new PlaneGeometry(2, 2),
    };
  }, [baseCount]);

  const materials = useMemo(() => {
    const shared = { uTime: uniforms.uTime, uDim: uniforms.uDim };
    return {
      stars: shader(starVertexShader, starFragmentShader, {
        ...shared,
        uSize: { value: GALAXY_POINT_SIZE },
        uScale: { value: 1 },
        uMaxSize: { value: MAX_POINT_SIZE },
      }),
      nebula: shader(nebulaVertexShader, nebulaFragmentShader, {
        ...shared,
        uSize: { value: NEBULA_POINT_SIZE },
        uScale: { value: 1 },
        uMaxSize: { value: NEBULA_MAX_SIZE },
        uAlpha: { value: NEBULA_ALPHA },
      }),
      dust: shader(
        nebulaVertexShader,
        dustLaneFragmentShader,
        {
          uTime: uniforms.uTime,
          uSize: { value: NEBULA_POINT_SIZE },
          uScale: { value: 1 },
          uMaxSize: { value: NEBULA_MAX_SIZE },
          uAlpha: { value: DUST_LANE_ALPHA },
        },
        NormalBlending
      ),
      background: shader(backgroundVertexShader, backgroundFragmentShader, {
        ...shared,
        uSize: { value: BACKGROUND_POINT_SIZE },
        uPixelRatio: { value: 1 },
        uMaxSize: { value: MAX_POINT_SIZE },
        uTwinkle: { value: 0.45 },
        uSharp: { value: 8 },
        uAlpha: { value: 1 },
      }),
      blobs: shader(backgroundVertexShader, backgroundFragmentShader, {
        ...shared,
        uSize: { value: BLOB_POINT_SIZE },
        uPixelRatio: { value: 1 },
        uMaxSize: { value: 4096 },
        uTwinkle: { value: 0 },
        uSharp: { value: 1.2 },
        uAlpha: { value: BLOB_ALPHA },
      }),
      core: shader(coreVertexShader, coreFragmentShader, {
        uDim: uniforms.uDim,
        uSize: { value: CORE_SIZE },
        uColor: { value: new Color(CORE_COLOR) },
        uStrength: { value: CORE_STRENGTH },
      }),
    };
  }, [uniforms]);

  useEffect(() => {
    geometries.stars.setDrawRange(0, Math.min(count, baseCount));
  }, [geometries, count, baseCount]);

  useEffect(() => {
    // 원근 크기: 화면 높이(px) 절반을 기준으로 거리에 반비례(three PointsMaterial과 같은 방식).
    const scale = height * dpr * 0.5;
    materials.stars.uniforms.uScale.value = scale;
    materials.stars.uniforms.uMaxSize.value = MAX_POINT_SIZE * dpr;
    materials.nebula.uniforms.uScale.value = scale;
    materials.nebula.uniforms.uMaxSize.value = NEBULA_MAX_SIZE * dpr;
    materials.dust.uniforms.uScale.value = scale;
    materials.dust.uniforms.uMaxSize.value = NEBULA_MAX_SIZE * dpr;
    materials.background.uniforms.uPixelRatio.value = dpr;
    materials.background.uniforms.uMaxSize.value = MAX_POINT_SIZE * dpr;
    materials.blobs.uniforms.uPixelRatio.value = dpr;
  }, [materials, height, dpr]);

  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
    [geometries, materials]
  );

  useFrame((state, delta) => {
    // R3F clock은 frameloop 전환 때 0으로 돌아가므로 자체 누적값을 쓴다.
    // demand(일시정지·모션 줄이기)에서는 자전·반짝임을 멈춘다.
    if (state.frameloop !== "always") return;
    uniforms.uTime.value += Math.min(delta, 0.1);
  });

  // 그리는 순서: 배경 → 색 얼룩 → 성운 → 먼지(어두운 띠) → 별 → 중심광
  return (
    <>
      <points geometry={geometries.background} material={materials.background} frustumCulled={false} renderOrder={-4} />
      <points geometry={geometries.blobs} material={materials.blobs} frustumCulled={false} renderOrder={-3} />
      <points geometry={geometries.nebula} material={materials.nebula} frustumCulled={false} renderOrder={-2} />
      <points geometry={geometries.dust} material={materials.dust} frustumCulled={false} renderOrder={-1} />
      <points geometry={geometries.stars} material={materials.stars} frustumCulled={false} />
      <mesh geometry={geometries.core} material={materials.core} frustumCulled={false} renderOrder={1} />
    </>
  );
};

export default Galaxy;
