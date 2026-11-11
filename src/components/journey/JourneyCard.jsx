import { memo } from "react";

// 챕터 패널 안의 위성 본문. 표시 전용이며 투명도는 scrollRig가 CSS 변수(--k)로 정한다.
const Kicker = ({ children, className = "" }) => (
  <p className={`journey-kicker text-[12px] uppercase tracking-[0.3em] text-[#b9b1f5] ${className}`}>
    {children}
  </p>
);

const Bullets = ({ items }) => (
  <ul className="journey-list mt-4 space-y-2">
    {items.map((text) => (
      <li key={text} className="journey-text flex items-start gap-3 text-white-100">
        <span className="journey-bullet shrink-0 rounded-full bg-[#915EFF]" />
        <span>{text}</span>
      </li>
    ))}
  </ul>
);

const Title = ({ id, children, className = "" }) => (
  <h3
    id={id}
    className={`journey-title font-bold leading-tight text-white ${className}`}
  >
    {children}
  </h3>
);

const IntroBody = ({ data, titleId }) => (
  <>
    <Kicker>{data.role}</Kicker>
    <Title id={titleId} className="mt-2">
      {data.name}
      <span className="ml-2 text-[#915EFF]">{data.englishName}</span>
    </Title>
    <p className="journey-text mt-4 text-secondary">{data.summary}</p>
    <div className="journey-block mt-5 rounded-2xl border border-white/10 bg-white/5">
      <Kicker>Focus</Kicker>
      <Bullets items={data.focus} />
    </div>
  </>
);

const ServiceBody = ({ data, titleId }) => (
  <>
    <img
      src={data.icon}
      alt=""
      aria-hidden="true"
      className="journey-icon object-contain"
    />
    <Title id={titleId} className="mt-5">
      {data.title}
    </Title>
    <p className="journey-text mt-3 text-secondary">{data.summary}</p>
  </>
);

const ExperienceBody = ({ data, titleId }) => (
  <>
    <div className="flex items-center gap-4">
      <div
        className="journey-icon-circle flex shrink-0 items-center justify-center rounded-full"
        style={{ background: data.iconBg }}
      >
        <img
          src={data.icon}
          alt=""
          aria-hidden="true"
          className="h-[60%] w-[60%] object-contain"
        />
      </div>
      <div>
        <Title id={titleId}>{data.title}</Title>
        <p className="mt-1 text-[15px] font-semibold text-[#b9b1f5]">
          {data.company_name}
        </p>
      </div>
    </div>
    <p className="mt-4 text-[13px] uppercase tracking-[0.2em] text-secondary">
      {data.date}
    </p>
    <Bullets items={data.points} />
  </>
);

const TechnologiesBody = ({ data, titleId }) => (
  <>
    <Kicker>Core stack</Kicker>
    <Title id={titleId} className="mt-2">
      Technologies
    </Title>
    <ul className="journey-tech-grid mt-5 grid grid-cols-3 sm:grid-cols-4">
      {data.map((technology) => (
        <li
          key={technology.name}
          className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 text-center"
        >
          <img
            src={technology.icon}
            alt=""
            aria-hidden="true"
            className="journey-tech-icon object-contain"
          />
          <span className="mt-2 text-[12px] font-medium leading-4 text-white-100">
            {technology.name}
          </span>
        </li>
      ))}
    </ul>
  </>
);

const SkillGroupBody = ({ data, titleId }) => (
  <>
    <Kicker>Skill set</Kicker>
    <Title id={titleId} className="mt-2">
      {data.title}
    </Title>
    <ul className="mt-5 flex flex-wrap gap-3">
      {data.items.map((name) => (
        <li
          key={name}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white-100"
        >
          {name}
        </li>
      ))}
    </ul>
  </>
);

const ProjectBody = ({ data, titleId }) => (
  <>
    <div className="journey-project-image relative mb-4 overflow-hidden rounded-2xl border border-white/5">
      <img
        src={data.image}
        alt={`${data.name} case study cover`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-tertiary via-tertiary/30 to-transparent" />
    </div>
    <Kicker className="journey-case-kicker">Case Study</Kicker>
    <p className="journey-subtitle mt-2 font-semibold text-white-100">
      {data.subtitle}
    </p>
    <Title id={titleId} className="mt-2">
      {data.name}
    </Title>
    <p className="journey-text mt-2 text-secondary">{data.description}</p>
    <Bullets items={data.highlights} />
    <div className="journey-tags mt-4 flex flex-wrap gap-x-3 gap-y-1">
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
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#915EFF]/20 text-[15px] font-semibold text-[#b9b1f5]">
        {String(number).padStart(2, "0")}
      </div>
      <Title id={titleId}>{data.title}</Title>
    </div>
    <p className="journey-text mt-5 text-secondary">{data.description}</p>
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
      data-journey-index={item.index}
      aria-labelledby={titleId}
    >
      <Body data={item.data} titleId={titleId} number={item.sectionIndex + 1} />
    </article>
  );
});

JourneyCard.displayName = "JourneyCard";

export default JourneyCard;
