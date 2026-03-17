import React from "react";

interface FileUploadProps {
  label: string;
  previewUrl?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  height?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  previewUrl,
  onChange,
  height = "h-16",
}) => (
  <div>
    <label className="block font-medium">{label}</label>
    <input type="file" accept="image/*" onChange={onChange} className="mt-1" />
    {previewUrl && (
      <img src={previewUrl} alt="Preview" className={`${height} mt-2`} />
    )}
  </div>
);
