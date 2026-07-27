"use client";

import UserComponent from "./UserComponent";
import UserRolesTable from "./UserRolesTable";

export default function Page() {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-600 sm:text-3xl">
            Team Access & Permissions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage role defaults and fine-tune permissions for individual team
            members.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Security controls
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
          <UserRolesTable />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
          <UserComponent />
        </div>
      </div>
    </div>
  );
}
