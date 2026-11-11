// 스테이지 오른쪽의 챕터 점 내비게이션. 표시 여부는 --hud가 정한다.
const JourneyProgress = ({ chapters, current }) => (
  <nav className="journey-dots" aria-label="항해 챕터">
    <ol>
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <a
            href={`#${chapter.id}`}
            className="journey-dot"
            aria-label={`${chapter.title.replace(/\.$/, "")} 챕터로 이동`}
            aria-current={chapter.index === current ? "step" : undefined}
          />
        </li>
      ))}
    </ol>
  </nav>
);

export default JourneyProgress;
