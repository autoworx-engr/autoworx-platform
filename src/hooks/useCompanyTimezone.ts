import moment from "moment-timezone";
import { useCompanyQuery } from "./useCompanyQuery";
import { useEffect, useState } from "react";

export function useCompanyTimezone() {
  const { data: company } = useCompanyQuery();
  const [timezone, setTimezone] = useState<string>(moment.tz.guess());

  useEffect(() => {
    if (company?.timezone) {
      setTimezone(company.timezone);
    }
  }, [company]);

  return timezone;
}
