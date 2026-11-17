import { stepJourney } from "../../scroll/scrollRig";

const pad = (value) => String(value).padStart(2, "0");

const Arrow = ({ flip }) => (
  <svg viewBox="0 0 20 20" className="journey-step-icon" aria-hidden="true">
    <path
      d={flip ? "M12 5l-5 5 5 5M7 10h9" : "M8 5l5 5-5 5M13 10H4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 이전/다음 정지점(챕터 도착 + 위성)으로 넘기는 버튼 한 쌍과 전체 위치(현재 / 전체).
// 방향키(← →)도 같은 동작이며, 힌트는 마우스가 있는 기기에서만 보인다.
const JourneyStepper = ({ position, total }) => (
  <nav className="journey-stepper" aria-label="항해 이동">
    <button
      type="button"
      className="journey-step"
      aria-label="이전 항목"
      onClick={() => stepJourney(-1)}
    >
      <Arrow flip />
    </button>
    <p className="journey-step-count">
      <span className="journey-step-current">{pad(position + 1)}</span>
      <span className="journey-step-total"> / {pad(total)}</span>
    </p>
    <button
      type="button"
      className="journey-step"
      aria-label="다음 항목"
      onClick={() => stepJourney(1)}
    >
      <Arrow />
    </button>
    <p className="journey-step-hint" aria-hidden="true">
      <kbd>←</kbd>
      <kbd>→</kbd>
    </p>
  </nav>
);

export default JourneyStepper;
