import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { styles } from "../styles";
import { navLinks, profile } from "../constants";
import { logo, menu, close } from "../assets";

const Navbar = () => {
  const [active, setActive] = useState("");
  const [toggle, setToggle] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 64);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (title) => {
    setActive(title);
    setToggle(false);
  };

  return (
    <nav
      className={`${styles.paddingX} fixed top-0 z-30 flex w-full items-center py-5 ${
        scrolled ? "bg-primary/95 backdrop-blur" : "bg-transparent"
      }`}
    >
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
                active === nav.title ? "text-white" : "text-secondary"
              } hover:text-white`}
              onClick={() => handleNavClick(nav.title)}
            >
              <a href={`#${nav.id}`}>{nav.title}</a>
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
                    active === nav.title ? "text-white" : "text-secondary"
                  }`}
                  onClick={() => handleNavClick(nav.title)}
                >
                  <a href={`#${nav.id}`}>{nav.title}</a>
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
