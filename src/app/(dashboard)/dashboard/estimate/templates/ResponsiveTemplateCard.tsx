import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import moment from "moment-timezone";
import Link from "next/link";
import { TemplateData } from "./TemplateTable";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

type TProps = {
  template: TemplateData;
  index: number;
};

export default function ResponsiveTemplateCard({ template, index }: TProps) {
  const { id, grandTotal, createdAt, status, bgColor, textColor, title } =
    template || {};
  const { setActionType } = useActionStoreCreateEdit();
  const timezone = useCompanyTimezone();

  return (
    <Card className={cn("w-full", index % 2 === 0 ? evenColor : oddColor)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <p className="block w-full text-blue-600">{id}</p>
        </CardTitle>
        <CardDescription className="font-bold">
          {moment.tz(createdAt, timezone).format("MM/DD/YYYY")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="line-clamp-1 text-xl font-bold">{title}</p>
          <p className="text-2xl text-blue-600">${grandTotal}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline">
          <Link
            href={`/dashboard/estimate/templates/create?isEdit=true&templateId=${id}`}
            className="text-xl text-blue-600"
            onClick={() => setActionType("edit")}
          >
            Edit
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
