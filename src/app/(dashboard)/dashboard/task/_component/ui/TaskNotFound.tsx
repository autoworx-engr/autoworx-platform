import { Clipboard } from "lucide-react";
import React from "react";

export default function TaskNotFound({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Clipboard className="mb-4 h-12 w-12 text-gray-400" />
      <h3 className="text-lg font-semibold text-gray-700 md:text-[#797979]">
        {message}
      </h3>
    </div>
  );
}
