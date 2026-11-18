import { useEffect, useRef } from "react";

import { registerLabel } from "../../journey/labels";
import { scrollToJourneyItem } from "../../scroll/scrollRig";
import { hoverProps } from "./hover";

// 위치(transform)와 행성 앞뒤 투명도(--a)는 Canvas 쪽 PlanetSystem이 매 프레임 쓴다.
// 누르면 그 위성 위치로 스크롤할 뿐이고, 설명은 스크롤만으로도 차례로 볼 수 있다.
const JourneyLabel = ({ item, current }) => {
  const ref = useRef(null);

  useEffect(() => registerLabel(item.id, ref.current), [item.id]);

  return (
    <li ref={ref} className="journey-label" data-current={current ? "" : undefined}>
      <button
        type="button"
        className="journey-label-button"
        data-journey-index={item.index}
        aria-current={current ? "step" : undefined}
        onClick={() => scrollToJourneyItem(item.index)}
        {...hoverProps(item.id)}
      >
        <span className="journey-label-title">{item.label.title}</span>
        {item.label.sub && (
          <span className="journey-label-sub">{item.label.sub}</span>
        )}
      </button>
    </li>
  );
};

// 챕터별 위성 라벨 목록. 현재 챕터만 보이고 나머지는 hidden.
const JourneyLabels = ({ chapters, current, currentItem }) => (
  <div className="journey-labels">
    {chapters.map((chapter) => (
      <ul
        key={chapter.id}
        className="journey-label-list"
        hidden={chapter.index !== current}
        aria-label={`${chapter.title.replace(/\.$/, "")} 위성`}
      >
        {chapter.items.map((item) => (
          <JourneyLabel
            key={item.id}
            item={item}
            current={item.index === currentItem}
          />
        ))}
      </ul>
    ))}
  </div>
);

export default JourneyLabels;
