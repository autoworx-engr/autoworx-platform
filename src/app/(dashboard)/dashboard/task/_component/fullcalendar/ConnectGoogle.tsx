"use client";
// import { generateAuthURL, getGoogleCalendarToken } from "./googleCalendarAuth";
import {
  generateAuthURL,
  getGoogleCalendarToken,
} from "@/actions/calendar-settings/getGoogleCalendarAuth";
import { useServerGet } from "@/hooks/useServerGet";
import { Check } from "lucide-react";

type Props = {};

const ConnectGoogle = (props: Props) => {
  const { data } = useServerGet(getGoogleCalendarToken);

  async function getAuthUrls(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    await generateAuthURL();
  }

  if (!data?.googleCalendarToken) {
    return (
      <button
        type="button"
        onClick={getAuthUrls}
        className="rounded-md bg-primary px-10 py-1.5 text-[14px] text-white md:text-[16px]"
      >
        Connect with Google Calendar
      </button>
    );
  } else {
    return (
      <div className="flex gap-5">
        <div className="flex items-center gap-2">
          <span className="text-green-500">
            <Check size={18} />
          </span>
          <span className="text-primary">Connected with Google Calendar</span>
        </div>

        <button
          type="button"
          onClick={getAuthUrls}
          className="rounded-md bg-primary px-10 py-1.5 text-[14px] text-white md:text-[16px]"
        >
          Reconnect{" "}
        </button>
      </div>
    );
  }
};

export default ConnectGoogle;
