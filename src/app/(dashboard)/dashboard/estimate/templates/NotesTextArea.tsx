interface NotesTextAreaProps {
  value: string;
  onChange: (notes: string) => void;
  placeholder?: string;
}

const NotesTextArea = ({ value, onChange, placeholder }: NotesTextAreaProps) => {
    return <textarea
          className="rounded col-span-full border border-solid border-slate-500 p-2 w-full"
          name="customer-notes"
          rows={5}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
}

export default NotesTextArea;