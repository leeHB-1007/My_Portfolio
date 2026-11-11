import { useEffect, useRef } from "react";

import { scrollToJourneyItem } from "../../scroll/scrollRig";
import JourneyCard from "./JourneyCard";

const pad = (value) => String(value).padStart(2, "0");

// 챕터 패널: 머리(소제목·제목·한 줄 설명) → 목차(위성 제목) → 본문(도착 안내, 위성 본문들).
// 패널과 본문의 투명도는 scrollRig가 --k로 쓰고, 목차의 현재 항목은 React가 표시한다.
const JourneyPanel = ({ chapter, currentItem }) => {
  const tocRef = useRef(null);
  const titleId = `journey-chapter-${chapter.id}`;
  const position = chapter.items.findIndex((item) => item.index === currentItem);

  // 좁은 화면의 가로 목차: 현재 항목이 보이도록 목차만 가로로 옮긴다(페이지는 스크롤하지 않음).
  useEffect(() => {
    const toc = tocRef.current;
    if (!toc || position < 0 || toc.scrollWidth <= toc.clientWidth) return;
    const button = toc.children[position];
    if (!button) return;
    toc.scrollLeft = button.offsetLeft - (toc.clientWidth - button.offsetWidth) / 2;
  }, [position]);

  return (
    <section
      className="journey-panel"
      data-journey-panel={chapter.index}
      aria-labelledby={titleId}
    >
      <div className="journey-panel-frame rounded-[20px] p-px shadow-card">
        <div className="journey-panel-body rounded-[19px] bg-tertiary">
          <header className="journey-panel-head">
            <p className="journey-panel-sub text-secondary">{chapter.subtitle}</p>
            <h2 id={titleId} className="journey-panel-title font-black text-white">
              {chapter.title}
            </h2>
            <p className="journey-panel-desc text-secondary" title={chapter.description}>
              {chapter.description}
            </p>
          </header>

          <ol ref={tocRef} className="journey-toc" aria-label={`${chapter.title.replace(/\.$/, "")} 목차`}>
            {chapter.items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="journey-toc-button"
                  data-journey-index={item.index}
                  data-passed={position > i ? "" : undefined}
                  aria-current={item.index === currentItem ? "step" : undefined}
                  onClick={() => scrollToJourneyItem(item.index)}
                >
                  <span className="journey-toc-number">{pad(i + 1)}</span>
                  <span className="journey-toc-title">{item.label.title}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="journey-panel-content">
            <p className="journey-hint text-white-100" data-journey-hint={chapter.index}>
              스크롤하면 위성을 차례로 설명합니다
            </p>
            {chapter.items.map((item) => (
              <JourneyCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JourneyPanel;
