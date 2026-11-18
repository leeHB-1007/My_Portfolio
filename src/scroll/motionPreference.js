// 배경 모션 일시정지 상태. eager 경로에서 쓰이므로 three 등을 import하지 않는다.
const STORAGE_KEY = "galaxy-motion-paused";
const listeners = new Set();

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

let paused = typeof window === "undefined" ? false : readStored();

export const getMotionPaused = () => paused;

export const setMotionPaused = (next) => {
  const value = Boolean(next);
  if (value === paused) return;
  paused = value;
  // 저장소 접근이 막혀 있으면 메모리 상태만 쓴다.
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // 무시
  }
  listeners.forEach((cb) => cb(paused));
};

export const subscribeMotionPaused = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
