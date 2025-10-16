import * as Select from "@radix-ui/react-select";
import React from "react";
import { ChevronDown } from "lucide-react";

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
  return (
    <div className="w-full">
      <label className="mb-1 block w-full font-medium text-slate-500">
        {required && <span className="text-red-600">*</span>}
        {label}
      </label>
      <Select.Root value={value ?? ""} onValueChange={onChange}>
        <Select.Trigger className="flex w-full items-center justify-between rounded border border-slate-400 bg-white px-2 py-2 text-sm text-slate-500 outline-none">
          <Select.Value placeholder={`Select ${label}`} />
          <Select.Icon>
            <ChevronDown size={18} className="text-slate-500" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            sideOffset={4}
            className="z-[9999] w-[var(--radix-select-trigger-width)] overflow-auto rounded border border-slate-300 bg-white shadow-sm"
            position="popper"
            align="start"
            avoidCollisions
          >
            <Select.Viewport className="py-1">
              {items.map((item) => (
                <SelectItem key={item.id} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Item>
>(({ children, className, ...props }, ref) => {
  return (
    <Select.Item
      className="cursor-pointer select-none px-2 py-1 text-slate-500 outline-none hover:bg-blue-50 focus:bg-blue-50"
      {...props}
      ref={ref}
    >
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
});
SelectItem.displayName = "SelectItem";

export default SelectComponent;
