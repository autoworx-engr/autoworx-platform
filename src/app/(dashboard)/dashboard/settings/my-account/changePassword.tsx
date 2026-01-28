import { changePassword } from "@/actions/settings/myAccount";
import { SlimInput } from "@/components/SlimInput";
import { errorToast, successToast } from "@/lib/toast";
import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";

export const ChangePassword = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [toggleCurrentPassword, setToggleCurrentPassword] =
    useState<boolean>(false);
  const [toggleNewPassword, setToggleNewPassword] = useState<boolean>(false);
  const [toggleConfirmPassword, setToggleConfirmPassword] =
    useState<boolean>(false);

  return (
    <>
      <h3 className="my-4 text-lg font-bold">New Password</h3>
      <div className="space-y-4 rounded-md p-8 shadow-md">
        <div className="relative">
          <SlimInput
            name="currentPassword"
            type={toggleCurrentPassword ? "text" : "password"}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <span
            onClick={() => setToggleCurrentPassword(!toggleCurrentPassword)}
            className="absolute right-2 bottom-2
"
          >
            {toggleCurrentPassword ? (
              <EyeOff className=" h-4 w-4 " />
            ) : (
              <Eye className="h-4 w-4 " />
            )}
          </span>
        </div>
        <div className="relative">
          <SlimInput
            name="newPassword"
            type={toggleNewPassword ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <span
            onClick={() => setToggleNewPassword(!toggleNewPassword)}
            className="absolute right-2 bottom-2
"
          >
            {toggleNewPassword ? (
              <EyeOff className=" h-4 w-4 " />
            ) : (
              <Eye className="h-4 w-4 " />
            )}
          </span>
        </div>
        <div className="relative">
          <SlimInput
            name="confirmNewPassword"
            type={toggleConfirmPassword ? "text" : "password"}
            value={confirmNewPw}
            onChange={(e) => setConfirmNewPw(e.target.value)}
          />
          <span
            onClick={() => setToggleConfirmPassword(!toggleConfirmPassword)}
            className="absolute right-2 bottom-2"
          >
            {toggleConfirmPassword ? (
              <EyeOff className=" h-4 w-4 " />
            ) : (
              <Eye className="h-4 w-4 " />
            )}
          </span>
        </div>
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
                    : res.message
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
