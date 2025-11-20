"use client";
import React from "react";

import UserRolesTable from "./UserRolesTable";
import UserComponent from "./UserComponent";

export default function Page() {
  return (
    <div className="p-2"> {/* Added padding for overall page spacing */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🔑 Team Access & Permissions
      </h1>
      {/* Container for the two main components */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 w-full">
        {/* User Roles Table (Default Permissions) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0">
          <UserRolesTable />
        </div>

        {/* User Component (Custom Permissions) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-0">
          <UserComponent />
        </div>
      </div>
    </div>
  );
}
