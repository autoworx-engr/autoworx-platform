"use client";
import { cn } from "@/lib/cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { capitalCase } from "change-case";
import { useEffect, useRef } from "react";
import { TFilterModalState } from "../../(report)/revenue/FilterHeader";
type TProps = {
  selectedItem: string;
  items: string[];
  type: string;
  modalName: string;
  closeModal: (modalName: string) => void;
  toggleModal: (modalName: string) => void;
  activeModal: TFilterModalState;
};
export default function FilterBySelection({
  selectedItem,
  items,
  type,
  modalName,
  closeModal,
  activeModal,
  toggleModal,
}: TProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // const [show, setShow] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeModal(modalName);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelection = (value: string) => {
    const searchParams = new URLSearchParams(params!);
    searchParams.set("page", "1");
    searchParams.set(type, value);
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
    closeModal(modalName);
  };

  const handleClear = () => {
    const searchParams = new URLSearchParams(params!);
    searchParams.delete(type);
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
    closeModal(modalName);
  };
  return (
    <div className="relative w-full lg:w-fit">
      <button
        ref={buttonRef}
        onClick={() => toggleModal(modalName)}
        className={cn(
          "w-full flex items-center justify-center gap-x-2 text-base lg:gap-x-2",
          "rounded-xl px-3 py-2 transition-transform duration-500 ease-out transform hover:scale-[1.02]",
          "bg-white dark:bg-slate-900",
          "ring-1 ring-slate-900/5 dark:ring-slate-700/20 hover:ring-[#6470fd]/50 hover:shadow-sm",
          activeModal[modalName as keyof TFilterModalState]
            ? "ring-2 ring-[#6470fd] shadow-[0_20px_40px_-12px_rgba(100,112,253,0.10)]"
            : "",
          "md:w-44",
          // keep rounded corners adjustments consistent with previous behavior
          activeModal[modalName as keyof TFilterModalState]
            ? "rounded-md"
            : "rounded-xl",
          selectedItem ? "border-2 border-[#6470fd]" : "border",
        )}
      >
        <span className="truncate max-w-[10rem] text-slate-600 dark:text-slate-200">
          {selectedItem
            ? selectedItem
            : type === "types"
              ? "Types"
              : capitalCase(type)}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
          role="img"
          className={cn(
            "ml-2 text-slate-500 dark:text-slate-300 transition-transform duration-200",
            activeModal[modalName as keyof TFilterModalState]
              ? "text-[#6470fd]"
              : "",
          )}
        >
          <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
        </svg>
      </button>
      {activeModal[modalName as keyof TFilterModalState] && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute left-0 right-0 z-50 flex max-h-52 w-full flex-col bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-2 shadow-lg border-transparent md:w-44",
            "ring-1 ring-slate-900/5 dark:ring-slate-700/20 transition-all duration-200",
          )}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pb-1 min-w-0">
            {items.map((item) => (
              <button
                onClick={() => handleSelection(item)}
                key={item}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-200 w-full",
                  item === selectedItem
                    ? "bg-[#6470fd] text-white shadow-[0_8px_30px_rgba(100,112,253,0.12)]"
                    : "text-slate-600 border dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60",
                )}
              >
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
          <div className="pt-1 border-t border-transparent bottom-0 sticky bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            <button
              disabled={!selectedItem}
              onClick={handleClear}
              className={cn(
                "w-full text-left px-3 py-2 text-sm text-white bg-[#de5967] rounded-lg",
                !selectedItem && "opacity-50 cursor-not-allowed",
              )}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
