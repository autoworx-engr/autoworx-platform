"use client"
import { useEstimateCreateStore } from "@/stores/estimate-create";
import InspectionsTab from "../create/tabs/InspectionsTab";


const TemplateInspectionTab = ()=>{
      const { inspections, updateInspection, damageNotes, setDamageNotes } =
    useEstimateCreateStore(); // it will replace 
    return (
        <>
         <InspectionsTab inspections={inspections} updateInspection={updateInspection} damageNotes={damageNotes} setDamageNotes={setDamageNotes} />
        </>
    )
}

export default TemplateInspectionTab;