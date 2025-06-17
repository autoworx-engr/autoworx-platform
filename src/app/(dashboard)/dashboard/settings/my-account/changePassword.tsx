import { changePassword } from "@/actions/settings/myAccount";
import { SlimInput } from "@/components/SlimInput";
import { errorToast, successToast } from "@/lib/toast";
import { useState, useTransition } from "react";

export const ChangePassword = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");

  return (
    <>
      <h3 className="my-4 text-lg font-bold">New Password</h3>
      <div className="space-y-4 rounded-md p-8 shadow-md">
        <SlimInput
          name="currentPassword"
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
        />
        <SlimInput
          name="newPassword"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <SlimInput
          name="confirmNewPassword"
          type="password"
          value={confirmNewPw}
          onChange={(e) => setConfirmNewPw(e.target.value)}
        />
        <div className="mt-4 text-right">
          <button
            onClick={async () => {
              let res = await changePassword(currentPw, newPw, confirmNewPw);
              if (newPw !== confirmNewPw) {
                errorToast("Passwords do not match");
                return;
              }
              if (res?.type === "success") {
                setCurrentPw("");
                setNewPw("");
                setConfirmNewPw("");
                successToast("Password changed successfully");
              } else if (res?.type === "globalError") {
                errorToast(
                  res.errorSource && res.errorSource.length > 0
                    ? res.errorSource[0].message
                    : res.message,
                );
              }
            }}
            disabled={
              !currentPw || !newPw || !confirmNewPw || newPw !== confirmNewPw
            }
            className="ml-auto mt-4 rounded-md bg-[#6571FF] px-4 py-1 text-white disabled:bg-gray-400"
          >
            Change Password
          </button>
        </div>
      </div>
    </>
  );
};
