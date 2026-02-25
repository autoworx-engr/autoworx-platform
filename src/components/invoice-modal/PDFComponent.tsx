"use client";
import { getInspections } from "@/actions/estimate/invoice/getInspections";
import { calculateDue } from "@/utils/calculateDue";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Client,
  Column,
  Company,
  Invoice,
  InvoiceInspection,
  InvoiceItem,
  InvoicePhoto,
  Labor,
  Material,
  Service,
  User,
  Vehicle,
} from "@prisma/client";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import moment from "moment";
import { useEffect, useState } from "react";
// Register Poppins Regular
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Regular.ttf",
  fontWeight: "normal",
});

// Register Poppins Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Italic.ttf",
  fontWeight: "normal",
  fontStyle: "italic",
});

// Register Poppins Thin
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Thin.ttf",
  fontWeight: 100,
});

// Register Poppins Thin Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-ThinItalic.ttf",
  fontWeight: 100,
  fontStyle: "italic",
});

// Register Poppins Light
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Light.ttf",
  fontWeight: 300,
});

// Register Poppins Light Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-LightItalic.ttf",
  fontWeight: 300,
  fontStyle: "italic",
});

// Register Poppins Medium
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Medium.ttf",
  fontWeight: 500,
});

// Register Poppins Medium Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-MediumItalic.ttf",
  fontWeight: 500,
  fontStyle: "italic",
});

// Register Poppins SemiBold
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-SemiBold.ttf",
  fontWeight: 600,
});

// Register Poppins SemiBold Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-SemiBoldItalic.ttf",
  fontWeight: 600,
  fontStyle: "italic",
});

// Register Poppins Bold
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Bold.ttf",
  fontWeight: "bold",
});

// Register Poppins Bold Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-BoldItalic.ttf",
  fontWeight: "bold",
  fontStyle: "italic",
});

// Register Poppins ExtraBold
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-ExtraBold.ttf",
  fontWeight: 800,
});

// Register Poppins ExtraBold Italic
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-ExtraBoldItalic.ttf",
  fontWeight: 800,
  fontStyle: "italic",
});

// Create styles
const styles = StyleSheet.create({
  regular: {
    fontFamily: "Poppins",
  },
  italic: {
    fontFamily: "Poppins",
    fontStyle: "italic",
  },
  bold: {
    fontFamily: "Poppins",
    fontWeight: "bold",
  },
  boldItalic: {
    fontFamily: "Poppins",
    fontWeight: "bold",
    fontStyle: "italic",
  },
  extraBold: {
    fontFamily: "Poppins",
    fontWeight: 800,
  },
  lightItalic: {
    fontFamily: "Poppins",
    fontWeight: 300,
    fontStyle: "italic",
  },
  page: {
    padding: 20,
  },
  container: {
    borderWidth: 1,
    borderColor: "#6571FF",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  mainSection: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    fontSize: 10,
  },
  fontSize10: {
    fontSize: 10,
  },
  section: {
    // margin: 10,
    // padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  logo: {
    // width: 80,
    // height: 80,
  },
  textRight: {
    textAlign: "right",
    fontSize: 10,
  },
  link: {
    borderRadius: "4px",
    border: "1px solid #6571ff",
    padding: "4px 16px", // Equivalent to 'px-4 py-1'
    fontSize: "12px", // Equivalent to 'text-sm'
    color: "#6571ff",
    textDecoration: "none",
  },
  boldText: {
    fontWeight: "bold",
  },
  totalContainer: {
    // marginTop: 20,
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#6571FF",
    marginBottom: 1,
    borderRadius: 4,
    columnGap: 2,
  },
  totalLabel: {
    fontWeight: "bold",
    color: "#6571FF",
    paddingLeft: 2,
    textTransform: "uppercase",
  },
  totalValue: {
    backgroundColor: "#6571FF",
    color: "white",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  invoiceItems: {
    marginTop: 20,
  },
  terms: {
    marginTop: 20,
    fontSize: 10,
  },
  authorize: {
    marginTop: 20,
    backgroundColor: "#6571FF",
    color: "white",
    textAlign: "center",
    padding: 10,
  },
  itemText: {
    color: "#6571FF",
  },
  serviceDetails: {
    // marginTop: 5,
  },
  mainMaterial: {
    color: "#6571FF",
    fontSize: 10,
  },
  materialItem: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 5,
  },
  laborItem: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    marginLeft: 5,
  },
  inspectionContainer: {
    borderWidth: 1,
    borderColor: "#6571FF",
    borderRadius: 4,
    padding: 5,
    marginBottom: 5,
  },
});

type PDFComponentProps = {
  id: string;
  client: Client;
  invoice: Invoice & {
    column: Column | null;
    company: Company;
    invoiceItems: (InvoiceItem & {
      materials: Material[] | [];
      service: Service | null;
      invoice: Invoice | null;
      labor: Labor | null;
    })[];
    photos: InvoicePhoto[];
    user: User;
  };
  vehicle: Vehicle | null;
  companyDetails: Company | null;
  authorizedName: string;
  signImageUrl?: string;
  isStripe: boolean;
};

const PDFComponent = function PDF({
  id,
  client,
  invoice,
  vehicle,
  companyDetails,
  authorizedName,
  isStripe,
  signImageUrl,
}: PDFComponentProps) {
  const [damageNotes, setDamageNotes] = useState<string>(
    "There is no damage notes"
  );
  const [inspectionData, setInspectionData] = useState<InvoiceInspection[]>([]);

  useEffect(() => {
    // Fetch inspection data and damage notes from the backend
    const fetchInspectionData = async () => {
      try {
        const response = await getInspections(id);
        setInspectionData(response);
      } catch (error) {
        console.error("Error fetching inspection data:", error);
      }
    };

    fetchInspectionData();
  }, [id]);

  useEffect(() => {
    if (invoice.damageNotes) {
      setDamageNotes(invoice.damageNotes);
    }
  }, [invoice.damageNotes]);

  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, styles.regular, { color: "#64748b" }]}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            {companyDetails?.image ? (
              <Image
                src={companyDetails?.image}
                style={{ width: 110, height: 90, objectFit: "contain" }}
              />
            ) : (
              <View
                style={{ width: 128, backgroundColor: "#6B7280", padding: 10 }}
              >
                <Text style={{ color: "white" }}>Logo</Text>
              </View>
            )}
          </View>
          <View style={styles.textRight}>
            <Text style={styles.boldText}>Contact Information:</Text>
            <Text>
              {companyDetails?.address && `${companyDetails.address}`}
              {companyDetails?.address && companyDetails?.city && ", "}
              {companyDetails?.city && `${companyDetails.city}`}
              {companyDetails?.city && companyDetails?.state && ", "}
              {companyDetails?.state && `${companyDetails.state}`}
              {companyDetails?.state && companyDetails?.zip && ", "}
              {companyDetails?.zip && `${companyDetails.zip}`}
            </Text>
            <Text>{companyDetails?.phone}</Text>
            <Text>{companyDetails?.email}</Text>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 20, marginTop: 20 }]}>
          <Text style={[styles.boldText, { fontSize: 20 }]}>Estimate</Text>
          <View style={[styles.mainSection, { marginTop: 20 }]}>
            <View style={{}}>
              <Text style={[styles.boldText, { marginBottom: 2 }]}>
                Estimate To:
              </Text>
              <Text style={styles.fontSize10}>
                {client?.firstName} {client?.lastName}
              </Text>
              <Text style={styles.fontSize10}>{client?.mobile}</Text>
              <Text style={styles.fontSize10}>{client?.email}</Text>
            </View>
            <View style={styles.section}>
              <Text style={[styles.boldText, { marginBottom: 2 }]}>
                Vehicle Details:
              </Text>
              <Text style={styles.fontSize10}>{vehicle?.year || ""}</Text>
              <Text style={styles.fontSize10}>{vehicle?.make}</Text>
              <Text style={styles.fontSize10}>{vehicle?.model}</Text>
              <Text style={styles.fontSize10}>{vehicle?.submodel}</Text>
              {vehicle?.other && (
                <Text style={styles.fontSize10}>{vehicle?.submodel}</Text>
              )}
              <Text style={styles.fontSize10}>{vehicle?.type}</Text>
              {vehicle?.vin && (
                <>
                  <Text>Vin Number</Text>
                  <Text style={styles.fontSize10}>{vehicle?.vin}</Text>
                </>
              )}
            </View>
            <View style={styles.section}>
              <Text style={[styles.boldText, { marginBottom: 2 }]}>
                Estimate Details:
              </Text>
              <Text style={styles.fontSize10}>{invoice.id}</Text>
              <Text style={styles.fontSize10}>
                {moment(invoice.createdAt).format("MMM DD, YYYY")}
              </Text>
              <Text>Bill Status</Text>
              <Text style={styles.fontSize10}>{invoice.column?.title}</Text>
              {parseFloat(
                calculateDue(
                  Number(invoice.grandTotal),
                  Number(invoice.totalPayment),
                  Number(invoice.deposit)
                ).toFixed(2)
              ) === 0 && <Text>Payment Status</Text>}
              <Text>
                {parseFloat(
                  calculateDue(
                    Number(invoice.grandTotal),
                    Number(invoice.totalPayment),
                    Number(invoice.deposit)
                  ).toFixed(2)
                ) === 0 && "PAID"}
              </Text>
            </View>
            <View style={styles.totalContainer}>
              {[
                ["subtotal", invoice.subtotal],
                ["discount", invoice.discount],
                ["tax", invoice.tax],
                ["shop supplies", invoice?.serviceFee],
                ["grand total", invoice.grandTotal],
                ["deposit", invoice.deposit],
                ["payment", invoice.totalPayment],
                [
                  "due",
                  calculateDue(
                    Number(invoice.grandTotal),
                    Number(invoice.totalPayment),
                    Number(invoice.deposit)
                  ),
                ],
              ].map(([field, value], ind) => (
                <View key={ind} style={styles.total}>
                  {/* @ts-ignore */}
                  <Text style={styles.totalLabel}>{field || ""}</Text>
                  <Text style={styles.totalValue}>
                    {field == "tax" || field == "shop supplies" ? (
                      <>
                        {Number(value)}%
                        {Number(value) !== 0 &&
                          ` | ${formatCurrency((Number((invoice.subtotal as any) - (invoice.discount as any)) * Number(value)) / 100)}`}
                      </>
                    ) : (
                      formatCurrency(parseFloat("" + value))
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <PDFInvoiceItems items={invoice.invoiceItems} />

        <View style={styles.container}>
          {inspectionData.map((item, index) => (
            <PDFInspections key={index} item={item} />
          ))}
          <Text style={{ marginTop: 10, fontSize: 10 }}>
            Damage Note: {damageNotes}
          </Text>
        </View>

        <View style={styles.terms}>
          <Text style={styles.boldText}>Terms & Conditions:</Text>
          <Text>{invoice.terms || companyDetails?.terms}</Text>
        </View>

        <View style={styles.terms}>
          <Text style={styles.boldText}>Policy & Conditions:</Text>
          <Text>{invoice.policy || companyDetails?.policy}</Text>
        </View>

        <View style={styles.header}>
          <View style={{ marginTop: 20 }}>
            <Text
              style={[styles.boldText, styles.fontSize10, { marginBottom: 2 }]}
            >
              {invoice.company.name}
            </Text>
            <Text style={styles.fontSize10}>
              {invoice.user.firstName} {invoice.user.lastName}
            </Text>
          </View>
          <View style={{ marginTop: 20, alignItems: "center" }}>
            {signImageUrl ? (
              <Image
                src={signImageUrl}
                style={{ width: 110, height: 90, objectFit: "contain" }}
              />
            ) : authorizedName ? (
              <Text style={[styles.boldText, styles.fontSize10]}>
                {authorizedName}
              </Text>
            ) : null}

            {(authorizedName || signImageUrl) && (
              <Text
                style={[
                  styles.fontSize10,
                  {
                    color: "#6571FF",
                    paddingVertical: 4,
                  },
                ]}
              >
                Authorized
              </Text>
            )}
          </View>

          {/* {isStripe && (
            <View style={{ marginTop: 20 }}>
              <Link
                src={`${process.env.NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}?stripe=true`}
                style={styles.link}
              >
                Pay With Stripe
              </Link>
            </View>
          )} */}
        </View>

        <Text
          style={{ textAlign: "center", marginTop: "auto", fontSize: "12px" }}
        >
          Thank you for shopping with {invoice.company.name}
        </Text>
      </Page>
    </Document>
  );
};

const PDFInvoiceItems = ({
  items,
}: {
  items: (InvoiceItem & {
    materials: Material[] | [];
    service: Service | null;
    invoice: Invoice | null;
    labor: Labor | null;
  })[];
}) => {
  return items.map((item) => {
    if (!item.service) return null;

    const materialCost = item.materials.reduce((acc, material) => {
      return (
        acc +
        (material && material.sell
          ? parseFloat(material.sell.toString()) *
            Number(material.quantity ?? 0)
          : 0)
      );
    }, 0);

    const laborCost = item.labor?.charge
      ? parseFloat(item.labor?.charge.toString()) *
        (Number(item.labor.hours) || 0)
      : 0;
    const totalDiscount =
      item.materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.discount
            ? parseFloat(material.discount.toString())
            : 0)
        );
      }, 0) +
      (item.labor?.discount ? parseFloat(item.labor?.discount.toString()) : 0);
    const serviceTotal = materialCost + laborCost - totalDiscount;
    return (
      <View
        key={item.id}
        style={{
          ...styles.container,
          ...styles.mainMaterial,
        }}
      >
        <View style={styles.header}>
          <Text>{item.service.name}</Text>

          <Text>{formatCurrency(serviceTotal)}</Text>
        </View>

        <View>
          <Text>{item.service?.description || item.serviceDesc}</Text>
        </View>

        <View style={styles.serviceDetails}>
          {item.materials.map((material, index) => {
            if (!material) return null;

            return (
              <View key={index} style={styles.materialItem}>
                <Text>{material.name}</Text>

                <Text>
                  {formatCurrency(
                    material.sell
                      ? parseFloat(material.sell.toString()) *
                          Number(material.quantity ?? 0)
                      : 0
                  )}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.laborItem}>
          <Text>{item.labor ? item.labor.name : "Labor"}</Text>
          <Text>{formatCurrency(laborCost)}</Text>
        </View>
        <View style={styles.laborItem}>
          <Text>{item.labor?.notes}</Text>
        </View>

        <View style={styles.laborItem}>
          <Text>Discount</Text>
          <Text>{formatCurrency(totalDiscount)}</Text>
        </View>
      </View>
    );
  });
};

const PDFInspections = ({ item }: { item: InvoiceInspection }) => {
  const driver = item?.driver ? "Driver" : "";
  const passenger = item?.passenger ? "Passenger" : "";

  if (!item.driver && !item.passenger) return null;

  return (
    <View
      style={{
        ...styles.inspectionContainer,
        ...styles.mainMaterial,
      }}
    >
      <View style={styles.header}>
        <Text>{item.title}</Text>
        <Text>
          {String(driver)} {String(passenger)}
        </Text>
      </View>

      <View>
        <Text>Note: {item.notes}</Text>
      </View>
    </View>
  );
};

export default PDFComponent;
