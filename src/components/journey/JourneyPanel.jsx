import { useEffect, useRef } from "react";

import { journeyChapters, journeyLayout } from "../../journey/data";
import { journeyStops, stopIndexOf } from "../../scroll/journeyPose";
import { scrollToJourneyItem, stepJourney } from "../../scroll/scrollRig";
import JourneyCard from "./JourneyCard";
import { hoverProps } from "./hover";

const pad = (value) => String(value).padStart(2, "0");
const stops = journeyStops(journeyLayout);
const chapterName = (chapter) => chapter.title.replace(/\.$/, "");

// 정지점 하나의 이름: 챕터 도착이면 챕터 이름, 위성이면 위성 제목
const stopName = (stop) => {
  const chapter = journeyChapters[stop.chapter];
  return stop.item < 0 ? chapterName(chapter) : chapter.items[stop.item].label.title;
};

// 이 패널이 보일 때의 이전·다음 정지점 이름(넘기기 버튼·방향키와 같은 순서).
// 처음 앞은 맨 위(Hero), 마지막 뒤는 Contact.
const neighbors = (chapter, position) => {
  const at = stopIndexOf(journeyLayout, {
    index: chapter.index,
    phase: position >= 0 ? "item" : "arrive",
    item: position,
  });
  const previous = stops[at - 1];
  const next = stops[at + 1];
  return {
    previous: previous ? stopName(previous) : "처음으로",
    next: next ? stopName(next) : "Contact",
    nextIsChapter: Boolean(next && next.item < 0),
  };
};

const Chevron = ({ flip }) => (
  <svg viewBox="0 0 16 16" className="journey-foot-icon" aria-hidden="true">
    <path
      d={flip ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 챕터 패널: 머리(번호·소제목·제목·한 줄 설명) → 목차 줄 → 본문(위성 본문들).
// 목차와 본문을 감싼 stack이 도착 안내 요소(data-journey-hint)라서 rig가 쓰는 --k가 곧 "도착 정도"다.
// 도착 단계(1)에는 큰 세로 목차가, 위성 단계(0)에는 작은 목차 줄과 본문이 보인다.
const JourneyPanel = ({ chapter, currentItem }) => {
  const tocRef = useRef(null);
  const titleId = `journey-chapter-${chapter.id}`;
  const count = chapter.items.length;
  const position = chapter.items.findIndex((item) => item.index === currentItem);
  const twoColumns = count > 6;
  const around = neighbors(chapter, position);

  // 목차 줄은 한 줄 가로 스크롤이다. 현재 항목이 보이도록 목차만 옮긴다(페이지는 스크롤하지 않음).
  useEffect(() => {
    const toc = tocRef.current;
    if (!toc) return;
    toc.toggleAttribute("data-overflow", toc.scrollWidth > toc.clientWidth + 1);
    if (position < 0 || toc.scrollWidth <= toc.clientWidth) return;
    const button = toc.children[position];
    if (!button) return;
    toc.scrollLeft = button.offsetLeft - (toc.clientWidth - button.offsetWidth) / 2;
  }, [position]);

  return (
    <section
      className="journey-panel"
      data-journey-panel={chapter.index}
      data-reading={position >= 0 ? "" : undefined}
      aria-labelledby={titleId}
    >
      <div className="journey-panel-frame">
        <div className="journey-panel-body">
          <header className="journey-panel-head">
            <span className="journey-panel-number" aria-hidden="true">
              {pad(chapter.index + 1)}
            </span>
            <p className="journey-panel-sub">{chapter.subtitle}</p>
            <h2 id={titleId} className="journey-panel-title">
              {chapter.title}
            </h2>
            <p className="journey-panel-desc" title={chapter.description}>
              {chapter.description}
            </p>
          </header>

          <div className="journey-panel-stack" data-journey-hint={chapter.index}>
            <div
              className="journey-rail"
              style={{ "--p": position < 0 ? 0 : (position + 1) / count }}
            >
              <ol
                ref={tocRef}
                className="journey-toc"
                aria-label={`${chapter.title.replace(/\.$/, "")} 목차`}
              >
                {chapter.items.map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="journey-toc-button"
                      data-journey-index={item.index}
                      data-passed={position > i ? "" : undefined}
                      aria-current={item.index === currentItem ? "step" : undefined}
                      onClick={() => scrollToJourneyItem(item.index)}
                      {...hoverProps(item.id)}
                    >
                      <span className="journey-toc-number">{pad(i + 1)}</span>
                      <span className="journey-toc-title">{item.label.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* 도착 단계의 큰 목차. 같은 목록이 위 목차 줄에 있으므로 보조기기에서는 숨기고 마우스로만 누른다. */}
            <div className="journey-index">
              <ol
                className="journey-index-list"
                aria-hidden="true"
                data-columns={twoColumns ? "2" : undefined}
                style={{ "--half": Math.ceil(count / 2) }}
              >
                {chapter.items.map((item, i) => (
                  <li key={item.id} style={{ "--i": i }}>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="journey-index-button"
                      onClick={() => scrollToJourneyItem(item.index)}
                      {...hoverProps(item.id)}
                    >
                      <span className="journey-index-number">{pad(i + 1)}</span>
                      <span className="journey-index-title">{item.label.title}</span>
                      {item.label.sub && (
                        <span className="journey-index-sub">{item.label.sub}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="journey-hint">
                <span className="journey-hint-line" aria-hidden="true" />
                스크롤하면 위성을 차례로 설명합니다
              </p>
            </div>

            <div className="journey-panel-content">
              {chapter.items.map((item) => (
                <JourneyCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* 이전·다음 정지점으로 넘기는 줄(아래 넘기기 버튼·방향키와 같은 동작). 좁은 화면에서는 숨긴다. */}
          <nav className="journey-foot" aria-label={`${chapterName(chapter)} 이동`}>
            <button
              type="button"
              className="journey-foot-button journey-foot-previous"
              aria-label={`이전: ${around.previous}`}
              onClick={() => stepJourney(-1)}
            >
              <Chevron flip />
              <span className="journey-foot-name">{around.previous}</span>
            </button>
            <button
              type="button"
              className="journey-foot-button journey-foot-next"
              data-chapter={around.nextIsChapter ? "" : undefined}
              aria-label={`다음: ${around.next}`}
              onClick={() => stepJourney(1)}
            >
              <span className="journey-foot-label" aria-hidden="true">
                {around.nextIsChapter ? "다음 행성" : "다음"}
              </span>
              <span className="journey-foot-name">{around.next}</span>
              <Chevron />
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
};

export default JourneyPanel;
