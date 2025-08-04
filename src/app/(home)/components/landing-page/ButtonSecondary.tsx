import Link from "next/link";
import React from "react";

const ButtonSecondary = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link href={href}>
      {" "}
      <button className="cursor-pointer rounded-xl border-2 border-[#26aadf] bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text p-4 text-sm font-extrabold uppercase text-transparent lg:px-12 lg:py-5 lg:text-xl">
        {text}
      </button>
    </Link>
  );
};

export default ButtonSecondary;
