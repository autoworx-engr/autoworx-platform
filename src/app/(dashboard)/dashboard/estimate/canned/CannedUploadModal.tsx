"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Upload, X, FileIcon, Download, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { stateStore } from "@/stores/stateStore";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import axiosInstance from "@/helpers/axios";
import { successToast, errorToast } from "@/lib/toast";
import type { JSX } from "react/jsx-runtime"; // Declare JSX variable

interface FileUploadModalProps {
  buttonElement?: JSX.Element;
  companyId?: string;
}

type UploadType = "labor" | "service";

const uploadConfig: Record<UploadType, { label: string; sampleFile: string }> =
  {
    labor: {
      label: "Canned Labor Upload",
      sampleFile: "/sample_labor_service.xlsx",
    },
    service: {
      label: "Canned Service Upload",
      sampleFile: "/sample_canned_service.xlsx",
    },
  };

export function CannedUploadModal({
  buttonElement,
  companyId,
}: FileUploadModalProps) {
  const { isUploadCannedOpen, setIsUploadCannedOpen } = stateStore();
  const currentUser = useGetCurrentUser();

  const [uploadType, setUploadType] = useState<UploadType>("labor");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFormats = [".csv", ".xlsx", ".xls"];
  const acceptedMimeTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const isValidFile = (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return (
      acceptedFormats.includes(ext) || acceptedMimeTypes.includes(file.type)
    );
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (isValidFile(droppedFile)) {
        setFile(droppedFile);
      } else {
        errorToast("Invalid file format. Please upload a CSV or Excel file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (isValidFile(selectedFile)) {
        setFile(selectedFile);
      } else {
        errorToast("Invalid file format. Please upload a CSV or Excel file.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", String(companyId));
    formData.append("type", uploadType);

    try {
      const response = await axiosInstance.post("/bulk-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response?.data.statusCode === 200) {
        const msg = response?.data?.message || "File uploaded successfully";
        successToast(String(msg));
        setFile(null);
        // close modal after short delay
        setTimeout(() => {}, 1200);
      } else {
        const errMsg =
          response?.data?.message ||
          response?.data?.error ||
          "Upload failed. Please try again.";
        errorToast(String(errMsg));
      }
    } catch (err: any) {
      const backendMsg =
        err?.data?.errors ||
        "An error occurred during upload. Please try again.";
      errorToast(String(backendMsg));

      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleClear();
  };

  const handleDownloadSample = async () => {
    const fileUrl = uploadConfig[uploadType].sampleFile;
    const fileName =
      uploadConfig[uploadType].sampleFile.split("/").pop() || "sample.xlsx";
    try {
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      errorToast("Failed to download sample file.");
    }
  };

  return (
    <Dialog open={isUploadCannedOpen} onOpenChange={setIsUploadCannedOpen}>
      <DialogTrigger asChild>
        {buttonElement ? (
          buttonElement
        ) : (
          <button
            className="
            flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
            bg-gradient-to-r from-primary to-[#5a66ee]
            shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
            hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-100
            transition-all duration-300 ease-in-out
          "
          >
            + Upload File
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-xl">Upload File</DialogTitle>
          <DialogDescription>
            Upload your CSV or Excel file to get started
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Type
            </label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
            >
              <span className="text-sm text-gray-900">
                {uploadConfig[uploadType].label}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white shadow-lg z-10">
                {(
                  Object.entries(uploadConfig) as [
                    UploadType,
                    (typeof uploadConfig)["labor"],
                  ][]
                ).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setUploadType(type);
                      setIsDropdownOpen(false);
                      setFile(null); // Clear file when changing upload type
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      uploadType === type
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50 scale-105"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload
              className={`w-12 h-12 mx-auto mb-3 transition-colors ${isDragging ? "text-blue-500" : "text-gray-400"}`}
            />
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Drag and drop your file here
            </p>
            <p className="text-xs text-gray-500 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = "";
              }}
              className="hidden"
              aria-label="File upload input"
            />
            <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Browse Files
            </button>
          </div>

          {/* File Info Card */}
          {file && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Supported Formats */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Supported formats:{" "}
              <span className="font-semibold">CSV, XLSX, XLS</span>
            </p>
            {/* Download Sample File Button */}
            <button
              onClick={handleDownloadSample}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Canned <span className="capitalize">
                {uploadType}
              </span>{" "}
              Sample File
            </button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-3 sm:gap-3">
          <DialogClose
            className="
                flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg 
                hover:bg-gray-50 font-semibold transition-colors
              "
            onClick={handleClose}
          >
            Cancel
          </DialogClose>
          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="flex-1 px-4 py-2 text-white  bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold "
          >
            {isLoading ? "Uploading..." : "Upload"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
