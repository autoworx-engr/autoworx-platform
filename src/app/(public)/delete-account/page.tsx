"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

// Zod Schema (Policy compliant)
const deleteAccountSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
  reason: z.string().optional(),
  confirm: z.boolean().refine((val) => val === true, {
    message: "You must confirm that this action is irreversible",
  }),
});

type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

export default function DeleteAccountPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      reason: "",
      confirm: false,
    },
  });

  const confirmChecked = watch("confirm");

  const onSubmit = (data: DeleteAccountFormValues) => {
    console.log("Delete Account Data:", data);
    setDialogOpen(false);
    toast.success("Your account deletion request has been submitted.");
    reset();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      {/* Main Content */}
      <div className="container max-w-2xl mx-auto px-4 py-12 md:py-16">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 border border-red-200 shadow-sm mb-2">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                Delete Account
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">
                You can permanently delete your account and all associated data
                directly from this page without contacting support.
              </p>
            </div>
          </div>

          {/* Compliance Warning Alert (Play + Apple Safe) */}
          <Alert className="border-red-300 bg-red-50 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <AlertDescription>
                  <p className="font-bold text-red-900 mb-3 text-base">
                    Permanent Account Deletion Notice
                  </p>

                  <ul className="space-y-2 text-sm text-red-800">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>
                        Your account and all personal data will be permanently
                        deleted from our servers
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>
                        This includes profile information, saved data, activity
                        history, and account settings
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>
                        This action is irreversible and cannot be undone once
                        confirmed
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>
                        Account deletion will be processed immediately and fully
                        completed within 30 days as per our data retention
                        policy
                      </span>
                    </li>

                    <li className="flex items-start gap-2">
                      <span className="font-bold text-red-600">•</span>
                      <span>
                        Active subscriptions must be cancelled separately via
                        Google Play or App Store if applicable
                      </span>
                    </li>
                  </ul>
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Form Card */}
          <Card className="border-slate-200 shadow-xl bg-white">
            <CardHeader className="space-y-2 pb-8 border-b">
              <CardTitle className="text-2xl font-bold text-slate-900">
                Confirm Account Deletion
              </CardTitle>
              <CardDescription className="text-base text-slate-600">
                For security purposes, please verify your password before
                deleting your account.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8">
              <form
                onSubmit={handleSubmit(() => setDialogOpen(true))}
                className="space-y-7"
              >
                {/* Password */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    Current Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="h-12 text-base border-slate-300 focus:border-red-500 focus:ring-red-500"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    Reason for leaving (optional)
                  </Label>
                  <Textarea
                    placeholder="Help us improve by sharing your feedback..."
                    rows={4}
                    className="resize-none text-base border-slate-300 focus:border-red-500 focus:ring-red-500"
                    {...register("reason")}
                  />
                </div>

                {/* Checkbox */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-5 rounded-xl border-2 border-red-200 bg-red-50">
                    <Checkbox
                      checked={confirmChecked}
                      onCheckedChange={(checked) =>
                        setValue("confirm", Boolean(checked), {
                          shouldValidate: true,
                        })
                      }
                      className="mt-1 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <Label className="text-sm font-medium text-slate-900 leading-relaxed cursor-pointer">
                      I understand that deleting my account is permanent,
                      irreversible, and all my data will be permanently removed.
                    </Label>
                  </div>

                  {errors.confirm && (
                    <p className="text-sm text-red-600 font-medium">
                      {errors.confirm.message}
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 text-base font-medium"
                    onClick={() => console.log("Cancel deletion")}
                  >
                    Cancel
                  </Button>

                  <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className="flex-1 h-12 gap-2 text-base font-semibold bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-200 text-white shadow-lg shadow-red-600/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-center">
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-base text-slate-600">
                          This will permanently delete your account and all
                          associated data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                          onClick={handleSubmit(onSubmit)}
                        >
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Compliance Policy Section (Fixes Play Console rejection) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-semibold text-slate-900 mb-2">
              Account Deletion Policy
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              In compliance with Google Play and Apple App Store policies, users
              can permanently delete their account directly داخل the app without
              contacting support. Once requested, all personal data associated
              with the account will be securely removed according to our data
              retention and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
