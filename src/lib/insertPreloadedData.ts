import { db } from "./db";
import { preloadedCategories } from "./preloadedDataCanned";
import { Prisma } from "@prisma/client";

export const insertPreloadedData = async (
  companyId: number,
  tx?: Prisma.TransactionClient,
) => {
  const client = tx ?? db;
  // Insert preloaded categories
  const categories = await client.category.createMany({
    data: preloadedCategories.map((category) => ({
      ...category,
      companyId,
    })),
    skipDuplicates: true,
  });

  // // For labor, find/create category by name, then insert
  // const laborRecords = [];

  // for (const labor of preloadedCannedLaborData) {
  //   // Check if category already exists
  //   let existingCategory = await db.category.findFirst({
  //     where: {
  //       name: labor.category,
  //       companyId: companyId,
  //     },
  //   });
  //   console.log("existing category", existingCategory);

  //   // If not found, create it
  //   if (!existingCategory) {
  //     existingCategory = await db.category.create({
  //       data: {
  //         name: labor.category,
  //         companyId,
  //       },
  //     });
  //     // console.log("created category", existingCategory);
  //   }

  //   // Prepare the labor record using found/created category id
  //   laborRecords.push({
  //     name: labor.name,
  //     categoryId: existingCategory.id,
  //     notes: labor.notes,
  //     hours: labor.hours,
  //     charge: labor.charge,
  //     cannedLabor: true,
  //     companyId,
  //   });
  // }

  // const laborData = await db.labor.createMany({
  //   data: laborRecords,
  //   skipDuplicates: true,
  // });
  // // console.log("laborData after creation", laborData);

  // const serviceRecords = [];
  // for (const service of preloadedCannedServiceData) {
  //   // Find or create the Category by "service.category" name
  //   let existingCategory = await db.category.findFirst({
  //     where: {
  //       name: service.category,
  //       companyId: companyId,
  //     },
  //   });
  //   if (!existingCategory) {
  //     existingCategory = await db.category.create({
  //       data: { name: service.category, companyId },
  //     });
  //   }

  //   serviceRecords.push({
  //     name: service.name,
  //     categoryId: existingCategory.id,
  //     companyId,
  //   });
  // }

  // // console.log("serviceRecords", serviceRecords);
  // // Insert service records with numeric categoryId
  // const serviceData = await db.service.createMany({
  //   data: serviceRecords.map(record => ({ ...record, canned: true })),
  //   skipDuplicates: true,
  // });

  return { categories };
};
