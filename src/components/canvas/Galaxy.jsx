import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from "three";

import {
  createDustAttributes,
  createGalaxyAttributes,
} from "./galaxyGeometry";

const MAX_POINT_SIZE = 24;
const GALAXY_POINT_SIZE = 0.05;
const DUST_POINT_SIZE = 1.6;

const galaxyVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uMaxSize;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    float r = length(p.xz);
    // 안쪽이 더 빨리 도는 차등 회전. 팔이 빠르게 감기지 않도록 차이는 작게 둔다.
    float angle = atan(p.z, p.x) - uTime * (0.05 + 0.04 / (1.0 + r));
    p.x = cos(angle) * r;
    p.z = sin(angle) * r;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(uSize * aScale * uScale / max(-mvPosition.z, 0.001), uMaxSize);

    vColor = aColor;
    vTwinkle = 0.8 + 0.2 * sin(uTime * 1.7 + aPhase);
  }
`;

const dustVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMaxSize;
  attribute vec3 aColor;
  attribute float aScale;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(uSize * aScale * uPixelRatio, uMaxSize);

    vColor = aColor;
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.3 + aPhase);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uDim;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float strength = pow(1.0 - d * 2.0, 2.0);
    gl_FragColor = vec4(vColor * vTwinkle * uDim, strength);
  }
`;

const createGeometry = ({ count, positions, colors, scales, phases }) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new BufferAttribute(scales, 1));
  geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));
  geometry.setDrawRange(0, count);
  return geometry;
};

const createMaterial = (vertexShader, uniforms) =>
  new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

// uniforms: GalaxyCanvas가 만든 공유 객체({ uTime, uDim }). CameraRig가 uDim을 쓴다.
// baseCount만큼 버퍼를 만들고, 하향된 count는 drawRange로만 줄인다.
const Galaxy = ({ uniforms, baseCount, count }) => {
  const dpr = useThree((state) => state.viewport.dpr);
  const height = useThree((state) => state.size.height);

  const galaxyGeometry = useMemo(
    () => createGeometry(createGalaxyAttributes({ count: baseCount, seed: 1 })),
    [baseCount]
  );
  const dustGeometry = useMemo(() => createGeometry(createDustAttributes()), []);

  const galaxyMaterial = useMemo(
    () =>
      createMaterial(galaxyVertexShader, {
        uTime: uniforms.uTime,
        uDim: uniforms.uDim,
        uSize: { value: GALAXY_POINT_SIZE },
        uScale: { value: 1 },
        uMaxSize: { value: MAX_POINT_SIZE },
      }),
    [uniforms]
  );
  const dustMaterial = useMemo(
    () =>
      createMaterial(dustVertexShader, {
        uTime: uniforms.uTime,
        uDim: uniforms.uDim,
        uSize: { value: DUST_POINT_SIZE },
        uPixelRatio: { value: 1 },
        uMaxSize: { value: MAX_POINT_SIZE },
      }),
    [uniforms]
  );

  useEffect(() => {
    galaxyGeometry.setDrawRange(0, Math.min(count, baseCount));
  }, [galaxyGeometry, count]);

  useEffect(() => {
    // 원근 크기: 화면 높이(px) 절반을 기준으로 거리에 반비례(three PointsMaterial과 같은 방식).
    galaxyMaterial.uniforms.uScale.value = height * dpr * 0.5;
    galaxyMaterial.uniforms.uMaxSize.value = MAX_POINT_SIZE * dpr;
    dustMaterial.uniforms.uPixelRatio.value = dpr;
    dustMaterial.uniforms.uMaxSize.value = MAX_POINT_SIZE * dpr;
  }, [galaxyMaterial, dustMaterial, height, dpr]);

  useEffect(
    () => () => {
      galaxyGeometry.dispose();
      dustGeometry.dispose();
      galaxyMaterial.dispose();
      dustMaterial.dispose();
    },
    [galaxyGeometry, dustGeometry, galaxyMaterial, dustMaterial]
  );

  useFrame((state, delta) => {
    // R3F clock은 frameloop 전환 때 0으로 돌아가므로 자체 누적값을 쓴다.
    // demand(일시정지·모션 줄이기)에서는 자전·반짝임을 멈춘다.
    if (state.frameloop !== "always") return;
    uniforms.uTime.value += Math.min(delta, 0.1);
  });

  return (
    <>
      <points
        geometry={galaxyGeometry}
        material={galaxyMaterial}
        frustumCulled={false}
      />
      <points
        geometry={dustGeometry}
        material={dustMaterial}
        frustumCulled={false}
      />
    </>
  );
};

export default Galaxy;
