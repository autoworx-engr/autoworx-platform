import { Skeleton } from "@mui/material";

interface MessageBubbleSkeletonProps {
  isSender?: boolean;
}

export const MessageBubbleSkeleton = ({
  isSender = true,
}: MessageBubbleSkeletonProps) => {
  return (
    <div
      className={`flex items-start space-x-2 ${
        isSender ? "flex-row space-x-2" : "flex-row-reverse gap-2"
      }`}
    >
      {/* Avatar Skeleton */}
      <Skeleton variant="circular" width={32} height={32} className="mt-1" />

      <div className="flex-1">
        <div
          className={`relative max-w-full rounded-xl shadow-md ${
            isSender ? "me-[20%]" : "ms-[20%]"
          }`}
        >
          <Skeleton
            variant="rounded"
            width="100%"
            height={60}
            className="rounded-xl"
          />
        </div>

        {/* Timestamp + Read Skeleton */}
        <div
          className={`mt-1 flex items-center ${
            isSender ? "justify-start" : "justify-end"
          } text-xs opacity-70`}
        >
          <Skeleton variant="text" width={60} height={20} />
        </div>
      </div>
    </div>
  );
};
