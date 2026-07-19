import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/client/client-details/{id}/vehicles:
 *   get:
 *     summary: Get client's vehicles and services (paginated)
 *     description: Retrieve a paginated list of the client's vehicles (each with its own services, drawn from that vehicle's invoices) along with the list of services from the client's associated lead (if any).
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 15
 *         description: Client ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Client vehicles and services fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     vehicles:
 *                       type: array
 *                       description: Paginated list of the client's vehicles
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 42
 *                           year:
 *                             type: integer
 *                             nullable: true
 *                             example: 2020
 *                           make:
 *                             type: string
 *                             nullable: true
 *                             example: Honda
 *                           model:
 *                             type: string
 *                             nullable: true
 *                             example: Civic
 *                           submodel:
 *                             type: string
 *                             nullable: true
 *                             example: EX
 *                           vin:
 *                             type: string
 *                             nullable: true
 *                             example: 1HGCM82633A004352
 *                           license:
 *                             type: string
 *                             nullable: true
 *                             example: ABC-1234
 *                           colorId:
 *                             type: integer
 *                             nullable: true
 *                             example: 3
 *                           clientId:
 *                             type: integer
 *                             nullable: true
 *                             example: 15
 *                           companyId:
 *                             type: integer
 *                             example: 1
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           services:
 *                             type: array
 *                             description: Unique list of service names from this vehicle's invoice items.
 *                             items:
 *                               type: string
 *                             example: ["Oil Change", "Brake Repair"]
 *                     services:
 *                       type: array
 *                       description: Services the client's lead is interested in (parsed from the lead's comma-separated services string). Empty array if the client has no associated lead.
 *                       items:
 *                         type: string
 *                       example: ["Oil Change", "Brake Repair", "Tire Rotation"]
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasMore:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid client ID
 *       404:
 *         description: Client not found
 *       500:
 *         description: Failed to fetch client vehicles
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const clientId = parseInt(params.id);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10") || 10,
      100,
    );
    const skip = (page - 1) * limit;

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { leadId: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }
    const leadPromise = client.leadId
      ? db.lead.findUnique({
          where: { id: client.leadId },
          select: { services: true },
        })
      : Promise.resolve(null);

    const invoicesPromise = db.invoice.findMany({
      where: { clientId },
      select: {
        vehicleId: true,
        invoiceItems: { select: { service: { select: { name: true } } } },
      },
    });

    const [vehicles, total, lead, invoices] = await Promise.all([
      db.vehicle.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.vehicle.count({ where: { clientId } }),
      leadPromise,
      invoicesPromise,
    ]);

    const services = lead?.services
      ? lead.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const invoiceServicesByVehicleId = new Map<number, string[]>();
    for (const inv of invoices) {
      if (!inv.vehicleId) continue;
      const names = inv.invoiceItems
        .map((ii) => ii.service?.name)
        .filter((name): name is string => !!name);
      if (!names.length) continue;
      invoiceServicesByVehicleId.set(inv.vehicleId, [
        ...(invoiceServicesByVehicleId.get(inv.vehicleId) ?? []),
        ...names,
      ]);
    }

    const vehiclesWithServices = vehicles.map((vehicle) => ({
      ...vehicle,
      services: Array.from(
        new Set(invoiceServicesByVehicleId.get(vehicle.id) ?? []),
      ),
    }));

    return NextResponse.json({
      success: true,
      data: {
        vehicles: vehiclesWithServices,
        services,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + vehicles.length < total,
      },
    });
  } catch (error) {
    console.error("CLIENT VEHICLE FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client vehicles" },
      { status: 500 },
    );
  }
}
