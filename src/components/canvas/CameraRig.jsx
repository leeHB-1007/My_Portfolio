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
// 카메라 목표는 이미 지연 보간된 스크롤(smoothY)로 계산되므로 damp는 짧게 둔다(이중 지연 방지).
const SMOOTH_TIME = 0.05;
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
  "fov",
  "bank",
];
const DEG = Math.PI / 180;
// always 모드의 유휴 흔들림(방위·고도, rad)과 주기(초). 시간으로만 움직이므로 정지 중에는 고정된다.
const IDLE_SWAY = { azimuth: 0.5 * DEG, elevation: 0.35 * DEG, roll: 0.25 * DEG };
const IDLE_PERIOD = { azimuth: 47, elevation: 37, roll: 59 };
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
    // 유휴 흔들림은 pose(목표·수렴 판정)에 넣지 않고 카메라에만 더한다.
    const time = rig.time;
    const sway = (key) =>
      state.frameloop === "always" && rig.mode !== "reduced"
        ? IDLE_SWAY[key] * Math.sin((time / IDLE_PERIOD[key]) * TAU)
        : 0;
    const azimuth = pose.azimuth + sway("azimuth");
    const elevation = pose.elevation + sway("elevation");
    const flat = Math.cos(elevation) * pose.radius;
    camera.position.set(
      pose.tx + Math.sin(azimuth) * flat,
      pose.ty + Math.sin(elevation) * pose.radius,
      pose.tz + Math.cos(azimuth) * flat
    );
    camera.lookAt(pose.tx, pose.ty, pose.tz);
    // 이동 중 기울임(뱅크): 시선 축 기준 회전
    camera.rotateZ(pose.bank + sway("roll"));
    if (Math.abs(camera.fov - pose.fov) > 1e-4) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }

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
