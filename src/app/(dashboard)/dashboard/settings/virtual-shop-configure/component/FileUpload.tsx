import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  label: string;
  previewUrl?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
  height?: string;
  width?: string;
  hint?: string;
  circular?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  previewUrl,
  onChange,
  onRemove,
  height = "h-24",
  width = "w-full",
  hint,
  circular = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div
        className={`relative ${height} ${width} ${circular ? "rounded-full" : "rounded-xl"} border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 overflow-hidden group ${
          previewUrl ? "border-solid border-gray-200" : ""
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
        />

        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className={`absolute inset-0 w-full h-full object-cover ${circular ? "rounded-full" : "rounded-xl"}`}
            />
            {/* Hover overlay */}
            <div
              className={`absolute inset-0 bg-black/40 ${circular ? "rounded-full" : "rounded-xl"} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1`}
            >
              <Upload className="w-4 h-4 text-white" />
              <span className="text-white text-[10px] font-medium">
                Replace
              </span>
            </div>
            {/* Remove button */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className={`absolute ${circular ? "top-1 right-2" : "top-1.5 right-1.5"} z-10 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <>
            <ImageIcon className="w-6 h-6 text-gray-400" />
            <span className="text-[10px] font-medium text-gray-500">
              Upload {label}
            </span>
            {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
          </>
        )}
      </div>
    </div>
  );
};
