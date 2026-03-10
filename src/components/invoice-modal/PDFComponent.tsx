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

// Design tokens for consistent UX
const colors = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  primaryDark: "#3730A3",
  text: "#1E293B",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  digit: "#475569", // slate-600
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  bgSection: "#F8FAFC",
  bgHighlight: "#F1F5F9",
  white: "#FFFFFF",
  success: "#059669",
  successBg: "#D1FAE5",
};

// Create styles
const styles = StyleSheet.create({
  regular: { fontFamily: "Poppins" },
  italic: { fontFamily: "Poppins", fontStyle: "italic" },
  bold: { fontFamily: "Poppins", fontWeight: "bold" },
  boldItalic: { fontFamily: "Poppins", fontWeight: "bold", fontStyle: "italic" },
  extraBold: { fontFamily: "Poppins", fontWeight: 800 },
  lightItalic: { fontFamily: "Poppins", fontWeight: 300, fontStyle: "italic" },
  fontSize10: { fontSize: 9 },
  fontSize11: { fontSize: 10 },
  fontSize12: { fontSize: 11 },
  fontSize14: { fontSize: 12 },
  page: {
    padding: 32,
    color: colors.text,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoContainer: {
    width: 100,
  },
  logoPlaceholder: {
    width: 100,
    height: 80,
    backgroundColor: colors.bgHighlight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  companyInfo: {
    textAlign: "right",
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  companySubtext: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  // Document title
  docTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: colors.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  infoBlock: {
    flex: 1,
    minWidth: 140,
  },
  infoBlockLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoBlockContent: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  // Totals summary
  totalsBox: {
    backgroundColor: colors.bgSection,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  totalsTwoCol: {
    flexDirection: "row",
    gap: 12,
  },
  totalsCol: {
    flex: 1,
  },
  totalsColRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    marginLeft: 12,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  totalsRowLast: {
    borderBottomWidth: 0,
  },
  totalsLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 800,
    color: colors.digit,
  },
  totalsValueEmphasis: {
    fontSize: 12,
    fontWeight: 900,
    color: colors.digit,
  },
  // Status badge
  statusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgePaid: {
    backgroundColor: colors.successBg,
  },
  // Invoice items
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primary,
  },
  itemDesc: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  lineItemText: {
    fontSize: 9,
    color: colors.text,
  },
  // Inspections
  inspectionCard: {
    backgroundColor: colors.bgSection,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  inspectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inspectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
  },
  inspectionSide: {
    fontSize: 9,
    color: colors.textMuted,
  },
  inspectionNote: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.4,
  },
  // Terms
  termsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  // Footer / Signature
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBlock: {
    alignItems: "flex-start",
  },
  footerSignature: {
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.textMuted,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 10,
    color: colors.text,
  },
  laborDescription: {
    color: "#66738C",
  },
  authorizedBadge: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: 700,
    color: colors.primary,
  },
  // Link (for Stripe)
  link: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 10,
    color: colors.primary,
    fontWeight: 600,
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
      } catch (_error) {
        // If inspections fail to load, keep invoice rendering intact.
      }
    };

    fetchInspectionData();
  }, [id]);

  useEffect(() => {
    if (invoice.damageNotes) {
      setDamageNotes(invoice.damageNotes);
    }
  }, [invoice.damageNotes]);

  const isPaid =
    parseFloat(
      calculateDue(
        Number(invoice.grandTotal),
        Number(invoice.totalPayment),
        Number(invoice.deposit),
      ).toFixed(2),
    ) === 0;

  const refundAmount =
    (invoice as any).Refund?.reduce(
      (acc: number, r: { amount: number }) => acc + (Number(r?.amount) || 0),
      0,
    ) || 0;

  const totals = [
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
        Number(invoice.deposit),
      ),
    ],
    ...(refundAmount > 0 ? [["refunded", refundAmount] as const] : []),
  ];

  const totalsMap = new Map<string, unknown>(
    totals.map(([k, v]) => [String(k), v]),
  );

  const leftFields = ["subtotal", "discount", "tax", "shop supplies"];
  const rightFields = ["grand total", "deposit", "payment", "refunded", "due"];

  const formatTotalsValue = (field: string, value: unknown) => {
    if (field === "tax" || field === "shop supplies") {
      const pct = Number(value) || 0;
      if (pct === 0) return "0%";
      const amount = formatCurrency(
        (Number((invoice.subtotal as any) - (invoice.discount as any)) * pct) /
        100,
      );
      return `${pct}% (${amount})`;
    }
    return formatCurrency(parseFloat("" + value));
  };

  return (
    <Document>
      <Page size="A4" style={[styles.page, styles.regular]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {companyDetails?.image ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image
                src={companyDetails?.image}
                style={{ width: 100, height: 80, objectFit: "contain" }}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={[styles.fontSize10, { color: colors.textMuted }]}>
                  Logo
                </Text>
              </View>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyDetails?.name}</Text>
            <Text style={styles.companySubtext}>
              {companyDetails?.address && `${companyDetails.address}`}
              {companyDetails?.address && companyDetails?.city && ", "}
              {companyDetails?.city && `${companyDetails.city}`}
              {companyDetails?.city && companyDetails?.state && ", "}
              {companyDetails?.state && `${companyDetails.state}`}
              {companyDetails?.state && companyDetails?.zip && " "}
              {companyDetails?.zip && `${companyDetails.zip}`}
            </Text>
            <Text style={styles.companySubtext}>{companyDetails?.phone}</Text>
            <Text style={styles.companySubtext}>{companyDetails?.email}</Text>
          </View>
        </View>

        {/* Document title */}
        <Text style={styles.docTitle}>
          {isPaid ? "RECEIPT" : invoice.type.toUpperCase()}
        </Text>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockLabel}>Estimate To</Text>
            <Text style={styles.infoBlockContent}>
              {client?.firstName} {client?.lastName}
            </Text>
            <Text style={styles.infoBlockContent}>{client?.mobile}</Text>
            <Text style={styles.infoBlockContent}>{client?.email}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockLabel}>Vehicle Details</Text>
            <Text style={styles.infoBlockContent}>
              {[vehicle?.year, vehicle?.make, vehicle?.model]
                .filter(Boolean)
                .join(" ")}
            </Text>
            {vehicle?.submodel && (
              <Text style={styles.infoBlockContent}>{vehicle.submodel}</Text>
            )}
            {vehicle?.other && (
              <Text style={styles.infoBlockContent}>{vehicle.other}</Text>
            )}
            {vehicle?.type && (
              <Text style={styles.infoBlockContent}>{vehicle.type}</Text>
            )}
            {vehicle?.vin && (
              <Text style={styles.infoBlockContent}>VIN: {vehicle.vin}</Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockLabel}>Estimate Details</Text>
            <Text style={styles.infoBlockContent}>#{invoice.id}</Text>
            <Text style={styles.infoBlockContent}>
              {moment(invoice.createdAt).format("MMM DD, YYYY")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Text style={[styles.infoBlockContent, { marginRight: 6 }]}>Bill Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  isPaid ? styles.statusBadgePaid : {},
                ]}
              >
                <Text
                  style={[
                    { fontSize: 9, fontWeight: 700 },
                    isPaid ? { color: colors.success } : { color: colors.primary },
                  ]}
                >
                  {isPaid ? "PAID" : invoice.column?.title || "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Totals summary */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsTwoCol}>
            <View style={styles.totalsCol}>
              {leftFields
                .filter((f) => totalsMap.has(f))
                .map((field, idx, arr) => {
                  const value = totalsMap.get(field);
                  return (
                    <View
                      key={field}
                      style={[
                        styles.totalsRow,
                        idx === arr.length - 1 ? styles.totalsRowLast : {},
                      ]}
                    >
                      <Text style={styles.totalsLabel}>
                        {field.toUpperCase()}
                      </Text>
                      <Text style={styles.totalsValue}>
                        {formatTotalsValue(field, value)}
                      </Text>
                    </View>
                  );
                })}
            </View>

            <View style={styles.totalsColRight}>
              {rightFields
                .filter((f) => totalsMap.has(f))
                .map((field, idx, arr) => {
                  const value = totalsMap.get(field);
                  const isEmphasis =
                    field === "grand total" || field === "due";
                  return (
                    <View
                      key={field}
                      style={[
                        styles.totalsRow,
                        idx === arr.length - 1 ? styles.totalsRowLast : {},
                      ]}
                    >
                      <Text style={styles.totalsLabel}>
                        {field.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.totalsValue,
                          isEmphasis ? styles.totalsValueEmphasis : {},
                        ]}
                      >
                        {formatTotalsValue(field, value)}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>
          Services & Line Items
        </Text>
        <PDFInvoiceItems items={invoice.invoiceItems} />

        {(inspectionData.length > 0 || damageNotes) && (
          <View style={[styles.termsSection, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Inspections</Text>
            {inspectionData.map((item, index) => (
              <PDFInspections key={index} item={item} />
            ))}
            {damageNotes && (
              <View style={[styles.inspectionCard, { marginTop: 4 }]}>
                <Text style={styles.termsTitle}>Damage Notes</Text>
                <Text style={styles.inspectionNote}>{damageNotes}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            {invoice.terms || companyDetails?.terms || "—"}
          </Text>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Policy & Conditions</Text>
          <Text style={styles.termsText}>
            {invoice.policy || companyDetails?.policy || "—"}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabel}>Prepared by</Text>
            <Text style={styles.footerValue}>{invoice.company.name}</Text>
            <Text style={[styles.footerValue, { fontWeight: 600 }]}>
              {invoice.user.firstName} {invoice.user.lastName}
            </Text>
          </View>
          <View style={styles.footerSignature}>
            {signImageUrl ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image
                src={signImageUrl}
                style={{ width: 100, height: 50, objectFit: "contain" }}
              />
            ) : authorizedName ? (
              <Text style={[styles.footerValue, styles.bold]}>
                {authorizedName}
              </Text>
            ) : null}
            {(authorizedName || signImageUrl) && (
              <Text style={styles.authorizedBadge}>Authorized</Text>
            )}
          </View>
        </View>

        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 10,
            color: colors.textLight,
          }}
        >
          Thank you for your business · Powered by {companyDetails?.name}
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
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>Service - {item.service.name}</Text>
          <Text style={styles.itemPrice}>{formatCurrency(serviceTotal)}</Text>
        </View>

        {(item.service?.description || item.serviceDesc) && (
          <Text style={styles.itemDesc}>
            Description - {item.service?.description || item.serviceDesc}
          </Text>
        )}

        {item.materials.filter(Boolean).length > 0 && (
          <View style={{ marginBottom: 6 }}>
            {item.materials.map((material, index) => {
              if (!material) return null;
              const lineTotal = material.sell
                ? parseFloat(material.sell.toString()) *
                Number(material.quantity ?? 0)
                : 0;
              return (
                <View key={index} style={styles.lineItem}>
                  <Text style={styles.lineItemText}>Material - {material.name}</Text>
                  <Text style={styles.lineItemText}>
                    {formatCurrency(lineTotal)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {item.labor && (
          <View style={styles.lineItem}>
            <Text style={styles.lineItemText}>
              Labor - {item.labor ? item.labor.name : "Labor"}
            </Text>
            <Text style={styles.lineItemText}>
              {formatCurrency(laborCost)}
            </Text>
          </View>
        )}
        {item.labor?.notes && (
          <Text style={[styles.inspectionNote, { marginTop: 2 }]}>
            Description - {item.labor.notes}
          </Text>
        )}
        {totalDiscount > 0 && (
          <View style={[styles.lineItem, { marginTop: 4 }]}>
            <Text style={styles.lineItemText}>Discount</Text>
            <Text style={styles.lineItemText}>
              -{formatCurrency(totalDiscount)}
            </Text>
          </View>
        )}
      </View>
    );
  });
};

const PDFInspections = ({ item }: { item: InvoiceInspection }) => {
  const sides = [
    item?.driver && "Driver",
    item?.passenger && "Passenger",
  ].filter(Boolean);

  if (!item.driver && !item.passenger) return null;

  return (
    <View style={styles.inspectionCard}>
      <View style={styles.inspectionHeader}>
        <Text style={styles.inspectionTitle}>{item.title}</Text>
        {sides.length > 0 && (
          <Text style={styles.inspectionSide}>{sides.join(" / ")}</Text>
        )}
      </View>
      {item.notes && (
        <Text style={styles.inspectionNote}>Note: {item.notes}</Text>
      )}
    </View>
  );
};

export default PDFComponent;
