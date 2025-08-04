"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function Header() {
  const { id } = useParams()!;
  const searchParams = useSearchParams();
  const activeView = searchParams?.get("view");

  const toggleButtons = [
    {
      label: "Details",
      href: `/dashboard/employee/${id}?view=details`,
      view: "details",
    },
    {
      label: "Performance",
      href: `/dashboard/employee/${id}?view=performance`,
      view: "performance",
    },
  ];

  return (
    <div className="flex items-center justify-between lg:justify-start">
      <h1 className="mr-4 mt-1 text-xl font-bold text-gray-600 sm:text-2xl">
        Employee Information
      </h1>
      <nav className="">
        <ul className="flex list-none items-center p-0 lg:gap-4">
          {toggleButtons.map((button, index) => (
            <li key={index}>
              <Link
                href={button.href}
                className={`rounded py-2 lg:border lg:px-4 ${
                  button.view === activeView
                    ? "hidden bg-[#6571FF] text-white lg:flex"
                    : "border-[#6571FF] text-[#6571FF] lg:bg-background"
                }`}
              >
                {button.label} <span className="lg:hidden">{">"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
