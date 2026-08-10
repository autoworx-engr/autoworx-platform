import { cn } from "@/lib/cn";

interface NotesTextAreaProps {
  value: string;
  onChange: (notes: string) => void;
  placeholder?: string;
  name?: string;
}

const NotesTextArea = ({
  value,
  onChange,
  placeholder,
  name,
}: NotesTextAreaProps) => {
  return (
    <textarea
      className={cn(
        "col-span-full w-full rounded-2xl p-4 text-sm font-medium transition-all duration-200",
        "bg-slate-50 border-2 border-slate-100 outline-none",
        "placeholder:text-slate-400 placeholder:font-normal",
        "focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10",
        "resize-none hover:border-slate-200",
      )}
      name={name}
      rows={5}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
};

export default NotesTextArea;
