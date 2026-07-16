"use client";
import { changePassword } from "@/actions/settings/myAccount";
import { changePasswordValidationSchema } from "@/validations/schemas/settings/my-account/account.validation";
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
  const [isPending, startTransition] = useTransition();

  const handleChangePassword = () => {
    const validationResult = changePasswordValidationSchema.safeParse({
      currentPassword: currentPw,
      newPassword: newPw,
      confirmNewPassword: confirmNewPw,
    });

    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors[0].message;
      errorToast(errorMsg);
      return;
    }
    startTransition(async () => {
      const res = await changePassword(currentPw, newPw, confirmNewPw);
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
    });
  };

  return (
    <div className="w-full">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">
        New Password
      </h3>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <SlimInput
            name="currentPassword"
            type={toggleCurrentPassword ? "text" : "password"}
            value={currentPw}
            required={true}
            autoComplete="new-password"
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <span
            onClick={() => setToggleCurrentPassword(!toggleCurrentPassword)}
            className="absolute right-2 bottom-2.5
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
            required={true}
            type={toggleNewPassword ? "text" : "password"}
            value={newPw}
            autoComplete="new-password"
            onChange={(e) => setNewPw(e.target.value)}
          />
          <span
            onClick={() => setToggleNewPassword(!toggleNewPassword)}
            className="absolute right-2 bottom-2.5
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
            required={true}
            value={confirmNewPw}
            autoComplete="new-password"
            onChange={(e) => setConfirmNewPw(e.target.value)}
          />
          <span
            onClick={() => setToggleConfirmPassword(!toggleConfirmPassword)}
            className="absolute right-2 bottom-2.5"
          >
            {toggleConfirmPassword ? (
              <EyeOff className=" h-4 w-4 " />
            ) : (
              <Eye className="h-4 w-4 " />
            )}
          </span>
        </div>
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <button
            onClick={handleChangePassword}
            disabled={isPending || !currentPw || !newPw || !confirmNewPw}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5864e5] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {isPending ? "Saving…" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
};
