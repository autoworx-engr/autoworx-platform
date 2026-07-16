import { Bug } from "lucide-react";
import React from "react";

const ReportNotFoundCard = () => {
  return (
    <div className=" flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 py-6 text-center shadow-sm">
      <Bug className="mb-6 h-16 w-16 text-primary" />
      <h2 className="mb-2 text-lg font-semibold text-gray-700">
        No Bug Reports Found
      </h2>
      <p className="text-sm text-gray-500">
        Everything looks good! No bugs have been reported yet.
      </p>
    </div>
  );
};

export default ReportNotFoundCard;
