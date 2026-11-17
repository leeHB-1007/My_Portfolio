import { useEffect, useState } from "react";

const SEEN_KEY = "journey-guide-seen";

// 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서는 매번 처음처럼 동작한다.
const readSeen = () => {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch (error) {
    return false;
  }
};

const writeSeen = () => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch (error) {
    void error;
  }
};

// 첫 챕터에 도착했을 때 한 번만 넘기는 방법을 알려 준다. 정지점이 바뀌면(스크롤·방향키·버튼) 사라지고
// 세션 동안 다시 뜨지 않는다. state: waiting(아직 도착 전) → shown → done
const JourneyGuide = ({ view }) => {
  const [state, setState] = useState(() => (readSeen() ? "done" : "waiting"));
  const atFirstArrival = view.index === 0 && view.phase === "arrive";

  useEffect(() => {
    if (state === "waiting" && atFirstArrival) {
      setState("shown");
    } else if (state === "shown" && !atFirstArrival) {
      setState("done");
      writeSeen();
    }
  }, [state, atFirstArrival]);

  const shown = state === "shown";

  return (
    <div
      className="journey-guide"
      data-show={shown ? "" : undefined}
      role="status"
      aria-hidden={shown ? undefined : true}
    >
      {state !== "waiting" && (
        <>
          <span className="sr-only">
            스크롤하거나 방향키(← →), 아래 넘기기 버튼으로 다음 위성으로 넘어갈 수 있습니다.
          </span>
          <span className="journey-guide-row" aria-hidden="true">
            <span className="journey-guide-item">
              <svg viewBox="0 0 16 20" className="journey-guide-mouse">
                <rect x="1.5" y="1.5" width="13" height="17" rx="6.5" />
                <line x1="8" y1="5" x2="8" y2="8" />
              </svg>
              스크롤
            </span>
            <span className="journey-guide-item journey-guide-keys">
              <kbd>←</kbd>
              <kbd>→</kbd>
              방향키
            </span>
            <span className="journey-guide-item">
              <span className="journey-guide-button">
                <svg viewBox="0 0 16 16">
                  <path d="M6 3.5L10.5 8 6 12.5" />
                </svg>
              </span>
              버튼
            </span>
          </span>
        </>
      )}
    </div>
  );
};

export default JourneyGuide;
