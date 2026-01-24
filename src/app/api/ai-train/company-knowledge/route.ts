import { db } from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const companyIdParam = searchParams.get("companyId")
        const companyId = Number(companyIdParam)

        if (!companyIdParam || !Number.isFinite(companyId)) {
            return NextResponse.json(
                { success: false, message: "Company ID is required" },
                { status: 400 },
            );
        }

        const data = await db.companyInfo.findMany({
            where: { companyId: Number(companyId) },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({
            success: true,
            message: "Company Info retrieved successfully",
            data
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        if (!body?.companyId) {
            return NextResponse.json(
                { success: false, message: "Company ID is required" },
                { status: 400 },
            );
        }

        const data = {
            companyId: Number(body.companyId),
            shopName: body.shopName,
            about: body.about,
            address: body.address,
            email: body.email,
            phone: body.phone,
            websiteUrl: body.websiteUrl,
            hours: body.hours,
            policies: body.policies,
            smsResponseDelayMin: Number(body.smsResponseDelayMin ?? 0),
            smsResponseDelayMax: Number(body.smsResponseDelayMax ?? 0),

        }
        const companyKnowledge = await db.companyInfo.create({
            data,
        })

        return NextResponse.json({
            success: true,
            message: "CompanyInfo created successfully",
            data: companyKnowledge,
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        );
    }
}