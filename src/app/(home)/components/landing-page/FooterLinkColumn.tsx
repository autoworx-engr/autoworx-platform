import Link from "next/link";
import type { FooterLink } from "./footerLinks";

export default function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-2 text-sm text-white/75 transition-colors duration-200 hover:text-white"
            >
              <span className="h-px w-0 bg-gradient-to-r from-[#26AADF] to-[#01A79E] transition-all duration-300 group-hover:w-4" />
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
