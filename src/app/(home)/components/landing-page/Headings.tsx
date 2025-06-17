import React from "react";

const Headings = ({ title }: { title: string }) => {
  return (
    <>
      <h1 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text pb-5 text-center text-3xl font-extrabold italic text-transparent md:text-6xl">
        {title}
      </h1>
    </>
  );
};

export default Headings;
