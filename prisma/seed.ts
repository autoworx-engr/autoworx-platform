import { PrismaClient } from "@prisma/client";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import minimist from "minimist";

const EXPECTED_CSV_FIELDS = ["productName", "category", "unit"] as const;

interface CsvProduct {
  productName: string;
  category?: string;
  unit?: string;
}

const CONFIG = {
  CSV_FILE_PATH: (fileName: string) =>
    path.resolve("./prisma", fileName || "inventoryProduct.csv"),
  DEFAULT_UNIT: "piece",
  DEFAULT_CATEGORY: "other",
  MAX_FIELD_LENGTH: 255,
};

const prisma = new PrismaClient();

async function parseCsv(filePath: string): Promise<CsvProduct[]> {
  const products: CsvProduct[] = [];
  const seenProductNames = new Set<string>();
  let emptySkipCount = 0;
  let duplicateSkipCount = 0;

  console.log("📦 Starting CSV import...");

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers: string[]) => {
        console.log("🔍 CSV headers:", headers);
        const missingFields = EXPECTED_CSV_FIELDS.filter(
          (field) => !headers.includes(field),
        );
        if (missingFields.length > 0) {
          console.warn(
            "⚠️ Missing expected CSV fields:",
            missingFields.join(", "),
          );
        }
      })
      .on("data", (data: Record<string, string>) => {
        // Skip records with missing or empty productName
        const productName = data.productName?.trim();
        if (!productName) {
          console.warn(
            "⚠️  Skipping CSV record with missing or empty productName:",
            data,
          );
          emptySkipCount++;
          return;
        }

        // Skip duplicates, keeping the first occurrence
        if (seenProductNames.has(productName)) {
          console.warn(
            `⚠️  Skipping CSV record with duplicate productName "${productName}":`,
            data,
          );
          duplicateSkipCount++;
          return;
        }

        seenProductNames.add(productName);

        if (products.length === 0) {
          console.log("🔍 First valid CSV record (raw):", data);
        }

        products.push({
          productName,
          category: data.category,
          unit: data.unit,
        });
      })
      .on("end", () => {
        console.log(`✅ Parsed ${products.length} valid products from CSV`);
        console.log(
          `⚠️  Skipped ${emptySkipCount} records with empty productName`,
        );
        console.log(
          `⚠️  Skipped ${duplicateSkipCount} duplicate productName records`,
        );
        resolve(null);
      })
      .on("error", reject);
  });

  return products;
}

async function seedDatabase(products: CsvProduct[]): Promise<{
  successCount: number;
  skipCount: number;
  errors: string[];
}> {
  let successCount = 0;
  let skipCount = 0;
  const errors: string[] = [];

  console.log("🌱 Seeding database...");

  for (const product of products) {
    // Sanitize fields
    const sanitizedProduct = {
      productName: product.productName.slice(0, CONFIG.MAX_FIELD_LENGTH),
      unit: (product.unit?.trim() || CONFIG.DEFAULT_UNIT).slice(
        0,
        CONFIG.MAX_FIELD_LENGTH,
      ),
      category: (product.category?.trim() || CONFIG.DEFAULT_CATEGORY).slice(
        0,
        CONFIG.MAX_FIELD_LENGTH,
      ),
    };

    try {
      await prisma.inventoryWirehouseProduct.upsert({
        where: {
          productName: sanitizedProduct.productName,
        },
        update: {
          unit: sanitizedProduct.unit,
          category: sanitizedProduct.category,
        },
        create: sanitizedProduct,
      });
      successCount++;
    } catch (error: any) {
      const errorMessage = `❌ Error inserting product "${sanitizedProduct.productName}": ${error.message}`;
      console.error(errorMessage, error);
      errors.push(errorMessage);
      skipCount++;
    }
  }

  return { successCount, skipCount, errors };
}

async function main() {
  try {
    const args = minimist(process.argv.slice(2));
    const userProvidedFileName = args.fileName || "inventoryProduct.csv";
    const csvFilePath = CONFIG.CSV_FILE_PATH(userProvidedFileName);

    if (!csvFilePath) {
      throw new Error("Invalid CSV file path provided.");
    }

    const products = await parseCsv(csvFilePath);
    const { successCount, skipCount, errors } = await seedDatabase(products);

    console.log("🌟 Seeding complete!");
    console.log(
      `📊 Result: ${successCount} inserted ✅ | ${skipCount} failed ⚠️`,
    );
    if (errors.length > 0) {
      console.log(`🚨 ${errors.length} errors occurred:`);
      errors.forEach((err, index) => console.log(`${index + 1}. ${err}`));
    }
  } catch (error: any) {
    console.error("💥 Unexpected error during seeding:", error);
    throw error;
  } finally {
    console.log("🔌 Disconnecting Prisma client...");
    await prisma.$disconnect();
    console.log("👋 Done!");
  }
}

main()
  .then(() => {
    console.log("🎉 Script completed successfully");
  })
  .catch((e) => {
    console.error("💥 Script failed:", e);
    process.exit(1);
  });

// Seeding Command
// npx prisma db seed -- --fileName=inventoryProduct.csv
