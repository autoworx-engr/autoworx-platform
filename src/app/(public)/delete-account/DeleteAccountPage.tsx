"use client";

import React, { useState } from "react";
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

export default function DeleteAccountPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { password?: string; confirm?: string } = {};

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (!confirm) {
      newErrors.confirm = "You must confirm that this action is irreversible";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setDialogOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const data = { password, reason, confirm };
      console.log("Delete Account Data:", data);

      toast.success("Your account deletion request has been submitted.");

      setDialogOpen(false);
      setPassword("");
      setReason("");
      setConfirm(false);
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = password.length >= 6 && confirm;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      <div className="container max-w-2xl mx-auto px-4 py-12 md:py-16">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 border border-red-200 shadow-sm mb-2">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Delete Account</h1>
              <p className="text-lg text-slate-600">
                You can permanently delete your account and all associated data
                directly from this page without contacting support.
              </p>
            </div>
          </div>

          {/* Warning */}
          <Alert className="border-red-300 bg-red-50 shadow-sm">
            <AlertDescription>
              <p className="font-bold text-red-900 mb-3">
                Permanent Account Deletion Notice
              </p>
              <ul className="space-y-2 text-sm text-red-800">
                <li>
                  • Your account and all personal data will be permanently
                  deleted
                </li>
                <li>• This action is irreversible</li>
                <li>• Deletion completed within 30 days</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Confirm Account Deletion</CardTitle>
              <CardDescription>
                Verify your password before deleting your account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleInitialSubmit} className="space-y-6">
                {/* Password */}
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Help us improve..."
                  />
                </div>

                {/* Confirm */}
                <div className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                  <Checkbox
                    checked={confirm}
                    onCheckedChange={(checked) => setConfirm(Boolean(checked))}
                  />
                  <Label>
                    I understand this action is permanent and irreversible.
                  </Label>
                </div>
                {errors.confirm && (
                  <p className="text-sm text-red-600">{errors.confirm}</p>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => console.log("Cancel")}
                  >
                    Cancel
                  </Button>

                  <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="submit"
                        disabled={!isValid || isSubmitting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 text-white"
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
        </div>
      </div>
    </div>
  );
}
