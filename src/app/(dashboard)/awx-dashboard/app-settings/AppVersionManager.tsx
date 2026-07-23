"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { SlimInput } from "@/components/SlimInput";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useAppVersion,
  useUpdateAppVersion,
} from "@/hooks/query-hook/useAppVersion";
import type { AppVersionData } from "@/service/app-version/api";

type Props = {
  initialData: AppVersionData | null;
};

type FormErrors = Partial<
  Record<"latestVersion" | "minSupportedVersion", string>
>;

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

export const AppVersionManager = ({ initialData }: Props) => {
  const [form, setForm] = useState<AppVersionData>({
    latestVersion: initialData?.latestVersion ?? "",
    minSupportedVersion: initialData?.minSupportedVersion ?? "",
    forceUpdate: initialData?.forceUpdate ?? false,
    message: initialData?.message ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: liveData } = useAppVersion(initialData ?? undefined);
  const snapshot = liveData ?? initialData;

  const mutation = useUpdateAppVersion();

  useEffect(() => {
    if (initialData) {
      setForm({
        latestVersion: initialData.latestVersion,
        minSupportedVersion: initialData.minSupportedVersion,
        forceUpdate: initialData.forceUpdate,
        message: initialData.message ?? "",
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.latestVersion) {
      newErrors.latestVersion = "Latest version is required";
    } else if (!SEMVER_REGEX.test(form.latestVersion)) {
      newErrors.latestVersion = "Must be in x.y.z format (e.g., 1.3.0)";
    }

    if (!form.minSupportedVersion) {
      newErrors.minSupportedVersion = "Minimum version is required";
    } else if (!SEMVER_REGEX.test(form.minSupportedVersion)) {
      newErrors.minSupportedVersion = "Must be in x.y.z format (e.g., 1.2.0)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ ...form, message: form.message || null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 text-xs 2xl:text-base">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/awx-dashboard"
          className="rounded-xl bg-white/80 p-2 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Settings</h1>
          <p className="text-xs text-slate-500">
            Manage mobile app version and update behavior.
          </p>
        </div>
      </div>

      {/* Current config snapshot */}
      {snapshot && (
        <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="mb-3 flex items-center gap-2">
            <Smartphone size={15} className="text-primary" />
            <span className="text-sm font-semibold text-slate-700">
              Current Configuration
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Latest Version", value: snapshot.latestVersion },
              {
                label: "Min Supported",
                value: snapshot.minSupportedVersion,
              },
              {
                label: "Force Update",
                value: snapshot.forceUpdate ? "Enabled" : "Disabled",
                valueClass: snapshot.forceUpdate
                  ? "text-rose-600"
                  : "text-emerald-600",
              },
              { label: "Message", value: snapshot.message || "—" },
            ].map(({ label, value, valueClass }) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-400">{label}</p>
                <p
                  className={`mt-0.5 truncate font-bold text-slate-800 ${valueClass ?? ""}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="mb-5 text-base font-semibold text-slate-800">
          {initialData ? "Update Version" : "Configure Version"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SlimInput
              name="latestVersion"
              label="Latest Version"
              placeholder="e.g., 1.3.0"
              value={form.latestVersion}
              onChange={(e) =>
                setForm((p) => ({ ...p, latestVersion: e.target.value }))
              }
              error={errors.latestVersion}
              required
            />
            <SlimInput
              name="minSupportedVersion"
              label="Min Supported Version"
              placeholder="e.g., 1.2.0"
              value={form.minSupportedVersion}
              onChange={(e) =>
                setForm((p) => ({ ...p, minSupportedVersion: e.target.value }))
              }
              error={errors.minSupportedVersion}
              required
            />
          </div>

          <SlimInput
            name="message"
            label="Update Message"
            placeholder="e.g., New features are available!"
            value={form.message ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, message: e.target.value }))
            }
          />

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Force Update</p>
              <p className="text-xs text-slate-400">
                Force users to update before using the app
              </p>
            </div>
            <Switch
              checked={form.forceUpdate}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, forceUpdate: checked }))
              }
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-2xl bg-[#6470FF] px-6 text-xs font-bold text-white hover:bg-[#5460ee] disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
