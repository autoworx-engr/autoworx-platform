import Image from "next/image";
import React from "react";

const WhatWeDoBest = () => {
  return (
    <div
      className="container mx-auto mt-20 px-4 lg:mt-24 xl:px-20"
      id="services"
    >
      <h1 className="flex flex-wrap items-center justify-center gap-4 text-center md:gap-10">
        <Image
          src={"/landing/Frame.png"}
          alt="frame"
          width={100}
          height={100}
          className="h-auto w-6 sm:w-10 md:w-16"
        />
        <span className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-2xl font-extrabold italic text-transparent sm:text-4xl md:text-6xl">
          What We Do Best
        </span>
        <Image
          src={"/landing/Frame.png"}
          alt="frame"
          width={100}
          height={100}
          className="h-auto w-8 sm:w-10 md:w-16"
        />
      </h1>

      {/* Text Content */}
      {/* 1sst pair */}
      <div>
        <div
          id="invoicing"
          className="mt-10 flex w-full flex-col items-center justify-between gap-10 lg:mt-20 lg:flex-row"
        >
          <div className="space-y-4 lg:w-1/2">
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              Estimates & Invoices
            </p>
            <div className="w- flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-bold">Instant Quotes:</span> Create
                accurate quotes in just a few clicks, with automatic cost
                calculations for parts, labor, and service.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  One-Click Invoice Conversion:
                </span>{" "}
                Clients can digitally authorize estimates, which are then
                seamlessly converted into invoices—automatically linking all the
                details to their profiles.
              </p>
              <p>
                {" "}
                <span className="font-semibold">Payment Management:</span> Our
                Text-to-pay solution delivers superior customer experience. We
                enable you to accept payments seamlessly on your invoices,
                deposits, and proposals. Track payments, outstanding balances,
                and issue receipts, with our integrated payments. We guarantee
                to meet or beat your current credit card processing rates to put
                more money back in your pocket every day.
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage1.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
        </div>
        <div
          id="task-management"
          className="mt-10 flex w-full flex-col-reverse items-center justify-between gap-10 lg:mt-20 lg:flex-row"
        >
          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage2.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
          <div className="space-y-4 lg:w-1/2">
            <p className="mt-10 font-semibold uppercase tracking-wider text-[#01A79E]/45 md:mt-0 md:w-3/4 lg:text-2xl">
              Optimize your scheduling, and reduce no-shows
            </p>
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              Calendar & Task Management
            </p>
            <div className="flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-semibold">
                  Centralized Scheduling:
                </span>{" "}
                View client appointments, team availability, and assignments in
                one place, with flexible daily, weekly, or monthly views, plus
                seamless calendar integrations for easy syncing.
              </p>
              <p>
                {" "}
                <span className="font-semibold">Automation:</span> Send clients
                timely reminders and automated confirmation messages to reduce
                no-shows, with easy drag-and-drop rescheduling for hassle-free
                adjustments.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Task Breakdown & Tracking:
                </span>{" "}
                Assign, prioritize, and track daily tasks in real time to ensure
                efficient, on-time task delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2nd pair */}
      <div>
        <div
          id="team-management"
          className="mt-10 flex w-full flex-col items-center justify-between gap-10 lg:mt-20 lg:flex-row"
        >
          <div className="space-y-4 lg:w-1/2">
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              Workforce Management
            </p>
            <div className="w- flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-semibold">
                  Job Assignments & Alerts:
                </span>{" "}
                Assign tasks, set deadlines, and automatically notify team
                members to keep everything on track, with a built-in commission
                structure to reward performance.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Time & Performance Tracking:
                </span>{" "}
                Track team hours, task completion, and productivity, all while
                gaining valuable insights through detailed performance reports
                to maximize efficiency.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Contractor Management:{" "}
                </span>{" "}
                Onboard and manage contractors with job assignments, ensuring
                smooth collaboration.
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage3.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
        </div>
        <div
          id="inventory-tracking"
          className="mt-10 flex w-full flex-col-reverse items-center justify-between gap-10 lg:mt-20 lg:flex-row"
        >
          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage4.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
          <div className="space-y-4 lg:w-1/2">
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              Inventory Tracking
            </p>
            <div className="flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-semibold">
                  Real-Time Stock Management:
                </span>{" "}
                Effortlessly track products, supplies, and yardage for tint,
                vinyl wrap, and PPF. Stay ahead with low-stock alerts and
                simplify reordering for a smooth, efficient inventory process.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Mobile Scan for Quick Updates:{" "}
                </span>{" "}
                With QR codes for each product, easily log inventory usage and
                replenish products on the go with mobile scanning.
              </p>
              <p>
                {" "}
                <span className="font-semibold">Detailed Analytics:</span>{" "}
                Access reports on usage, inventory value, and trends for more
                informed purchasing decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3rd pair */}
      <div>
        <div
          id="crm"
          className="mt-10 flex w-full flex-col items-center justify-between gap-10 lg:mt-20 lg:flex-row"
        >
          <div className="space-y-4 lg:w-1/2">
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              CRM
            </p>
            <div className="w- flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-semibold">
                  Streamlined Client & Pipeline Management:
                </span>{" "}
                Track leads, monitor deal stages, and manage customer
                relationships all in one place for seamless operations.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Effortless Workflow Optimization:
                </span>{" "}
                Automate scheduling, task assignments, and follow-ups to keep
                your team focused on closing deals.
              </p>
              <p>
                {" "}
                <span className="font-semibold">Real-Time Insights:</span> Gain
                actionable data on pipeline performance, sales trends, and team
                productivity to drive smarter decisions.
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage5.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
        </div>
        <div className="mt-10 flex w-full flex-col-reverse items-center justify-between gap-10 lg:mt-20 lg:flex-row">
          {/* Image */}
          <div className="lg:w-1/2">
            <Image
              src={"/landing/dobestImage6.png"}
              alt="Success Graphic"
              width={1000}
              height={1200}
              className="h-auto max-w-full"
            />
          </div>
          <div className="space-y-4 lg:w-1/2">
            <p className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-xl font-semibold uppercase text-transparent lg:text-4xl">
              Reporting & Analytics
            </p>
            <div className="flex flex-col gap-10 text-lg lg:text-3xl">
              <p className="text-gray-800">
                {" "}
                <span className="font-semibold">
                  Customizable Dashboards:
                </span>{" "}
                Get real-time insights tailored to your business needs with
                easy-to-read, visual reports.
              </p>
              <p>
                {" "}
                <span className="font-semibold">Track Key Metrics: </span>{" "}
                Monitor leads, conversions, revenue, inventory and team
                performance to stay ahead of your goals.
              </p>
              <p>
                {" "}
                <span className="font-semibold">
                  Data-Driven Decisions:
                </span>{" "}
                Analyze trends and uncover opportunities to optimize operations
                and boost profitability.
              </p>
              <p>
                Stay informed, stay efficient, and stay ahead with powerful
                reporting tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatWeDoBest;
