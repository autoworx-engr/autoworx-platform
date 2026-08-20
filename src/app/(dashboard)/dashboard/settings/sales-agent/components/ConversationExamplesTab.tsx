"use client";
import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Image,
  Trash2,
  Loader2,
  Lightbulb,
  MessageCircleMore,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useConversationExamples,
  useCreateConversationExample,
  useUpdateConversationExample,
  useDeleteConversationExample,
} from "@/hooks/sales-agent/useConversationExamples";

export function ConversationExamplesTab() {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploadingExample, setIsUploadingExample] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; url: string }[]
  >([]);

  const { data: examplesData, isLoading: isLoadingExamples } =
    useConversationExamples();
  const createExample = useCreateConversationExample();
  const updateExample = useUpdateConversationExample();
  const deleteExample = useDeleteConversationExample();

  const conversationExamples = examplesData?.data || [];
  console.log("conversationExamples", conversationExamples);

  const handleUploadConversationExample = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const invalidFiles = Array.from(files).filter(
      (file) => !file.type.startsWith("image/"),
    );
    if (invalidFiles.length > 0) {
      toast.error("Please upload only image files (JPG, PNG, etc.)");
      return;
    }

    setSelectedFiles(
      Array.from(files).map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    );

    event.target.value = "";
  };

  const handleUpdateExampleNotes = async (id: string, notes: string) => {
    try {
      await updateExample.mutateAsync({ id, notes });
    } catch (error) {
      console.error("Error updating notes:", error);
    }
  };

  const handleDeleteConversationExample = async (
    id: string,
    imageUrl: string,
  ) => {
    try {
      await deleteExample.mutateAsync(id);

      if (imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error) {
      console.error("Error deleting conversation example:", error);
    }
  };

  const handleSaveExamples = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select images to upload");
      return;
    }

    setIsUploadingExample(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((item) => {
        formData.append("file", item.file);
      });

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadResponse.json();
      if (uploadData.status !== "success") {
        throw new Error("Upload failed");
      }

      const urls = uploadData.data;

      const createPromises = urls.map((url: string) =>
        createExample.mutateAsync({
          imageUrl: url,
          extractedText: undefined,
          notes: undefined,
        }),
      );

      await Promise.all(createPromises);

      toast.success("Examples uploaded successfully");
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.url));
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error saving examples:", error);
      toast.error("Failed to upload examples");
    } finally {
      setIsUploadingExample(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircleMore className="h-5 w-5" />
            Conversation Examples
          </div>
          <div>
            <Button
              onClick={handleSaveExamples}
              disabled={
                isLoadingExamples ||
                isUploadingExample ||
                selectedFiles.length === 0
              }
              size="lg"
            >
              {isUploadingExample ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>Save Examples</>
              )}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Upload screenshots of previous text conversations so the AI can learn
          your communication style and common interactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadConversationExample}
            className="hidden"
            id="conversation-upload"
            disabled={isUploadingExample || createExample.isPending}
          />
          <label
            htmlFor="conversation-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            {isUploadingExample || createExample.isPending ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : (
              <Image className="h-10 w-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {isUploadingExample || createExample.isPending
                  ? "Uploading..."
                  : "Click to select conversation screenshots"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select multiple JPG, PNG or other image formats
              </p>
            </div>
          </label>
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              Selected Images ({selectedFiles.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedFiles.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={item.url}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        URL.revokeObjectURL(item.url);
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }}
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversationExamples.map((example) => (
            <div
              key={example.id}
              className="border rounded-lg overflow-hidden bg-card"
            >
              <div className="aspect-[3/4] relative">
                <img
                  src={`${example?.imageUrl}`}
                  alt="Conversation example"
                  className="w-full h-full"
                />
                <Button
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    handleDeleteConversationExample(
                      example.id,
                      example.imageUrl,
                    )
                  }
                  disabled={deleteExample.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3">
                <Textarea
                  placeholder="Add notes about this conversation (optional)..."
                  defaultValue={example.notes || ""}
                  rows={2}
                  className="text-sm"
                  disabled={updateExample.isPending}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (debounceRef.current) {
                      clearTimeout(debounceRef.current);
                    }

                    debounceRef.current = setTimeout(() => {
                      handleUpdateExampleNotes(example.id, value);
                    }, 5000);
                  }}
                />

                <p className="text-xs text-muted-foreground mt-2">
                  Added{" "}
                  {new Date(example.createdAt).toLocaleDateString("en-US")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {conversationExamples.length === 0 && !isLoadingExamples && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No conversation examples uploaded yet.</p>
            <p className="text-sm mt-1">
              Upload screenshots of your best text conversations to help the AI
              learn.
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tips for best results:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>
                  • Upload conversations that show great customer interactions
                </li>
                <li>• Include examples of how you handle common questions</li>
                <li>
                  • Add notes to explain what makes each conversation good
                </li>
                <li>• Include examples of successful sales or bookings</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
