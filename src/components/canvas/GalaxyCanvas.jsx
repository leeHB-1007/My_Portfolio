import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";

import CameraRig from "./CameraRig";
import Galaxy from "./Galaxy";
import PlanetSystem from "./PlanetSystem";
import PostEffects from "./PostEffects";
import { GALAXY_MAX_COUNT } from "./galaxyGeometry";
import {
  getMotionPaused,
  subscribeMotionPaused,
} from "../../scroll/motionPreference";
import useJourneyMode from "../../journey/useJourneyMode";
import { setCanvasUnavailable } from "../../scroll/canvasStatus";

const CLEAR_COLOR = "#01030a";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const DECLINE_RATIO = 0.6;
const DECLINE_FLOOR = 8000;
// 셰이더 컴파일·lazy 섹션 초기화와 겹친 첫 프레임들로 하향 판정하지 않게 늦게 붙인다.
const MONITOR_DELAY_MS = 2000;
// WebGL 컨텍스트 손실이 이 시간 안에 복구되지 않으면 항해를 일반 섹션으로 내린다.
const CONTEXT_FALLBACK_MS = 2000;
// 항해 중 카메라가 작은 행성(반지름 0.085)에 0.82까지 다가가므로 near를 낮춘다.
const CAMERA = { fov: 60, near: 0.02, far: 300, position: [0, 0, 13] };
const GL = { alpha: false, antialias: false, powerPreference: "high-performance" };
// 첫 프레임을 그린 뒤 canvas를 서서히 드러낸다(아래 StaticGalaxy에서 자연스럽게 넘어가게).
const FADE_IN = "opacity 0.8s ease";

// 첫 렌더(후처리 패스 이후, 우선순위 2) 다음 rAF에서 투명도를 올린다. visibility(컨텍스트 손실)와는 별개다.
const FirstFrameReveal = () => {
  const gl = useThree((state) => state.gl);
  const shown = useRef(false);
  useFrame(() => {
    if (shown.current) return;
    shown.current = true;
    window.requestAnimationFrame(() => {
      gl.domElement.style.opacity = "1";
    });
  }, 2);
  return null;
};

// 마운트 시 1회만 정한다. 리사이즈로 버퍼를 다시 만들지 않는다.
const pickParticleCount = () => {
  const width = window.innerWidth;
  if (width >= 1024) return GALAXY_MAX_COUNT;
  if (width > 640) return 25000;
  return 12000;
};

const subscribeReduced = (cb) => {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
};
const getReduced = () => window.matchMedia(REDUCED_QUERY).matches;

// 후처리(블룸 등)는 픽셀 수에 비례해 비싸다. 큰 고해상도 화면에서는 렌더 픽셀 수에 상한을 둔다.
const PIXEL_BUDGET = 3_600_000;
const MAX_DPR = 1.5;
const pickMaxDpr = () => {
  const area = Math.max(1, window.innerWidth * window.innerHeight);
  return Math.min(MAX_DPR, Math.max(1, Math.sqrt(PIXEL_BUDGET / area)));
};

const GalaxyCanvas = () => {
  const [baseCount] = useState(pickParticleCount);
  const [degraded, setDegraded] = useState(false);
  const [maxDpr, setMaxDpr] = useState(pickMaxDpr);
  const [contextLost, setContextLost] = useState(false);
  const [monitorReady, setMonitorReady] = useState(false);
  const paused = useSyncExternalStore(subscribeMotionPaused, getMotionPaused);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced);
  const journeyOn = useJourneyMode();
  const invalidateRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const wasLost = useRef(false);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDim: { value: 1 } }),
    []
  );

  useEffect(() => {
    const onResize = () => setMaxDpr(pickMaxDpr());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const frameloop = contextLost
    ? "never"
    : paused || reduced
      ? "demand"
      : "always";
  const count = degraded
    ? Math.min(baseCount, Math.max(DECLINE_FLOOR, Math.round(baseCount * DECLINE_RATIO)))
    : baseCount;

  // frameloop이 never에서 돌아온 뒤에 invalidate해야 demand에서도 다시 그린다.
  useEffect(() => {
    if (contextLost) {
      wasLost.current = true;
    } else if (wasLost.current) {
      wasLost.current = false;
      if (invalidateRef.current) invalidateRef.current();
    }
  }, [contextLost]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMonitorReady(true), MONITOR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // 손실 중에도 Canvas는 유지하고 canvas만 숨겨 아래의 StaticGalaxy가 보이게 한다.
  useEffect(() => {
    if (!canvas) return undefined;
    let fallbackTimer = 0;
    const onLost = (event) => {
      event.preventDefault();
      canvas.style.visibility = "hidden";
      setContextLost(true);
      // 항해는 3D 위성이 필요하다. 손실은 일시적일 수 있으므로 잠시 기다렸다가
      // 그때도 복구되지 않았을 때만 App이 일반 섹션으로 내려가게 한다.
      window.clearTimeout(fallbackTimer);
      fallbackTimer = window.setTimeout(
        () => setCanvasUnavailable(true),
        CONTEXT_FALLBACK_MS
      );
    };
    const onRestored = () => {
      window.clearTimeout(fallbackTimer);
      canvas.style.visibility = "";
      setContextLost(false);
      setCanvasUnavailable(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      window.clearTimeout(fallbackTimer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [canvas]);

  const handleCreated = ({ gl, invalidate }) => {
    gl.setClearColor(CLEAR_COLOR, 1);
    gl.domElement.style.opacity = "0";
    // 모션 줄이기에서는 바로 보인다.
    gl.domElement.style.transition = reduced ? "none" : FADE_IN;
    invalidateRef.current = invalidate;
    setCanvas(gl.domElement);
  };

  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={CAMERA}
      frameloop={frameloop}
      dpr={degraded ? 1 : [1, maxDpr]}
      gl={GL}
      onCreated={handleCreated}
    >
      {monitorReady && frameloop === "always" && !degraded && (
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
      )}
      <Galaxy uniforms={uniforms} baseCount={baseCount} count={count} />
      {journeyOn && <PlanetSystem uniforms={uniforms} />}
      <CameraRig uniforms={uniforms} />
      <PostEffects uniforms={uniforms} degraded={degraded} />
      <FirstFrameReveal />
    </Canvas>
  );
};

export default GalaxyCanvas;
