const pad = (value) => String(value).padStart(2, "0");

// 스테이지 오른쪽의 세로 챕터 내비게이션. 표시 여부는 --hud가 정한다.
// 눈금마다 번호, 현재 챕터는 눈금이 길어지고 아래에 챕터 이름이 세로로 붙는다.
// 호버·포커스하면 그 챕터 이름이 눈금 왼쪽에 뜬다(터치 대상은 44px).
const JourneyProgress = ({ chapters, current }) => {
  const currentChapter = chapters[current];

  return (
    <nav className="journey-dots" aria-label="항해 챕터">
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              className="journey-dot"
              aria-label={`${chapter.title.replace(/\.$/, "")} 챕터로 이동`}
              aria-current={chapter.index === current ? "step" : undefined}
            >
              <span className="journey-dot-name" aria-hidden="true">
                {chapter.title.replace(/\.$/, "")}
              </span>
              <span className="journey-dot-number" aria-hidden="true">
                {pad(chapter.index + 1)}
              </span>
              <span className="journey-dot-tick" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      {currentChapter && (
        <p className="journey-dots-caption" aria-hidden="true">
          {currentChapter.title.replace(/\.$/, "")}
        </p>
      )}
    </nav>
  );
};

export default JourneyProgress;
