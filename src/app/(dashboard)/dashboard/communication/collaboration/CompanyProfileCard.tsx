"use client";

import Image from "next/image";
import { MapPin, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";

export default function CompanyProfileCard({ company }: { company?: any }) {
  const [activeTab, setActiveTab] = useState<"reviews" | "write">("reviews");

  /* ---------------- STATIC DEFAULT DATA ---------------- */

  const defaultCompany = {
    name: "Elite Auto Films",
    location: "Los Angeles, CA",
    rating: 4.9,
    totalReviews: 127,
    teamSize: "Medium",
    jobsDone: 342,
    about:
      "Premium PPF and vinyl wrap specialists with 15+ years of experience. We focus on high-end vehicles and custom designs.",
    specializations: [
      "Dry Install PPF",
      "Wet Install PPF",
      "Vinyl Wrap",
      "Ceramic Coating",
    ],
    collaborationCount: 10,
  };

  const data = defaultCompany;

  const initials = data.name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-[380px] rounded-xl bg-white shadow-md border p-4 space-y-4 md:h-[83vh] overflow-y-auto">
      {/* Header */}
      <h2 className="text-lg font-semibold">Profile</h2>

      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex items-center justify-center w-[90px] h-[90px] rounded-full bg-teal-600 text-white text-3xl font-bold">
            {initials}
          </div>
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        </div>

        <h3 className="mt-3 text-xl font-bold">{data.name}</h3>

        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <MapPin size={14} />
          {data.location}
        </div>

        <div className="flex items-center gap-1 mt-2 text-sm">
          <div className="text-yellow-500">{"★★★★★"}</div>
          <span className="text-gray-600">
            {data.rating} ({data.totalReviews})
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-100 p-3 text-center">
          <Users className="mx-auto mb-1 text-gray-500" size={16} />
          <p className="text-xs text-gray-500">Team Size</p>
          <p className="font-semibold">{data.teamSize}</p>
        </div>

        <div className="rounded-lg bg-gray-100 p-3 text-center">
          <Briefcase className="mx-auto mb-1 text-gray-500" size={16} />
          <p className="text-xs text-gray-500">Jobs Done</p>
          <p className="font-semibold">{data.jobsDone}</p>
        </div>
      </div>

      {/* About */}
      <div>
        <h4 className="font-semibold mb-1">About</h4>
        <p className="text-sm text-gray-600">{data.about}</p>
      </div>

      {/* Specializations */}
      <div>
        <h4 className="font-semibold mb-2">Specializations</h4>
        <div className="flex flex-wrap gap-2">
          {data?.specializations?.map((spec: string, i: number) => (
            <span
              key={i}
              className="rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-medium"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Collaboration Box */}
      <div className="rounded-lg bg-teal-50 border p-3 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Your Collaboration
          </p>
          <p className="text-xs text-gray-500">Jobs completed together</p>
        </div>
        <p className="font-bold text-teal-700">{data.collaborationCount}</p>
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 rounded-lg p-1 flex text-sm">
        <button
          onClick={() => setActiveTab("reviews")}
          className={cn(
            "flex-1 py-2 rounded-md",
            activeTab === "reviews" && "bg-white shadow",
          )}
        >
          Reviews (2)
        </button>

        <button
          onClick={() => setActiveTab("write")}
          className={cn(
            "flex-1 py-2 rounded-md",
            activeTab === "write" && "bg-white shadow",
          )}
        >
          Write Review
        </button>
      </div>

      {activeTab === "reviews" ? (
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">You</p>
          <p>
            Exceptional PPF work on my client's Porsche. Flawless installation
            and great communication throughout.
          </p>
        </div>
      ) : (
        <form className="space-y-3">
          <textarea
            placeholder="Write your review..."
            className="w-full h-20 resize-none border rounded-md p-2 text-sm"
          />
          <button
            type="submit"
            className="w-full bg-[#006D77] text-white py-2 rounded-md text-sm"
          >
            Submit Review
          </button>
        </form>
      )}
    </div>
  );
}
