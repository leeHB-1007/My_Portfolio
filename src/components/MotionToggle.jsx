import { useSyncExternalStore } from "react";

import {
  getMotionPaused,
  setMotionPaused,
  subscribeMotionPaused,
} from "../scroll/motionPreference";

// 은하의 자동 재생(자전·반짝임)만 멈춘다. 스크롤에 따른 카메라 이동은 유지된다.
const MotionToggle = () => {
  const paused = useSyncExternalStore(subscribeMotionPaused, getMotionPaused);

  return (
    <button
      type="button"
      className="motion-toggle fixed bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-primary/80 text-white hover:border-[#915EFF]"
      aria-label="배경 모션 일시정지"
      aria-pressed={paused}
      title="배경 모션 일시정지"
      onClick={() => setMotionPaused(!paused)}
    >
      {paused ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path d="M6 4l10 6-10 6V4z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
};

export default MotionToggle;
