import { ReactNode } from "react";
import ClientLists from "./_component/ClientLists";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communication Hub - Client",
  description: "Manage client and supplier collaboration",
};

type TProps = {
  children: ReactNode;
};

export default function ClientLayoutRoot({ children }: TProps) {
  return (
    <div className="grid grid-cols-12 gap-x-6 lg:overflow-y-hidden lg:pb-3 xl:gap-x-10">
      <div className="col-span-12 px-2 lg:col-span-5 lg:px-0 xl:col-span-3">
        <ClientLists />
      </div>
      <div className="col-span-12 lg:col-span-7 xl:col-span-9">{children}</div>
    </div>
  );
}
