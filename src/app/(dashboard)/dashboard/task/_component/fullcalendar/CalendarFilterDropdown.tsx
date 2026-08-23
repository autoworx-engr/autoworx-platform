"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../../../components/ui/dropdown-menu";

type FilterOption = {
  id: number;
  name: string;
};

type CalendarFilterDropdownProps = {
  teamMates: FilterOption[];
  categories: FilterOption[];
  selectedTeamMateIds: number[];
  selectedCategoryIds: number[];
  onSelectedTeamMateIdsChange: (ids: number[]) => void;
  onSelectedCategoryIdsChange: (ids: number[]) => void;
};

export function CalendarFilterDropdown({
  teamMates,
  categories,
  selectedTeamMateIds,
  selectedCategoryIds,
  onSelectedTeamMateIdsChange,
  onSelectedCategoryIdsChange,
}: CalendarFilterDropdownProps) {
  const [activeFilterTab, setActiveFilterTab] = useState<
    "teamMate" | "category"
  >("teamMate");

  const allTeamMatesSelected =
    teamMates.length > 0 && selectedTeamMateIds.length === teamMates.length;
  const allCategoriesSelected =
    categories.length > 0 && selectedCategoryIds.length === categories.length;

  const handleToggleTeamMate = (id: number, checked: boolean) => {
    if (checked) {
      if (selectedTeamMateIds.includes(id)) return;
      onSelectedTeamMateIdsChange([...selectedTeamMateIds, id]);
    } else {
      onSelectedTeamMateIdsChange(selectedTeamMateIds.filter((i) => i !== id));
    }
  };

  const handleToggleAllTeamMates = (checked: boolean) => {
    onSelectedTeamMateIdsChange(checked ? teamMates.map((t) => t.id) : []);
  };

  const handleToggleCategory = (id: number, checked: boolean) => {
    if (checked) {
      if (selectedCategoryIds.includes(id)) return;
      onSelectedCategoryIdsChange([...selectedCategoryIds, id]);
    } else {
      onSelectedCategoryIdsChange(selectedCategoryIds.filter((i) => i !== id));
    }
  };

  const handleToggleAllCategories = (checked: boolean) => {
    onSelectedCategoryIdsChange(checked ? categories.map((c) => c.id) : []);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 flex-1 lg:flex-none w-full lg:w-auto"
          disabled={!teamMates.length && !categories.length}
        >
          <Filter size={14} />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="mb-1 grid grid-cols-2 border-b">
          <button
            type="button"
            onClick={() => setActiveFilterTab("teamMate")}
            className={`px-3 py-2 text-sm ${
              activeFilterTab === "teamMate"
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-500"
            }`}
          >
            Teammate
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab("category")}
            className={`px-3 py-2 text-sm ${
              activeFilterTab === "category"
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-500"
            }`}
          >
            Category
          </button>
        </div>

        <div className="max-h-72 h-full overflow-y-auto overflow-x-hidden">
          {activeFilterTab === "teamMate" ? (
            <>
              {teamMates.length > 0 ? (
                <>
                  <DropdownMenuCheckboxItem
                    checked={allTeamMatesSelected}
                    onCheckedChange={(checked) =>
                      handleToggleAllTeamMates(Boolean(checked))
                    }
                  >
                    Select All
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  {teamMates.map((mate) => (
                    <DropdownMenuCheckboxItem
                      key={mate.id}
                      checked={selectedTeamMateIds.includes(mate.id)}
                      onCheckedChange={(checked) =>
                        handleToggleTeamMate(mate.id, Boolean(checked))
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {mate.name}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              ) : (
                <div className="px-3 py-3 text-sm text-slate-500">
                  No teammate available
                </div>
              )}
            </>
          ) : (
            <>
              {categories.length > 0 ? (
                <>
                  <DropdownMenuCheckboxItem
                    checked={allCategoriesSelected}
                    onCheckedChange={(checked) =>
                      handleToggleAllCategories(Boolean(checked))
                    }
                  >
                    Select All
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  {categories.map((cat) => (
                    <DropdownMenuCheckboxItem
                      key={cat.id}
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={(checked) =>
                        handleToggleCategory(cat.id, Boolean(checked))
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {cat.name}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              ) : (
                <div className="px-3 py-3 text-sm text-slate-500">
                  No category available
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
