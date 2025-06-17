import { updateCommunicationAutomationTrigger } from "@/actions/automation/communication/triggerCommunicationAutomation";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { initialCreateClientChatTrack } from "@/actions/communication/client/chat-track";
import { db } from "@/lib/db";
import { sendNewLeadNotification } from "@/lib/notification/pipeline-notify";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("X-TOKEN");

    if (!token) {
      return NextResponse.json("Invalid token", { status: 401 });
    }

    // Check if there any company with the token
    const company = await db.company.findFirst({
      where: {
        zapierToken: token,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // take data from the body
    const body = await request.json();

    const clientName = body.name;
    const clientEmail = body?.email;
    const clientPhone = body?.phone;
    const customerCountry = body.customer_country;
    const serviceId = +body.serviceId;
    const oppurtunity = body.oppurtunity_source;

    // now extract the source, services and vehicle info from opportunity
    // the format is this: (source) vehicle | service
    const source = oppurtunity.split(")")[0].replace("(", "").trim();
    const vehicleInfo = oppurtunity.split(")")[1].split("|")[0].trim();
    const services = oppurtunity.split(")")[1].split("|")[1].trim();

    // check if the required fields are provided
    if (!clientName || !vehicleInfo || !services || !source) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const companyId = company.id;
    // Fetch the ID of the "New Leads" column
    const newLeadsColumn = await db.column.findFirst({
      where: {
        title: "New Leads",
        companyId: companyId,
        type: "sales",
      },
    });

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
      },
    });

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
    } else {
      await db.client.update({
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

    try {
      if (newLead) {
        console.log("ESCD");

        await updatePipelineAutomationTrigger({
          companyId: newClient.companyId,
          condition: "TIME_DELAY",
          leadId: newLead.id,
          columnId: +(newLead?.columnId ?? 0),
        });
      }
    } catch (error) {}

    // communication automation trigger
    try {
      if (newLead) {
        console.log("ESCD");

        await updateCommunicationAutomationTrigger({
          companyId: newClient.companyId,
          leadId: newLead.id,
          columnId: +(newLead?.columnId ?? 0),
        });
      }
    } catch (error) {}

    // return success response
    return Response.json(
      {
        id: newLead.id,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        customer_country: customerCountry,
        oppurtunity_source: oppurtunity,
      },
      { status: 201 },
    );
  } catch (error: any) {
    // check if this is json parse error
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    } else {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}
