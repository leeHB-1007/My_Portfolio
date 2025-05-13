
import React, { Suspense, useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Preload, useGLTF } from "@react-three/drei";
import CanvasLoader from "../Loader";

const Computers = () => {
  const computer = useGLTF("/desktop_pc/scene.gltf");
  const rotatingRef = useRef();

  // 메시만 회전
  useFrame((_, delta) => {
    if (rotatingRef.current) {
      rotatingRef.current.rotation.y += delta * 0.3; // 속도는 delta 곱으로 조절
    }
  });

  return (
    <>
      {/* 조명은 한 번만 세팅 */}
      <hemisphereLight intensity={0.15} groundColor="black" />
      <spotLight
        position={[-20, 50, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize-width={512}    // 해상도 반감
        shadow-mapSize-height={512}
      />
      <pointLight intensity={1} />

      {/* 이 그룹만 회전시킴 */}
      <group ref={rotatingRef} dispose={null}>
        <primitive
          object={computer.scene}
          scale={0.75}
          position={[0, -3.25, -1.5]}
          rotation={[-0.01, -0.2, -0.1]}
        />
      </group>
    </>
  );
};

const ComputersCanvas = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 500);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) return null;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}               // 픽셀 비율 제한
      camera={{ position: [20, 3, 5], fov: 25 }}
      gl={{ preserveDrawingBuffer: false }}
      frameloop="always"           // 연속 렌더링
    >
      <Suspense fallback={<CanvasLoader />}>
        <OrbitControls
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Computers />
      </Suspense>
      <Preload all />
    </Canvas>
  );
};

export default ComputersCanvas;
