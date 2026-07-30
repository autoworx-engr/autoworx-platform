import { getEmployees, getEmployeesForPaginate } from "@/actions/employee/get";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { EmployeeType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/get-employees:
 *   get:
 *     summary: Get company employees for assignment dropdown
 *     description: Returns a list of employees for a company, used to populate the "Assign To" dropdown on work order cards. Supports optional pagination and search.
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: excludeCurrentUser
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Exclude the currently authenticated user from results
 *         example: true
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by employee type (e.g. Technician, Sales)
 *         example: Technician
 *       - in: query
 *         name: notType
 *         required: false
 *         schema:
 *           type: string
 *         description: Exclude employees of this type (e.g. Sales)
 *         example: Sales
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based). Only applies when `take` is provided.
 *         example: 1
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of records per page. Omit to return all employees.
 *         example: 20
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone (only used when paginating)
 *         example: John
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Employees retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       firstName:
 *                         type: string
 *                         example: John
 *                       lastName:
 *                         type: string
 *                         example: Doe
 *                       email:
 *                         type: string
 *                         example: john@example.com
 *                       employeeType:
 *                         type: string
 *                         example: Technician
 *                 meta:
 *                   type: object
 *                   description: Present only when `take` is provided
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     take:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const { searchParams } = req.nextUrl;

    const excludeCurrentUser =
      searchParams.get("excludeCurrentUser") === "true";
    const type = searchParams.get("type") as EmployeeType | null;
    const notType = searchParams.get("notType") as EmployeeType | null;
    const pageParam = searchParams.get("page");
    const takeParam = searchParams.get("take");
    const search = searchParams.get("search") ?? undefined;

    const take = takeParam ? parseInt(takeParam) : undefined;

    if (take !== undefined && !isNaN(take)) {
      const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;

      const result = await getEmployeesForPaginate({
        companyId: principal.companyId,
        page,
        take,
        filter: {
          type: type ?? undefined,
          searchParams: search,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Employees retrieved successfully",
        data: result.employees,
        meta: {
          total: result.totalEmployees,
          page,
          take,
          totalPages: Math.ceil(result.totalEmployees / take),
        },
      });
    }

    const data = await getEmployees({
      excludeCurrentUser,
      type: type ?? undefined,
      notType: notType ?? undefined,
      companyId: principal.companyId,
      currentUserId: principal.userId,
    });

    return NextResponse.json({
      success: true,
      message: "Employees retrieved successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve employees",
      },
      { status: 500 },
    );
  }
}
