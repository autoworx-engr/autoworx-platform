import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useRef } from "react";

interface ChatInputProps {
  loading: boolean;
  message: string;
  setMessage: (value: string) => void;
  onSend: () => void;
  selectedFiles: File[];
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  isResolved?: boolean;
}

export const ChatInput = ({
  message,
  setMessage,
  onSend,
  selectedFiles,
  handleFileChange,
  handleRemoveFile,
  isResolved = false,
  loading,
}: ChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingCount = selectedFiles.length - 3;

  return (
    <div className="relative rounded-b-lg border-t bg-[#D9D9D9] p-2">
      <div className="flex items-center space-x-2 ">
        {/* File Upload */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="ghost"
            className={`p-2 ${
              isResolved ? "bg-gray-400 text-gray-50" : "text-gray-500"
            }`}
            disabled={isResolved}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Preview Section */}
          {!loading && selectedFiles.length > 0 && (
            <div className="absolute mt-2 left-1 bottom-14 flex flex-wrap gap-3">
              {selectedFiles.slice(0, 3).map((file, index) => (
                <div
                  key={index}
                  className="relative w-16 h-16 sm:h-20 sm:w-20 overflow-hidden rounded-md border border-gray-300 shadow-sm"
                >
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    layout="fill"
                    objectFit="cover"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Show remaining count if more than 3 files */}
              {remainingCount > 0 && (
                <div className="relative w-16 h-16 sm:h-20 sm:w-20 overflow-hidden rounded-md border border-gray-300 shadow-sm bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-lg font-semibold text-gray-600">
                      +{remainingCount}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">more</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Input */}
        <Input
          placeholder="Send Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-white"
          disabled={isResolved}
        />

        {/* Send Button */}
        <Button
          onClick={onSend}
          size="sm"
          disabled={isResolved || loading}
          className={`${isResolved ? "bg-gray-400" : "bg-[#006D77]"} hover:bg-teal-800`}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
