import React from "react";
import {
  FaEnvelope,
  FaGithub,
  FaLinkedin,
  FaPenNib,
} from "react-icons/fa6";

import { profile, profileLinks } from "../constants";

const iconByLabel = {
  Email: FaEnvelope,
  GitHub: FaGithub,
  Velog: FaPenNib,
  LinkedIn: FaLinkedin,
};

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-black-100/70 px-6 py-8 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
        <div>
          <p className="text-[18px] font-semibold">
            {profile.name} | {profile.role}
          </p>
          <p className="mt-1 text-sm text-secondary">
            Direct links to active channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {profileLinks.map((link) => {
            const Icon = iconByLabel[link.label];

            return (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                aria-label={link.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-[#915EFF] hover:text-[#b9b1f5]"
              >
                <Icon size={18} />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
