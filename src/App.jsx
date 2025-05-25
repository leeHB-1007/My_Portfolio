import React, { Suspense, lazy } from 'react'; // Suspense와 lazy import
import { BrowserRouter } from "react-router-dom";

// 기존 컴포넌트 import 방식 대신 lazy를 사용
// import { About, Contact, Experience, Feedbacks, Hero, Navbar, Tech, Works, StarsCanvas } from "./components";
// import Footer from "./components/Footer";

const Navbar = lazy(() => import('./components/Navbar')); // Navbar도 필요에 따라 lazy 가능
const Hero = lazy(() => import('./components/Hero'));
const About = lazy(() => import('./components/About'));
const Experience = lazy(() => import('./components/Experience'));
const Tech = lazy(() => import('./components/Tech'));
const Works = lazy(() => import('./components/Works'));
const Feedbacks = lazy(() => import('./components/Feedbacks'));
const Contact = lazy(() => import('./components/Contact'));
const StarsCanvas = lazy(() => import('./components/canvas/Stars'));
const Footer = lazy(() => import('./components/Footer'));
const WeatherWidget = lazy(() => import('./components/WeatherWidget')); 

// 로딩 중 표시할 간단한 fallback 컴포넌트
const LoadingFallback = () => <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>Loading...</div>;


const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}> {/* 전체를 Suspense로 감싸거나, 각 lazy 컴포넌트 그룹별로 감쌀 수 있음 */}
        <div className='relative z-0 bg-primary'>
            <WeatherWidget />
          <div className='bg-hero-pattern bg-cover bg-no-repeat bg-center relative'>
            <Navbar />
            <Hero />
          </div>
          <StarsCanvas /> {/* 첫 번째 StarsCanvas */}
          <About />
          <Experience />
          <Tech />
          <Works />
          <Feedbacks />
          <div className='relative z-0'>
            <Contact />
            <StarsCanvas /> {/* 두 번째 StarsCanvas */}
            <Footer/>
          </div>
        </div>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
