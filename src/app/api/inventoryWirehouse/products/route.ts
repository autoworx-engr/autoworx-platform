import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic'; // 👈 important

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryName = searchParams.get('categoryName') || '';
    const skip = (page - 1) * limit;

    let where: any = {};

    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { category: { contains: search } },
        { unit: { contains: search } },
      ];
    }

    if (categoryName) {
      if (search) {
        where = {
          AND: [
            { OR: where.OR },
            { category: { contains: categoryName } },
          ],
        };
      } else {
        where.category = { contains: categoryName };
      }
    }

    const [totalCount, products] = await Promise.all([
      db.inventoryWirehouseProduct.count({ where }),
      db.inventoryWirehouseProduct.findMany({
        where,
        take: limit,
        skip,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: products,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
