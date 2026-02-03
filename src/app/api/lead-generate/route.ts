import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { updateTagAutomationTrigger } from "@/actions/automation/tag/triggerTagAutomation";
import { initialCreateClientChatTrack } from "@/actions/communication/client/chat-track";
import { companyWithUser } from "@/actions/settings/getCompanyWithUser";
import { db } from "@/lib/db";
import { sendCRMDemoNotification } from "@/lib/notification/crm-demo-notifiy";
import { sendNewLeadNotification } from "@/lib/notification/pipeline-notify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/lead-generate:
 *   post:
 *     summary: Generate new lead from Zapier
 *     tags: [Leads]
 *     parameters:
 *       - in: header
 *         name: X-TOKEN
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead created successfully
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("X-TOKEN");
    // console.log("🚀 ~ POST ~ token:", token);

    if (!token) {
      return NextResponse.json("Invalid token", { status: 401 });
    }

    // Check if there any company with the token
    const company = await db.company.findFirst({
      where: {
        zapierToken: token,
      },
    });
    // console.log("🚀 ~ POST ~ company:", company);

    if (!company) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // take data from the body
    const body = await request.json();
    // console.log("🚀 ~ POST ~ body:", body);

    const clientName = body.name;
    // console.log("🚀 ~ POST ~ clientName:", clientName);
    const clientEmail = body?.email;
    const clientPhone = body?.phone;
    const countryCode = body?.countryCode;
    // console.log("🚀 ~ POST ~ clientPhone:", clientPhone);
    const customerCountry = body.customer_country;
    // console.log("🚀 ~ POST ~ customerCountry:", customerCountry);
    const serviceId = +body.serviceId;
    // console.log("🚀 ~ POST ~ serviceId:", serviceId);
    const opportunity = body.opportunity_source;
    // console.log("🚀 ~ POST ~ opportunity:", opportunity);
    const crmMsg = body.message;
    const multipleServices = body.multiServices as number[] | undefined;
    // now extract the source, services and vehicle info from opportunity
    // the format is this: (source) vehicle | service
    const source = opportunity.split(")")[0].replace("(", "").trim();
    // console.log("🚀 ~ POST ~ source:", source);
    const vehicleInfo = opportunity.split(")")[1].split("|")[0].trim();
    // console.log("🚀 ~ POST ~ vehicleInfo:", vehicleInfo);
    const services = opportunity.split(")")[1].split("|")[1].trim();
    // console.log("🚀 ~ POST ~ services:", services);
    // console.log("crmMsg", crmMsg);
    //check if crm company
    const isCRMCompany = company.isCRMEnabled || false;
    // console.log("🚀 ~ POST ~ isCRMCompany:", isCRMCompany);
    if (isCRMCompany) {
      // For demo requests
      const source = body.source || "Marketing Site";

      // Create lead with demo-specific handling
      const newLead = await db.lead.create({
        data: {
          clientName,
          clientEmail,
          clientPhone,
          vehicleInfo: vehicleInfo || "N/A",
          services: services || crmMsg || "Service Request",
          countryCode,
          source,
          serviceId: null,
          companyId: company.id,
          columnId: (
            await db.column.findFirst({
              where: {
                title: "New Leads",
                companyId: company.id,
                type: "sales",
              },
            })
          )?.id,
          multipleServices:
            multipleServices && multipleServices.length > 0
              ? {
                  connect: multipleServices.map((service: any) => ({
                    id: Number(service.id),
                  })),
                }
              : undefined,
        },
      });

      const clientNameParts = clientName.trim().split(" ");
      const firstName = clientNameParts.shift() || "";
      const lastName = clientNameParts.join(" ");

      let newClient = clientPhone
        ? await db.client.findFirst({
            where: {
              mobile: clientPhone,
              companyId: company.id,
            },
          })
        : null;

      if (!newClient) {
        newClient = await db.client.create({
          data: {
            firstName: firstName,
            lastName: lastName,
            email: clientEmail,
            mobile: clientPhone,
            companyId: company.id,
            leadId: newLead.id,
          },
        });
        await db.lead.update({
          where: {
            id: newLead.id,
          },
          data: {
            clientId: newClient.id,
          },
        });
      } else {
        let updatedClient = await db.client.update({
          where: {
            id: newClient.id,
            companyId: company.id,
          },
          data: {
            leadId: newLead.id,
            firstName: firstName,
            lastName: lastName,
            email: clientEmail,
            mobile: clientPhone,
            companyId: company.id,
          },
        });
        await db.lead.update({
          where: {
            id: newLead.id,
          },
          data: {
            clientId: updatedClient.id,
          },
        });
      }

      try {
        if (newLead) {
          await updatePipelineAutomationTrigger({
            companyId: newClient.companyId,
            condition: "TIME_DELAY",
            leadId: newLead.id,
            columnId: +(newLead?.columnId ?? 0),
          });
        }
      } catch (error) {}

      // communication automation trigger
      await updateCommunicationAutomationTrigger({
        companyId: newLead.companyId,
        leadId: newLead.id,
        columnId: +(newLead?.columnId ?? 0),
        generatedToken: token,
      });

      updateTagAutomationTrigger({
        columnId: +(newLead?.columnId ?? 0),
        companyId: newLead.companyId,
        pipelineType: "SALES",
        leadId: newLead.id,
        conditionType: "post_tag",
        generatedToken: token,
      });

      // send a notification for new lead added
      await sendCRMDemoNotification({
        companyId: company.id,
        clientName: newLead.clientName,
      });

      // send a notification for new lead added
      await sendNewLeadNotification({
        companyId: company.id,
        leadClientName: newLead.clientName,
      });

      return Response.json(
        {
          id: newLead.id,
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          type: "demo_request",
          opportunity_source: opportunity,
          countryCode: countryCode,
        },
        { status: 201 },
      );
    }

    // check if the required fields are provided
    if (!clientName || !vehicleInfo || !services || !source) {
      console.log(
        "name vehicle services source missing",
        clientName,
        vehicleInfo,
        services,
        source,
      );
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const companyId = company.id;
    // console.log("🚀 ~ POST ~ companyId:", companyId);
    // Fetch the ID of the "New Leads" column
    const newLeadsColumn = await db.column.findFirst({
      where: {
        title: "New Leads",
        companyId: companyId,
        type: "sales",
      },
    });
    console.log("🚀 ~ POST ~ newLeadsColumn:", newLeadsColumn);

    if (!newLeadsColumn) {
      return new Response(
        JSON.stringify({ error: "New Leads column not found" }),
        { status: 404 },
      );
    }

    // Save the leads
    const newLead = await db.lead.create({
      data: {
        clientName,
        clientEmail,
        clientPhone,
        vehicleInfo,
        services,
        source,
        serviceId,
        companyId: company.id,
        columnId: newLeadsColumn.id,
        multipleServices:
          multipleServices && multipleServices.length > 0
            ? {
                connect: multipleServices.map((service: any) => ({
                  id: Number(service.id),
                })),
              }
            : undefined,
      },
    });
    // console.log("🚀 ~ POST ~ newLead:", newLead);

    //naming correction for the client from lead
    const clientNameParts = clientName.trim().split(" ");
    const firstName = clientNameParts.shift() || "";
    const lastName = clientNameParts.join(" ");

    let newClient = clientPhone
      ? await db.client.findFirst({
          where: {
            mobile: clientPhone,
            companyId: company.id,
          },
        })
      : null;

    if (!newClient) {
      newClient = await db.client.create({
        data: {
          firstName: firstName,
          lastName: lastName,
          email: clientEmail,
          mobile: clientPhone,
          companyId: company.id,
          leadId: newLead.id,
        },
      });
      await db.lead.update({
        where: {
          id: newLead.id,
        },
        data: {
          clientId: newClient.id,
        },
      });
    } else {
      let updatedClient = await db.client.update({
        where: {
          id: newClient.id,
          companyId: company.id,
        },
        data: {
          leadId: newLead.id,
          firstName: firstName,
          lastName: lastName,
          email: clientEmail,
          mobile: clientPhone,
          companyId: company.id,
        },
      });
      await db.lead.update({
        where: {
          id: newLead.id,
        },
        data: {
          clientId: updatedClient.id,
        },
      });
    }

    const vehicleParts = vehicleInfo?.split(/\s+/) || [];
    const year = parseInt(vehicleParts[0]) || undefined;
    const make = vehicleParts[1] || "";

    const model = vehicleParts.slice(2).join(" ") || "";
    const newVehicle = await db.vehicle.create({
      data: {
        year: year,
        make: make ? make : vehicleParts?.length > 0 ? vehicleParts[0] : "",
        model: model,
        companyId: company.id,
        clientId: newClient.id,
      },
    });

    await db.lead.update({
      where: {
        companyId: company.id,
        id: newLead.id,
      },
      data: {
        vehicleId: newVehicle.id,
      },
    });

    await initialCreateClientChatTrack(newClient.id);

    // send a notification for new lead added
    await sendNewLeadNotification({
      companyId: company.id,
      leadClientName: newLead.clientName,
    });

    const newToken = await companyWithUser({ companyId: newLead.companyId });

    try {
      if (newLead) {
        await updatePipelineAutomationTrigger({
          companyId: newClient.companyId,
          condition: "TIME_DELAY",
          leadId: newLead.id,
          columnId: +(newLead?.columnId ?? 0),
        });
      }
    } catch (error) {}

    // communication automation trigger
    await updateCommunicationAutomationTrigger({
      companyId: newLead.companyId,
      leadId: newLead.id,
      columnId: +(newLead?.columnId ?? 0),
      generatedToken: newToken,
    });

    updateTagAutomationTrigger({
      columnId: +(newLead?.columnId ?? 0),
      companyId: newLead.companyId,
      pipelineType: "SALES",
      leadId: newLead.id,
      conditionType: "post_tag",
      generatedToken: newToken,
    });

    // return success response
    const response = Response.json(
      {
        id: newLead.id,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        customer_country: customerCountry,
        opportunity_source: opportunity,
        countryCode: countryCode,
      },
      { status: 201 },
    );
    // Add CORS headers
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-TOKEN",
    );

    return response;
  } catch (error: any) {
    // check if this is json parse error
    const errorResponse = Response.json(
      { error: error.message },
      { status: 500 },
    );
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    return errorResponse;
    // if (error instanceof SyntaxError) {
    //   return Response.json({ error: 'Invalid input' }, { status: 400 });
    // } else {
    //   return Response.json({ error: error.message }, { status: 500 });
    // }
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-TOKEN",
    },
  });
}
