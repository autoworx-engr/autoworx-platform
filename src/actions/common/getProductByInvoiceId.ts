import { db } from "@/lib/db";
import { getProductWithQuantity } from "@/lib/getProductWithQuantity";

export default async function getProductByInvoiceId(invoiceId: string) {
  try {
    // get all the product materials
    const materials = await db.material.findMany({
      where: {
        invoiceId,
        // productId not null
        productId: { not: null },
      },
      include: {
        vendor: true,
      },
    });

    // merge all the same products and sum the quantity
    const productsWithQuantity = getProductWithQuantity(materials);
    return productsWithQuantity;
  } catch (err) {
    throw err;
  }
}
