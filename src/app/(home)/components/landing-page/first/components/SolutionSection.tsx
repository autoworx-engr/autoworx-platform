import React from "react";
import { SolutionCard } from "./SolutionCard";
import { DecorativeDivider } from "./Devider";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../../ui/carousel";

const solutions = [
  {
    category: "Estimates & Invoices",

    imageSrc: "/landing/image1.png",
    features: [
      "Instant Quotes: Create accurate quotes in just a few clicks with automatic cost calculations for parts, labor, and service.",
      "One-Click Invoice Conversion: Seamlessly convert accepted quotes into invoices, leading to faster client profiles.",
      "Payment Management: Track payments, outstanding balances, and issue receipts with integration options for major payment gateways.",
    ],
  },
  {
    category: "Calendar & Task Management",

    imageSrc: "/landing/image2.png",
    features: [
      "Centralized Scheduling: View client appointments, team availability, and workspace utilization with daily, weekly, or monthly views.",
      "Automated Reminders: Send clients reminders to reduce no-shows, with easy drag-&-drop rescheduling.",
      "Task Breakdown & Tracking: Assign, prioritize, and track daily tasks in real time to ensure efficient, on-time task delivery.",
    ],
  },
  {
    category: "Team Management",

    imageSrc: "/landing/image3.png",
    features: [
      "Job Assignments & Alerts: Assign jobs, set deadlines, and notify team members automatically.",
      "Time & Performance Tracking: Monitor time tracking, team productivity, and productivity insights with easy access to detailed performance reports.",
      "Contractor Management: Onboard and manage contractors with job assignments, ensuring smooth collaboration.",
    ],
  },
  {
    category: "Inventory Tracking",

    imageSrc: "/landing/image4.png",
    features: [
      "Real-Time Stock Management: Track parts and supplies, receive low stock alerts, and simplify reordering.",
      "Mobile Scan for Quick Updates: Use mobile scanning to log inventory use instantly.",
      "Detailed Analytics: View stock trends and predictive values for better inventory decisions.",
    ],
  },
  {
    category: "CRM",

    imageSrc: "/landing/image5.png",
    features: [
      "Streamlined Client & Pipeline Management:  Track leads, monitor deal stages, and manage customer relationships all in one place for seamless operations.",
      "Effortless Workflow Optimization: Automate scheduling, task assignments, and follow-ups to keep your team focused on closing deals.",
      "Real-Time Insights: Gain actionable data on pipeline performance, sales trends, and team productivity to drive smarter decisions.",
    ],
  },
  {
    category: "Reporting & Analytics",

    imageSrc: "/landing/image6.png",
    features: [
      "Customizable Dashboards: Get real-time insights tailored to your business needs with easy-to-read, visual reports.",
      "Track Key Metrics: Monitor leads, conversions, revenue, inventory and team performance to stay ahead of your goals.",
      "Data-Driven Decisions: Analyze trends and uncover opportunities to optimize operations and boost profitability.Stay informed, stay efficient, and stay ahead with powerful reporting tools.",
    ],
  },
];

export function SolutionsSection() {
  return (
    <section className="z-10 bg-gray-50 px-4 py-16" id="solutions">
      <div className="mx-auto">
        <div className="mb-12 text-center">
          <p className="mb-6 bg-custom-gradient-lp bg-clip-text p-4 text-3xl font-bold text-transparent md:text-6xl">
            Making Success Simple
          </p>
          <p className="mx-auto max-w-3xl text-xl font-normal text-gray-900 md:text-3xl">
            Autoworx offers powerful tools tailored to streamline every aspect
            of your automotive business, from quotes and scheduling to inventory
            and Team management.
          </p>
        </div>

        {/* <div className="flex gap-8 overflow-x-clip"> */}
        <div className="flex shrink-0 items-center justify-center gap-8">
          <Carousel
            opts={{
              align: "end",
            }}
            className="mx-auto w-full max-w-7xl"
          >
            <CarouselContent className="py-3">
              {[...solutions, ...solutions].map((solution, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <SolutionCard
                    features={solution.features}
                    imageSrc={solution.imageSrc}
                    category={solution.category}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
        {/* </div> */}
      </div>
      <DecorativeDivider />
    </section>
  );
}
