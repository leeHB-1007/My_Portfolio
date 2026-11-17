import { useEffect, useRef, useState } from "react";

import { journeyChapters, journeyLayout } from "../../journey/data";
import { CONNECTOR_ID, PLANET_TAG_ID, registerLabel } from "../../journey/labels";
import {
  JOURNEY_STEPPER,
  JOURNEY_VIEWS,
  journeyAnchors,
  journeyStops,
  stopIndexOf,
} from "../../scroll/journeyPose";
import { attachJourney, rig, stepJourney } from "../../scroll/scrollRig";
import JourneyGuide from "./JourneyGuide";
import JourneyLabels from "./JourneyLabels";
import JourneyPanel from "./JourneyPanel";
import JourneyProgress from "./JourneyProgress";
import JourneyStepper from "./JourneyStepper";
import JourneyTitles from "./JourneyTitles";

const anchors = journeyAnchors(journeyLayout);
const stopCount = journeyStops(journeyLayout).length;
// 키를 누르고 있을 때 반복 입력은 이 간격(ms)마다 한 번만 넘긴다.
const KEY_REPEAT_MS = 450;
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
// 패널 영역 위치는 투영 테스트와 같은 상수(JOURNEY_VIEWS)를 CSS 변수로 넘긴다.
const panelRegionStyle = {
  "--panel-left-wide": JOURNEY_VIEWS.wide.panelLeft,
  "--panel-left-mid": JOURNEY_VIEWS.mid.panelLeft,
  "--panel-top-narrow": JOURNEY_VIEWS.narrow.panelTop,
};
// 이전/다음 버튼은 넓은·중간 화면에서 행성 아래(가로 위치 = 체류 중 행성의 화면 위치)에 둔다.
const stageStyle = {
  "--planet-x-wide": 0.5 + JOURNEY_VIEWS.wide.shift.x,
  "--planet-x-mid": 0.5 + JOURNEY_VIEWS.mid.shift.x,
  "--stepper-height": `${JOURNEY_STEPPER.height}px`,
  "--stepper-bottom-side": `${JOURNEY_STEPPER.bottomSide}px`,
  "--stepper-bottom-narrow": `${JOURNEY_STEPPER.bottomNarrow}px`,
};

const checkPanelFit = (region, index) => {
  const panel = region && region.querySelector(`[data-journey-panel="${index}"]`);
  if (!panel) return null;
  const limit = region.clientHeight;
  // offsetHeight는 등장 transform의 영향을 받지 않는다.
  if (panel.offsetHeight <= limit + 1) return null;
  return `[journey] 챕터 패널 ${index}가 영역을 넘음: ${panel.offsetHeight}px > ${limit}px (${window.innerWidth}×${window.innerHeight})`;
};

// 고정 스테이지. 챕터마다 행성 하나와 챕터 패널, 위성 설명은 스크롤에 따라 하나씩.
const Journey = () => {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const panelsRef = useRef(null);
  const connectorRef = useRef(null);
  const tagRef = useRef(null);
  const [view, setView] = useState({ index: 0, phase: "travel", item: -1 });

  useEffect(() => registerLabel(CONNECTOR_ID, connectorRef.current), []);
  useEffect(() => registerLabel(PLANET_TAG_ID, tagRef.current), []);

  useEffect(() => {
    const region = panelsRef.current;
    const stage = stageRef.current;
    return attachJourney({
      track: trackRef.current,
      stage,
      panels: Array.from(region.querySelectorAll("[data-journey-panel]")),
      items: Array.from(region.querySelectorAll("article[data-journey-index]")),
      hints: Array.from(region.querySelectorAll("[data-journey-hint]")),
      titles: Array.from(stage.querySelectorAll("[data-journey-title]")),
      region,
      layout: journeyLayout,
    });
  }, []);

  // 방향키: → 다음, ← 이전. 입력 칸(Contact 폼 등)과 수정 키 조합에서는 쓰지 않는다.
  useEffect(() => {
    let lastRepeat = 0;
    const onKeyDown = (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE)) return;
      if (!rig.journey || !rig.journey.measured) return;
      event.preventDefault();
      if (event.repeat) {
        const now = performance.now();
        if (now - lastRepeat < KEY_REPEAT_MS) return;
        lastRepeat = now;
      }
      stepJourney(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let lastMessage = null;
    const sync = (state) => {
      const journey = state.journey;
      if (!journey) return;
      setView((previous) =>
        previous.index === journey.index &&
        previous.phase === journey.phase &&
        previous.item === journey.item
          ? previous
          : { index: journey.index, phase: journey.phase, item: journey.item }
      );
      if (!import.meta.env.DEV || journey.panel === null) return;
      const message = checkPanelFit(panelsRef.current, journey.panel);
      if (message && message !== lastMessage) console.warn(message);
      lastMessage = message;
    };
    sync(rig);
    return rig.subscribe(sync);
  }, []);

  const chapter = journeyChapters[view.index];
  const currentItem =
    view.phase === "item" ? chapter.items[view.item].index : -1;

  return (
    <div
      ref={trackRef}
      className="journey-track"
      style={{ "--journey-units": journeyLayout.total }}
    >
      {anchors.map((anchor) => (
        <span
          key={anchor.id}
          id={anchor.id}
          className="journey-anchor"
          style={{ "--at": anchor.at }}
          aria-hidden="true"
        />
      ))}

      <section
        ref={stageRef}
        className="journey-stage"
        aria-label="포트폴리오 항해"
        style={stageStyle}
      >
        <JourneyTitles chapters={journeyChapters} />
        <JourneyProgress chapters={journeyChapters} current={view.index} />
        <JourneyStepper
          position={stopIndexOf(journeyLayout, view)}
          total={stopCount}
        />

        <JourneyGuide view={view} />

        {/* 이동 중(data-journey-phase="travel")에는 목적지 표시(Next + 행성 둘레 원)로 바뀐다. */}
        <div ref={tagRef} className="journey-planet-tag" aria-hidden="true">
          <span className="journey-planet-tag-ring" />
          <span className="journey-planet-tag-caption">
            <span className="journey-planet-tag-next">Next</span>
            <span className="journey-planet-tag-number">
              {String(chapter.index + 1).padStart(2, "0")}
            </span>
            <span className="journey-planet-tag-title">{chapter.title}</span>
          </span>
        </div>
        <JourneyLabels
          chapters={journeyChapters}
          current={view.index}
          currentItem={currentItem}
        />
        <div ref={connectorRef} className="journey-connector" aria-hidden="true" />

        <div ref={panelsRef} className="journey-panels" style={panelRegionStyle}>
          {journeyChapters.map((entry) => (
            <JourneyPanel
              key={entry.id}
              chapter={entry}
              currentItem={entry.index === view.index ? currentItem : -1}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Journey;
