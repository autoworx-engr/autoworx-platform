"use client";
import {
  Column,
  Company,
  Invoice,
  InvoiceItem,
  InvoicePhoto,
  Labor,
  Material,
  Service,
  Status,
  User,
  Vehicle,
} from "@prisma/client";
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import moment from "moment";
import React from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { calculateDue } from "@/utils/calculateDue";
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
    marginBottom: 20,
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
});

const PDFComponent = ({
  id,
  clientId,
  invoice,
  vehicle,
  companyDetails,
  authorizedName,
  signImageUrl,
}: {
  id: string;
  clientId: any;
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
}) => {
  return (
    <Document>
      <Page
        size="A4"
        style={[styles.page, styles.regular, { color: "#64748b" }]}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              src={`${companyDetails?.image}`}
              style={{
                width: 90,
                height: 90,
                objectFit: "fit",
              }}
              // @ts-ignore
              alt="logo"
            />
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
                {clientId?.firstName} {clientId?.lastName}
              </Text>
              <Text style={styles.fontSize10}>{clientId?.mobile}</Text>
              <Text style={styles.fontSize10}>{clientId?.email}</Text>
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
                <Text style={styles.fontSize10}>{vehicle?.other}</Text>
              )}
              <Text style={styles.fontSize10}>{vehicle?.type}</Text>
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
            </View>
            <View style={styles.totalContainer}>
              {[
                ["subtotal", invoice.subtotal],
                ["discount", invoice.discount],
                ["tax", invoice?.tax],
                ["shop supplies", invoice?.serviceFee],
                ["grand total", invoice.grandTotal],
                ["deposit", invoice.deposit],
                ["payment", invoice.totalPayment],
                [
                  "due",
                  calculateDue(
                    Number(invoice.grandTotal),
                    Number(invoice.totalPayment),
                    Number(invoice.deposit),
                  ),
                ],
              ].map(([field, value], ind) => (
                <View key={ind} style={styles.total}>
                  {/* @ts-ignore */}
                  <Text style={styles.totalLabel}>{field || ""}</Text>
                  <Text style={styles.totalValue}>
                    {field == "tax" || field == "shop supplies" ? (
                      <> %{Number(value)}</>
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

        {invoice.customerNotes && (
          <View style={styles.terms}>
            <Text style={styles.boldText}>Customer Notes:</Text>
            <Text>{invoice.customerNotes}</Text>
          </View>
        )}

        <View style={styles.terms}>
          <Text style={styles.boldText}>Terms & Conditions:</Text>
          <Text>{invoice.terms || invoice.company.terms}</Text>
        </View>

        <View style={styles.terms}>
          <Text style={styles.boldText}>Policy & Conditions:</Text>
          <Text>{invoice.policy || invoice.company.policy}</Text>
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
          {authorizedName ||
            (signImageUrl && (
              <View style={{ marginTop: 20 }}>
                {/* {signImageUrl ? <Im} */}
                {authorizedName && (
                  <Text style={[styles.boldText, styles.fontSize10]}>
                    {authorizedName || ""}
                  </Text>
                )}
                <Text
                  style={[
                    styles.fontSize10,
                    {
                      color: "#6571FF",
                      // border: "3px solid #6571FF",
                      padding: "4px 2px",
                    },
                  ]}
                >
                  Authorized0
                </Text>
              </View>
            ))}
          {invoice?.stripePaymentLink &&
            //@ts-expect-error FIX Later
            parseFloat(invoice?.due || "0") > 0 && (
              <View style={{ marginTop: 20 }}>
                <Link src={invoice.stripePaymentLink} style={styles.link}>
                  Pay With Stripe
                </Link>
              </View>
            )}
        </View>

        <Text style={{ textAlign: "center", marginTop: "auto" }}>
          Thank you for shopping with Autoworx
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
              Number(material.quantity ?? 0) -
            parseFloat(material.discount ? material.discount.toString() : "0")
          : 0)
      );
    }, 0);

    const laborCost = item.labor?.charge
      ? parseFloat(item.labor?.charge.toString()) *
        (Number(item.labor.hours) ?? 0)
      : 0;

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
          <Text>{formatCurrency(materialCost + laborCost)}</Text>
        </View>

        <View style={styles.serviceDetails}>
          {item.materials.map((material, index) => {
            if (!material) return null;

            return (
              <View key={index} style={styles.materialItem}>
                <Text>{material.name}</Text>
                <Text>
                  {formatCurrency(
                    (material.sell
                      ? parseFloat(material.sell.toString()) *
                        Number(material.quantity ?? 0)
                      : 0) -
                      parseFloat(
                        material.discount ? material.discount.toString() : "0",
                      ),
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
      </View>
    );
  });
};

export default PDFComponent;
