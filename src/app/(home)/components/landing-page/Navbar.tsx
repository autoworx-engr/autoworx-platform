"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import MobileNavList from "./MobileNavList";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const links = [
  { title: "Home", link: "/" },
  { title: "Services", link: "/#services" },
  { title: "Contact US", link: "/contact" },
];

export default function Navbar() {
  const [openNav, setOpenNav] = useState(false);

  useEffect(() => {
    document.body.style.overflow = openNav ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [openNav]);

  return (
    <>
      <div className="sm:hidden">
        <div className="relative flex items-center justify-between bg-white p-2 shadow-md">
          <button onClick={() => setOpenNav(true)}>
            <Menu size={30} className="text-[#26AADF]" />
          </button>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-4">
            <Link href="/">
              <Image
                src={"/landing/mobileNavAutoworkxLogo.svg"}
                alt="Logo"
                width={100}
                height={24}
                className="h-6 w-auto"
                style={{ width: "auto" }}
              />
            </Link>
            <Image
              src={"/landing/HeroAutoWorkx.svg"}
              alt="hero text"
              className="h-3 w-auto"
              width={100}
              height={12}
              style={{ width: "auto" }}
            />
          </div>
        </div>
        <div
          className={`fixed inset-0 z-50 transform bg-gradient-to-br from-[#26AADF] to-[#01A79E] transition-transform duration-300 ${
            openNav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOpenNav(false)}
              className="p-6 text-white"
            >
              <X strokeWidth={3} size={36} />
            </button>
          </div>
          <div className="mt-16 flex h-screen flex-col items-center">
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <div className="flex-shrink-0">
                <Image
                  src="/landing/navbarLogo.svg"
                  alt="Company Logo"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                  style={{ width: "auto" }}
                  priority
                />
              </div>
              <div className="flex-shrink-0">
                <Image
                  src="/landing/navAutoworkxLogo.svg"
                  alt="Autoworkx Logo"
                  width={140}
                  height={40}
                  className="h-10 w-auto max-w-[150px]"
                  style={{ width: "auto" }}
                />
              </div>
            </div>
            <ul className="mt-10 flex flex-col gap-6">
              {links.map((item, index) => (
                <MobileNavList
                  key={index}
                  item={item}
                  setOpenNav={setOpenNav}
                />
              ))}
            </ul>
            <div className="mt-2 flex flex-col items-center space-y-4">
              {/* <Link
                href="/login"
                className="rounded-2xl bg-white bg-gradient-to-r from-[#03A7A2] to-[#26AADF] bg-clip-text px-10 py-3 text-transparent"
              >
                Login
              </Link> */}

              <Link
                href="/login"
                className="rounded-2xl bg-gradient-to-r from-[#03A7A2] to-[#26AADF] p-[1px]"
              >
                <button className="rounded-2xl bg-white px-6 py-3 uppercase">
                  <span className="bg-gradient-to-r from-[#03A7A2] to-[#26AADF] bg-clip-text text-transparent">
                    Login
                  </span>
                </button>
              </Link>
              <button
                onClick={() => setOpenNav(false)}
                className="rounded-md border-2 border-white px-6 py-2 text-white"
              >
                <Link href="/contact">REQUEST A DEMO</Link>
              </button>
            </div>
          </div>
        </div>
      </div>

      <nav
        style={{
          fill: "linear-gradient(90deg, #26AADF 0%, #01A79E 100%)",
          filter: "drop-shadow(0px 4px 20px rgba(38, 170, 223, 0.58))",
        }}
        className="hidden w-full items-center justify-between bg-gradient-to-r from-[#26AADF] to-[#01A79E] px-4 py-3 md:flex xl:px-[12rem] 2xl:px-[15rem]"
      >
        <Link href="/" className="flex items-center gap-4">
          <Image
            src={"/landing/navbarLogo.svg"}
            alt="Logo1"
            className="h-11 w-auto"
            width={100}
            height={44}
            style={{ width: "auto" }}
          />
          <Image
            src={"/landing/navAutoworkxLogo.svg"}
            alt="Logo1"
            width={100}
            height={16}
            className="h-4 w-auto"
            style={{ width: "auto" }}
          />
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.title}
              href={link.link}
              className="uppercase text-white hover:text-black"
            >
              {link.title}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-2xl border-2 border-white px-2 py-3 uppercase text-white lg:block"
            style={{
              background: "linear-gradient(90deg, #03A7A2 0%, #26AADF 100%)",
            }}
          >
            Request a Demo
          </Link>
          <Link
            href="/login"
            className="rounded-2xl bg-gradient-to-r from-[#03A7A2] to-[#26AADF] p-[1px]"
          >
            <button className="rounded-2xl bg-white px-4 py-3 uppercase">
              <span className="bg-gradient-to-r from-[#03A7A2] to-[#26AADF] bg-clip-text text-transparent">
                Login
              </span>
            </button>
          </Link>
        </div>
      </nav>
    </>
  );
}
