import toast from "react-hot-toast";
import {  X } from "lucide-react";

interface OneSignalToastProps {
  message: string;
  toastId: string;
}

export const OneSignalErrorToast = ({
  message,
  toastId,
}: OneSignalToastProps) => {
  const handleDismiss = () => {
    toast.dismiss(toastId);
    toast.remove(toastId);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
        aria-label="Close notification"
        type="button"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      <p className="text-sm text-gray-800 font-medium flex-1">{message}</p>
    </div>
  );
};

export const showOneSignalErrorToast = (message: string, options?: any) => {
  toast.dismiss("onesignal-config-error");

  return toast.custom(
    (t) => (
      <div className="bg-white border border-red-300 rounded-lg shadow-lg px-4 py-3 max-w-sm pointer-events-auto">
        <OneSignalErrorToast message={message} toastId={t.id} />
      </div>
    ),
    {
      duration: 4000,
      id: "onesignal-config-error",
      position: "top-right",
      ...options,
    }
  );
};
