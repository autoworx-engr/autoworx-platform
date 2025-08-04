import Image from "next/image";
import React from "react";

export default function Header() {
  return (
    <div className="flex items-center justify-center gap-5 bg-[#14252D05] pt-9 sm:justify-start sm:gap-9 md:px-8">
      <Image
        src="/images/solution/logo1.png"
        alt="logo"
        width={56}
        height={47}
      />
      <Image
        src="/images/solution/logo2.png"
        alt="logo"
        width={420}
        height={100}
        className="w-[280px] sm:h-[37px] sm:w-[420px]"
      />
    </div>
  );
}
