import { Search } from "lucide-react";
import React from "react";

const ResourceHeader = ({
  title,
  description,
  setFilter,
}: {
  title: string;
  description: string;
  setFilter: (filter: { search: string }) => void;
}) => {
  return (
    <>
      <div className="text-[#66738C]">
        <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-base font-normal">{description}</p>
      </div>
      <div className="flex w-full items-center gap-x-8 bg-background lg:w-fit mt-3 lg:mt-6">
        <div className="flex w-full items-center gap-x-2 rounded-md border border-gray-300 px-4 py-1 text-gray-400 lg:w-[500px]">
          <span className="">
            <Search className="w-5 h-5" />
          </span>
          <input
            name="search"
            type="text"
            className="w-full rounded-md border border-white px-2 focus:outline-none"
            placeholder="Search..."
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
      </div>
    </>
  );
};

export default ResourceHeader;
