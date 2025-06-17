import React from "react";

import ButtonPrimary from "../../ButtonPrimary";
import ButtonSecondary from "../../ButtonSecondary";
import Headings from "../../Headings";
import Image from "next/image";

const JoinPlatform = () => {
  return (
    <section className="bg-[#EEF8FC]">
      <div className="container mx-auto mt-20 px-4 pb-20 lg:mt-24 lg:pb-24 xl:px-20">
        {/* Section 1 */}
        <div className="mb-10 flex flex-col items-center justify-between gap-10 lg:mb-20 lg:flex-row">
          <div className="mt-10 space-y-4 lg:mt-20 lg:w-1/2 lg:space-y-6">
            <p className="font-semibold uppercase tracking-wider text-[#01A79E]/50 lg:text-2xl">
              No more uncertainty with quotes, timelines & results
            </p>
            <h2 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-2xl font-extrabold italic text-transparent lg:text-5xl">
              Eliminate Guesswork, Embrace Confidence
            </h2>
            <p className="text-lg leading-relaxed text-gray-800 lg:text-xl">
              Analyze your business’ KPIs{" "}
              <span className="font-medium italic">like a real owner</span> to
              drive meaningful insights. Detailed accountability tracking for
              sales staff & technicians to ensure consistency. Enjoy perpetual
              clarity on inventories, job statuses, employee metrics & more.
            </p>
          </div>

          <div className="flex justify-center lg:w-1/2">
            <Image
              src={"/landing/joinPlatform1.png"}
              alt="Eliminate Guesswork"
              width={1000}
              height={1200}
              className="max-w-[90%]"
            />
          </div>
        </div>

        {/* Section 2 */}
        <div className="mb-8 flex flex-col-reverse items-center justify-between gap-10 lg:mb-24 lg:flex-row">
          <div className="flex justify-center lg:w-1/2">
            <Image
              src={"/landing/joinPlatform2.png"}
              alt="Never Miss Lead"
              width={1000}
              height={1200}
              className="max-w-[90%]"
            />
          </div>

          <div className="space-y-4 lg:w-1/2 lg:space-y-6">
            <p className="font-semibold uppercase tracking-wider text-[#01A79E]/50 lg:text-2xl">
              We make it pretty impossible with our reminder system
            </p>
            <h2 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-2xl font-extrabold italic text-transparent lg:text-5xl">
              Never Miss A High Quality Lead (Again)
            </h2>
            <p className="text-base leading-relaxed text-gray-800 lg:text-xl">
              Our sales pipeline is designed to ensure you follow up, close, and
              of course, retain. Communicate with clients directly through
              Autoworx via texts, calls, and emails. Robust features like{" "}
              <span className="font-semibold italic">
                automated reminders & lead tracking
              </span>{" "}
              are just the tip of the iceberg.
            </p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <p className="text-xl font-semibold uppercase tracking-wider text-[#01A79E]/50 lg:text-2xl">
            Autoworx was built with you in mind
          </p>
          <Headings title="Platform Built By Restlyers, For Restylers" />
          <p className="text-lg leading-relaxed text-gray-800 lg:text-2xl">
            Autoworx was built by people like you, whether you’re into wraps,
            tints, PPF, coating, detailing, tires—you name it. We tackle the
            struggles we all face in our business to ensure you are able to
            deliver exceptional service. Join the community of shop owners
            falling in love with Autoworx.
          </p>

          <div className="mt-10 flex flex-col items-center gap-6">
            <Image
              src="/landing/HeroAutoWorkx.svg"
              alt="autoworx"
              width={500}
              height={200}
              priority
              className="h-auto w-full md:max-w-md"
              // sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
            />
            <Image
              src={"/landing/joinPlatform3.png"}
              alt="Team Illustration"
              width={1000}
              height={1200}
              className="w-full max-w-xl"
            />

            <div className="lg;mt-10 mt-4 flex gap-5 sm:flex-row">
              <ButtonPrimary text="Request a demo" href="/contact" />
              <ButtonSecondary text="Contact Us" href="/contact" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinPlatform;
