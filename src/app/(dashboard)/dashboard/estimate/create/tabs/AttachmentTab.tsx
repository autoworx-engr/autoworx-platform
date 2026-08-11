"use client";

import { useEstimateCreateStore } from "@/stores/estimate-create";
import { ImagesInput } from "./ImagesInput";
import { TasksInput } from "./TasksInput";
import NotesTextArea from "../../templates/NotesTextArea";

export function AttachmentTab() {
  const {
    internalNotes,
    terms,
    policy,
    customerNotes,
    customerComments,
    setInternalNotes,
    setTerms,
    setPolicy,
    setCustomerNotes,
    setCustomerComments,
    photos,
    setPhotos,
    tasks,
  } = useEstimateCreateStore();

  // const { photos, setPhotos } = useEstimateCreateStore();
  return (
    <>
      <h2 className="mb-3 font-bold">Internal</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ImagesInput photos={photos} setPhotos={setPhotos} />
        <TasksInput tasks={tasks} />

        <h2 className="font-bold">Internal Job Notes</h2>

        <NotesTextArea
          value={internalNotes}
          onChange={setInternalNotes}
          placeholder="Internal Job Notes..."
          name="internal-notes"
        />

        {/* <textarea
          className="rounded border border-solid border-slate-500 p-2"
          name="internal-t&c"
          rows={5}
          placeholder="Terms and Conditions..."
          value={terms}
          onChange={(e) => setTerms(e.currentTarget.value)}
        /> */}

        {/* <textarea
          className="rounded border border-solid border-slate-500 p-2"
          name="internal-p&g"
          rows={5}
          placeholder="Policy and Guidelines..."
          value={policy}
          onChange={(e) => setPolicy(e.currentTarget.value)}
        /> */}
      </div>

      <h2 className="mb-3 font-bold">Customer Notes</h2>

      <div className="grid grid-cols-1 gap-3">
        <NotesTextArea
          value={customerNotes}
          onChange={setCustomerNotes}
          placeholder="Notes..."
          name="customer-notes"
        />
        {/* <textarea
          className="rounded border border-solid border-slate-500 p-2"
          name="customer-comments"
          rows={5}
          placeholder="Comments..."
          value={customerComments}
          onChange={(e) => setCustomerComments(e.currentTarget.value)}
        /> */}
      </div>
    </>
  );
}
