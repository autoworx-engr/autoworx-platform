declare module "react-date-range" {
  import * as React from "react";

  export interface Range {
    startDate?: Date;
    endDate?: Date;
    key?: string;
    [key: string]: any;
  }

  export interface DateRangePickerProps {
    ranges?: Range[];
    onChange?: (ranges: any) => void;
    [key: string]: any;
  }

  export class DateRangePicker extends React.Component<DateRangePickerProps> {}

  export interface CalendarProps {
    date?: Date;
    onChange?: (date: Date) => void;
    [key: string]: any;
  }

  export class Calendar extends React.Component<CalendarProps> {}

  export interface DateRangeProps {
    ranges?: Range[];
    onChange?: (ranges: any) => void;
    [key: string]: any;
  }

  export class DateRange extends React.Component<DateRangeProps> {}
}
