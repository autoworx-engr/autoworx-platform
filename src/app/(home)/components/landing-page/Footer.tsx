import { INFO_EMAIL } from "@/lib/consts";
import { Mail } from "lucide-react";
import Image from "next/image";
import AppDownloadLinks from "./AppDownloadLinks";
import FooterLinkColumn from "./FooterLinkColumn";
import { FOOTER_COMPANY, FOOTER_LEGAL, FOOTER_SOLUTIONS } from "./footerLinks";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#024B5A] to-[#012931] text-white">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#26AADF] to-transparent" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[#26AADF]/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-16 h-80 w-80 rounded-full bg-[#01A79E]/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 lg:pt-20 xl:px-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-4">
            <Image
              src="/icons/footerLogo.png"
              alt="Autoworx"
              width={180}
              height={90}
              className="h-auto w-[180px]"
            />
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              AutoWorx makes running your automotive shop easier than ever —
              from hassle-free customer management to streamlined garage
              operations, everything you need to manage your shop efficiently in
              one place.
            </p>

            <a
              href={`mailto:${INFO_EMAIL}`}
              className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#26AADF]/60 hover:bg-white/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#26AADF] to-[#01A79E]">
                <Mail className="h-4 w-4" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-wide text-white/50">
                  Any questions?
                </span>
                <span className="text-sm font-semibold">{INFO_EMAIL}</span>
              </span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <FooterLinkColumn title="Solutions" links={FOOTER_SOLUTIONS} />
            <FooterLinkColumn title="Company" links={FOOTER_COMPANY} />
            <FooterLinkColumn title="Legal" links={FOOTER_LEGAL} />
          </div>

          <div className="lg:col-span-3">
            <AppDownloadLinks />
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4 border-t border-white/10 py-8">
          <p className="text-xs text-white/50">
            © {year} Autoworx. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
