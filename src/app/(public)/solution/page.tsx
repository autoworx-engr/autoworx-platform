import Banner from "@/components/solution-ui/Banner";
import Beta from "@/components/solution-ui/Beta";
import CallToAction from "@/components/solution-ui/CallToAction";
import Footer from "@/components/solution-ui/Footer";
import Header from "@/components/solution-ui/Header";
import Problem from "@/components/solution-ui/Problem";
import Solution from "@/components/solution-ui/Solution";
import Testimonial from "@/components/solution-ui/Testimonial";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solution",
  description: "Discover how Autoworx solves your shop management challenges.",
};

export default function SolutionPage() {
  return (
    <div>
      <Header />
      <Banner />
      <Problem />
      <Solution />
      <Testimonial />
      <Beta />
      <CallToAction />
      <Footer />
    </div>
  );
}
