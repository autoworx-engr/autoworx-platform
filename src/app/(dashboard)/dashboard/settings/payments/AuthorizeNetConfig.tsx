"use client";

import { useState } from "react";
import { CircleCheckBig, CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  saveAuthorizeNetCredentials,
  removeAuthorizeNetCredentials,
} from "./authorize-net";
import { successToast, errorToast } from "@/lib/toast";

interface AuthorizeNetConfigProps {
  companyId: number;
  isConfigured: boolean;
  hasApiLoginId: boolean;
  onUpdate: () => void;
}

export default function AuthorizeNetConfig({
  companyId,
  isConfigured,
  hasApiLoginId,
  onUpdate,
}: AuthorizeNetConfigProps) {
  const [apiLoginId, setApiLoginId] = useState("");
  const [transactionKey, setTransactionKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(!isConfigured);

  const handleSave = async () => {
    if (!apiLoginId || !transactionKey) {
      errorToast("Please enter both API Login ID and Transaction Key");
      return;
    }

    setIsLoading(true);
    try {
      const result = await saveAuthorizeNetCredentials(
        apiLoginId,
        transactionKey
      );

      if (result.success) {
        successToast("Authorize.Net credentials saved successfully!");
        setShowForm(false);
        setApiLoginId("");
        setTransactionKey("");
        onUpdate();
      } else {
        errorToast(result.message || "Failed to save credentials");
      }
    } catch (error) {
      console.log("🚀 ~ handleSave ~ error:", error);
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
      const result = await removeAuthorizeNetCredentials(companyId);

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
    <div className="payment-integration-card rounded-lg border bg-background p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-center">
        <img src="/icons/Logo2.png" alt="Autoworx" className="h-12 w-12" />
        <span className="mx-4 text-2xl">↔️</span>
        <img
          src="/icons/authorizenet.png"
          alt="Authorize.Net"
          className="#h-12 w-24"
        />
      </div>

      <p className="my-2 text-center text-xl font-medium">
        Connect Autoworx to Authorize.Net
      </p>
      <p className="mb-4 text-center text-gray-500">
        Accept credit card payments securely through Authorize.Net
      </p>

      {isConfigured && !showForm ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center rounded-lg bg-gray-100 p-4">
            <div className="flex items-center font-medium text-green-600">
              <CircleCheckBig className="mr-2 h-5 w-5" />
              Authorize.Net Connected
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#6571ff] text-white hover:bg-blue-700"
            >
              Update Credentials
            </Button>
            <Button
              onClick={handleRemove}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50"
              disabled={isLoading}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiLoginId">API Login ID</Label>
            <Input
              id="apiLoginId"
              type="text"
              placeholder="Enter your API Login ID"
              value={apiLoginId}
              onChange={(e) => setApiLoginId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionKey">Transaction Key</Label>
            <Input
              id="transactionKey"
              type="password"
              placeholder="Enter your Transaction Key"
              value={transactionKey}
              onChange={(e) => setTransactionKey(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <p className="font-medium">What you need from Authorize.Net:</p>
            <ol className="ml-4 mt-2 list-decimal space-y-1">
              <li>Log in to your Authorize.Net account</li>
              <li>
                Go to{" "}
                <span className="font-semibold">
                  Account → Settings → API Credentials &amp; Keys
                </span>
              </li>
              <li>
                Copy your <span className="font-semibold">API Login ID </span>
                and generate a new
                <span className="font-semibold"> Transaction Key</span>
              </li>
              <li>
                Generate a <span className="font-semibold">Signature Key</span>,
                which is required for webhooks
              </li>
            </ol>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              onClick={handleSave}
              disabled={isLoading || !apiLoginId || !transactionKey}
              className="bg-[#6571ff] text-white hover:bg-blue-700"
            >
              {isLoading ? "Saving..." : "Save Credentials"}
            </Button>
            {isConfigured && (
              <Button
                onClick={() => {
                  setShowForm(false);
                  setApiLoginId("");
                  setTransactionKey("");
                }}
                variant="outline"
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {!isConfigured && !showForm && (
        <div className="flex items-center justify-center rounded-lg bg-gray-100 p-4">
          <div className="flex items-center font-medium text-yellow-600">
            <CircleAlert className="mr-2 h-5 w-5" />
            Not Configured
          </div>
        </div>
      )}
    </div>
  );
}
