"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const reviews = [
  // Your reviews array remains the same
  {
    id: 1,
    avatar: "/landing/OwnerOfTCCustoms.jpeg",
    text: `“We’re a small team, so staying organized is everything. Having a sales board to track leads and a separate shop board for active jobs makes it so much easier to stay on top of things—no more missed leads or forgotten installs. The integrated payments are a game-changer—customers pay us before we even have to ask!”`,
    author: "Asil M.",
    role: "Owner of TC Customs",
    rating: 5,
  },
  {
    id: 2,
    avatar: "/landing/OwnerofASM.jpeg",
    text: `“Autoworx has completely changed the way we run our shop. Scheduling, invoicing, inventory — everything’s in one place now. We’re saving hours every week, and our team finally feels organized instead of overwhelmed. Couldn’t imagine going back.”`,
    author: "Sahel M",
    role: "Owner of ASM Performance",
    rating: 5,
  },
  {
    id: 3,
    avatar: "/landing/CoOwnerofLuxe.jpeg",
    text: `“As both a service and retail shop — where we not only install wraps but also sell materials — Autoworx has been a total game changer. We can finally track which materials are used on each job, what’s sold over the counter, and even the ROI on every product we carry. It’s taken the guesswork out of our inventory and helped us make smarter decisions across the board. No other platform we’ve used comes close.”`,
    author: "Angelo W",
    role: "Co owner Luxe Wrap Stars",
    rating: 5,
  },
  {
    id: 4,
    avatar: "/landing/beckscarcare.png",
    text: `“AutoWorks Transformed My Business. I’ve tried various software over the years, but nothing compares to AutoWorks. Their all-in-one platform covers booking, invoicing, estimates, inventory, customer management, and more, all in one easy-to-use dashboard. It’s streamlined my workflow, saved me hours each week, and helped me stay organized. If you want to level up your business, this is the tool to get.”`,
    author: "Steven B",
    role: "Owner of Becks Car Care",
    rating: 5,
  },
];

export default function ReviewSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState("right");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth >= 767 && window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getAdjacentReviews = () => {
    const next = (currentIndex + 1) % reviews.length;
    const prev = (currentIndex - 1 + reviews.length) % reviews.length;
    return {
      current: reviews[currentIndex],
      next: reviews[next],
      prev: reviews[prev],
    };
  };

  const { current, next, prev } = getAdjacentReviews();

  const handleNavigation = (dir: React.SetStateAction<string>) => {
    setDirection(dir);
    setCurrentIndex((prevIndex) =>
      dir === "right"
        ? (prevIndex + 1) % reviews.length
        : (prevIndex - 1 + reviews.length) % reviews.length
    );
  };

  const cardVariants = {
    enter: (direction: string) => ({
      x: direction === "right" ? "100%" : "-100%",
      scale: 0.9,
      opacity: 0,
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      transition: { duration: 0.5 },
    },
    exit: (direction: string) => ({
      x: direction === "right" ? "-100%" : "100%",
      scale: 0.9,
      opacity: 0,
      transition: { duration: 0.5 },
    }),
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#26AADF]/45 to-[#01A79E]/45 py-20">
      <div className="relative mx-auto flex h-[600px] w-full max-w-4xl items-center">
        {isMobile ? (
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              key={`mobile-${currentIndex}`}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 top-0 mx-auto w-full max-w-sm items-center justify-center px-8 sm:h-[500px] sm:max-w-md"
            >
              <Card review={current} isMobile={true} />
            </motion.div>
          </AnimatePresence>
        ) : isTablet ? (
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              key={`mobile-${currentIndex}`}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 top-0 mx-auto w-full max-w-sm items-center justify-center px-8 sm:h-[500px] sm:max-w-md"
            >
              <Card review={current} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <>
            {/* Back Cards */}
            <div className="absolute left-1/2 top-4 flex -translate-x-80 gap-8">
              <div className="relative -translate-x-48 scale-90 transform opacity-50">
                <Card review={prev} isBack={true} />
              </div>
              <div className="relative translate-x-12 scale-90 transform opacity-50">
                <Card review={next} isBack={true} />
              </div>
            </div>

            {/* Front Card */}
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={`desktop-${currentIndex}`}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute top-0 z-20 md:-translate-x-2 lg:left-[30%] lg:-translate-x-48"
              >
                <Card review={current} />
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={() => handleNavigation("left")}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-colors hover:bg-gray-100"
      >
        <svg
          className="h-6 w-6 text-[#01A79E]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onClick={() => handleNavigation("right")}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg transition-colors hover:bg-gray-100"
      >
        <svg
          className="h-6 w-6 text-[#01A79E]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </section>
  );
}

function Card({ review, isBack = false }: any) {
  const stars = Array.from({ length: review.rating }).map((_, i) => (
    <svg
      key={i}
      className="h-6 w-6 fill-current text-[#01A79E]"
      viewBox="0 0 24 24"
    >
      <path d="M12 .587l3.668 7.431L24 9.751l-6 5.847L19.335 24 12 20.013 4.665 24 6 15.598 0 9.751l8.332-1.733z" />
    </svg>
  ));

  return (
    <div
      className={`flex h-[600px] flex-col items-center rounded-2xl bg-white p-8 text-center shadow-lg md:w-96 ${
        isBack ? "scale-90 opacity-50" : "scale-100 opacity-100"
      }`}
    >
      <Image
        src={review.avatar}
        alt={review.author}
        width={112}
        height={112}
        className="-mt-16 h-28 w-28 rounded-full border-4 border-white object-cover"
      />
      <p className="mt-10 text-base leading-relaxed text-gray-800">
        {review.text}
      </p>
      <div className="mt-auto flex w-full flex-col items-center">
        <p className="mt-4 font-semibold">
          - {review.author}, <span className="font-normal">{review.role}</span>
        </p>
        <div className="mt-4 flex">{stars}</div>
      </div>
    </div>
  );
}
