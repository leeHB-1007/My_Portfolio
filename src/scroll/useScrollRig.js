import { useEffect } from "react";

import { mountScrollRig } from "./scrollRig";

// trackRef: 인트로 트랙(높이 = 스크롤 거리), stageRef: 트랙 안의 sticky 스테이지.
const useScrollRig = (trackRef, stageRef) => {
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return undefined;

    return mountScrollRig({ track, stage });
  }, [trackRef, stageRef]);
};

export default useScrollRig;
