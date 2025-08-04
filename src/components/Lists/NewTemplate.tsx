"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { useEffect, useState } from "react";
import FormError from "@/components/FormError";
import { useFormErrorStore } from "@/stores/form-error";
import { addTemplate } from "../../actions/appointment/addTemplate";
import { EmailTemplate, EmailTemplateType } from "@prisma/client";
import { useListsStore } from "@/stores/lists";
import useTemplatesQuery from "@/hooks/query-hook/useTemplatesQuery";
import { useQueryClient } from "@tanstack/react-query";
import { emailTemplateQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";

type TNewTemplateProps = {
  type: EmailTemplateType;
  clientName: string;
  vehicleModel: string;
  setTemplate: React.Dispatch<React.SetStateAction<EmailTemplate | null>>;
  setOpenTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  startTime: string;
  date: string;
};

export default function NewTemplate({
  type,
  clientName,
  vehicleModel,
  setTemplate,
  setOpenTemplate,
  startTime,
  date,
}: TNewTemplateProps) {
  const [open, setOpen] = useState(false);
  const { showError } = useFormErrorStore();
  // const templates = useListsStore((x) => x.templates);
  const { data: templates = [] } = useTemplatesQuery();

  const queryClient = useQueryClient();

  const [subject, setSubject] = useState(
    type === "Confirmation"
      ? "Appointment Confirmation"
      : "Reminder for your upcoming appointment",
  );
  const [message, setMessage] = useState("");

  const templateText =
    type === "Confirmation"
      ? `Confirmation: Your appointment is on <DATE>`
      : `reminder: Your appointment is on <DATE>`;

  useEffect(() => {
    // const appointmentDate = moment(`${date}T${startTime}:00`).format(
    //   "dddd, MMMM DD, h:mm A",
    // );
    // const dayName = moment(date).format("dddd");
    // const month = moment(date).format("MMMM DD");
    setMessage(`Hi <CLIENT>, ${templateText}. Reply here or call <PHONE> with questions or to reschedule.
<BUSINESS_NAME>
<ADDRESS>.
STOP to opt out.`);
  }, [clientName, vehicleModel, date, startTime]);

  async function handleSubmit(data: FormData) {
    const res = await addTemplate({ subject, message, type });

    if (res.type === "error") {
      showError({
        field: res.field || "subject",
        message: res.message || "",
      });
    } else {
      useListsStore.setState({
        templates: [...templates, res.data],
      });
      queryClient.invalidateQueries({
        queryKey: [emailTemplateQueryKey.templates],
      });
      setOpen(false);
      setTemplate(res.data);
      setOpenTemplate(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-[#6571FF]">
          + Add New Template
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Custom Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <FormError />
          <input type="hidden" name="type" value={type} />
          <SlimInput
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <label className="block">
            <div className="mb-1 px-2 font-medium">Message</div>
            <textarea
              name="message"
              rows={10}
              className={slimInputClassName}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <AppointmentTemplateVariable />
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
            formAction={handleSubmit}
          >
            Save
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Define the structure for a single template variable
type TemplateVariable = {
  name: string;
  description: string;
};

// Template variables array using the new variables provided by the user
const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: "<VEHICLE>", description: "Vehicle details" },
  { name: "<CLIENT>", description: "Client name" },
  { name: "<DATE>", description: "Appointment date" },
  { name: "<BUSINESS_NAME>", description: "Your business name" },
  { name: "<PHONE>", description: "Your business phone number" },
  { name: "<ADDRESS>", description: "Your business address" },
];

export const AppointmentTemplateVariable = ({
  VARIABLES = TEMPLATE_VARIABLES, // Use the default TEMPLATE_VARIABLES if none are provided
}: {
  VARIABLES?: TemplateVariable[];
}) => {
  return (
    <div className="rounded-lg bg-white p-4 font-sans text-gray-700 shadow-md">
      {/* Section title for template variables */}
      <h4 className="mb-3 text-lg font-semibold text-gray-800">
        TEMPLATE VARIABLES
      </h4>
      <div className="flex flex-wrap gap-2">
        {/* Map through the VARIABLES array and display each variable's name and description */}
        {VARIABLES.map((variable) => (
          <div
            key={variable.name}
            className="flex flex-col rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            {/* Display the variable name */}
            <span className="mb-1 text-xs font-bold text-blue-600">
              {variable.name}
            </span>
            {/* Display the variable description */}
            <span className="text-xs text-gray-600">
              {variable.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
