import React from "react";

type TProps = {
  children: React.ReactNode;
  conversations: React.ReactNode;
  details: React.ReactNode;
};

export default function ClientLayout({ conversations, details }: TProps) {
  return (
    <>
      <div className="grid grid-cols-12 lg:gap-10">
        <div className="col-span-12 lg:col-span-5">{conversations}</div>
        <div className="col-span-12 lg:col-span-7">{details}</div>
      </div>
    </>
  );
}
