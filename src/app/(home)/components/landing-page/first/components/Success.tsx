import React from "react";

import Headings from "../../Headings";
import Image from "next/image";

const Success = () => {
  return (
    <div className="container mx-auto mt-20 overflow-hidden px-4 lg:mt-24 xl:px-20">
      {/* Main Heading */}
      <div className="text-center">
        <Headings title={"Built By Shop Owners, For Shop Owners"} />
        <p className="mx-auto mb-5 mt-4 text-lg text-gray-700 lg:mb-10 lg:text-3xl">
          Simplifying the path to success with powerful tools tailored to
          streamline every aspect of your business. From Quotes, scheduling,
          inventory to team management. It’s time to discover your business’
          true potential.
        </p>
      </div>

      {/* Content Section */}
      <div className="mb-10 flex flex-col items-center md:justify-center lg:flex-row xl:gap-10">
        {/* Text Content */}
        <div className="space-y-4 md:w-1/2">
          <p className="mt-10 font-semibold uppercase tracking-wider text-[#01A79E]/45 md:mt-0 md:w-3/4 lg:text-2xl">
            Discover your business’ true potential in just a few taps.
          </p>
          <h2 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text pb-6 text-2xl font-extrabold italic text-transparent lg:text-6xl">
            Full Control At <br />
            Your Fingertips
          </h2>
          <div className="relative">
            <p className="text-lg text-gray-800 lg:text-3xl">
              Streamlines the whole process from client acquisition to job
              fulfillment. Powerful tools for{" "}
              <span className="font-extrabold italic">
                sales, CRM, Inventory, Collaboration, Reporting and So Much
                More.
              </span>{" "}
              A crystal-clear bird’s eye view of your shop, with real-time
              updates on your phone, tablet, or computer. Ensure your entire
              team stays perfectly synced, reducing friction and wasted time
            </p>
            <div className="absolute hidden -rotate-6 md:-left-44 md:-top-2 md:block xl:-left-64">
              <Image
                src="/landing/dfg 1.png"
                alt="Decorative element"
                width={200}
                height={400}
                className="h-auto w-auto"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="flex justify-around">
          <div>
            <Image
              src="/landing/successImage1.png"
              alt="Success Graphic"
              width={600}
              height={800}
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>

      {/* 2nd part */}
      <div className="mb-10 flex flex-col items-center md:justify-center lg:flex-row-reverse xl:gap-10">
        {/* Text Content */}
        <div className="space-y-4 md:w-1/2">
          <p className="mt-10 font-semibold uppercase tracking-wider text-[#01A79E]/45 md:mt-0 md:w-3/4 lg:text-2xl">
            Your business works for you, not the other way around.
          </p>
          <h2 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text pb-6 text-2xl font-extrabold italic text-transparent lg:text-6xl">
            Reclaim Your Time & Take Control
          </h2>
          <div className="relative">
            <p className="text-lg text-gray-800 lg:text-3xl">
              Whether you're aiming to grow your business or create more space
              for yourself, you're in control. Stay connected with clients, keep
              jobs on track, and manage your team effortlessly—anytime,
              anywhere. With the right tools at your fingertips, you can scale
              up, step back, or strike the perfect balance—all on your terms.
            </p>
            <div className="absolute hidden -rotate-2 md:-right-36 md:-top-8 md:block xl:-right-64">
              <Image
                src="/landing/jkhg.png"
                alt="Success Graphic"
                width={200}
                height={400}
                className="h-auto w-auto"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="">
          <Image
            src="/landing/successImage2.png"
            alt="Success Graphic"
            width={600}
            height={700}
            className="h-auto w-full"
          />
        </div>
      </div>

      {/* 3rd part */}
      <div className="mb-10 flex flex-col items-center md:justify-center lg:flex-row xl:gap-10">
        {/* Text Content */}
        <div className="space-y-4 md:w-1/2">
          <h2 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text pb-6 text-2xl font-extrabold italic text-transparent lg:text-6xl">
            Make More, Grow More, Do Less
          </h2>
          <div className="relative">
            <p className="text-lg text-gray-800 lg:text-3xl">
              Deliver on jobs smoothly with invoices, documentation, and billing
              taken care of to optimize your processes and trim unnecessary
              sales & admin personnel. Smoother process flow will help your
              business grow naturally.
            </p>
            <div className="absolute hidden -rotate-6 md:-left-36 md:top-16 md:block xl:-left-52">
              <Image
                src="/landing/sf.png"
                alt="Success Graphic"
                width={200}
                height={400}
                className="h-auto w-auto"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="flex justify-around">
          <div>
            <Image
              src="/landing/successImage3.png"
              alt="Success Graphic"
              width={600}
              height={400}
              className="h-auto w-full"
              // sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 40vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
