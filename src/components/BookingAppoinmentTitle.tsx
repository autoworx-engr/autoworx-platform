"use client";

import { useEffect, useState } from "react";

import { createBookingAppointmentTitle } from "@/actions/appointment/createBookingAppoinmentTitles";
import { deleteBookingAppointmentTitle } from "@/actions/appointment/deleteBookingAppointmentTitle";
import { getBookingAppointmentTitles } from "@/actions/appointment/getBookingAppoinmentTitles";
import { updateBookingAppointmentTitle } from "@/actions/appointment/updateBookingAppointmentTitle";
import { SlimInput } from "@/components/SlimInput";
import { cn } from "@/lib/utils";
import { Edit, Trash } from "lucide-react";
import toast from "react-hot-toast";

type AppointmentTitle = {
  id: number;
  title: string;
  createdAt: Date;
};

export default function BookingAppointmentTitles() {
  const [titles, setTitles] = useState<AppointmentTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTitles = async () => {
    setIsLoading(true);
    const result = await getBookingAppointmentTitles();
    if (result.type === "success") {
      setTitles(result.data as AppointmentTitle[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTitles();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }
    setIsCreating(true);
    setCreateError("");
    const result = await createBookingAppointmentTitle({ title: newTitle });
    if (result.type === "success") {
      setNewTitle("");
      toast.success(result.message);
      await fetchTitles();
    } else {
      setCreateError(result.message);
      toast.error(result.message);
    }
    setIsCreating(false);
  };

  const handleEditStart = (item: AppointmentTitle) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editTitle.trim()) {
      setEditError("Title is required.");
      return;
    }
    setIsSaving(true);
    setEditError("");
    const result = await updateBookingAppointmentTitle({
      id: editingId!,
      title: editTitle,
    });
    if (result.type === "success") {
      setEditingId(null);
      toast.success(result.message);
      await fetchTitles();
    } else {
      setEditError(result.message);
      toast.error(result.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    const result = await deleteBookingAppointmentTitle(id);
    if (result.type === "success") {
      setDeletingId(null);
      toast.success(result.message);
      await fetchTitles();
    } else {
      toast.error(result.message);
    }
    setIsDeleting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div>
        <h2 className="text-2xl font-bold pb-2">Appointment Titles</h2>
      </div>

      {/* Create new */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow p-5 mb-6">
        <h2 className="text-base font-semibold">Add New Title</h2>
        <div className="flex gap-3 items-center justify-center">
          <div className="flex-1">
            <SlimInput
              name="newTitle"
              label=""
              placeholder="e.g. Free Consultation"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (createError) setCreateError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="focus:border-[#6571FF] focus:outline-none focus:ring-2 focus:ring-[#6571FF]"
              error={createError}
            />
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className={cn(
                "px-5 py-[7px] rounded-md text-sm font-medium text-white transition-colors mt-2",
                isCreating
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#6571FF] hover:opacity-90"
              )}
            >
              {isCreating ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border max-h-64 overflow-y-auto border-gray-100 rounded-2xl shadow divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : titles.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No appointment titles yet. Add one above.
          </div>
        ) : (
          titles.map((item) => (
            <div key={item.id} className="p-4">
              {editingId === item.id ? (
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <SlimInput
                      name="editTitle"
                      label=""
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        if (editError) setEditError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                      className="focus:border-[#6571FF] focus:outline-none focus:ring-2 focus:ring-[#6571FF]"
                      error={editError}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 mt-[2px]">
                    <button
                      onClick={handleEditSave}
                      disabled={isSaving}
                      className="px-4 py-[7px] bg-[#6571FF] text-white text-sm rounded-md font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-[7px] border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deletingId === item.id ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Delete <span className="font-semibold">"{item.title}"</span>
                    ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className="px-4 py-[7px] bg-red-500 text-white text-sm rounded-md font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-[7px] border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditStart(item)}
                      className="   text-blue-600 hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="  text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
