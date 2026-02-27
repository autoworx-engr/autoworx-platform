import TimezoneSelect from "react-timezone-select";
import { useState } from "react";
import { Clock, Globe } from "lucide-react";

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
  <div className="App space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <blockquote className="text-sm font-semibold text-gray-700 flex items-center mb-2">
        <Globe className="h-4 w-4 mr-2 text-[#6571FF]" />
        Default Timezone
      </blockquote>
      <div className="select-wrapper flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-grow">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Select Timezone
          </label>
          <TimezoneSelect
            value={selectedTimezone}
            onChange={(val) => {
              setSelectedTimezone(val.value);
              setBusinessSettings((prev: any) => ({
                ...prev,
                timezone: val.value,
              }));
            }}
            // Note: displayValue="UTC" is not a standard prop for react-timezone-select, using the default label property
            // Keeping className for minimum width
            className="min-w-64 react-select-container"
            classNames={{
                control: () => 'p-1 border-gray-300 rounded-md shadow-sm',
                option: ({ isSelected }) => isSelected ? 'bg-blue-100' : 'hover:bg-gray-50',
            }}
          />
        </div>
        <button
          onClick={handleBrowserTimezone}
          className="rounded-md bg-[#6571FF] px-4 py-2 text-white text-sm font-medium transition duration-150 hover:bg-[#5a64e8] flex items-center justify-center shadow-md md:h-[42px]"
        >
            <Clock className="h-4 w-4 mr-2" />
          Use My Current Timezone
        </button>
      </div>
    </div>
  );
};

export default Timezone;
