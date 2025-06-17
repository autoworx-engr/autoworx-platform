import { ReactNode } from "react";
import ClientLists from "./_component/ClientLists";

type TProps = {
  children: ReactNode;
};

export default function ClientLayoutRoot({ children }: TProps) {
  return (
    <div className="grid grid-cols-12 lg:gap-10 lg:overflow-y-hidden lg:pb-3">
      <div className="col-span-12 px-2 lg:col-span-3 lg:px-0">
        <ClientLists />
      </div>
      <div className="col-span-12 lg:col-span-9">{children}</div>
    </div>
  );
}
