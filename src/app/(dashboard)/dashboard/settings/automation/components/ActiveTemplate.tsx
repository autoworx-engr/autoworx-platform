"use client";
import { Box, IconButton, TextField } from "@mui/material";
import { Paperclip, X } from "lucide-react";
import Image from "next/image";
import React, { ChangeEvent } from "react";

type TemplateProps = {
  activeTemplate: string;
  rows?: number;
  placeholder?: string;
  name: string;
  value: string;
  handleChange: (name: string, value: any) => void;
  iconBtnClassName?: string;
  handleFileAttachment: (
    event: ChangeEvent<HTMLInputElement>,
    type: string,
  ) => void;
  label?: string;
  attachments?: { fileUrl: string; id: number; isLocal?: boolean }[];
  setFormData: any;
  attachmentName: string;
  attachmentType: string;
  subjectName?: string;
  subjectValue?: string;
  error?: string;
  subjectError?: boolean;
  characterLength?: number;
  maxLength?: number;
  isLimitExceeded?: boolean;
};

const ActiveTemplate = ({
  activeTemplate,
  rows,
  placeholder,
  name,
  value,
  handleChange,
  iconBtnClassName,
  handleFileAttachment,
  label,
  attachments = [],
  attachmentName,
  attachmentType,
  subjectName,
  subjectValue,
  setFormData,
  error,
  subjectError,
  characterLength,
  maxLength,
  isLimitExceeded,
}: TemplateProps) => {
  const handleDeleteAttachment = (
    e: React.MouseEvent<HTMLButtonElement>,
    fileToRemove: { fileUrl: string },
  ) => {
    e.stopPropagation();
    const updatedAttachments =
      attachments?.filter((file) => file.fileUrl !== fileToRemove.fileUrl) ||
      [];

    // Use the attachmentName prop to correctly update the specific attachment field
    setFormData((prev: any) => ({
      ...prev,
      attachments: updatedAttachments,
    }));
  };

  return (
    <Box className="mb-4">
      {activeTemplate === "EMAIL" && name && (
        <input
          name={subjectName}
          type="text"
          value={subjectValue || ""}
          placeholder="Subject"
          className={`mb-1 w-full rounded-sm border bg-background px-2 py-1 leading-6 outline-none ${subjectError ? "border-red-500 focus:border-red-500" : "border-slate-400"}`}
          onChange={(e) =>
            subjectName && handleChange(subjectName, e.target.value)
          }
        />
      )}

      <Box>
        <TextField
          multiline
          rows={rows}
          fullWidth
          error={Boolean(error)}
          helperText={error || ""}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(name, e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton
                component="label"
                size="small"
                className={iconBtnClassName}
              >
                <Paperclip size={18} />
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleFileAttachment(e, attachmentType)}
                  multiple
                  accept="image/*"
                />
              </IconButton>
            ),
          }}
        />
      </Box>

      <div
        className={`mt-1 text-xs font-medium ${
          isLimitExceeded ? "text-red-500" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {characterLength}/{maxLength}
      </div>

      {attachments && attachments.length > 0 && (
        <Box className="mt-4 flex flex-wrap gap-4">
          {attachments.map((file, index) => (
            <Box
              key={index}
              className={`relative h-24 w-24 overflow-hidden rounded border ${
                file.isLocal ? "border-blue-400" : "border-gray-300"
              }`}
            >
              <Image
                src={file.fileUrl}
                alt={`attachment-${index}`}
                className="h-full w-full object-cover"
                width={500}
                height={400}
              />

              <button
                type="button"
                onClick={(e) => handleDeleteAttachment(e, file)}
                className="absolute right-0 top-0 bg-white"
              >
                <X className="text-red-500" />
              </button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ActiveTemplate;
