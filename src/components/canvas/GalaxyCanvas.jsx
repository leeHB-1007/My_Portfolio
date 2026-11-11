import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";

import CameraRig from "./CameraRig";
import Galaxy from "./Galaxy";
import { GALAXY_MAX_COUNT } from "./galaxyGeometry";
import {
  getMotionPaused,
  subscribeMotionPaused,
} from "../../scroll/motionPreference";

const CLEAR_COLOR = "#050816";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const DECLINE_RATIO = 0.6;
const DECLINE_FLOOR = 8000;
// 셰이더 컴파일·lazy 섹션 초기화와 겹친 첫 프레임들로 하향 판정하지 않게 늦게 붙인다.
const MONITOR_DELAY_MS = 2000;
const CAMERA = { fov: 60, near: 0.1, far: 300, position: [0, 0, 13] };
const GL = { alpha: false, antialias: false, powerPreference: "high-performance" };

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

const GalaxyCanvas = () => {
  const [baseCount] = useState(pickParticleCount);
  const [degraded, setDegraded] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [monitorReady, setMonitorReady] = useState(false);
  const paused = useSyncExternalStore(subscribeMotionPaused, getMotionPaused);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced);
  const invalidateRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const wasLost = useRef(false);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDim: { value: 1 } }),
    []
  );

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
    const onLost = (event) => {
      event.preventDefault();
      canvas.style.visibility = "hidden";
      setContextLost(true);
    };
    const onRestored = () => {
      canvas.style.visibility = "";
      setContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [canvas]);

  const handleCreated = ({ gl, invalidate }) => {
    gl.setClearColor(CLEAR_COLOR, 1);
    invalidateRef.current = invalidate;
    setCanvas(gl.domElement);
  };

  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={CAMERA}
      frameloop={frameloop}
      dpr={degraded ? 1 : [1, 1.5]}
      gl={GL}
      onCreated={handleCreated}
    >
      {monitorReady && frameloop === "always" && !degraded && (
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
      )}
      <Galaxy uniforms={uniforms} baseCount={baseCount} count={count} />
      <CameraRig uniforms={uniforms} />
    </Canvas>
  );
};

export default GalaxyCanvas;
