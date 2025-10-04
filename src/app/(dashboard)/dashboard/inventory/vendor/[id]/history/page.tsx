import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import EditVendor from "@/components/Lists/EditVendor";
import Title from "@/components/Title";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import moment from "moment-timezone";
import Link from "next/link";
import { IoIosArrowBack } from "react-icons/io";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default async function Page({
  params: { id },
}: {
  params: { id: string };
}) {
  const { timezone } = await getCompanyTimezone();

  const inventoryProducts = await db.inventoryProduct.findMany({
    where: {
      vendorId: parseInt(id),
      // type: "Purchase"
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const vendor = await db.vendor.findUnique({
    where: {
      id: parseInt(id),
    },

    include: {
      inventoryProducts: true,
    },
  });

  const totalPurchaseAmount =
    inventoryProducts?.reduce((acc, product) => {
      return acc + Number(product.price || 0) * Number(product.quantity || 0);
    }, 0) ?? 0;

  // const totalPurchaseAmount = histories.reduce((acc, product) => {
  //   return acc + (product.product.price as any) * product.quantity;
  // }, 0);

  // const totalAmountSpent = 0;

  return (
    <div className="h-full">
      <Title className="flex items-center">
        <Link href="/dashboard/inventory/vendor">
          <IoIosArrowBack />
        </Link>
        Vendor - Purchase product
      </Title>

      <div className="mt-5 flex h-full flex-col gap-5 p-2 lg:flex-row">
        <div className="hidden h-[90%] w-[65%] overflow-scroll lg:block">
          {/* TODO: fix height issue */}
          <table className="w-full">
            <thead className="bg-background">
              <tr className="h-10 border-b">
                <th className="px-10 text-left">#</th>
                <th className="px-10 text-left">Name</th>
                <th className="px-10 text-left">Price</th>
                <th className="px-10 text-left">Quantity</th>
                <th className="px-10 text-left">Total</th>
                <th className="px-10 text-left">Date</th>
                <th className="px-5 text-left">Receipt</th>
              </tr>
            </thead>

            <tbody>
              {inventoryProducts?.map((product, index) => {
                const total = Number(product.price) * Number(product.quantity);
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      "py-3",
                      index % 2 === 0 ? evenColor : oddColor
                    )}
                  >
                    <td className="h-12 px-10 text-left">
                      <p>{product.id}</p>
                    </td>
                    <td className="text-nowrap px-10 text-left">
                      {product.name}
                    </td>
                    <td className="text-nowrap px-10 text-left">
                      {formatCurrency(Number(product.price))}
                    </td>
                    <td className="px-10 text-left">
                      {Number(product.quantity)}
                    </td>
                    <td className="px-10 text-left">{formatCurrency(total)}</td>
                    <td className="px-10 text-left">
                      {moment
                        .tz(product.createdAt, timezone)
                        .format("MM/DD/YYYY")}
                    </td>
                    <td className="mt-2 flex gap-3 px-5">{product.receipt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 lg:hidden">
          {inventoryProducts.map((product, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="space-y-3">
                    <div>
                      <div className="text-muted-foreground">Name</div>
                      <div className="font-medium">{product.name}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-medium">{Number(product.price)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Quantity</div>
                      <div className="font-medium">
                        {Number(product.quantity)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-muted-foreground">Date</div>
                      <div className="font-medium">
                        {moment.utc(product.createdAt).format("DD.MM.YYYY")}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-medium">
                        {Number(product.price) * Number(product.quantity)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Receipt</div>
                      <div className="font-medium">{product.receipt}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:w-[30%]">
          <div className="flex w-full flex-col gap-5 lg:flex-row">
            <div className="app-shadow w-full rounded-lg bg-background p-6 px-6">
              <div className="h-16">
                <h3 className="text-nowrap text-center font-semibold">
                  Total Purchase Amount
                </h3>
                <p className="mt-2 text-center text-4xl font-bold">
                  {formatCurrency(totalPurchaseAmount)}
                </p>
              </div>
            </div>
            <div className="app-shadow w-full rounded-lg bg-background p-6 px-6">
              <div className="h-16 w-full">
                <h3 className="text-nowrap text-center font-semibold">
                  Total Number of purchase
                </h3>
                <p className="mt-2 text-center text-4xl font-bold">
                  {inventoryProducts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="app-shadow mt-5 w-full rounded-lg bg-background p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Vendor Details</h3>
              <EditVendor
                button={
                  <button className="rounded-sm border-2 px-4 py-1">
                    Edit
                  </button>
                }
                vendor={vendor!}
              />
            </div>
            <div className="flex flex-col gap-1 p-3">
              <p>Contact Name: {vendor?.name}</p>
              <p>Company Name: {vendor?.companyName}</p>
              <p>Phone: {vendor?.phone}</p>
              <p>Email: {vendor?.email}</p>
              <p>Address: {vendor?.address}</p>
              <p>City: {vendor?.city}</p>
              <p>State: {vendor?.state}</p>
              <p>Zip: {vendor?.zip}</p>
              <p>Website: {vendor?.website}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
