import Link from "next/link";
import {
  UserRoundSearch,
  MessageSquareText,
  FileText,
  ArrowRight,
} from "lucide-react";

export default function NoClientFound() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent min-h-[60vh]">
      <div className="flex flex-col items-center justify-center text-center p-10 max-w-md w-full">
        {/* Icon */}
        <div className="mb-7">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#006D77]/15 to-[#0098da]/15 flex items-center justify-center">
            <UserRoundSearch
              className="w-10 h-10 text-[#006D77] animate-pulse"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">
          No Client Selected
        </h2>

        {/* Subtitle */}
        <p className="text-sm font-light text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Pick a client from the list on the left to view their conversations,
          details, and communication history — or add a new one to get started.
        </p>

        {/* Feature hints */}
        <div className="w-full space-y-3 mb-8 text-left">
          {[
            {
              icon: MessageSquareText,
              label: "SMS & Email",
              desc: "View all messages in one place",
            },
            {
              icon: FileText,
              label: "Client Details",
              desc: "Access vehicles, invoices & notes",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400"
            >
              <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-white">
                {label}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                — {desc}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard/client"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#006D77] to-[#008c99] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          <UserRoundSearch className="w-4 h-4" />
          Add a Client
        </Link>

        {/* Accent line */}
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#006D77]/50 to-transparent rounded-full mt-8" />
      </div>
    </div>
  );
}
