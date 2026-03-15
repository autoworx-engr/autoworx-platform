import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, ...props }) => (
  <div>
    <label className="block font-medium">{label}</label>
    <textarea className="mt-1 w-full border rounded p-2" {...props} />
  </div>
);
