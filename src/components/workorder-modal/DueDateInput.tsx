"use client";
import React, { useEffect, useRef, useState } from "react";

type TProps = {
  dueDate: string | null;
  setDueDate: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function DueDate({ dueDate, setDueDate }: TProps) {
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);



  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setDueDate(date);
  };



  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInput(true);
    }, 0.1);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mt-1">
      {showInput && (
        <>
          <label className="flex flex-col md:items-start md:text-base">
            <span className="mb-1 font-medium">Due Date</span>
            <input
              ref={inputRef}
              name="dueDate"
              type="date"
              value={dueDate ?? ""}
              onChange={handleDateChange}
              className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
              autoFocus={false}
            />
          </label>
        </>
      )}
    </div>
  );
}
