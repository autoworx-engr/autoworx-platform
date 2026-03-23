import { Rating } from "@mui/material";
import moment from "moment";

type TAlreadyReviewed = {
  rate: number;
  message: string;
  date?: string;
  sendUserId: number;
  currentUserId: number;
};

export default function AlreadyReviewed({
  rate,
  message,
  date,
  sendUserId,
  currentUserId,
}: TAlreadyReviewed) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-2">
      <div className="flex items-center gap-1 justify-between">
        <Rating
          name="size-small"
          defaultValue={rate}
          size="small"
          readOnly
          precision={0.5}
        />
        <div>
          {date && (
            <span className="text-xs text-gray-400 ml-2">
              {moment(date).format("DD-MM-YYYY")}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700">{message}</p>

      <p className="text-xs text-gray-400">
        You have already submitted this review.
      </p>
    </div>
  );
}
