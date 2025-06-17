"use server";
import { authOptions } from "@/authOptions";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

// Fetch all columns by type
export const getColumnsByType = async (type: string) => {
  const companyId = await getCompanyId();
  let columns = await db.column.findMany({
    where: { type, companyId: companyId },
    orderBy: { order: "asc" },
  });

  return columns;
};

export const createColumn = async (
  title: string,
  type: string,
  textColor?: string,
  bgColor?: string,
) => {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }
  const maxOrder = await db.column.findFirst({
    where: { type },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const newOrder = maxOrder ? maxOrder.order + 1 : 0;

  return await db.column.create({
    data: {
      title,
      type,
      order: newOrder,
      companyId,
      textColor: textColor ?? undefined,
      bgColor: bgColor ?? undefined,
    },
  });
};

export const updateColumn = async (
  id: number,
  title: string,
  type: string,
  order: number,
  textColor?: string,
  bgColor?: string,
) => {
  await db.column.update({
    where: { id },
    data: { title, type, order, textColor, bgColor },
  });
  revalidatePath("/dashboard/pipeline/shop/pipeline");
};

// Delete a column
export const deleteColumn = async (id: number) => {
  //update the invoice which column is deleted
  await db.invoice.updateMany({
    where: { columnId: id },
    data: {
      columnId: null,
    },
  });

  return await db.column.delete({
    where: { id },
  });
};

// Update the order of multiple columns
export const updateColumnOrder = async (
  reorderedColumns: { id: number; order: number }[],
) => {
  const updatePromises = reorderedColumns.map(({ id, order }) =>
    db.column.update({
      where: { id },
      data: { order },
    }),
  );

  await Promise.all(updatePromises);
};
