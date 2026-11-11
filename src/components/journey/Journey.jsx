import { useEffect, useRef, useState } from "react";

import { journeyChapters, journeyLayout } from "../../journey/data";
import { CONNECTOR_ID, PLANET_TAG_ID, registerLabel } from "../../journey/labels";
import { JOURNEY_VIEWS, journeyAnchors } from "../../scroll/journeyPose";
import { attachJourney, rig } from "../../scroll/scrollRig";
import JourneyLabels from "./JourneyLabels";
import JourneyPanel from "./JourneyPanel";
import JourneyProgress from "./JourneyProgress";

const anchors = journeyAnchors(journeyLayout);
// 패널 영역 위치는 투영 테스트와 같은 상수(JOURNEY_VIEWS)를 CSS 변수로 넘긴다.
const panelRegionStyle = {
  "--panel-left-wide": JOURNEY_VIEWS.wide.panelLeft,
  "--panel-left-mid": JOURNEY_VIEWS.mid.panelLeft,
  "--panel-top-narrow": JOURNEY_VIEWS.narrow.panelTop,
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
    return attachJourney({
      track: trackRef.current,
      stage: stageRef.current,
      panels: Array.from(region.querySelectorAll("[data-journey-panel]")),
      items: Array.from(region.querySelectorAll("article[data-journey-index]")),
      hints: Array.from(region.querySelectorAll("[data-journey-hint]")),
      region,
      layout: journeyLayout,
    });
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

      <section ref={stageRef} className="journey-stage" aria-label="포트폴리오 항해">
        <JourneyProgress chapters={journeyChapters} current={view.index} />

        <div ref={tagRef} className="journey-planet-tag" aria-hidden="true">
          <span>{chapter.title}</span>
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
