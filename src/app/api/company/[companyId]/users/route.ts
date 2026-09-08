import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { uploadNotificationSettings } from "@/actions/settings/updateNotification";
import { createEmployeeValidationSchema } from "@/validations/schemas/employee/employee.validation";
import { EmployeeType, SalaryType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";

/**
 * @swagger
 * /api/company/{companyId}/users:
 *   get:
 *     summary: Get users by company
 *     description: Returns paginated users belonging to a specific company with optional search.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Company ID
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: john
 *         description: Search by first name, last name, email or phone
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           example: Sales
 *         description: >-
 *           Optional employeeType filter. Case-insensitive single value
 *           (e.g. "Sales"). Valid values: Admin, Manager, Sales, Technician, Other.
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 120
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 12
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 5
 *                       firstName:
 *                         type: string
 *                         example: John
 *                       lastName:
 *                         type: string
 *                         example: Doe
 *                       email:
 *                         type: string
 *                         example: john@example.com
 *                       phone:
 *                         type: string
 *                         example: "+123456789"
 *                       role:
 *                         type: string
 *                         example: admin
 *                       employeeType:
 *                         type: string
 *                         example: Admin
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - companyId does not match the authenticated principal
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  const params = await props.params;
  try {
    const companyId = Number(params.companyId);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (companyId !== principal.companyId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: company mismatch" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";

    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (search) {
      const terms = search.split(/\s+/).filter(Boolean);
      where.AND = terms.map((term) => ({
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
        ],
      }));
    }

    const VALID_EMPLOYEE_TYPES = [
      "Admin",
      "Manager",
      "Sales",
      "Technician",
      "Other",
    ];

    if (type) {
      const matched = VALID_EMPLOYEE_TYPES.find(
        (et) => et.toLowerCase() === type.trim().toLowerCase(),
      );

      if (matched) {
        where.employeeType = matched;
      }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          employeeType: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/company/{companyId}/users:
 *   post:
 *     summary: Add a new employee (mobile)
 *     description: >-
 *       Creates an employee for the authenticated company. Mirrors the web
 *       "Add Employee" flow (validation, duplicate check, bcrypt password,
 *       optional salary history and default notification settings). Auth via
 *       Bearer token; companyId is resolved from the token, not the path.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Employee created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       409: { description: User already exists }
 *       500: { description: Internal server error }
 */
export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const companyId = principal.companyId;

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      mobileNumber,
      countryCode,
      address,
      city,
      state,
      zip,
      companyName,
      commission,
      date,
      type,
      salaryType,
      salaryAmount,
      profilePicture,
      password,
      confirmPassword,
    } = body ?? {};

    if (!password || password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Password and confirm password do not match",
        },
        { status: 400 },
      );
    }

    // Empty strings would fail the optional-string/zip validators — treat as absent.
    const orUndef = (v: unknown) =>
      typeof v === "string" && v.trim() === "" ? undefined : v;

    let employeeInfo;
    try {
      employeeInfo = await createEmployeeValidationSchema.parseAsync({
        firstName,
        lastName: lastName ?? null,
        email,
        phone: orUndef(mobileNumber),
        address: orUndef(address),
        city: orUndef(city),
        state: orUndef(state),
        zip: orUndef(zip),
        companyName: orUndef(companyName),
        commission:
          commission != null && commission !== "" ? Number(commission) : 0,
        joinDate: new Date(date || Date.now()),
        employeeType: type as EmployeeType,
        image: orUndef(profilePicture) as string | undefined,
        password,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: err.issues[0]?.message ?? "Invalid input",
          },
          { status: 400 },
        );
      }
      throw err;
    }

    const existing = await db.user.findFirst({ where: { email, companyId } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "User already exists!" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = await db.user.create({
      data: {
        ...employeeInfo,
        password: hashedPassword,
        companyId,
        role: "employee",
        countryCode: countryCode ?? undefined,
      },
    });

    // New user has no prior salary record, so this is a straight insert — the
    // full end-dating logic in manageSalaryHistory only matters on later changes.
    const salaryAmt =
      salaryAmount != null && salaryAmount !== "" ? Number(salaryAmount) : 0;
    if (salaryType && salaryAmt > 0) {
      await db.salaryHistory.create({
        data: {
          userId: newEmployee.id,
          companyId,
          salaryType: salaryType as SalaryType,
          salaryAmount: salaryAmt,
          startDate: new Date(),
          isActive: true,
        },
      });
    }

    await uploadNotificationSettings(
      newEmployee.id,
      newEmployee.employeeType,
      companyId,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Employee added successfully",
        data: {
          id: newEmployee.id,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          email: newEmployee.email,
          phone: newEmployee.phone,
          role: newEmployee.role,
          employeeType: newEmployee.employeeType,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
