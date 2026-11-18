const pad = (value) => String(value).padStart(2, "0");

// 이동 구간의 챕터 인터스티셜: 다음 행성으로 가는 동안 화면 가운데에 챕터 번호·제목이 떴다 사라진다.
// 투명도·등장 정도(--k)와 data-on은 rig가 이동 진행도로 쓴다. 패널 h2와 같은 내용이라 보조기기에서는 숨긴다.
const JourneyTitles = ({ chapters }) => (
  <div className="journey-titles" aria-hidden="true">
    {chapters.map((chapter) => (
      <div
        key={chapter.id}
        className="journey-title-card"
        data-journey-title={chapter.index}
      >
        <p className="journey-title-count">
          <span className="journey-title-number">{pad(chapter.index + 1)}</span>
          <span className="journey-title-rule" />
          <span>{pad(chapters.length)}</span>
        </p>
        <p className="journey-title-name">{chapter.title}</p>
        <p className="journey-title-meta">
          <span>{chapter.subtitle}</span>
          <span className="journey-title-satellites">위성 {chapter.items.length}개</span>
        </p>
      </div>
    ))}
  </div>
);

export default JourneyTitles;
