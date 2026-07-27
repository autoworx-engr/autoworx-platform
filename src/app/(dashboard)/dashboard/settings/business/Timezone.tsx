import { Clock, Globe } from "lucide-react";
import { useState } from "react";
import TimezoneSelect from "react-timezone-select";

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
        <Globe className="h-4 w-4 mr-2 text-primary" />
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
            className="min-w-64 react-select-container"
            classNames={{
              control: () =>
                "py-1 px-3 border-2 border-primary rounded-3xl shadow-sm bg-white focus:ring-2 focus:ring-primary transition-all duration-150 flex items-center min-h-[36px]",
              option: ({ isSelected, isFocused }) =>
                [
                  "px-4 py-2 cursor-pointer transition-colors duration-100",
                  isSelected
                    ? "bg-primary text-white"
                    : isFocused
                      ? "bg-blue-50 text-primary"
                      : "text-gray-700",
                ].join(" "),
              menuList: () =>
                "max-h-60 overflow-y-auto thin-scrollbar bg-white rounded-lg shadow-lg border border-gray-200",
              singleValue: () => "text-gray-900 font-medium",
              placeholder: () => "text-gray-400",
            }}
            styles={{
              menuList: (base: any) => ({
                ...base,
                maxHeight: "15rem",
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                border: "1px solid #e5e7eb",
              }),
              control: (base: any, state: any) => ({
                ...base,
                minHeight: "36px",
                borderRadius: "12px",
                paddingTop: "0.25rem", // ~py-1
                paddingBottom: "0.25rem",
                paddingLeft: "0.75rem", // ~px-3
                paddingRight: "0.75rem",
                borderColor: state.isFocused ? "#6571FF" : "#e5e7eb",
                boxShadow: state.isFocused
                  ? "0 0 0 2px #6571FF33"
                  : base.boxShadow,
                background: "white",
                transition: "border-color 0.15s, box-shadow 0.15s",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#6571FF",
                },
              }),
              option: (base: any, state: any) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? "#6571FF"
                  : state.isFocused
                    ? "#e0e7ff"
                    : "white",
                color: state.isSelected
                  ? "white"
                  : state.isFocused
                    ? "#6571FF"
                    : "#374151",
                cursor: "pointer",
              }),
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleBrowserTimezone}
          className="rounded-md bg-primary px-4 py-2 text-white text-sm font-medium transition duration-150 hover:bg-[#5a64e8] flex items-center justify-center shadow-md md:h-[42px]"
        >
          <Clock className="h-4 w-4 mr-2" />
          Use My Current Timezone
        </button>
      </div>
    </div>
  );
};

export default Timezone;
