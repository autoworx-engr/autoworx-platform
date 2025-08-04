import { useRef, useEffect } from "react";

type ColumnOption = {
  id: number | null;
  value: string;
  label: string;
};

interface ColumnDropdownProps {
  options: ColumnOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ColumnDropdown({
  options,
  onSelect,
  onClose,
  isOpen,
}: ColumnDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSelect = (value: string) => {
    onSelect(value);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No other columns available
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id || option.value}
                  onClick={() => handleSelect(option.value)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:outline-none"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
