"use client";

import { useEffect, useState } from "react";
import SyncEstimate from "./create/SyncEstimate";
import CarLoading from "@/components/common/CarLoading";
import { Column } from "@prisma/client";
import { useListsStore } from "@/stores/lists";
import { Dialog, DialogContentBlank, DialogPortal } from "@/components/Dialog";

export default function DynamicTemplateLoader({
  templateId,
}: {
  templateId: string;
}) {
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState<Column | null>(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!templateId) {
      // reset when templateId removed
      setTemplate(null);
      setItems([]);
      setTasks([]);
      setPhotos([]);
      setInspections([]);
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/template/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load template data");
        return res.json();
      })
      .then((data) => {
        setTemplate(data.template);
        setStatus(data.template?.column);
        setItems(data.items);
        setTasks(
          (data.tasks ?? []).map(
            (t: { title: string; description: string }) => ({
              title: t.title,
              description: t.description,
            }),
          ),
        );
        setPhotos(data.photos);
        setInspections(data.inspections);
      })
      .catch((err) => {
        console.error(err);
        setError("Something went wrong loading the template.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [templateId]);

  useEffect(() => {
    if (status) {
      useListsStore.setState({ status });
    }
  }, [status, templateId]);

  if (!templateId || !template) return null;

  if (loading) {
    return (
      <Dialog open={loading}>
        <DialogPortal>
          <DialogContentBlank className="fixed left-[50%] top-[50%] z-50 flex h-full w-full translate-x-[-50%] translate-y-[-50%] flex-col justify-center gap-1 overflow-y-auto py-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] md:max-h-full md:max-w-[98%] md:flex-row md:gap-4">
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <CarLoading />
              </div>
            </div>
          </DialogContentBlank>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <div>
      <SyncEstimate
        template={template}
        items={items}
        tasks={tasks}
        photos={photos}
        inspections={inspections}
        payment={null}
      />
    </div>
  );
}
