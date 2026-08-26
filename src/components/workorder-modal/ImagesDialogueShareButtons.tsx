import { isSmsAvailable } from "@/actions/communication/client/createTwilioCredentials";
import { InfobipConfig, TwilioCredentials } from "@prisma/client";
import { Popconfirm } from "antd";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface ImagesDialogueShareButtonsProps {
  handleEmailShare: () => void;
  handleSmsShare: () => void;
  handleCopyShare: () => void;
}
export const ImagesDialogueShareButtons = ({
  handleEmailShare,
  handleSmsShare,
  handleCopyShare,
}: ImagesDialogueShareButtonsProps) => {
  const [twilioCredentials, setTwilioCredentials] = useState<
    TwilioCredentials | InfobipConfig | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTwilioData() {
      try {
        setIsLoading(true);

        const { data } = await isSmsAvailable();

        setTwilioCredentials(data || null);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTwilioData();
  }, []);

  if (isLoading) {
    return <p>Loading SMS status...</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 w-full md:w-auto">
      <div className="flex items-center gap-x-2 rounded-md border border-gray-300 px-2 py-0.5">
        <span className="mr-1 font-semibold text-sm md:text-base">
          Share to Client via
        </span>
        <Popconfirm
          title="Send image via Email now?"
          onConfirm={handleEmailShare}
          okText="Yes"
          cancelText="No"
          overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
          okButtonProps={{
            className:
              "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
          }}
          cancelButtonProps={{
            className:
              "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
          }}
        >
          <button className="flex items-center justify-center gap-1 rounded bg-primary px-1 py-0.5 text-sm text-white md:px-4 md:text-base">
            <Mail className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden md:inline">Email</span>
          </button>
        </Popconfirm>
        {twilioCredentials && (
          <Popconfirm
            title="Send image via SMS now?"
            onConfirm={handleSmsShare}
            okText="Yes"
            cancelText="No"
            overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
            okButtonProps={{
              className:
                "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
            }}
            cancelButtonProps={{
              className:
                "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
            }}
          >
            <button className="flex items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-sm text-white md:px-4 md:text-base">
              <svg
                fill="#ffffff"
                height="24"
                width="24"
                version="1.1"
                id="Icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-5.28 -5.28 34.56 34.56"
                enableBackground="new 0 0 24 24"
                stroke="#ffffff"
                strokeWidth="0.36"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="#CCCCCC"
                  strokeWidth="0.144"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path d="M12,1C5.37,1,0,5.58,0,10.55c0,2.92,1.86,5.95,4.72,7.59L3,23l5.85-3.32C9.86,19.88,10.91,20,12,20c6.63,0,12-4.48,12-9.45 C24,5.58,18.63,1,12,1z M6.55,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84 h0.16c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76H6.93 C6.68,8.54,6.37,8.33,6.01,8.16C5.65,7.99,5.28,7.9,4.9,7.9c-0.15,0-0.28,0.01-0.4,0.04C4.38,7.97,4.26,8.01,4.13,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25C3.78,8.44,3.74,8.56,3.74,8.69c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17C5.49,9.7,5.72,9.78,5.96,9.87c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C7.34,12.72,7.08,13.33,6.55,13.8z M15.33,14.36h-1.68V9.24l-1.23,3.3h-1.16l-1.23-3.3v5.12H8.44V6.64h1.95l1.5,3.81l1.49-3.81h1.95 V14.36z M21.18,13.8c-0.53,0.47-1.24,0.7-2.14,0.7c-0.52,0-0.97-0.06-1.36-0.17c-0.39-0.11-0.75-0.26-1.09-0.43v-1.84h0.16 c0.34,0.33,0.71,0.58,1.12,0.76c0.41,0.18,0.8,0.26,1.19,0.26c0.1,0,0.23-0.01,0.38-0.04c0.16-0.02,0.29-0.06,0.38-0.11 c0.12-0.06,0.22-0.14,0.3-0.25c0.08-0.1,0.12-0.24,0.12-0.42c0-0.19-0.07-0.35-0.2-0.47s-0.29-0.21-0.48-0.26 c-0.23-0.07-0.47-0.13-0.73-0.2c-0.26-0.06-0.51-0.14-0.73-0.23c-0.52-0.21-0.9-0.49-1.12-0.85c-0.23-0.36-0.34-0.8-0.34-1.34 c0-0.72,0.27-1.31,0.8-1.75c0.53-0.45,1.2-0.67,2-0.67c0.4,0,0.8,0.05,1.2,0.14c0.4,0.09,0.75,0.22,1.06,0.38v1.76h-0.15 c-0.25-0.25-0.56-0.45-0.92-0.62C20.27,7.99,19.9,7.9,19.52,7.9c-0.15,0-0.28,0.01-0.4,0.04C19,7.97,18.88,8.01,18.75,8.08 c-0.11,0.06-0.2,0.14-0.27,0.25c-0.08,0.11-0.12,0.23-0.12,0.37c0,0.2,0.06,0.35,0.18,0.47c0.12,0.12,0.36,0.22,0.71,0.31 c0.23,0.06,0.44,0.12,0.66,0.17c0.21,0.06,0.43,0.13,0.67,0.23c0.47,0.19,0.82,0.45,1.04,0.78c0.23,0.33,0.34,0.76,0.34,1.29 C21.97,12.72,21.7,13.33,21.18,13.8z"></path>{" "}
                </g>
              </svg>
              <span className="hidden md:inline">SMS</span>
            </button>
          </Popconfirm>
        )}
      </div>
      {/* <button
        className="flex items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-sm text-white md:px-4 md:text-base"
        onClick={handleCopyShare}
      >
        <svg
          viewBox="0 0 32 32"
          height="16"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
          fill="#ffffff"
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <g fill="none" fill-rule="evenodd">
              {" "}
              <path d="m0 0h32v32h-32z"></path>{" "}
              <path
                d="m24.110782 0 5.889218 8.76607872v19.23392128h-4v4h-24v-28h4v-4zm-18.110782 6h-2v24h20v-2h-18z"
                fill="#ffffff"
                fill-rule="nonzero"
              ></path>{" "}
            </g>{" "}
          </g>
        </svg>
        <span className="hidden md:inline">Copy Link</span>
      </button> */}
    </div>
  );
};
