import Selector from "@/components/Selector";
import React, { useState } from "react";

type Item = {
  id: string;
  value: string;
  label: string;
};

interface SelectProps {
  label: string;
  items: Item[];
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}

const SelectComponent = ({
  label,
  items,
  value,
  onChange,
  required,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedItem = items.find((item) => item.value === value) || null;

  return (
    <div className="w-full">
      <label className="mb-1 block w-full font-medium text-slate-600 dark:text-slate-200 transition-colors duration-300">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <Selector<Item>
        label={(item) => (item ? item.label : `Select ${label}`)}
        newButton={<div className="hidden"></div>}
        items={items}
        displayList={(item) => <p>{item.label}</p>}
        onSearch={(search) =>
          items.filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase()),
          )
        }
        openState={[isOpen, setIsOpen]}
        selectedItem={selectedItem}
        onSelect={(item) => onChange(item.value)}
      />
    </div>
  );
};

export default SelectComponent;
