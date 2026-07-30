import { cn } from "@/lib/cn";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import React from "react";

type item = {
  [key: string]: any;
};
interface SelectProps {
  label: string;
  items: item[];
  onChange?: (value: string | null) => void;
  onClose?: () => void;
  value: string | null;
}

const SelectComponent = ({
  label,
  items,
  onChange,
  onClose,
  value,
}: SelectProps) => {
  return (
    <div className="w-full min-w-[300px] space-y-2">
      {label && (
        <label className="font-semibold text-slate-600 ml-1">{label}</label>
      )}

      <Select.Root onValueChange={onChange} value={value || ""}>
        <Select.Trigger className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-600 outline-none hover:bg-slate-50 transition-all">
          <Select.Value placeholder={`Select ${label}`} />

          <Select.Icon>
            <ChevronDown size={16} className="text-slate-400" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            className="z-[100] min-w-[300px] overflow-hidden rounded-2xl border border-slate-50 bg-white shadow-xl animate-in fade-in zoom-in-95"
          >
            <Select.Viewport className="p-2">
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto thin-scrollbar">
                {items.map((item) => (
                  <Select.Item
                    key={item.id}
                    value={item.value}
                    className="relative flex py-3 cursor-pointer select-none items-center rounded-lg px-3 text-sm font-medium text-slate-600 outline-none border-b data-[highlighted]:bg-primary data-[highlighted]:text-white data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                  >
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </div>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

const SelectItem = React.forwardRef(
  ({ children, className, ...props }: any, forwardedRef) => {
    return (
      <Select.Item
        className={cn(
          "relative z-50 flex min-w-[200px] cursor-pointer select-none items-center rounded-[3px] border-b px-2 py-4 leading-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none",
          className,
        )}
        {...props}
        ref={forwardedRef}
      >
        <Select.ItemText>{children}</Select.ItemText>
        {/* <Select.ItemIndicator className="absolute left-0 z-50 inline-flex w-[25px] items-center justify-center">
          <CheckCircleOutlined />
        </Select.ItemIndicator> */}
      </Select.Item>
    );
  },
);

export default SelectComponent;
