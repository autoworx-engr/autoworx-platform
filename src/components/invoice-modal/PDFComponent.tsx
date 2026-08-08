"use client";
import { getInspections } from "@/actions/estimate/invoice/getInspections";
import { calculateDue } from "@/utils/calculateDue";
import { formatCurrency } from "@/utils/formatCurrency";
import { getInvoiceItemTitle } from "@/utils/invoiceItemTitle";
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
  Payment,
  CardPayment,
  CheckPayment,
  CashPayment,
  OtherPayment,
  DepositPayment,
  PaymentMethod,
  Refund,
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
  boldItalic: {
    fontFamily: "Poppins",
    fontWeight: "bold",
    fontStyle: "italic",
  },
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
  // Payments
  paymentTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 8,
  },
  paymentHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.bgSection,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  paymentRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  paymentRowLast: {
    borderBottomWidth: 0,
  },
  paymentColDate: {
    width: "33.33%",
    fontSize: 8,
    color: colors.text,
  },
  paymentColMethod: {
    width: "33.33%",
    fontSize: 8,
    color: colors.text,
  },
  paymentColAmount: {
    width: "33.33%",
    fontSize: 8,
    color: colors.text,
  },
  paymentColCash: {
    width: "16%",
    fontSize: 8,
    color: colors.text,
  },
  paymentColDue: {
    width: "16%",
    fontSize: 8,
    color: colors.text,
  },
  paymentHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  paymentRefundText: {
    fontSize: 7,
    color: "#DC2626",
    marginTop: 1,
  },
  // Attachments
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attachmentImage: {
    width: 110,
    height: 90,
    objectFit: "cover",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
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

export type PDFComponentProps = {
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
    payments: (Payment & {
      card: CardPayment | null;
      check: CheckPayment | null;
      cash: CashPayment | null;
      other: (OtherPayment & { paymentMethod: PaymentMethod | null }) | null;
      deposit: DepositPayment | null;
      Refund: Refund[];
    })[];
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
    "There is no damage notes",
  );
  const [inspectionData, setInspectionData] = useState<InvoiceInspection[]>([]);
  const [photoDataUrls, setPhotoDataUrls] = useState<Record<number, string>>(
    {},
  );

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
    // react-pdf fetches <Image> sources itself, and remote S3 images without
    // CORS headers are unreliable there when multiple are rendered at once
    // (only the first tends to resolve). Route each through the same-origin
    // proxy and inline it as a data URI before handing it to <Image>.
    if (invoice.photos.length === 0) return;
    let cancelled = false;

    const loadPhotos = async () => {
      const entries = await Promise.all(
        invoice.photos.map(async (photo) => {
          try {
            const res = await fetch(
              `/api/proxy-image?url=${encodeURIComponent(photo.photo)}`,
            );
            if (!res.ok) return null;
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
            return [photo.id, dataUrl] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;
      setPhotoDataUrls(
        Object.fromEntries(
          entries.filter((entry): entry is [number, string] => entry !== null),
        ),
      );
    };

    loadPhotos();

    return () => {
      cancelled = true;
    };
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

  const totalMaterialSell = invoice.invoiceItems.reduce(
    (invoiceSum: number, invoiceItem: any) =>
      invoiceSum +
      (invoiceItem.materials ?? []).reduce(
        (materialSum: number, material: { quantity?: number; sell?: number }) =>
          materialSum + (material.quantity ?? 0) * (material.sell ?? 0),
        0,
      ),
    0,
  );

  const refundAmount =
    (invoice as any).Refund?.reduce(
      (acc: number, r: { amount: number }) => acc + (Number(r?.amount) || 0),
      0,
    ) || 0;

  const totals = [
    ["subtotal", invoice.subtotal],
    ["discount", invoice.discount],
    ["tax", invoice.tax],
    // ["vehicle extra cost", invoice.vehicleExtraCost],
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

  const leftFields = [
    "subtotal",
    "discount",
    "tax",
    "vehicle extra cost",
    "shop supplies",
  ];
  const rightFields = ["grand total", "deposit", "payment", "refunded", "due"];

  const formatTotalsValue = (field: string, value: unknown) => {
    if (field === "tax" || field === "shop supplies") {
      const pct = Number(value) || 0;
      if (pct === 0) return "0%";
      const base =
        field === "tax" ? totalMaterialSell : Number(invoice.subtotal as any);
      const amount = formatCurrency((base * pct) / 100);
      return `${pct}% (${amount})`;
    }
    return formatCurrency(parseFloat("" + value));
  };

  const paymentEntries = (invoice.payments ?? [])
    .filter((payment) => payment.invoiceId === invoice.id)
    .reverse();

  const getPaymentMethodText = (payment: (typeof paymentEntries)[number]) => {
    if (payment.type === "OTHER") {
      return payment.other?.paymentMethod?.name || "OTHER";
    }

    if (payment.type === "CARD") {
      return payment.card?.cardType || "CARD";
    }

    return payment.type;
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={[styles.infoBlockContent, { marginRight: 6 }]}>
                Bill Status:
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isPaid ? styles.statusBadgePaid : {},
                ]}
              >
                <Text
                  style={[
                    { fontSize: 9, fontWeight: 700 },
                    isPaid
                      ? { color: colors.success }
                      : { color: colors.primary },
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
                  const isEmphasis = field === "grand total" || field === "due";
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

        {/* payment info  */}
        {paymentEntries.length > 0 && (
          <View style={[styles.termsSection, { marginTop: 6 }]}>
            <Text style={styles.sectionTitle}>Payment Info</Text>
            <View style={styles.paymentTable}>
              <View style={styles.paymentHeaderRow}>
                <Text style={[styles.paymentColDate, styles.paymentHeaderText]}>
                  Date
                </Text>
                <Text
                  style={[styles.paymentColMethod, styles.paymentHeaderText]}
                >
                  Method
                </Text>
                <Text
                  style={[styles.paymentColAmount, styles.paymentHeaderText]}
                >
                  Amount
                </Text>
              </View>

              {paymentEntries.map((payment, index) => {
                const refundedAmount = payment.Refund.reduce(
                  (sum, refund) => sum + Number(refund.amount || 0),
                  0,
                );

                return (
                  <View
                    key={payment.id}
                    style={[
                      styles.paymentRow,
                      index === paymentEntries.length - 1
                        ? styles.paymentRowLast
                        : {},
                    ]}
                  >
                    <Text style={styles.paymentColDate}>
                      {moment(payment.date || payment.createdAt).format(
                        "MM.DD.YYYY",
                      )}
                    </Text>
                    <Text style={styles.paymentColMethod}>
                      {getPaymentMethodText(payment)}
                    </Text>
                    <View style={styles.paymentColAmount}>
                      <Text>{formatCurrency(Number(payment.amount || 0))}</Text>
                      {refundedAmount > 0 && (
                        <Text style={styles.paymentRefundText}>
                          Refunded: {formatCurrency(refundedAmount)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {invoice.photos.length > 0 && (
          <View style={[styles.termsSection, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.attachmentsGrid}>
              {invoice.photos.map((photo) => (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <Image
                  key={photo.id}
                  src={photoDataUrls[photo.id] ?? photo.photo}
                  style={styles.attachmentImage}
                />
              ))}
            </View>
          </View>
        )}

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

        {invoice.customerNotes && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Notes</Text>
            <Text style={styles.termsText}>{invoice.customerNotes}</Text>
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

        <View style={styles.footer} wrap={false}>
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabel}>Prepared by</Text>
            <Text style={styles.footerValue}>{invoice.company.name}</Text>
            {invoice?.user && (
              <Text style={[styles.footerValue, { fontWeight: 600 }]}>
                {invoice?.user?.firstName} {invoice?.user?.lastName}
              </Text>
            )}
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
    if (!item.service && !item.labor && !item.materials?.length) return null;

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
      ? parseFloat(item.labor?.charge.toString()) * Number(item.labor?.hours)
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
    const isLaborOnly = !item.service;

    if (isLaborOnly) {
      return (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{getInvoiceItemTitle(item)}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(serviceTotal)}</Text>
          </View>
          {item.labor?.notes && (
            <Text style={styles.itemDesc}>{item.labor.notes}</Text>
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
                    <Text style={styles.lineItemText}>
                      Material - {material.name}
                    </Text>
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
              <Text style={styles.lineItemText}>Labor Cost</Text>
              <Text style={styles.lineItemText}>
                {formatCurrency(laborCost)}
              </Text>
            </View>
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
    }

    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>Service - {item.service!.name}</Text>
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
                  <Text style={styles.lineItemText}>
                    Material - {material.name}
                  </Text>
                  <Text style={styles.lineItemText}>
                    {formatCurrency(lineTotal)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.lineItem}>
          <Text style={styles.lineItemText}>
            Labor {item.labor ? `-` + item.labor.name : ""}
          </Text>
          <Text style={styles.lineItemText}>{formatCurrency(laborCost)}</Text>
        </View>
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
