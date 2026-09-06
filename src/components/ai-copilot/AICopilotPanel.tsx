import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CalendarPlus, FilePlus2, Lock, MessagesSquare } from "lucide-react";
import Image from "next/image";

const upcomingCapabilities = [
  {
    icon: MessagesSquare,
    title: "Ask about your shop",
    description: "Find clients, jobs and invoices by asking in plain language.",
  },
  {
    icon: CalendarPlus,
    title: "Create tasks & appointments",
    description:
      "Add and update tasks and appointments without leaving the chat.",
  },
  {
    icon: FilePlus2,
    title: "Handle estimates & work orders",
    description:
      "Create or update estimates and invoices, and assign work orders.",
  },
];

function CopilotLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/autoworx-icon.png"
      alt=""
      width={64}
      height={64}
      className={cn("shrink-0 border bg-white object-contain", className)}
    />
  );
}

function CopilotHeroVisual() {
  return (
    <div className="relative flex h-36 items-center justify-center">
      <div className="absolute size-28 rounded-full bg-primary/15 blur-2xl" />
      <div className="absolute size-28 animate-ping rounded-full border border-primary/20 [animation-duration:3s]" />
      <div className="absolute size-20 rounded-full border border-primary/25" />
      <CopilotLogo className="relative size-16 rounded-2xl shadow-lg shadow-primary/25" />
    </div>
  );
}

export default function AICopilotPanel() {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="gap-0 border-b bg-gradient-to-br from-primary/10 to-transparent p-4 pr-12">
        <div className="flex items-center gap-3">
          <CopilotLogo className="size-10 rounded-xl shadow-sm shadow-primary/25" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-base font-semibold">
                AI Copilot
              </SheetTitle>
              <Badge
                variant="secondary"
                className="bg-primary/10 uppercase tracking-wide text-primary hover:bg-primary/10"
              >
                Coming Soon
              </Badge>
            </div>
            <SheetDescription className="text-xs">
              Your assistant for smarter shop management
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4">
        <CopilotHeroVisual />

        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            AI Copilot is coming soon
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Your intelligent assistant for smarter shop management is on the
            way. Soon you&apos;ll be able to ask about your shop and get real
            work done just by chatting.
          </p>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What you&apos;ll be able to do
          </p>
          <ul className="mt-3 space-y-2">
            {upcomingCapabilities.map((item) => (
              <li key={item.title}>
                <Card className="flex items-start gap-3 p-3 shadow-none">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="size-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/50 px-3 py-3">
          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Chat will be enabled once AI Copilot launches
          </span>
        </div>
      </div>
    </div>
  );
}
