import React, { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";

const Navbar = lazy(() => import("./components/Navbar"));
const Hero = lazy(() => import("./components/Hero"));
const About = lazy(() => import("./components/About"));
const Experience = lazy(() => import("./components/Experience"));
const Tech = lazy(() => import("./components/Tech"));
const Works = lazy(() => import("./components/Works"));
const Feedbacks = lazy(() => import("./components/Feedbacks"));
const Contact = lazy(() => import("./components/Contact"));
const StarsCanvas = lazy(() => import("./components/canvas/Stars"));
const Footer = lazy(() => import("./components/Footer"));

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-primary px-6 text-center text-white">
    Portfolio is loading...
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <div className="relative z-0 bg-primary">
          <div className="bg-hero-pattern relative bg-cover bg-center bg-no-repeat">
            <Navbar />
            <Hero />
          </div>
          <StarsCanvas />
          <main>
            <About />
            <Experience />
            <Tech />
            <Works />
            <Feedbacks />
            <div className="relative z-0">
              <Contact />
              <StarsCanvas />
            </div>
          </main>
          <Footer />
        </div>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
