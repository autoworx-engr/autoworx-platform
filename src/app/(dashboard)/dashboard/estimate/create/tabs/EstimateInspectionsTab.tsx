"use client"
import { useEstimateCreateStore } from "@/stores/estimate-create";
import InspectionsTab from "./InspectionsTab"

const EstimateInspectionsTab = ()=>{
      const { inspections, updateInspection, damageNotes, setDamageNotes } =
    useEstimateCreateStore();
    return (
        <>
         <InspectionsTab inspections={inspections} updateInspection={updateInspection} damageNotes={damageNotes} setDamageNotes={setDamageNotes} />
        </>
    )
}

export default EstimateInspectionsTab;