import TimezoneSelect from "react-timezone-select";
import { useState } from "react";

const Timezone = ({
  timezone,
  setBusinessSettings,
}: {
  timezone: string | undefined | null;
  setBusinessSettings: (settings: any) => void;
}) => {
  const [selectedTimezone, setSelectedTimezone] = useState(timezone || "");

  const handleBrowserTimezone = () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
    setBusinessSettings((prev: any) => ({
      ...prev,
      timezone: browserTimezone,
    }));
  };

  return (
    <div className="App space-y-4">
      <blockquote>Timezone</blockquote>
      <div className="select-wrapper flex flex-col gap-4 md:flex-row">
        <TimezoneSelect
          value={selectedTimezone}
          onChange={(val) => {
            setSelectedTimezone(val.value);
            setBusinessSettings((prev: any) => ({
              ...prev,
              timezone: val.value,
            }));
          }}
          displayValue="UTC"
          className="min-w-64"
        />
        <button
          onClick={handleBrowserTimezone}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Use My Current Timezone
        </button>
      </div>
    </div>
  );
};

export default Timezone;
