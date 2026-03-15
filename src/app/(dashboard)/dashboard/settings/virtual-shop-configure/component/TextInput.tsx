import React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const TextInput: React.FC<TextInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block font-medium">{label}</label>
    <input className="mt-1 w-full border rounded p-2" {...props} />
  </div>
);
