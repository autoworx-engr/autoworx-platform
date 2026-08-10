"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogContentBlank = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    aria-describedby={props["aria-describedby"] ?? undefined}
    {...props}
  >
    <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
    <DialogPrimitive.Description className="sr-only">
      Dialog content
    </DialogPrimitive.Description>
    {children}
  </DialogPrimitive.Content>
));
DialogContentBlank.displayName = "DialogContentBlank";

type DialogOverlayProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Overlay
>;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    form?: boolean;
  }
>(({ className, form, children, ...props }, ref) => {
  const Tag = form ? "form" : React.Fragment;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "#data-[state=open]:animate-in #data-[state=closed]:animate-out fixed left-[50%] top-[50%] z-50 grid max-h-full w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-visible border bg-background p-6 shadow-lg duration-200 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg focus:outline-none",
          className,
        )}
        asChild={form}
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={props["aria-describedby"] ?? undefined}
        {...props}
      >
        <Tag>
          {/* Fallback a11y nodes so dialogs without explicit header don't warn/crash screen-reader semantics */}
          <DialogPrimitive.Title className="sr-only">
            Dialog
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Dialog content
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm font-bold opacity-90 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X
              strokeWidth={3}
              className="h-5 w-5 font-bold text-slate-500 md:h-6 md:w-6"
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </Tag>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-end gap-2 flex-wrap", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-2xl font-semibold text-slate-600 leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContentBlank,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function InterceptedDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const isEstimateEditRoute = pathname?.includes("/estimate/edit");
  function close() {
    router.back();
  }

  React.useEffect(() => {
    setOpen(true);
  }, []);

  React.useEffect(() => {
    if (isEstimateEditRoute && open) {
      setOpen(false);
    }
  }, [isEstimateEditRoute, open]);

  return (
    <Dialog open={open} onOpenChange={close}>
      {children}
    </Dialog>
  );
}
