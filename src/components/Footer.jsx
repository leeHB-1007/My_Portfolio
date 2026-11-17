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
    <footer className="site-footer px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
        <div>
          <p className="site-footer-name">
            {profile.name} | {profile.role}
          </p>
          <p className="site-footer-note">
            Direct links to active channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {profileLinks.map((link) => {
            const Icon = iconByLabel[link.label];

            return (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                aria-label={link.label}
                className="site-footer-link"
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
