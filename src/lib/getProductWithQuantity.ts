import { Material, Vendor } from "@prisma/client";

export function getProductWithQuantity(
  materials: (Material & { vendor?: Vendor | null })[],
) {
  // Aggregate all materials to calculate total quantities for each product
  const productsWithQuantity =
    materials && materials.length > 0
      ? materials.reduce(
          (
            acc: {
              id: number;
              name: string;
              invoiceItemId?: number | null;
              quantity: number;
              sell?: number;
              vendorId?: number;
              totalSellPrice?: number;
            }[],
            material,
          ) => {
            //handle null or undefined product id error
            if (!material || material.productId === undefined) {
              return acc;
            }
            const product = acc.find((p) => p.id === material.productId);

            if (product) {
              if (material.quantity !== null) {
                product.quantity += Number(material.quantity);
                if (product.totalSellPrice) {
                  product.totalSellPrice +=
                    Number(material?.quantity ?? 0) *
                    (Number(material.sell) ?? 0);
                }
              }
            } else {
              acc.push({
                id: material.productId as number,
                name: material.name || "",
                invoiceItemId: material.invoiceItemId,
                quantity: Number(material.quantity) || 0,
                sell: Number(material.sell) ?? 0,
                vendorId: material.vendor?.id,
                totalSellPrice:
                  Number(material?.quantity ?? 0) *
                  (Number(material.sell) ?? 0),
              });
            }

            return acc;
          },
          [],
        )
      : [];
  return productsWithQuantity;
}
