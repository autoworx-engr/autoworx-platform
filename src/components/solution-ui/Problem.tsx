"use client";

import {
  Bell,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import ProblemCard from "./ProblemCard";
import TestimonialCard from "./TestimonialCard";

const problem = [
  {
    icon: Calendar,
    title: "Scheduling Chaos",
    description:
      "Double-bookings, missed appointments, and no-shows cutting into your profits.",
    benefit:
      "Streamlined calendar with automated reminders and no double-booking.",
    didYouKnow:
      "Most restyling shops lose up to 30% of potential revenue from inefficient scheduling chaos systems.",
  },
  {
    icon: Bell,
    title: "Missed Follow-Ups",
    description:
      "Hot leads going cold because you're too busy putting out fires.",
    benefit:
      "Automated follow-up sequences keep clients engaged without lifting a finger.",
    didYouKnow:
      "Our customers report saving 5-10 hours per week after solving their missed follow-ups problems with Autoworx.",
  },
  {
    icon: Users,
    title: "Team Management Struggles",
    description:
      "Unreliable staff, communication gaps, and unclear task assignments.",
    benefit:
      "Role-based dashboards, task assignments, and built-in communication.",
    didYouKnow:
      "Most restyling shops lose up to 30% of potential revenue from inefficient team management struggles systems.",
  },
  {
    icon: Package,
    title: "Inventory Nightmares",
    description:
      "Manually tracking parts, lost items, and missing stock when you need it most.",
    benefit:
      "Centralized inventory tracking, real-time updates, and direct database sync.",
    didYouKnow:
      "Our customers report saving 5-10 hours per week after solving their inventory nightmares problems with Autoworx.",
  },
  {
    icon: RefreshCw,
    title: "No Automation",
    description:
      "Wasting time on repetitive tasks that could be automated, like appointment reminders and follow-ups.",
    benefit: "Automation for texts, emails, follow-ups, and client reviews.",
    didYouKnow:
      "Most restyling shops lose up to 30% of potential revenue from inefficient no automation systems.",
  },
  {
    icon: FileText,
    title: "Lack of Detailed Reporting",
    description:
      "Struggling to see which services are most profitable or where you're losing money.",
    benefit:
      "Real-time reports, revenue tracking, and service profitability insights.",
    didYouKnow:
      "Our customers report saving 5-10 hours per week after solving their lack of detailed reporting problems with Autoworx.",
  },
];

export default function Problem() {
  return (
    <div>
      <section className="py-16">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#0F172A] lg:text-4xl">
              Does This Sound Familiar?
            </h2>
            <p className="text-lg text-[#475569]">
              As a restyling shop owner, you&#39;re probably dealing with these
              daily headaches:
            </p>
          </div>

          <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {problem.map((item, index) => (
              <ProblemCard key={index} item={item} />
            ))}
          </div>

          {/* Testimonial  */}
          <div className="mx-auto max-w-xl mb-16">
            {[
              {
                name: "Steven B",
                title: "Owner of Becks Car Care",
                image: "/landing/beckscarcare.png",
                rating: 5,
                quote: `AutoWorks Transformed My Business. I’ve tried various software over the years, but nothing compares to AutoWorks. Their all-in-one platform covers booking, invoicing, estimates, inventory, customer management, and more, all in one easy-to-use dashboard. It’s streamlined my workflow, saved me hours each week, and helped me stay organized. If you want to level up your business, this is the tool to get.`,
              },
            ].map((testimonial, index) => (
              <TestimonialCard key={index} testimonial={testimonial} />
            ))}
          </div>

          {/* More Challenges */}
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-8 text-center text-2xl font-bold text-[#0F172A]">
              More Challenges Solved by Autoworx
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  icon: FileText,
                  title: "Digitally Approved Estimates",
                  description:
                    "Chasing clients for approvals or dealing with confusing paperwork.",
                  benefit:
                    "Send estimates digitally, clients approve with a click — no back and forth.",
                  didYouKnow:
                    "Most restyling shops lose up to 25% of potential revenue due to inefficient digitally approved estimates systems.",
                },
                {
                  icon: Clock,
                  title: "Late Nights",
                  description:
                    "Burning the midnight oil just to keep up with paperwork and admin.",
                  benefit:
                    "Automated invoicing, digital payments, and one-click financial tracking.",
                  didYouKnow:
                    "Our customers report saving 4-8 hours per week after solving their late nights problems with Autoworx.",
                },
                {
                  icon: DollarSign,
                  title: "Sky-High Processing Fees",
                  description:
                    "Credit card fees eating away at your hard-earned revenue.",
                  benefit:
                    "Competitive payment processing with the ability to beat any other provider's rates.",
                  didYouKnow:
                    "Most restyling shops lose up to 25% of potential revenue due to inefficient sky-high processing fees systems.",
                },
              ].map((item, index) => (
                <AccordionItem value={item.title} key={index} className="">
                  <AccordionTrigger>
                    <div className="flex items-center space-x-3">
                      <div className="w-fit rounded-full bg-[#DBEAFE] p-3">
                        <item.icon className="h-6 w-6 text-[#2563EB]" />
                      </div>
                      <span className="text-xl font-semibold text-[#020817]">
                        {item.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-4 text-lg">
                    <Card className="p-4">
                      <p className="pb-4 text-sm text-[#334155]">
                        {item.description}
                      </p>
                      {/* Benefits section */}
                      <div className="mb-4 flex items-start gap-2">
                        <div className="flex items-center justify-center rounded-full bg-green-100 p-1">
                          <Plus className="h-4 w-4 flex-shrink-0 text-green-600" />
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-green-700">
                            With Autoworx:
                          </span>
                          <span className="ml-1 w-full font-medium text-green-700">
                            {item.benefit}
                          </span>
                        </div>
                      </div>

                      {/* Info box */}
                      <div className="w-full rounded-lg bg-[#DBEAFE]/50 px-4 py-2 text-sm">
                        <span className="font-bold text-[#2563EB]">
                          Did You Know?
                        </span>
                        <span className="ml-1 w-full text-sm font-medium text-[#2563EB]">
                          {item.didYouKnow}
                        </span>
                      </div>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* The Real Cost */}
          <Card className="mx-auto mt-12 max-w-4xl border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-full w-fit rounded-full bg-[#FEE2E2] p-3">
                  <X className="h-6 w-6 text-[#DC2626]" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-[#0F172A]">
                    The Real Cost
                  </h3>
                  <p className="text-[#475569]">
                    Most custom auto shop owners lose an estimated 20–80% of
                    leads due to slow or missed responses, and waste countless
                    hours juggling multiple platforms that don&#39;t sync.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
