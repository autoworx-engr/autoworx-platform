import * as React from "react";
import Box from "@mui/material/Box";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useMediaQuery } from "react-responsive";
import MobileDateInput from "./MobileDateInput";
import { TextField, TextFieldProps } from "@mui/material";

interface propsType {
  name: string;
  customTitle: string;
  defaultValue?: Date;
  otherDate?: string;
  isStartDate?: boolean;
  onDateChange?: (date: string) => void;
}

export default function CouponDateComponent({
  name,
  customTitle,
  defaultValue,
  otherDate,
  isStartDate,
  onDateChange,
}: propsType) {
  const isMobile = useMediaQuery({ maxWidth: 640 });

  // Initialize the state with defaultValue if provided
  const [value, setValue] = React.useState<Dayjs | null>(
    defaultValue ? dayjs(defaultValue) : null,
  );

  if (isMobile) {
    return (
      <MobileDateInput
        name={name}
        customTitle={customTitle}
        defaultValue={defaultValue}
        otherDate={otherDate}
        isStartDate={isStartDate}
        onDateChange={onDateChange}
      />
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box>
          <DatePicker
            label={customTitle}
            value={value}
            onChange={(newValue) => {
              setValue(newValue);
              if (newValue && onDateChange) {
                onDateChange(newValue.toISOString());
              }
            }}
            renderInput={(params) => <TextField {...params} />}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
