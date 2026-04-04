"use client";

import { useState } from "react";
import SearchCollaborationModal from "./SearchCollaborationModal";
import { Company, User } from "@prisma/client";

type CollaborationToggleProps = {
  initialValue: boolean;
  companyId: number;
  onChange?: (value: boolean) => void;
  companyAdmins: Partial<User>[];
  setCompanyAdmins: React.Dispatch<React.SetStateAction<Partial<User>[]>>;
  companies: (Company & { users: User[] })[];
};

export default function CollaborationToggle({
  initialValue,
  companyId,
  onChange,
  companyAdmins,
  companies,
  setCompanyAdmins,
}: CollaborationToggleProps) {
  const [isCollaborators, setIsCollaborators] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    try {
      setLoading(true);
      const newValue = !isCollaborators;

      await fetch(
        `/api/communication/collaboration/company/${companyId}/enable`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isCollaborators: newValue,
          }),
        },
      );

      setIsCollaborators(newValue);
      onChange?.(newValue);
    } catch (error) {
      console.error("Failed to update collaboration status", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
    mb-5 inline-flex items-center justify-center
    w-full rounded-lg px-4 py-2
    text-sm font-semibold
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${
      isCollaborators
        ? "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500"
        : "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500"
    }
    ${loading ? "opacity-60 cursor-not-allowed" : "active:scale-95"}
  `}
      >
        {loading
          ? "Updating..."
          : isCollaborators
            ? "Collaboration Enabled"
            : "Enable Collaboration"}
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#797979] sm:text-[14px] sm:font-normal">
          Collaborators List
        </h2>

        {isCollaborators && (
          <SearchCollaborationModal
            companies={companies}
            setCompanyAdmins={setCompanyAdmins}
            companyAdmins={companyAdmins}
          />
        )}
      </div>
    </div>
  );
}
