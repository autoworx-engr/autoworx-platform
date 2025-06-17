import TimezoneSelect from "react-timezone-select";

const Timezone = ({
  timezone,
  setBusinessSettings,
}: {
  timezone: string | undefined | null;
  setBusinessSettings: (settings: any) => void;
}) => {
  return (
    <div className="App">
      <blockquote>Timezone</blockquote>
      <div className="select-wrapper">
        <TimezoneSelect
          value={timezone as string}
          onChange={(val) => {
            setBusinessSettings((prev: any) => ({
              ...prev,
              timezone: val.value,
            }));
          }}
          displayValue="UTC"
        />
      </div>
    </div>
  );
};

export default Timezone;
