import { NextRequest } from "next/server";
import { createGroupHandler } from "./_handlers/createGroup";
import { listGroupsHandler } from "./_handlers/listGroups";
import { updateGroupHandler } from "./_handlers/updateGroup";

/**
 * @swagger
 * /api/communication/internal/group:
 *   post:
 *     summary: Create a new group
 *     tags: [Internal]
 *     description: Creates a new group with the given name and connects it to the specified users.
 *   get:
 *     summary: Get groups for a user
 *     tags: [Internal]
 *     description: Retrieves paginated list of groups that the specified user is part of.
 *   put:
 *     summary: Update a group
 *     tags: [Internal]
 *     description: Updates the name and users of an existing group.
 */
export const POST = (req: NextRequest) => createGroupHandler(req);
export const GET = (req: NextRequest) => listGroupsHandler(req);
export const PUT = (req: NextRequest) => updateGroupHandler(req);
