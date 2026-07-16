"use client";
import {
  getEmailTemplate,
  updateEmailTemplate,
} from "@/actions/settings/emailTemplates";
import { AppointmentTemplateVariable } from "@/components/Lists/NewTemplate";
import { successToast } from "@/lib/toast";
import { CompanyEmailTemplate } from "@prisma/client";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface EmailTemplate {
  subject: string;
  message: string;
  companyId: number;
}
export default function EstimateAndInvoicePage() {
  const [emailTemplate, setEmailTemplate] =
    useState<CompanyEmailTemplate | null>(null);
  const [newSubject, setNewSubject] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");
  const maxLength = 160;
  useEffect(() => {
    const fetchEmail = async () => {
      const template = await getEmailTemplate();
      if (template) {
        setEmailTemplate(template);
        setNewSubject(template.subject);
        setNewMessage(template.message ?? "");
      }
    };

    fetchEmail();
  }, []);

  const handleUpdate = async () => {
    if (newSubject.trim() && newMessage.trim()) {
      const updatedTemplate = await updateEmailTemplate(
        emailTemplate?.id || null,
        {
          subject: newSubject,
          message: newMessage,
        },
      );

      successToast("Email Template Updated Successfully");

      setEmailTemplate(updatedTemplate);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
          <Mail size={24} />
        </div>
        <h2 className="text-xl font-bold ">
          Edit Draft Email for Sharing Estimate/Invoice
        </h2>
      </div>
      <div className="space-y-4">
        {/* Email Subject Input */}
        <label className="block">
          <div className="mb-1 px-1 text-sm font-medium ">Email Subject</div>
          <input
            placeholder="Enter email subject here..."
            value={newSubject}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewSubject(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm outline-none shadow-sm focus:border-indigo-500 transition duration-150"
          />
        </label>

        {/* Message Context */}
        <p className="text-sm font-medium text-gray-500 border-l-4 border-indigo-300 pl-3 py-1 bg-indigo-50 rounded">
          The following message will be sent to the recipient when sharing an
          Invoice/Estimate.
        </p>

        {/* Email Message Textarea */}
        <div className="relative">
          <label className="block">
            <div className="mb-1 flex justify-between items-center px-1 text-sm font-medium ">
              <span>Email Message</span>
            </div>

            <textarea
              placeholder="Enter your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              maxLength={maxLength} // ✅ hard cap
              className={`h-32 w-full resize-none rounded-lg bg-gray-50 px-3 py-2 text-sm leading-6 outline-none transition duration-150 shadow-sm ${
                newMessage.length > maxLength
                  ? "border-2 border-red-500"
                  : "border border-gray-300 focus:border-indigo-500"
              }`}
            />
          </label>
          <span
            className={`absolute -bottom-2.5 right-1 text-xs font-medium ${newMessage.length > maxLength ? "text-red-500" : "text-gray-500"}`}
          >
            {newMessage.length}/{maxLength}
          </span>
        </div>

        <AppointmentTemplateVariable hasBackground />
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleUpdate}
            className="rounded-lg bg-primary px-8 py-2 text-base font-medium text-white shadow-md hover:bg-[#5661FF] transition duration-150"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
