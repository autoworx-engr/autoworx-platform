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
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
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
        <button type="button" className="text-xs text-primary">
          Edit
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Custom Template: Edit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
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
              className={slimInputClassName}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
          </label>
          <AppointmentTemplateVariable />
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-lg border bg-primary px-5 py-2 text-white"
            formAction={handleSubmit}
          >
            Save
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
