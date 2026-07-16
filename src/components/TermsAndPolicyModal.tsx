"use client";

import type React from "react";

import { getCompanyLeadTermsPolicyByToken } from "@/actions/settings/getCompanyLeadTermsPolicyByToken";
import { getCompanyLeadTermsPolicy } from "@/actions/settings/updateLeadTermsPolicy";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";

interface TermsModalProps {
  children: React.ReactNode;
  content?: string;
  type: "terms" | "policy";
  token?: string;
}

export function TermsAndPolicyModal({
  children,
  content,
  type,
  token,
}: TermsModalProps) {
  const [open, setOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Default terms content if none provided
  const defaultContent = `<h2><strong>Summary of our Terms</strong></h2><p><br></p><p>These Terms of Service ("Terms") are part of the User Agreement – a legally binding contract governing your use of X.&nbsp;<strong>You should read these Terms of Service ("Terms") in full, but here are a few key things you should take away:</strong></p><ol><li><strong>You will see advertising on the platform:</strong>&nbsp;In exchange for accessing the Services, X and our third-party providers and partners may display advertising to you.</li><li><strong>When posting Content and otherwise using the Services, you must comply with this User Agreement and Applicable Law:</strong>&nbsp;You are responsible for your use of the Services and your Content. You must comply with this User Agreement, its incorporated policies, and all applicable laws.</li><li><strong>You must abide by the Services' acceptable use terms:</strong>&nbsp;You may not access the Services in any way other than through the currently available, published interfaces that we provide. For example, this means that you cannot scrape the Services&nbsp;without X's express written permission, try to work around any technical limitations we impose, or otherwise attempt to disrupt the operation of the Services.</li><li><strong>We have broad enforcement rights:</strong>&nbsp;X reserves the right to take enforcement actions against you if you do violate these terms, such as, for example, removing your Content, limiting visibility, discontinuing your access to X, or taking legal action. We may also suspend or terminate your account for other reasons, such as prolonged inactivity, risk of legal exposure, or commercial inviability.&nbsp;</li></ol><p><br></p>`;

  // Fetch terms and policy data when modal opens
  useEffect(() => {
    if (open && !content) {
      setIsLoading(true);

      // Use token-based function if token is provided, otherwise use session-based function
      const fetchFunction =
        token && token.trim() !== ""
          ? getCompanyLeadTermsPolicyByToken(token)
          : getCompanyLeadTermsPolicy();

      fetchFunction
        .then((data) => {
          if (data) {
            if (type === "terms") {
              setModalContent(data.leadTerms || defaultContent);
            } else {
              setModalContent(data.leadPolicy || defaultContent);
            }
          } else {
            setModalContent(defaultContent);
          }
        })
        .catch((error) => {
          console.error("Error fetching terms/policy:", error);
          setModalContent(defaultContent);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (content) {
      setModalContent(content);
    }
  }, [open, content, type, token, defaultContent]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {type === "terms" ? "Terms of Service" : "Privacy Policy"}
          </DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] w-full rounded-md border p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-6"
              dangerouslySetInnerHTML={{
                __html: modalContent || defaultContent,
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
