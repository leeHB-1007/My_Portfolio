import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// 조정용 상수: 블룸(강도·반경·임계값), 톤매핑 노출, 마감(비네팅·그레인·색수차)
const BLOOM = { strength: 0.36, radius: 0.5, threshold: 0.82 };
const EXPOSURE = 0.95;
const FINISH = { vignette: 0.38, grain: 0.03, aberration: 0.0022 };
const NARROW_WIDTH = 768;

// 품질 티어: high(넓은 화면), low(좁은 화면 또는 성능 하향: 블룸 해상도 절반),
// minimal(좁은 화면에서 성능 하향: 블룸·색수차 끔). 톤매핑·비네팅은 모든 티어에서 같다.
const TIERS = {
  high: { bloom: true, bloomScale: 0.5, aberration: 1, grain: 1 },
  low: { bloom: true, bloomScale: 0.35, aberration: 1, grain: 1 },
  minimal: { bloom: false, bloomScale: 0.5, aberration: 0, grain: 0.6 },
};

export const pickPostTier = (width, degraded) => {
  const narrow = width < NARROW_WIDTH;
  if (degraded) return narrow ? "minimal" : "low";
  return narrow ? "low" : "high";
};

// OutputPass(톤매핑·sRGB) 뒤, 화면 공간에서 비네팅 + 약한 필름 그레인 + 가장자리 색수차를 한 번에 그린다.
// GLSL ES 예약어(active, filter, input, output, sample, common, partition, using 등)를 식별자로 쓰지 않는다.
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uVignette: { value: FINISH.vignette },
    uGrain: { value: FINISH.grain },
    uAberration: { value: FINISH.aberration },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float grainHash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 fromCenter = vUv - 0.5;
      vec2 shift = fromCenter * length(fromCenter) * 2.0 * uAberration;
      vec3 color = vec3(
        texture2D(tDiffuse, vUv + shift).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - shift).b
      );
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      float edge = length(fromCenter * aspect) / length(0.5 * aspect);
      color *= 1.0 - uVignette * smoothstep(0.35, 1.05, edge);
      float grain = grainHash(floor(vUv * uResolution) + fract(uTime * 0.37) * 113.0) - 0.5;
      color += grain * uGrain;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// 화면을 직접 그린다(useFrame 우선순위 1 → R3F의 자동 렌더는 꺼진다).
// demand 모드에서는 프레임이 요청될 때만 실행되므로 정지 중 렌더 0회 규칙이 유지된다.
const PostEffects = ({ uniforms, degraded }) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(
      new Vector2(256, 256),
      BLOOM.strength,
      BLOOM.radius,
      BLOOM.threshold
    );
    const output = new OutputPass();
    const finish = new ShaderPass(FinishShader);
    composer.addPass(render);
    composer.addPass(bloom);
    composer.addPass(output);
    composer.addPass(finish);
    return { composer, bloom, output, finish };
  }, [gl, scene, camera]);

  const tier = TIERS[pickPostTier(size.width, degraded)];

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = EXPOSURE;
  }, [gl]);

  useEffect(() => {
    const { composer, bloom, finish } = pipeline;
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    // 블룸 해상도는 티어에 따라 낮춘다(composer.setSize가 덮어쓰므로 그 뒤에 다시 맞춘다).
    bloom.setSize(
      Math.max(1, Math.round(size.width * dpr * tier.bloomScale)),
      Math.max(1, Math.round(size.height * dpr * tier.bloomScale))
    );
    bloom.enabled = tier.bloom;
    finish.uniforms.uResolution.value.set(size.width * dpr, size.height * dpr);
    finish.uniforms.uAberration.value = FINISH.aberration * tier.aberration;
    finish.uniforms.uGrain.value = FINISH.grain * tier.grain;
  }, [pipeline, size, dpr, tier]);

  useEffect(
    () => () => {
      pipeline.bloom.dispose();
      pipeline.output.dispose();
      pipeline.finish.dispose();
      pipeline.composer.dispose();
    },
    [pipeline]
  );

  // 행성·위성 셰이더를 미리 컴파일해, 챕터에 처음 도착할 때 프레임이 멈칫하지 않게 한다.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => gl.compile(scene, camera));
    return () => window.cancelAnimationFrame(id);
  }, [gl, scene, camera]);

  useFrame((_, delta) => {
    // 그레인은 은하 시간(uTime)을 따르므로 일시정지 중에는 고정된다.
    pipeline.finish.uniforms.uTime.value = uniforms.uTime.value;
    pipeline.composer.render(delta);
  }, 1);

  return null;
};

export default PostEffects;
