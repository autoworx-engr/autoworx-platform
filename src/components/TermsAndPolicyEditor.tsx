"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  updateLeadTermsPolicy,
  getCompanyLeadTermsPolicy,
} from "@/actions/settings/updateLeadTermsPolicy";
import toast from "react-hot-toast";

export function TermsAndPolicyEditor() {
  const [termsContent, setTermsContent] = useState("");
  const [policyContent, setPolicyContent] = useState("");
  const [activeTab, setActiveTab] = useState("terms");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const existingData = await getCompanyLeadTermsPolicy();
        if (existingData) {
          setTermsContent(existingData.leadTerms || "");
          setPolicyContent(existingData.leadPolicy || "");
        }
      } catch (error) {
        console.error("Error loading existing terms and policy:", error);
        toast.error("Failed to load existing terms and policy");
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateLeadTermsPolicy({
        leadTerms: termsContent,
        leadPolicy: policyContent,
      });

      if (result.type === "success") {
        toast.success("Terms and policy saved successfully!");
      } else {
        toast.error(result.message || "Failed to save terms and policy");
      }
    } catch (error) {
      console.error("Error saving terms and policy:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["blockquote"],
      ["link"],
      ["clean"],
    ],
  };

  const quillFormats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "color",
    "background",
    "align",
  ];

  return (
    <div className="mx-auto w-full ">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Terms & Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6571FF]"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 md:inline-flex -ml-[14px] rounded-bl-none">
                  <TabsTrigger
                    value="terms"
                    className="text-sm md:text-base truncate"
                  >
                    Terms of Service
                  </TabsTrigger>
                  <TabsTrigger
                    value="policy"
                    className="text-sm md:text-base truncate"
                  >
                    Privacy Policy
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="terms" className="space-y-4 rounded-tl-none">
                  <div className="space-y-2">
                    <Label htmlFor="terms-editor">
                      Terms of Service Content
                    </Label>
                    <div className="border rounded-md overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={termsContent}
                        onChange={setTermsContent}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Enter your terms of service content here. Use the toolbar to format headings, lists, links, and more..."
                        style={{ height: "400px" }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="policy" className="space-y-4 rounded-tl-none">
                  <div className="space-y-2">
                    <Label htmlFor="policy-editor">
                      Privacy Policy Content
                    </Label>
                    <div className="border rounded-md overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={policyContent}
                        onChange={setPolicyContent}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Enter your privacy policy content here. Structure your policy with headings, bullet points, and professional formatting..."
                        style={{ height: "400px" }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-md bg-[#6571FF] px-10 py-1.5 text-white hover:bg-[#5561ef] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
