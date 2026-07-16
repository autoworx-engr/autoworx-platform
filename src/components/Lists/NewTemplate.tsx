"use client";

import { emailTemplateQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import useTemplatesQuery from "@/hooks/query-hook/useTemplatesQuery";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { EmailTemplate, EmailTemplateType } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { addTemplate } from "../../actions/appointment/addTemplate";

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
  const { data: templates = [] } = useTemplatesQuery();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState(
    type === "Confirmation"
      ? "Appointment Confirmation"
      : "Appointment Reminder",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Updated default texts (<160 chars, SMS style)
    const templateText =
      type === "Confirmation"
        ? `Hi <CLIENT>, your <BUSINESS_NAME> appt is on <DATE>. Reply YES to confirm, NO to cancel, or text here to reschedule. STOP to opt out.`
        : `Reminder: <CLIENT>, your <BUSINESS_NAME> appt is on <DATE>. If you’re not able to make it, text here to reschedule.`;

    setMessage(templateText);
  }, [clientName, vehicleModel, date, startTime, type]);

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
        <button type="button" className="text-xs text-primary">
          + Add New Template
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle className="px-1">Custom Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-1">
          <FormError />
          <input type="hidden" name="type" value={type} />
          <SlimInput
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <label className="block">
            <div className="mb-1 px-2 font-medium flex justify-between">
              <span>Message</span>
              <span
                className={
                  message.length > 160 ? "text-red-500" : "text-gray-500"
                }
              >
                {message.length}/160
              </span>
            </div>
            <textarea
              name="message"
              rows={5}
              maxLength={160} // ✅ Enforce SMS strictness
              className={`${slimInputClassName} ${
                message.length > 160 ? "border-red-500" : ""
              }`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <AppointmentTemplateVariable />
        </div>

        <DialogFooter className="px-1">
          <DialogClose
            className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
          >
            Cancel
          </DialogClose>
          <Submit
            className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
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
  VARIABLES = TEMPLATE_VARIABLES,
  hasBackground = false, // Use the default TEMPLATE_VARIABLES if none are provided
}: {
  VARIABLES?: TemplateVariable[];
  hasBackground?: boolean;
}) => {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const copyToClipboard = (variable: string | null) => {
    navigator.clipboard.writeText(variable!);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <div
      className={`rounded-lg   bg-white  font-sans text-gray-700 ${hasBackground ? "" : "shadow-md p-4"} `}
    >
      {/* Section title for template variables */}
      <h4 className="mb-3 text-lg font-semibold text-gray-800">
        TEMPLATE VARIABLES
      </h4>
      <div className="flex flex-wrap gap-2">
        {/* Map through the VARIABLES array and display each variable's name and description */}
        {VARIABLES.map((variable) => (
          <div
            key={variable.name}
            onClick={() => copyToClipboard(variable.name)}
            className={`flex flex-col rounded-md border cursor-pointer p-3 ${
              copiedVar === variable.name
                ? "border-green-400 bg-green-50"
                : "border-gray-200 hover:border-indigo-300"
            }`}
          >
            {/* Display the variable name */}
            <span className="mb-1 text-xs font-bold text-blue-600">
              {variable.name}
            </span>
            {/* Display the variable description */}
            <span className="text-xs text-gray-600">
              {copiedVar === variable.name ? "✓ Copied!" : variable.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
