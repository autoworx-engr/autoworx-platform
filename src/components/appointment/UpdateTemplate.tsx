import { updateTemplate } from "@/actions/appointment/updateTemplate";
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
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { PencilLineIcon } from "lucide-react";
import { useState } from "react";

export default function UpdateTemplate({
  id,
  subject,
  message,
}: {
  id: number;
  subject: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  const { showError } = useFormErrorStore();

  const [subjectInput, setSubjectInput] = useState(subject);
  const [messageInput, setMessageInput] = useState(message);

  async function handleSubmit() {
    const res = await updateTemplate({
      id,
      subject: subjectInput,
      message: messageInput,
    });

    if (res.type === "error") {
      showError({
        field: res.field || "subject",
        message: res.message || "",
      });
    } else {
      useListsStore.setState(({ templates }) => ({
        templates: templates.map((template) => {
          if (template.id === id) {
            return {
              ...template,
              subject: subjectInput,
              message: messageInput,
            };
          }
          return template;
        }),
      }));
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md transition-all bg-white text-primary active:scale-90"
        >
          <PencilLineIcon size={16} strokeWidth={2} />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle className="px-1">Custom Template: Edit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-1">
          <FormError />

          <SlimInput
            name="subject"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            required
          />
          <label className="block">
            <div className="mb-1 px-2 font-medium">Message</div>
            <textarea
              name="message"
              rows={10}
              className={cn(
                slimInputClassName,
                "min-h-16 resize-y thin-scrollbar",
              )}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
          </label>
          <AppointmentTemplateVariable />
        </div>

        <DialogFooter>
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
