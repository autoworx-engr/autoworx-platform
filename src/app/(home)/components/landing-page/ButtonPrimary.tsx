import Link from "next/link";
import React from "react";

const ButtonPrimary = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link href={href}>
      <button className="cursor-pointer rounded-xl bg-gradient-to-r from-[#26AADF] to-[#01A79E] p-4 text-sm font-extrabold uppercase text-white lg:px-6 lg:py-5 lg:text-xl">
        {text}
      </button>
    </Link>
  );
};

export default ButtonPrimary;
