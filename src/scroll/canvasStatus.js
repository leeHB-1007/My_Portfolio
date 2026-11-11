// 은하 canvas가 쓸 수 없는 상태(에러 경계로 실패, WebGL 컨텍스트 손실)인지.
// 항해는 3D 위성이 있어야 하므로 이 값이 참이면 App이 일반 섹션으로 내려간다.
const listeners = new Set();
let unavailable = false;

export const getCanvasUnavailable = () => unavailable;

export const setCanvasUnavailable = (next) => {
  const value = Boolean(next);
  if (value === unavailable) return;
  unavailable = value;
  listeners.forEach((cb) => cb(unavailable));
};

export const subscribeCanvasUnavailable = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
