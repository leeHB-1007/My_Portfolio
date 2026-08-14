import { motion, useReducedMotion } from "framer-motion";

import { styles } from "../styles";
import { profile, profileLinks } from "../constants";
import { ComputersCanvas } from "./canvas";

const Hero = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative mx-auto min-h-screen w-full overflow-hidden">
      <div
        className={`absolute inset-0 top-[104px] z-20 mx-auto flex max-w-7xl flex-col gap-8 ${styles.paddingX} lg:flex-row lg:items-start lg:justify-between`}
      >
        <div className="relative z-20 flex w-full max-w-5xl gap-5">
          <div className="mt-6 hidden flex-col items-center sm:flex">
            <div className="h-5 w-5 rounded-full bg-[#915EFF]" />
            <div className="violet-gradient h-72 w-1" />
          </div>

          <div className="relative z-20 pb-24 pt-6 sm:pt-10">
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
            <p className="mt-5 max-w-2xl text-[16px] leading-8 text-secondary sm:text-[18px]">
              {profile.summary}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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

      <div className="absolute inset-0 z-10 hidden lg:block">
        <ComputersCanvas />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[15] hidden bg-gradient-to-r from-black/85 via-black/45 to-transparent lg:block" />

      <div className="absolute bottom-10 z-20 flex w-full items-center justify-center">
        <a href="#about" aria-label="About 섹션으로 이동">
          <div className="flex h-[64px] w-[35px] items-start justify-center rounded-3xl border-4 border-secondary p-2">
            <motion.div
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [0, 24, 0],
                    }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "loop",
                    }
              }
              className="mb-1 h-3 w-3 rounded-full bg-secondary"
            />
          </div>
        </a>
      </div>
    </section>
  );
};

export default Hero;
