import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { styles } from "../styles";
import { navLinks, profile } from "../constants";
import { logo, menu, close } from "../assets";
import { rig } from "../scroll/scrollRig";

const Navbar = () => {
  const [active, setActive] = useState("");
  const [toggle, setToggle] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // 항해 모드의 현재 위치: 진행 중인 챕터 id, 트랙을 지나면 contact, 항해 밖이면 null
  const [journey, setJourney] = useState({ on: false, current: null });

  useEffect(() => {
    // 스크롤 리스너는 scrollRig 하나로 통합한다. pinned에서는 인트로가 끝날 때 배경을 켠다.
    const sync = (state) => {
      setScrolled(state.navScrolled);
      const track = state.journey;
      let current = null;
      if (track && track.past) {
        current = "contact";
      } else if (track && track.active) {
        const segment = track.layout.segments[track.index];
        current = segment ? segment.section : null;
      }
      const on = Boolean(track);
      setJourney((previous) =>
        previous.on === on && previous.current === current ? previous : { on, current }
      );
    };

    sync(rig);
    return rig.subscribe(sync);
  }, []);

  // 항해 모드에서는 스크롤 위치가 현재 챕터를 정하고, 그 밖에서는 마지막으로 누른 링크를 강조한다.
  const isCurrent = (nav) => (journey.on ? journey.current === nav.id : active === nav.title);

  const handleNavClick = (title) => {
    setActive(title);
    setToggle(false);
  };

  return (
    <nav
      className={`${styles.paddingX} fixed top-0 z-30 flex w-full items-center py-5 ${
        scrolled ? "bg-primary/95" : "bg-transparent"
      }`}
    >
      {/* 전체 항해 진행 선. transform(scaleX)은 rig가 쓴다. 노드를 계속 유지해야 rig가 잡은 참조가 유효하다. */}
      <span
        className="nav-progress"
        data-journey-progress=""
        data-on={journey.on ? "" : undefined}
        aria-hidden="true"
      />
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
        <Link
          to="/"
          className="flex items-center gap-3"
          onClick={() => {
            setActive("");
            window.scrollTo({ top: 0 });
          }}
        >
          <img src={logo} alt="Portfolio logo" className="h-9 w-9 object-contain" />
          <p className="flex cursor-pointer flex-col text-white">
            <span className="text-[18px] font-bold">{profile.name}</span>
            <span className="text-xs uppercase tracking-[0.26em] text-secondary">
              {profile.role}
            </span>
          </p>
        </Link>

        <ul className="hidden list-none flex-row gap-7 lg:flex">
          {navLinks.map((nav) => (
            <li
              key={nav.id}
              className={`cursor-pointer text-[15px] font-medium transition ${
                isCurrent(nav) ? "text-white" : "text-secondary"
              } hover:text-white`}
              onClick={() => handleNavClick(nav.title)}
            >
              <a
                href={`#${nav.id}`}
                className="nav-link"
                aria-current={journey.current === nav.id ? "true" : undefined}
              >
                {nav.title}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-1 items-center justify-end lg:hidden">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-black/20 p-2"
            aria-label={toggle ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={toggle}
            onClick={() => setToggle((previous) => !previous)}
          >
            <img
              src={toggle ? close : menu}
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />
          </button>

          <div
            className={`${
              !toggle ? "hidden" : "flex"
            } black-gradient absolute right-0 top-20 mx-4 my-2 min-w-[220px] rounded-xl border border-white/10 p-6`}
          >
            <ul className="flex flex-1 list-none flex-col items-start gap-4">
              {navLinks.map((nav) => (
                <li
                  key={nav.id}
                  className={`cursor-pointer text-[16px] font-medium ${
                    isCurrent(nav) ? "text-white" : "text-secondary"
                  }`}
                  onClick={() => handleNavClick(nav.title)}
                >
                  <a
                    href={`#${nav.id}`}
                    aria-current={journey.current === nav.id ? "true" : undefined}
                  >
                    {nav.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
