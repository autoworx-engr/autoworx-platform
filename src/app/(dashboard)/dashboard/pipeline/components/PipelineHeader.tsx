"use client";

import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import SessionUserType from "@/types/sessionUserType";
import { Column } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ManagePipelines from "./ManagePipelines";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface PipelineHeaderProps {
  title: string;
  toggleButtons: { label: string; href: string }[];
  type: string;
}

export default function PipelineHeader({
  title,
  toggleButtons,
  type,
}: PipelineHeaderProps) {
  const pathname = usePathname();
  const [isPipelineManaged, setPipelineManaged] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUserType>();
  const [columns, setColumns] = useState<Column[]>([]);
  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch("/api/getUser");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    };
    fetchUser();
  }, []);
  useEffect(() => {
    const fetchShopColumns = async () => {
      const columns = await getColumnsByType(type);
      setColumns(columns);
    };

    fetchShopColumns();
  }, [type]);
  const hasManagePipelineAccess =
    currentUser?.employeeType === "Admin" ||
    currentUser?.employeeType === "Manager";

  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex w-full items-center justify-between lg:justify-start">
        <h1 className="mr-4 text-[26px] font-bold text-[#66738C]">{title}</h1>
        <nav className="">
          <ul className="flex list-none items-center p-0 lg:gap-4">
            {toggleButtons.map((button, index) => (
              <li key={index}>
                <Link
                  href={button.href}
                  className={cn(
                    "group flex items-center justify-between rounded py-2.5 transition-all duration-300",
                    "lg:border lg:px-4",
                    pathname === button.href
                      ? "hidden lg:flex lg:bg-[#6571FF] lg:text-white"
                      : "border-[#6571FF] text-[#6571FF] lg:bg-background"
                  )}
                >
                  <span className="font-medium tracking-wide">
                    {button.label}
                  </span>
                  <div className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6571FF] to-[#818eff] shadow-sm text-white transition-all duration-300 group-hover:translate-x-1 group-hover:shadow-md lg:hidden">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {(pathname?.includes("/sales/pipeline") ||
        pathname?.includes("/shop/pipeline")) &&
        hasManagePipelineAccess && (
          <button
            onClick={() => setPipelineManaged(true)}
            className="hidden w-48 rounded border bg-[#6571FF] px-4 py-2 text-white lg:block"
          >
            Manage Pipelines
          </button>
        )}

      {isPipelineManaged && (
        <ManagePipelines
          columns={columns}
          onClose={() => setPipelineManaged(false)}
          pipelineType={type}
        />
      )}
    </header>
  );
}
