import React, { useState, useRef, useEffect } from "react";
import { MdOutlineCancel } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { cn } from "@/lib/utils";

export type Option = {
  id: string | number;
  title: string;
};

type MultiSelectProps = {
  options: Option[];
  value: (string | number)[];
  onChange: (newValue: (string | number)[]) => void;
  label: string;
  placeholder?: string;
  required: boolean;
  error?:string;
};

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  label,
  required,
  error,
  placeholder = "Select options",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string | number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleDelete = (id: string | number, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className={cn("mb-1 font-medium text-gray-500")}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </div>
      <div
        onClick={() => setOpen((prev) => !prev)}
        className={cn("flex w-full cursor-pointer flex-wrap items-center gap-2 rounded border border-slate-400 bg-white px-2 py-0.5",
          error && "border-red-500 focus:border-red-500",
        )}
      >
        {value?.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          value?.map((id) => {
            const option = options?.find((opt) => opt?.id === id);
            return (
              <span
                key={id}
                className="flex items-center rounded-[5px] bg-gray-100 px-2 py-1 text-xs"
              >
                {option?.title}
                <MdOutlineCancel
                  className="ml-1 cursor-pointer text-gray-600 hover:text-red-600"
                  size={14}
                  onClick={(e) => handleDelete(id, e)}
                />
              </span>
            );
          })
        )}
        <IoIosArrowDown size={20} className="ml-auto text-gray-500" />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border bg-white shadow">
          {options.map((option) => (
            <div
              key={option?.id}
              onClick={() => handleSelect(option?.id)}
              className={`cursor-pointer px-4 py-2 hover:bg-indigo-100 ${
                value?.includes(option?.id)
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : ""
              }`}
            >
              {option?.title}
            </div>
          ))}
        </div>
      )}

      {error && <div className="mt-1 px-2 text-xs text-red-500">{error}</div>}
    </div>
  );
};

export default MultiSelect;
