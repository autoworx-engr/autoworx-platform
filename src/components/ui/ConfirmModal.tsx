"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/cn";
import { AlertTriangle } from "lucide-react";

type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm button as a destructive (red) action. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
};

/**
 * Reusable confirmation modal built on the shadcn AlertDialog primitive.
 * Use anywhere a "are you sure?" prompt is needed instead of window.confirm.
 */
export default function ConfirmModal({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-xl">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div
            className={cn(
              "mx-auto flex size-12 items-center justify-center rounded-full",
              destructive ? "bg-destructive/10" : "bg-accent",
            )}
          >
            <AlertTriangle
              className={cn(
                "size-6",
                destructive ? "text-destructive" : "text-primary",
              )}
            />
          </div>
          <AlertDialogTitle className="mt-3 text-lg font-semibold">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex-nowrap justify-stretch gap-3 sm:justify-stretch">
          <AlertDialogCancel disabled={loading} className="mt-0 flex-1">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              "flex-1",
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {loading ? "Please wait…" : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
