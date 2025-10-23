import {
  DialogContentBlank,
  DialogOverlay,
  DialogPortal,
} from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { CircleX } from "lucide-react";
import Image from "next/image";
// import permissionGuideImage from "@/public/images/notification-permission.png";

export default function NotificationPermissionGuide({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col items-center justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
        <div className="flex max-h-[80vh] w-full max-w-md flex-col justify-between overflow-hidden overflow-y-auto rounded-lg bg-background">
          <div className="relative p-6">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <CircleX className="h-5 w-5" />
            </button>

            <h2 className="mb-4 pr-6 text-xl font-semibold text-gray-800">
              You need to adjust the permissions in your browser
            </h2>

            <p className="mb-4 text-gray-600">
              Click on the settings icon to the left of the address bar. Under
              Notifications, select &quot;Allow&quot; in the dropdown.
            </p>

            <div className="relative mb-4 overflow-hidden rounded-md border">
              <Image
                src={`/notification-permission.png`}
                alt="permission-guide"
                width={500}
                height={500}
                className="h-auto w-full max-w-[400px] object-cover object-center"
              />
            </div>
          </div>

          <div className="flex justify-end border-t p-4">
            <Button
              onClick={onClose}
              className="bg-indigo-500 px-6 text-white hover:bg-indigo-600"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContentBlank>
    </DialogPortal>
  );
}
