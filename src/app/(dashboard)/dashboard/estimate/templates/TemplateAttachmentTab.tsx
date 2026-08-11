"use client";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { ImagesInput } from "../create/tabs/ImagesInput";
import { TasksInput } from "../create/tabs/TasksInput";
import NotesTextArea from "./NotesTextArea";

const TemplateAttachmentTab = () => {
  const {
    photos,
    setPhotos,
    internalNotes,
    setInternalNotes,
    setCustomerNotes,
    customerNotes,
    tasks,
  } = useEstimateCreateStore(); //it will replace with template store later
  return (
    <>
      <h2 className="mb-3 font-bold">Internal</h2>

      {/* Image and Tasks input section */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-3">
        <ImagesInput photos={photos} setPhotos={setPhotos} />
        <TasksInput tasks={tasks} />
      </div>

      <h2 className="mb-3 font-bold">Internal Job Notes</h2>

      <NotesTextArea
        value={internalNotes}
        onChange={setInternalNotes}
        placeholder="Internal Job Notes..."
        name="internal-notes"
      />

      <div>
        <h2 className="mb-3 font-bold">Customer Notes</h2>
        <NotesTextArea
          value={customerNotes}
          onChange={setCustomerNotes}
          placeholder="Notes..."
          name={"customer-notes"}
        />
      </div>
    </>
  );
};

export default TemplateAttachmentTab;
