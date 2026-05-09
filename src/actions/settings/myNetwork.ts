"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { Company } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendUserNotifications } from "../notification/sendUserNotification";

type TConnectWithCompany = {
  targetCompanyId: number;
  userCompanyId?: number;
  revalidatePathName?: string | undefined;
};

export async function connectWithCompany({
  targetCompanyId,
  userCompanyId,
  revalidatePathName,
}: TConnectWithCompany) {
  try {
    const companyId = userCompanyId || (await getCompanyId());

    // Check if the connection already exists
    const existingConnection = await db.companyJoin.findFirst({
      where: {
        OR: [
          {
            companyOneId: companyId,
            companyTwoId: targetCompanyId,
            companyTwo: {
              isCollaborators: true,
            },
          },
          {
            companyOneId: targetCompanyId,
            companyTwoId: companyId,
            companyOne: {
              isCollaborators: true,
            },
          },
        ],
      },
    });

    if (existingConnection) {
      return {
        success: false,
        message: "Connection already exists with this company.",
      };
    }

    // Create a new connection
    await db.companyJoin.create({
      data: {
        companyOneId: companyId,
        companyTwoId: targetCompanyId,
        status: "PENDING",
      },
    });

    const company = await db.company.findUnique({
      where: { id: targetCompanyId },
      select: { name: true },
    });

    const targetUsers = await db.user.findMany({
      where: {
        companyId: targetCompanyId,
        employeeType: {
          in: ["Admin", "Manager", "Sales"],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyId: true,
      },
    });

    const sessionUser = await getUser();

    const redirectUrl = `/dashboard/settings/networks`;
    const sessionUserFullName = `${sessionUser.firstName} ${sessionUser.lastName}`;
    const description = `New collaboration invitation from ${sessionUserFullName} in ${company?.name}. View it in Autoworx`;
    const title = "New Collaboration Invitation";

    await Promise.all(
      targetUsers.map((user) =>
        sendUserNotifications({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email || "",
          userPhoneNo: user.phone || "",
          companyId: user.companyId,
          iconType: "message",
          title,
          description,
          type: "COLLABORATION_INVITATION",
          redirectUrl,
        }),
      ),
    );

    revalidatePathName && revalidatePath(revalidatePathName);
    return {
      success: true,
      message: "Successfully connected with the company.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect with the company.",
    };
  }
}

export async function toggleBusinessVisibility(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const companyId = await getCompanyId();

    // Fetch the current business visibility status
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { businessVisibility: true },
    });

    if (!company) {
      return {
        success: false,
        message: "Company not found",
      };
    }

    // Toggle the business visibility status
    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: { businessVisibility: !company.businessVisibility },
    });

    return {
      success: true,
      message: `Business visibility is now ${updatedCompany.businessVisibility ? "enabled" : "disabled"}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to toggle business visibility.",
    };
  }
}

export async function togglePhoneVisibility(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const companyId = await getCompanyId();

    // Fetch the current phone visibility status
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { phoneVisibility: true },
    });

    if (!company) {
      return {
        success: false,
        message: "Company not found",
      };
    }

    // Toggle the phone visibility status
    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: { phoneVisibility: !company.phoneVisibility },
    });

    return {
      success: true,
      message: `Phone visibility is now ${updatedCompany.phoneVisibility ? "enabled" : "disabled"}.`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to toggle phone visibility.",
    };
  }
}

export async function toggleAddressVisibility(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const companyId = await getCompanyId();

    // Fetch the current address visibility status
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { addressVisibility: true },
    });

    if (!company) {
      return {
        success: false,
        message: "Company not found",
      };
    }

    // Toggle the address visibility status
    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: { addressVisibility: !company.addressVisibility },
    });

    return {
      success: true,
      message: `Address visibility is now ${updatedCompany.addressVisibility ? "enabled" : "disabled"}.`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to toggle address visibility.",
    };
  }
}

//location

export async function setLatLong(
  latitude: number | null,
  longitude: number | null,
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    let companyId = await getCompanyId();
    await db.company.update({
      where: { id: companyId },
      data: { companyLatitude: latitude, companyLongitude: longitude },
    });

    return {
      success: true,
      message: "Successfully updated location.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update location.",
    };
  }
}

// Haversine formula to calculate distance in miles
function getDistanceFromLatLonInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Function to find nearby unconnected companies
export async function findNearbyCompanies(
  latitude: number,
  longitude: number,
  range: [number, number], // e.g., [minDistance, maxDistance]
): Promise<{
  success: boolean;
  data: Company[] | [];
}> {
  try {
    const userCompanyId = await getCompanyId(); // Your function to get the user's company ID

    // Step 1: Get all connected company IDs
    const connectedCompanyIds = await db.companyJoin.findMany({
      where: {
        OR: [{ companyOneId: userCompanyId }, { companyTwoId: userCompanyId }],
      },
      select: {
        companyOneId: true,
        companyTwoId: true,
      },
    });

    // Extract connected company IDs
    const connectedIds = connectedCompanyIds.flatMap((join) =>
      [join.companyOneId, join.companyTwoId].filter(
        (id) => id !== userCompanyId,
      ),
    );

    // Compute bounding box (~100 mi at equator) to filter in DB before JS Haversine
    const maxRangeMi = range[1];
    const latDelta = maxRangeMi / 69.0;
    const cosLat = Math.max(Math.cos((latitude * Math.PI) / 180), 1e-10);
    const lonDelta = maxRangeMi / (69.0 * cosLat);

    // Step 2: Get nearby unconnected companies (bounding box pre-filter)
    const unconnectedCompanies = await db.company.findMany({
      where: {
        id: {
          notIn: connectedIds,
          not: userCompanyId,
        },
        companyLatitude: {
          not: null,
          gte: latitude - latDelta,
          lte: latitude + latDelta,
        },
        companyLongitude: {
          not: null,
          gte: longitude - lonDelta,
          lte: longitude + lonDelta,
        },
      },
      take: 200,
    });

    // Step 3: Filter unconnected companies by distance
    const nearbyUnconnectedCompanies = unconnectedCompanies.filter(
      (company) => {
        if (company.companyLatitude && company.companyLongitude) {
          const distance = getDistanceFromLatLonInMiles(
            latitude,
            longitude,
            company.companyLatitude,
            company.companyLongitude,
          );
          return distance <= range[1] && distance >= range[0]; // Filter based on the distance range
        }
        return false;
      },
    );

    return {
      success: true,
      data: nearbyUnconnectedCompanies,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      data: [],
    };
  }
}
