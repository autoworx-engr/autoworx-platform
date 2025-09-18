"use client";
import React from "react";

import UserRolesTable from "./UserRolesTable";
import UserComponent from "./UserComponent";

export default function Page() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      <div className="#w-1/2">
        <UserRolesTable />
      </div>

      <div className="#w-1/2">
        <UserComponent />
      </div>
    </div>
  );
}
