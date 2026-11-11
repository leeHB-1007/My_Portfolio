import { useEffect, useRef } from "react";

import { styles } from "../styles";
import { profile, profileLinks } from "../constants";
import { rig } from "../scroll/scrollRig";
import useScrollRig from "../scroll/useScrollRig";

const STAGE_PADDING_TOP = 104;

// 모드는 CSS가 정하므로 dev에서 경고만 남긴다.
const checkPinnedLayout = (stage, text) => {
  if (rig.mode !== "pinned" || !stage || !text) return null;
  // offsetTop은 transform(페이드)의 영향을 받지 않는다.
  const top = text.offsetTop;
  const bottom = top + text.offsetHeight;
  const limit =
    stage.clientHeight - parseFloat(getComputedStyle(stage).paddingBottom);
  if (top >= STAGE_PADDING_TOP && bottom <= limit) return null;
  return `[hero] pinned 텍스트 열이 예약 영역을 벗어남: top ${top}, bottom ${bottom}, limit ${STAGE_PADDING_TOP}~${limit}`;
};

const Hero = () => {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const textRef = useRef(null);
  useScrollRig(trackRef, stageRef);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    let lastMessage = null;
    const check = () => {
      const message = checkPinnedLayout(stageRef.current, textRef.current);
      if (message && message !== lastMessage) console.warn(message);
      lastMessage = message;
    };
    if (rig.measured) check();
    return rig.subscribe(check);
  }, []);

  return (
    <div ref={trackRef} className="hero-track">
      <section ref={stageRef} className="hero-stage mx-auto w-full">
        <div className="hero-scrim" />

        <div className={`mx-auto w-full max-w-7xl ${styles.paddingX}`}>
          <div
            ref={textRef}
            data-hero-fade=""
            className="hero-fade relative z-20 flex w-full max-w-5xl gap-5"
          >
            <div className="mt-1 hidden flex-col items-center sm:flex">
              <div className="h-5 w-5 rounded-full bg-[#915EFF]" />
              <div className="violet-gradient h-72 w-1" />
            </div>

            <div className="relative z-20">
              <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#b9b1f5]">
                {profile.role}
              </p>
              <h1 className={styles.heroHeadText}>
                {profile.name}
                <span className="block text-[#915EFF]">
                  {profile.englishName}
                </span>
              </h1>
              <p
                className={`${styles.heroSubText} mt-6 max-w-2xl text-white-100 lg:max-w-4xl lg:whitespace-nowrap`}
              >
                {profile.headline}
              </p>
              <p className="hero-summary mt-5 max-w-2xl text-[16px] leading-8 text-secondary sm:text-[18px]">
                {profile.summary}
              </p>

              <div className="hero-chips mt-8 flex flex-wrap gap-3">
                {profile.focus.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white-100 backdrop-blur"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {profileLinks.map((link, index) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={
                      link.href.startsWith("mailto:") ? undefined : "_blank"
                    }
                    rel={
                      link.href.startsWith("mailto:")
                        ? undefined
                        : "noopener noreferrer"
                    }
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      index === 0
                        ? "bg-[#915EFF] text-white shadow-lg shadow-[#915EFF]/30"
                        : "border border-white/15 bg-black/20 text-white hover:border-[#915EFF]"
                    }`}
                    aria-label={`${link.label} 열기`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          data-hero-fade=""
          className="hero-fade hero-indicator absolute bottom-4 left-0 z-20 flex w-full items-center justify-center"
        >
          <a href="#about" aria-label="About 섹션으로 이동">
            <div className="flex h-[64px] w-[35px] items-start justify-center rounded-3xl border-4 border-secondary p-2">
              <div className="hero-indicator-dot mb-1 h-3 w-3 rounded-full bg-secondary" />
            </div>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Hero;
