import React from "react";
import Headings from "../../Headings";
import ButtonPrimary from "../../ButtonPrimary";
import ButtonSecondary from "../../ButtonSecondary";
import Image from "next/image";

const Hero = () => {
  return (
    <div className="container mx-auto mt-16 px-4 md:mt-20 lg:mt-30 xl:px-20">
      <Headings title="STREAMLINE. MANAGE. GROW." />
      <div className="mx-auto flex max-w-2xl justify-center py-8">
        <Image
          src="/landing/HeroAutoWorkx.svg"
          alt="autoworx"
          width={500}
          height={300}
          priority
          className="h-auto w-full"
          // sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
        />
      </div>
      <p className="mx-auto px-1 pt-8 text-center lg:text-4xl">
        Take control of your shop with powerful tools that simplify client
        communication and optimize daily operations—so you can work smarter, not
        harder. Elevate your graphics, window tint, or custom builds while
        staying focused on what matters most—growing your business and
        delivering exceptional service.
      </p>
      <div className="flex flex-col items-center">
        <Image
          src="/images/landing/hero-image.png"
          alt="Hero-image"
          width={800}
          height={500}
          className="h-auto w-full"
          // sizes="(max-width: 640px) 95vw, (max-width: 768px) 85vw, (max-width: 1024px) 75vw, 65vw"
        />
        <div className="mt-16 flex gap-7">
          <ButtonPrimary text={"Request a demo"} href="/contact" />
          <ButtonSecondary text={"Contact Us"} href="/contact" />
        </div>
      </div>
    </div>
  );
};

export default Hero;
