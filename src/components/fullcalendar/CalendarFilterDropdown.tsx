"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type FilterOption = {
  id: number;
  name: string;
};

type CalendarFilterDropdownProps = {
  users: FilterOption[];
  technicians: FilterOption[];
  selectedUserIds: number[];
  selectedTechnicianIds: number[];
  onSelectedUserIdsChange: (ids: number[]) => void;
  onSelectedTechnicianIdsChange: (ids: number[]) => void;
};

export function CalendarFilterDropdown({
  users,
  technicians,
  selectedUserIds,
  selectedTechnicianIds,
  onSelectedUserIdsChange,
  onSelectedTechnicianIdsChange,
}: CalendarFilterDropdownProps) {
  const [activeFilterTab, setActiveFilterTab] = useState<"user" | "technician">(
    "technician",
  );

  const allUsersSelected =
    users.length > 0 && selectedUserIds.length === users.length;
  const allTechniciansSelected =
    technicians.length > 0 &&
    selectedTechnicianIds.length === technicians.length;

  const handleToggleUser = (userId: number, checked: boolean) => {
    if (checked) {
      if (selectedUserIds.includes(userId)) {
        return;
      }
      onSelectedUserIdsChange([...selectedUserIds, userId]);
      return;
    }

    onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
  };

  const handleToggleTechnician = (technicianId: number, checked: boolean) => {
    if (checked) {
      if (selectedTechnicianIds.includes(technicianId)) {
        return;
      }
      onSelectedTechnicianIdsChange([...selectedTechnicianIds, technicianId]);
      return;
    }

    onSelectedTechnicianIdsChange(
      selectedTechnicianIds.filter((id) => id !== technicianId),
    );
  };

  const handleToggleAllTechnicians = (checked: boolean) => {
    onSelectedTechnicianIdsChange(checked ? technicians.map((t) => t.id) : []);
  };

  const handleToggleAllUsers = (checked: boolean) => {
    onSelectedUserIdsChange(checked ? users.map((u) => u.id) : []);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={!users.length && !technicians.length}
        >
          <Filter size={14} />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="mb-1 grid grid-cols-2 border-b">
          <button
            type="button"
            onClick={() => setActiveFilterTab("user")}
            className={`px-3 py-2 text-sm ${
              activeFilterTab === "user"
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-500"
            }`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab("technician")}
            className={`px-3 py-2 text-sm ${
              activeFilterTab === "technician"
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-500"
            }`}
          >
            Technician
          </button>
        </div>

        {activeFilterTab === "user" ? (
          <>
            {users.length > 0 ? (
              <>
                <DropdownMenuCheckboxItem
                  checked={allUsersSelected}
                  onCheckedChange={(checked) =>
                    handleToggleAllUsers(Boolean(checked))
                  }
                >
                  Select All
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {users.map((userItem) => (
                  <DropdownMenuCheckboxItem
                    key={userItem.id}
                    checked={selectedUserIds.includes(userItem.id)}
                    onCheckedChange={(checked) =>
                      handleToggleUser(userItem.id, Boolean(checked))
                    }
                  >
                    {userItem.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            ) : (
              <div className="px-3 py-3 text-sm text-slate-500">
                No user available
              </div>
            )}
          </>
        ) : (
          <>
            {technicians.length > 0 ? (
              <>
                <DropdownMenuCheckboxItem
                  checked={allTechniciansSelected}
                  onCheckedChange={(checked) =>
                    handleToggleAllTechnicians(Boolean(checked))
                  }
                >
                  Select All
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />

                {technicians.map((technician) => (
                  <DropdownMenuCheckboxItem
                    key={technician.id}
                    checked={selectedTechnicianIds.includes(technician.id)}
                    onCheckedChange={(checked) =>
                      handleToggleTechnician(technician.id, Boolean(checked))
                    }
                  >
                    {technician.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            ) : (
              <div className="px-3 py-3 text-sm text-slate-500">
                No technician available
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
