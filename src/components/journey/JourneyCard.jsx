import { memo } from "react";

// 챕터 패널 안의 위성 본문. 표시 전용이며 투명도·시차는 scrollRig가 쓰는 --k를 CSS가 읽는다.
// 본문의 직계 자식이 시차 단위다(index.css의 .journey-card > *).
const Kicker = ({ children, className = "" }) => (
  <p className={`journey-kicker ${className}`}>{children}</p>
);

const Bullets = ({ items }) => (
  <ul className="journey-list">
    {items.map((text) => (
      <li key={text} className="journey-list-item">
        <span className="journey-bullet" aria-hidden="true" />
        <span>{text}</span>
      </li>
    ))}
  </ul>
);

const Title = ({ id, children, className = "" }) => (
  <h3 id={id} className={`journey-title ${className}`}>
    {children}
  </h3>
);

const IntroBody = ({ data, titleId }) => (
  <>
    <Kicker>{data.role}</Kicker>
    <Title id={titleId} className="journey-title-hero">
      {data.name}
      <span className="journey-title-alt">{data.englishName}</span>
    </Title>
    <p className="journey-text journey-lead">{data.summary}</p>
    <div className="journey-focus">
      <p className="journey-focus-label">Focus</p>
      <ul className="journey-focus-list">
        {data.focus.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  </>
);

const ServiceBody = ({ data, titleId }) => (
  <>
    <div className="journey-glyph">
      <img src={data.icon} alt="" aria-hidden="true" className="journey-icon" />
    </div>
    <Title id={titleId} className="journey-title-hero">
      {data.title}
    </Title>
    <p className="journey-text journey-lead">{data.summary}</p>
  </>
);

const ExperienceBody = ({ data, titleId }) => (
  <>
    <div className="journey-role">
      <div className="journey-icon-circle" style={{ background: data.iconBg }}>
        <img src={data.icon} alt="" aria-hidden="true" className="journey-icon-inner" />
      </div>
      <div className="journey-role-text">
        <Title id={titleId}>{data.title}</Title>
        <p className="journey-company">{data.company_name}</p>
      </div>
    </div>
    <p className="journey-date">{data.date}</p>
    <Bullets items={data.points} />
  </>
);

const TechnologiesBody = ({ data, titleId }) => (
  <>
    <Kicker>Core stack</Kicker>
    <Title id={titleId}>Technologies</Title>
    <ul className="journey-tech-grid">
      {data.map((technology) => (
        <li key={technology.name}>
          <img
            src={technology.icon}
            alt=""
            aria-hidden="true"
            className="journey-tech-icon"
          />
          <span>{technology.name}</span>
        </li>
      ))}
    </ul>
  </>
);

const SkillGroupBody = ({ data, titleId }) => (
  <>
    <Kicker>Skill set</Kicker>
    <Title id={titleId} className="journey-title-hero">
      {data.title}
    </Title>
    <ul className="journey-skill-list">
      {data.items.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  </>
);

const ProjectBody = ({ data, titleId }) => (
  <>
    <div className="journey-project-image">
      <img
        src={data.image}
        alt={`${data.name} case study cover`}
        loading="lazy"
      />
      <p className="journey-case-kicker">Case Study</p>
    </div>
    {/* 같은 이름(BoostUs)의 사례가 여러 개라 구분하는 부제를 크게, 이름은 작게 둔다. */}
    <Title id={titleId} className="journey-project-title">
      {data.name}
    </Title>
    <p className="journey-subtitle">{data.subtitle}</p>
    <p className="journey-text">{data.description}</p>
    <Bullets items={data.highlights} />
    <div className="journey-tags">
      {data.tags.map((tag) => (
        <p key={tag.name} className={tag.color}>
          #{tag.name}
        </p>
      ))}
    </div>
  </>
);

const StrengthBody = ({ data, titleId, number }) => (
  <>
    <p className="journey-strength-number" aria-hidden="true">
      {String(number).padStart(2, "0")}
    </p>
    <Title id={titleId} className="journey-title-hero">
      {data.title}
    </Title>
    <p className="journey-text journey-statement">{data.description}</p>
  </>
);

const BODIES = {
  intro: IntroBody,
  service: ServiceBody,
  experience: ExperienceBody,
  technologies: TechnologiesBody,
  skillGroup: SkillGroupBody,
  project: ProjectBody,
  strength: StrengthBody,
};

// 항목이 바뀔 때 본문 30개가 모두 다시 렌더되지 않게 memo로 감싼다(props는 고정된 item뿐).
const JourneyCard = memo(({ item }) => {
  const Body = BODIES[item.kind];
  const titleId = `journey-title-${item.id}`;

  return (
    <article
      className="journey-card"
      data-kind={item.kind}
      data-journey-index={item.index}
      aria-labelledby={titleId}
    >
      <Body data={item.data} titleId={titleId} number={item.sectionIndex + 1} />
    </article>
  );
});

JourneyCard.displayName = "JourneyCard";

export default JourneyCard;
