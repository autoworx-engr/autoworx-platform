import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { sendLeadStageChangeOrCloseNotification } from "@/lib/notification/pipeline-notify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/leads/{id}/column:
 *   put:
 *     summary: Update lead column
 *     tags: [Sales Pipeline Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *             properties:
 *               columnId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lead column updated successfully
 *       400:
 *         description: Missing columnId or invalid lead ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Failed to update lead column
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = (await getAuthPrincipal(request))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const params = await props.params;
    const leadId = parseInt(params.id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lead ID" },
        { status: 400 },
      );
    }

    const { columnId, newColumnId } = await request.json();
    const finalColumnId = columnId ?? newColumnId;

    if (!finalColumnId) {
      return NextResponse.json(
        { success: false, error: "columnId is required" },
        { status: 400 },
      );
    }

    const lead = await db.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 },
      );
    }

    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: { columnId: parseInt(finalColumnId), columnChangedAt: new Date() },
      include: { column: true },
    });

    if (updatedLead.column?.title === "Converted") {
      sendLeadStageChangeOrCloseNotification({
        companyId,
        description: `Lead "${updatedLead.clientName}" has been closed. Track it in your pipeline.`,
        title: "Lead Closed",
        notificationType: "LEADS_CLOSED",
      });
    }

    sendLeadStageChangeOrCloseNotification({
      companyId,
      description: `Lead "${updatedLead.clientName}" moved to "${updatedLead?.column?.title}". Track progress in Autoworx.`,
      title: "Lead Stage Changed",
      notificationType: "STAGE",
    });

    try {
      await updatePipelineAutomationTrigger({
        companyId: companyId,
        condition: "TIME_DELAY",
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {
      console.log("updatePipelineAutomationTrigger error", error);
    }

    // communication automation trigger
    try {
      await updateCommunicationAutomationTrigger({
        companyId: companyId,
        leadId: leadId,
        columnId: newColumnId,
      });
    } catch (error) {
      console.log("error", error);
      console.log("updateCommunicationAutomationTrigger error", error);
    }

    const response = await updateTagAutomationTrigger({
      columnId: newColumnId,
      companyId: companyId,
      pipelineType: "SALES",
      leadId: leadId,
      conditionType: "post_tag",
    });

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
