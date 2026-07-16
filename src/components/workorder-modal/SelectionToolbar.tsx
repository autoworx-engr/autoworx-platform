interface SelectionToolbarProps {
  selectedIds: number[];
  photosState: {
    id: number | string;
    photo: string;
    technicianName: string;
    timestamp: string;
    invoiceId?: string;
    technicianId?: number;
  }[];
  selectableIds: number[];
  allSelectableSelected: boolean;
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
}

export const SelectionToolbar = ({
  selectedIds,
  photosState,
  selectableIds,
  allSelectableSelected,
  setSelectedIds,
}: SelectionToolbarProps) => {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium text-foreground">Selected images</h3>
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} of {photosState.length} selected
        </p>
      </div>

      <button
        onClick={() => {
          if (selectableIds.length === 0) return;

          if (allSelectableSelected) {
            // unselect all selectable
            setSelectedIds((s) =>
              s.filter((id) => !selectableIds.includes(id)),
            );
          } else {
            // add all selectable ids
            setSelectedIds((s) =>
              Array.from(new Set([...s, ...selectableIds])),
            );
          }
        }}
        disabled={selectableIds.length === 0}
        className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 md:text-sm bg-primary"
      >
        {selectableIds.length === 0
          ? "No selectable images"
          : allSelectableSelected
            ? "Unselect all"
            : "Select all"}
      </button>
    </div>
  );
};
