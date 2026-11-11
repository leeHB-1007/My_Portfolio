import React, { Suspense, lazy, useEffect, useRef, useSyncExternalStore } from "react";
import { BrowserRouter } from "react-router-dom";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import MotionToggle from "./components/MotionToggle";
import CanvasErrorBoundary from "./components/CanvasErrorBoundary";
import StaticGalaxy from "./components/canvas/StaticGalaxy";
import { getJourneyMode, subscribeJourneyMode } from "./journey/useJourneyMode";
import {
  getCanvasUnavailable,
  setCanvasUnavailable,
  subscribeCanvasUnavailable,
} from "./scroll/canvasStatus";
import { restoreSection, withSectionMemory } from "./scroll/sectionMemory";

// barrel(canvas/index.js)을 거치면 three가 entry로 끌려오므로 직접 import한다.
const GalaxyCanvas = lazy(() => import("./components/canvas/GalaxyCanvas"));
const Journey = lazy(() => import("./components/journey/Journey"));
const About = lazy(() => import("./components/About"));
const Experience = lazy(() => import("./components/Experience"));
const Tech = lazy(() => import("./components/Tech"));
const Works = lazy(() => import("./components/Works"));
const Feedbacks = lazy(() => import("./components/Feedbacks"));
const Contact = lazy(() => import("./components/Contact"));
const Footer = lazy(() => import("./components/Footer"));

const handleCanvasError = () => setCanvasUnavailable(true);
const subscribeMode = withSectionMemory(subscribeJourneyMode);
const subscribeUnavailable = withSectionMemory(subscribeCanvasUnavailable);

const App = () => {
  // 높은 화면 + 모션 허용 + 3D 사용 가능이면 행성 항해, 아니면 기존 일반 섹션(드리프트 배경).
  const canvasUnavailable = useSyncExternalStore(
    subscribeUnavailable,
    getCanvasUnavailable
  );
  const journey = useSyncExternalStore(subscribeMode, getJourneyMode) && !canvasUnavailable;

  // 트리가 바뀌면(첫 렌더 제외) 바뀌기 직전에 읽던 섹션으로 이동한다.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    return restoreSection();
  }, [journey]);

  return (
    <BrowserRouter>
      <div className="relative z-0 bg-primary">
        <div
          className="galaxy-layer pointer-events-none fixed inset-x-0 top-0 -z-10"
          aria-hidden="true"
        >
          <StaticGalaxy />
          <CanvasErrorBoundary fallback={null} onError={handleCanvasError}>
            <Suspense fallback={null}>
              <GalaxyCanvas />
            </Suspense>
          </CanvasErrorBoundary>
          <div className="galaxy-veil" />
        </div>
        <div className="relative">
          <Navbar />
          <MotionToggle />
          <Hero />
        </div>
        <Suspense fallback={<div className="min-h-screen" />}>
          <main>
            {journey ? (
              <Journey />
            ) : (
              <>
                <About />
                <Experience />
                <Tech />
                <Works />
                <Feedbacks />
              </>
            )}
            <div className="relative z-0">
              <Contact />
            </div>
          </main>
          <Footer />
        </Suspense>
      </div>
    </BrowserRouter>
  );
};

export default App;
