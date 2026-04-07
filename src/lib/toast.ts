import toast from "react-hot-toast";

type ToastConfig = {
  id?: string;
};

export function successToast(message: string, config?: ToastConfig) {
  toast.success(message, config);
}

export function errorToast(message: string, config?: ToastConfig) {
  toast.error(message, config);
}
