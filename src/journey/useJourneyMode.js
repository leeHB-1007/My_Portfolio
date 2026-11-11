import { useSyncExternalStore } from "react";

// 항해 모드 조건. 콘텐츠를 측정하지 않고 이 미디어쿼리 하나로만 정한다.
export const JOURNEY_QUERY =
  "(min-height: 600px) and (prefers-reduced-motion: no-preference)";

export const subscribeJourneyMode = (cb) => {
  const query = window.matchMedia(JOURNEY_QUERY);
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
};

export const getJourneyMode = () => window.matchMedia(JOURNEY_QUERY).matches;

const useJourneyMode = () => useSyncExternalStore(subscribeJourneyMode, getJourneyMode);

export default useJourneyMode;
