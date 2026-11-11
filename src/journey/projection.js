// 카메라 pose로 월드 점의 화면 좌표(뷰포트 비율, 왼쪽 위 0,0)를 구하는 순수 계산.
// three의 PerspectiveCamera + lookAt + setViewOffset(CameraRig)과 같은 결과를 낸다.
// 좁은 화면 배치(앞 위성과 패널이 겹치지 않는지)를 단위 테스트로 검증하는 데 쓴다.
import { ringAngle, satellitePosition } from "./planets";

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const normalize = (a) => {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / length, y: a.y / length, z: a.z / length };
};

export const cameraPosition = (pose) => {
  const flat = Math.cos(pose.elevation) * pose.radius;
  return {
    x: pose.tx + Math.sin(pose.azimuth) * flat,
    y: pose.ty + Math.sin(pose.elevation) * pose.radius,
    z: pose.tz + Math.cos(pose.azimuth) * flat,
  };
};

// fov: 세로 시야각(rad), aspect: 폭/높이. 반환 { x, y, depth }(x·y는 뷰포트 비율)
export const projectPoint = (point, pose, { fov, aspect }) => {
  const eye = cameraPosition(pose);
  const forward = normalize(sub({ x: pose.tx, y: pose.ty, z: pose.tz }, eye));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const v = sub(point, eye);
  const depth = dot(v, forward);
  const tan = Math.tan(fov / 2);
  const ndcX = dot(v, right) / (depth * tan * aspect);
  const ndcY = dot(v, up) / (depth * tan);
  return {
    x: 0.5 + ndcX / 2 + pose.viewShiftX,
    y: 0.5 - ndcY / 2 + pose.viewShiftY,
    depth,
  };
};

// 고리의 앞 자리에 온 위성 j의 월드 좌표(시간 0, 행성 공전 회전 없음).
// yaw: 고리의 앞 자리 방향(journeyPose의 ringYaw)
export const frontSatelliteWorld = (planet, count, j, yaw) => {
  const offset = satellitePosition(count, j, ringAngle(count, j));
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: planet.x + offset.x * c + offset.z * s,
    y: planet.y + offset.y,
    z: planet.z - offset.x * s + offset.z * c,
  };
};
