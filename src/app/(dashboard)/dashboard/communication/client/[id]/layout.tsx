import React from "react";

type TProps = {
  children: React.ReactNode;
  conversations: React.ReactNode;
  details: React.ReactNode;
};

export default function ClientLayout({ conversations, details }: TProps) {
  return (
    <>
      <div className="grid grid-cols-12 xl:gap-x-10">
        <div className="col-span-12 xl:col-span-6">{conversations}</div>
        <div className="col-span-12 xl:col-span-6">{details}</div>
      </div>
    </>
  );
}
