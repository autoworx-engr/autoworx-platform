import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPatch] = a.split(".").map(Number);
  const [bMaj, bMin, bPatch] = b.split(".").map(Number);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPatch - bPatch;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     AppVersion:
 *       type: object
 *       properties:
 *         latestVersion:
 *           type: string
 *           example: "1.3.0"
 *         minSupportedVersion:
 *           type: string
 *           example: "1.2.0"
 *         forceUpdate:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           nullable: true
 *           example: "New features are available!"
 *     AppVersionInput:
 *       type: object
 *       required:
 *         - latestVersion
 *         - minSupportedVersion
 *       properties:
 *         latestVersion:
 *           type: string
 *           example: "1.3.0"
 *         minSupportedVersion:
 *           type: string
 *           example: "1.2.0"
 *         forceUpdate:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           nullable: true
 *           example: "New features are available!"
 */

/**
 * @swagger
 * /api/app-version:
 *   get:
 *     summary: Get current app version configuration
 *     description: Public endpoint used by mobile apps to check the latest version, minimum supported version, and whether a force update is required.
 *     tags:
 *       - App Version
 *     security: []
 *     responses:
 *       200:
 *         description: App version fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppVersion'
 *       404:
 *         description: No version configuration found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No version configuration found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */
export async function GET() {
  try {
    const version = await db.appVersion.findUnique({
      where: { id: 1 },
      select: {
        latestVersion: true,
        minSupportedVersion: true,
        forceUpdate: true,
        message: true,
      },
    });

    if (!version) {
      return NextResponse.json(
        { message: "No version configuration found" },
        { status: 404 },
      );
    }

    return NextResponse.json(version, { status: 200 });
  } catch (error) {
    console.error("GET APP VERSION ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/app-version:
 *   patch:
 *     summary: Update app version configuration
 *     description: Creates or updates the app version configuration. Requires super admin authentication.
 *     tags:
 *       - App Version
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppVersionInput'
 *     responses:
 *       200:
 *         description: App version updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: App version updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/AppVersion'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Version must be in x.y.z format (e.g., 1.3.0)
 *       403:
 *         description: Forbidden — not a super admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { latestVersion, minSupportedVersion, forceUpdate, message } = body;

    if (!latestVersion || !minSupportedVersion) {
      return NextResponse.json(
        { message: "latestVersion and minSupportedVersion are required" },
        { status: 400 },
      );
    }

    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (
      !semverRegex.test(latestVersion) ||
      !semverRegex.test(minSupportedVersion)
    ) {
      return NextResponse.json(
        { message: "Version must be in x.y.z format (e.g., 1.3.0)" },
        { status: 400 },
      );
    }

    if (compareSemver(latestVersion, minSupportedVersion) < 0) {
      return NextResponse.json(
        {
          message:
            "latestVersion must be greater than or equal to minSupportedVersion",
        },
        { status: 400 },
      );
    }

    const data = {
      latestVersion,
      minSupportedVersion,
      forceUpdate: forceUpdate ?? false,
      message: message || null,
    };

    const version = await db.appVersion.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return NextResponse.json(
      { message: "App version updated successfully", data: version },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH APP VERSION ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
