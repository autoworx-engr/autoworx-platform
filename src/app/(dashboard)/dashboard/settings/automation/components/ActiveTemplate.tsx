"use client";
import React, { ChangeEvent } from "react";
import { Close as CloseIcon } from "@mui/icons-material";
import { Box, Chip, IconButton, TextField } from "@mui/material";
import { ImAttachment } from "react-icons/im";

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
  attachment?: File[];
  attachmentName: string;
  attachmentType: string;
  subjectName?: string;
  subjectValue?: string;
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
  attachment = [],
  attachmentName,
  attachmentType,
  subjectName,
  subjectValue,
}: TemplateProps) => {
  const handleDeleteAttachment = (fileToRemove: File) => {
    const updatedAttachments =
      attachment?.filter((file) => file !== fileToRemove) || [];
    handleChange(
      attachmentName,
      updatedAttachments.length ? updatedAttachments : null,
    );
  };

  return (
    <Box className="mb-4">
      {activeTemplate === "EMAIL" && name && (
        <input
          name={subjectName}
          type="text"
          value={subjectValue || ""}
          placeholder="Subject"
          className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
          onChange={(e) =>
            subjectName && handleChange(subjectName, e.target.value)
          }
          // required
        />
      )}

      <Box className="relative">
        <TextField
          multiline
          rows={rows}
          fullWidth
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
                <ImAttachment />
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleFileAttachment(e, attachmentType)}
                  multiple
                />
              </IconButton>
            ),
          }}
        />
      </Box>

      {attachment && attachment.length > 0 && (
        <Box className="mt-4 flex flex-wrap gap-2">
          {attachment.map((file, index) => (
            <Chip
              key={index}
              label={file.name}
              onDelete={() => handleDeleteAttachment(file)}
              deleteIcon={<CloseIcon />}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ActiveTemplate;
