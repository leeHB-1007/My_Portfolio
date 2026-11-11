import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { damp } from "maath/easing";
import { Vector3 } from "three";

import {
  computeTarget,
  galaxyDebug,
  rig,
  setInvalidate,
} from "../../scroll/scrollRig";
import { rotateByTime } from "../../journey/planets";
import { GALAXY_RADIUS } from "./galaxyGeometry";

const EPSILON = 1e-3;
const SMOOTH_TIME = 0.25;
const MAX_DELTA = 1 / 30;
const KEYS = [
  "radius",
  "azimuth",
  "elevation",
  "dim",
  "viewShiftX",
  "viewShiftY",
  "tx",
  "ty",
  "tz",
];
const PROBE_POINTS = 64;
const TAU = Math.PI * 2;

const pick = (target) =>
  KEYS.reduce((values, key) => {
    values[key] = target[key];
    return values;
  }, {});

const CameraRig = ({ uniforms }) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const current = useRef(null);

  useEffect(() => {
    setInvalidate(invalidate);
    // 등록 전에 바뀐 목표도 demand 모드에서 반영되게 한 번 그린다.
    invalidate();
    return () => setInvalidate(null);
  }, [invalidate]);

  useEffect(() => {
    const point = new Vector3();
    galaxyDebug.projectedWidth = () => {
      camera.updateMatrixWorld();
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < PROBE_POINTS; i += 1) {
        const angle = (i / PROBE_POINTS) * Math.PI * 2;
        point
          .set(Math.cos(angle) * GALAXY_RADIUS, 0, Math.sin(angle) * GALAXY_RADIUS)
          .project(camera);
        min = Math.min(min, point.x);
        max = Math.max(max, point.x);
      }
      return (max - min) / 2;
    };

    // 현재 행성의 화면 좌표(뷰포트 비율, 왼쪽 위 0,0)
    galaxyDebug.planetScreen = () => {
      const journey = rig.journey;
      if (!journey) return null;
      const planet = rotateByTime(journey.planets[journey.index], uniforms.uTime.value);
      camera.updateMatrixWorld();
      point.set(planet.x, planet.y, planet.z).project(camera);
      return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
    };

    return () => {
      galaxyDebug.projectedWidth = () => null;
      galaxyDebug.planetScreen = () => null;
    };
  }, [camera, uniforms]);

  useFrame((state, delta) => {
    galaxyDebug.frames += 1;

    if (!rig.target) return;
    rig.time = uniforms.uTime.value;
    // 항해 중에는 행성이 uTime에 따라 돌므로 현재 시각으로 목표를 다시 계산한다.
    const target = rig.journey ? computeTarget(rig.time) : rig.target;

    let moving = false;
    if (!current.current || rig.mode === "reduced") {
      current.current = pick(target);
    } else {
      // 목표 방위각이 2π 배수만큼 건너뛰면(앵커 이동, 별 방위각 정규화) 짧은 쪽으로 돈다.
      const turn = target.azimuth - current.current.azimuth;
      if (Math.abs(turn) > Math.PI) {
        current.current.azimuth += TAU * Math.round(turn / TAU);
      }
      const step = Math.min(delta, MAX_DELTA);
      KEYS.forEach((key) => {
        damp(current.current, key, target[key], SMOOTH_TIME, step);
        if (Math.abs(current.current[key] - target[key]) > EPSILON) {
          moving = true;
        }
      });
    }

    const pose = current.current;
    const flat = Math.cos(pose.elevation) * pose.radius;
    camera.position.set(
      pose.tx + Math.sin(pose.azimuth) * flat,
      pose.ty + Math.sin(pose.elevation) * pose.radius,
      pose.tz + Math.cos(pose.azimuth) * flat
    );
    camera.lookAt(pose.tx, pose.ty, pose.tz);

    const { width, height } = state.size;
    if (pose.viewShiftX !== 0 || pose.viewShiftY !== 0) {
      camera.setViewOffset(
        width,
        height,
        -pose.viewShiftX * width,
        -pose.viewShiftY * height,
        width,
        height
      );
    } else if (camera.view && camera.view.enabled) {
      camera.clearViewOffset();
    }

    uniforms.uDim.value = pose.dim;
    rig.current = pose;
    rig.settled = !moving;

    // demand 렌더에서도 목표에 닿을 때까지 스스로 다음 프레임을 요청한다.
    if (moving) state.invalidate();
  });

  return null;
};

export default CameraRig;
