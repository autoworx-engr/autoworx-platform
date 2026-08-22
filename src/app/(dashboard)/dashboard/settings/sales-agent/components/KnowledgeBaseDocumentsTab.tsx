"use client";
import { useState } from "react";
import { Popconfirm } from "antd";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Search,
  Lightbulb,
  Plus,
} from "lucide-react";
import {
  useKnowledgeBaseDocuments,
  useCreateKnowledgeBaseDocument,
  useDeleteKnowledgeBaseDocument,
} from "@/hooks/sales-agent/useKnowledgeBaseDocuments";
import { Badge } from "@/components/ui/badge";

const documentExamples = [
  {
    title: "Price List PDF",
    description: "Upload your detailed pricing sheet",
  },
  {
    title: "Service Menu",
    description: "Complete list of services with descriptions",
  },
  {
    title: "Warranty Documentation",
    description: "Warranty terms for each service type",
  },
  {
    title: "FAQ Document",
    description: "Common questions and answers from customers",
  },
  {
    title: "Training Materials",
    description: "Internal guides on service procedures",
  },
  {
    title: "Product Spec Sheets",
    description: "Manufacturer info for products used",
  },
];

export function KnowledgeBaseDocumentsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "general",
    content: "",
  });

  const { data: documentsData, isLoading: isLoadingDocuments } =
    useKnowledgeBaseDocuments();
  const createDocument = useCreateKnowledgeBaseDocument();
  const deleteDocument = useDeleteKnowledgeBaseDocument();

  const documents = documentsData?.data || [];
  const categories = ["general", "services", "pricing", "policies", "faq"];

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      return;
    }

    try {
      await createDocument.mutateAsync({
        title: newDoc.title,
        category: newDoc.category,
        content: newDoc.content,
      });

      // Reset form
      setNewDoc({
        title: "",
        category: "general",
        content: "",
      });
    } catch (error) {
      console.error("Error adding document:", error);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Knowledge Base Documents
          </CardTitle>
          <CardDescription>
            Upload or paste documents that contain information your AI should
            know
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Document */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newDoc.title}
                  onChange={(e) =>
                    setNewDoc((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g., PPF Warranty Info"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={newDoc.category}
                  onChange={(e) =>
                    setNewDoc((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newDoc.content}
                onChange={(e) =>
                  setNewDoc((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Paste the content from your document here..."
                rows={6}
              />
            </div>
            <Button
              onClick={handleAddDocument}
              disabled={
                createDocument.isPending ||
                !newDoc.title.trim() ||
                !newDoc.content.trim()
              }
            >
              {createDocument.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Knowledge Base
                </>
              )}
            </Button>
          </div>

          {/* Example Documents */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">
                  What documents should you add?
                </p>
                <div className="grid gap-2 md:grid-cols-2 mt-3">
                  {documentExamples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="text-sm p-2 rounded bg-background/50"
                    >
                      <span className="font-medium">{ex.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        - {ex.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>
                No documents yet. Add your first knowledge base entry above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.category}
                      </Badge>
                      <Badge
                        variant={
                          doc.status === "indexed" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {doc.content}
                    </p>
                  </div>
                  <Popconfirm
                    title="Are you sure you want to delete this document?"
                    onConfirm={() => handleDeleteDocument(doc.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
