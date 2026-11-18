import { rig } from "./scrollRig";

// 항해 ↔ 일반 섹션으로 main 트리가 바뀔 때 읽던 섹션을 잃지 않게 한다.
// 바뀌기 직전(구독 콜백 안, React가 다시 그리기 전)에 섹션 id를 기억했다가 새 트리가 붙은 뒤 그 앵커로 이동한다.
const SECTION_IDS = ["about", "experience", "skills", "projects", "strengths"];
// 화면 위에서 이 비율 지점을 지난 마지막 섹션을 현재 섹션으로 본다.
const READ_LINE = 0.4;
const RESTORE_TIMEOUT_MS = 3000;

let pending = null;

// Hero 구간이나 Contact 이후면 null(위치를 건드리지 않는다).
const currentSectionId = () => {
  const journey = rig.journey;
  if (journey && journey.measured) {
    if (!journey.active) return null;
    const segment = journey.layout.segments[journey.index];
    return segment ? segment.section : null;
  }
  const line = window.innerHeight * READ_LINE;
  const contact = document.getElementById("contact");
  if (contact && contact.getBoundingClientRect().top <= line) return null;
  let found = null;
  SECTION_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (element && element.getBoundingClientRect().top <= line) found = id;
  });
  return found;
};

export const withSectionMemory = (subscribe) => (callback) =>
  subscribe((...args) => {
    pending = currentSectionId();
    callback(...args);
  });

// 새 트리의 섹션은 lazy로 붙으므로 앵커가 생길 때까지 잠시 기다린다.
export const restoreSection = () => {
  const id = pending;
  pending = null;
  if (!id) return () => {};
  const deadline = performance.now() + RESTORE_TIMEOUT_MS;
  let frame = 0;
  const attempt = () => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "instant" });
      return;
    }
    if (performance.now() < deadline) frame = window.requestAnimationFrame(attempt);
  };
  frame = window.requestAnimationFrame(attempt);
  return () => window.cancelAnimationFrame(frame);
};
