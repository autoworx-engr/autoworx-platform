import { DialogContent, DialogHeader, DialogTitle } from "@/components/Dialog";
import { EmployeeType } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import useSettingsQuery from "../../_hook/settings/query/useSettingsQuery";
import TaskSpinner from "../ui/TaskSpinner";
import General from "./General";
import Holidays from "./Holidays";

export default function SettingsModalContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data: settings, isLoading } = useSettingsQuery();
  const [activeTab, setActiveTab] = useState("general");

  // Holiday functionality
  const { data: session } = useSession();
  const authUser = session;

  const isAdmin = authUser?.user.employeeType === EmployeeType?.Admin;
  return (
    <DialogContent className="max-w-xl grid-rows-[auto,1fr,auto]">
      {/* Heading */}
      <DialogHeader>
        <DialogTitle>Calendar Settings</DialogTitle>
        <div className="mt-4 flex border-b">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 font-medium ${activeTab === "general"
                ? "border-b-2 border-[#6571FF] text-[#6571FF]"
                : "text-gray-600"
              }`}
          >
            General
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("holidays")}
              className={`px-4 py-2 font-medium ${activeTab === "holidays"
                  ? "border-b-2 border-[#6571FF] text-[#6571FF]"
                  : "text-gray-600"
                }`}
            >
              Holidays
            </button>
          )}
        </div>
      </DialogHeader>

      {/* Content */}
      {activeTab === "general" && (
        <>
          {isLoading ? (
            <TaskSpinner />
          ) : (
            settings && (
              <General
                settings={settings}
                authUser={authUser}
                onClose={onClose}
              />
            )
          )}
        </>
      )}

      {activeTab === "holidays" && isAdmin && <Holidays />}
    </DialogContent>
  );
}
