import { useEffect, useState } from "react";

export function useCompanyTimezone() {
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const res = await fetch("/api/company-timezone");
        const data = await res.json();
        if (data?.timezone) {
          setTimezone(data.timezone);
        }
      } catch (error) {
        console.error("Failed to load timezone:", error);
      }
    };

    fetchTimezone();
  }, []);

  return timezone;
}
