interface NotesTextAreaProps {
  value: string;
  onChange: (notes: string) => void;
  placeholder?: string;
  name?:string;
}

const NotesTextArea = ({ value, onChange, placeholder, name }: NotesTextAreaProps) => {
    return <textarea
          className="rounded col-span-full border border-solid border-slate-500 p-2 w-full focus:outline-blue-400"
          name={name}
          rows={5}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
}

export default NotesTextArea;