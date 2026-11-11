import React, { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import MotionToggle from "./components/MotionToggle";
import CanvasErrorBoundary from "./components/CanvasErrorBoundary";
import StaticGalaxy from "./components/canvas/StaticGalaxy";

// barrel(canvas/index.js)을 거치면 three가 entry로 끌려오므로 직접 import한다.
const GalaxyCanvas = lazy(() => import("./components/canvas/GalaxyCanvas"));
const About = lazy(() => import("./components/About"));
const Experience = lazy(() => import("./components/Experience"));
const Tech = lazy(() => import("./components/Tech"));
const Works = lazy(() => import("./components/Works"));
const Feedbacks = lazy(() => import("./components/Feedbacks"));
const Contact = lazy(() => import("./components/Contact"));
const Footer = lazy(() => import("./components/Footer"));

const App = () => {
  return (
    <BrowserRouter>
      <div className="relative z-0 bg-primary">
        <div
          className="galaxy-layer pointer-events-none fixed inset-x-0 top-0 -z-10"
          aria-hidden="true"
        >
          <StaticGalaxy />
          <CanvasErrorBoundary fallback={null}>
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
            <About />
            <Experience />
            <Tech />
            <Works />
            <Feedbacks />
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
