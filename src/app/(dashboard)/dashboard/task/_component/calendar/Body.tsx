import Day from "./day/Day";
import Month from "./month/Month";
import Week from "./week/Week";

export default function Body({ type }: { type: string }) {
  switch (type) {
    case "day": {
      return <Day />;
    }

    case "week": {
      return <Week />;
    }
    case "month": {
      return <Month />;
    }
    default:
      throw new Error("Invalid calendar type");
  }
}
