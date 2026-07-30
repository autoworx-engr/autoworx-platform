"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorToast, successToast } from "@/lib/toast";
import { CircleAlert, CircleCheckBig } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  removeAuthorizeNetCredentials,
  saveAuthorizeNetCredentials,
} from "./authorize-net";

interface AuthorizeNetConfigProps {
  isConfigured: boolean;
  hasApiLoginId: boolean;
  hasSignatureKey: boolean;
  initialApiLoginId?: string;
  initialTransactionKey?: string;
  initialSignatureKey?: string;
  onUpdate: () => void;
}

export default function AuthorizeNetConfig({
  isConfigured,
  hasApiLoginId,
  hasSignatureKey,
  initialApiLoginId = "",
  initialTransactionKey = "",
  initialSignatureKey = "",
  onUpdate,
}: AuthorizeNetConfigProps) {
  const [apiLoginId, setApiLoginId] = useState(initialApiLoginId);
  const [transactionKey, setTransactionKey] = useState(initialTransactionKey);
  const [signatureKey, setSignatureKey] = useState(initialSignatureKey);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(!isConfigured);

  const handleSave = async () => {
    if (!apiLoginId || !transactionKey || !signatureKey) {
      errorToast(
        "Please enter API Login ID, Transaction Key, and Signature Key",
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await saveAuthorizeNetCredentials(
        apiLoginId,
        transactionKey,
        signatureKey,
      );

      if (result.success) {
        successToast("Authorize.Net credentials saved successfully!");
        setShowForm(false);
        onUpdate();
      } else {
        errorToast(result.message || "Failed to save credentials");
      }
    } catch (error) {
      errorToast("An error occurred while saving credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (
      !confirm("Are you sure you want to remove Authorize.Net credentials?")
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await removeAuthorizeNetCredentials();

      if (result.success) {
        successToast("Credentials removed successfully");
        setShowForm(true);
        onUpdate();
      } else {
        errorToast(result.message || "Failed to remove credentials");
      }
    } catch (error) {
      errorToast("An error occurred while removing credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Authorize.Net Integration
        </h3>
      </div>
      <div className="flex flex-col items-center px-6 py-8">
        <div className="mb-5 flex items-center gap-3">
          <Image
            src="/icons/Logo2.png"
            alt="Autoworx"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <span className="mx-4 text-2xl">↔️</span>
          <Image
            src="/icons/authorizenet.png"
            alt="Authorize.Net"
            width={112}
            height={40}
            className="w-28"
          />
        </div>
        <p className="mb-1 text-lg font-semibold text-gray-700 text-center">
          Connect Autoworx to Authorize.Net
        </p>
        <p className="mb-6 max-w-md text-center text-sm text-gray-500">
          Accept credit card payments securely through Authorize.Net
        </p>

        {isConfigured && !showForm ? (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <CircleCheckBig className="h-3.5 w-3.5" />
              Authorize.Net Connected
            </span>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowForm(true)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#5561ef] hover:shadow-md"
              >
                Update Credentials
              </Button>
              <Button
                onClick={handleRemove}
                variant="outline"
                className="rounded-lg border-red-200 px-5 py-2.5 text-sm font-medium text-red-500 transition-colors hover:border-red-300 hover:bg-red-50"
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="apiLoginId"
                className="text-sm font-medium text-gray-700"
              >
                API Login ID
              </Label>
              <Input
                id="apiLoginId"
                type="text"
                placeholder="Enter your API Login ID"
                value={apiLoginId}
                onChange={(e) => setApiLoginId(e.target.value)}
                disabled={isLoading}
                className="rounded-lg border-gray-200 transition-colors focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="transactionKey"
                className="text-sm font-medium text-gray-700"
              >
                Transaction Key
              </Label>
              <Input
                id="transactionKey"
                type="password"
                placeholder="Enter your Transaction Key"
                value={transactionKey}
                onChange={(e) => setTransactionKey(e.target.value)}
                disabled={isLoading}
                className="rounded-lg border-gray-200 transition-colors focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="signatureKey"
                className="text-sm font-medium text-gray-700"
              >
                Signature Key
              </Label>
              <Input
                id="signatureKey"
                type="password"
                placeholder="Enter your Webhook Signature Key"
                value={signatureKey}
                onChange={(e) => setSignatureKey(e.target.value)}
                disabled={isLoading}
                className="rounded-lg border-gray-200 transition-colors focus:border-primary focus:ring-primary/20"
              />
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700">
              <p className="font-semibold">Setup Instructions</p>
              <ol className="ml-4 mt-2 list-decimal space-y-1 text-blue-600">
                <li>Log in to your Authorize.Net account</li>
                <li>
                  Go to{" "}
                  <span className="font-semibold">
                    Account → Settings → API Credentials &amp; Keys
                  </span>
                </li>
                <li>
                  Copy your <span className="font-semibold">API Login ID</span>{" "}
                  and generate a new{" "}
                  <span className="font-semibold">Transaction Key</span>
                </li>
                <li>
                  Go to{" "}
                  <span className="font-semibold">Account → Webhooks</span> and
                  copy your <span className="font-semibold">Signature Key</span>
                </li>
              </ol>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={
                  isLoading || !apiLoginId || !transactionKey || !signatureKey
                }
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#5561ef] hover:shadow-md disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Credentials"}
              </Button>
              {isConfigured && (
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setApiLoginId(initialApiLoginId);
                    setTransactionKey(initialTransactionKey);
                    setSignatureKey(initialSignatureKey);
                  }}
                  variant="outline"
                  disabled={isLoading}
                  className="rounded-lg px-5 py-2.5 text-sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {!isConfigured && !showForm && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700">
            <CircleAlert className="h-3.5 w-3.5" />
            Not Configured
          </span>
        )}
      </div>
    </div>
  );
}
