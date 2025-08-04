import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { ChevronUp, Plus } from "lucide-react";

export default function ProblemCard({ item }: any) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Card className="p-6 transition-shadow hover:shadow-lg">
      <CardContent className="p-0">
        <div className="">
          <div className="flex items-center justify-between">
            <div className="w-fit rounded-full bg-[#DBEAFE] p-3">
              <item.icon className="h-6 w-6 text-[#2563EB]" />
            </div>
            <div
              onClick={toggleDropdown}
              className="cursor-pointer rounded-full p-1 hover:bg-gray-200"
            >
              <ChevronUp
                className={`h-6 w-6 text-gray-500 transition-transform duration-200 ${
                  isOpen ? "rotate-0" : "rotate-180"
                }`}
              />
            </div>
          </div>
          <h3 className="pb-2 pt-4 text-xl font-semibold text-[#0F172A]">
            {item.title}
          </h3>
          <p className="text-[#475569]">{item.description}</p>
        </div>
        <div
          className={`overflow-hidden border-t pt-4 transition-all duration-300 ease-in-out ${
            isOpen ? "mt-4 max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {/* Benefits section */}
          <div className="mb-4 flex items-start gap-2">
            <div className="flex items-center justify-center rounded-full bg-green-100 p-1">
              <Plus className="h-4 w-4 flex-shrink-0 text-green-600" />
            </div>
            <div>
              <span className="font-bold text-green-700">With Autoworx:</span>
              <span className="ml-1 font-medium text-green-700">
                {item.benefit}
              </span>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-[#DBEAFE]/50 px-4 py-2">
            <span className="font-medium text-[#2563EB]">Did You Know?</span>
            <span className="ml-1 text-sm font-medium text-[#2563EB]">
              {item.didYouKnow}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
