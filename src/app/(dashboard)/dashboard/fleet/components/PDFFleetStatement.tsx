// components/pdf/PDFFleetStatement.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Link,
} from "@react-pdf/renderer";
import moment from "moment";
import { formatCurrency } from "@/utils/formatCurrency";

// Register Poppins fonts (same as invoice)
Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Regular.ttf",
  fontWeight: "normal",
});

Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Bold.ttf",
  fontWeight: "bold",
});

Font.register({
  family: "Poppins",
  src: "/fonts/Poppins-Medium.ttf",
  fontWeight: 500,
});

Font.registerHyphenationCallback((word) => [word]);

// Dummy props interface – customize as needed
interface FleetData {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  price: string;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
  other?: string;
}

// Due/payment emphasis: red while a balance remains outstanding, brand
// indigo once it's settled — used for both the "Due" and "Payment" columns.
const dueEmphasisColor = (dueAmount: number) =>
  dueAmount > 0 ? "#DC2626" : "#6571FF";

interface CompanyDetails {
  name: string;
  image?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  terms?: string;
  policy?: string;
}

interface FleetCustomer {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
}

interface User {
  name: string;
}

interface PDFFleetStatementProps {
  fleetData: FleetData[];
  companyDetails: CompanyDetails;
  fleetCustomer: FleetCustomer;
  user: User;
  fleetName: string;
  contactName: string;
  totalAmount: string;
  date: string;
  authorizedName?: string;
  paymentLink?: string;
  terms?: string;
  policy?: string;
}

const styles = StyleSheet.create({
  regular: {
    fontFamily: "Poppins",
  },
  bold: {
    fontFamily: "Poppins",
    fontWeight: "bold",
  },
  medium: {
    fontFamily: "Poppins",
    fontWeight: 500,
  },
  page: {
    padding: 20,
    fontFamily: "Poppins",
    color: "#64748b",
  },
  fontSize10: {
    fontSize: 10,
  },

  // Header styles (same as invoice)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logo: {
    // width: 90,
    // height: 90,
  },
  textRight: {
    textAlign: "right",
    fontSize: 10,
  },
  boldText: {
    fontWeight: "bold",
  },

  // Main section styles
  section: {
    marginBottom: 20,
    marginTop: 20,
  },
  mainSection: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    fontSize: 10,
    marginTop: 20,
  },

  // Fleet table styles
  tableContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#6571FF",
    borderRadius: 4,
    paddingVertical: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    marginBottom: 1,
  },
  tableRowEven: {
    backgroundColor: "#EEF4FF",
  },

  // Table cells
  cellInvoice: {
    width: "12%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellYear: {
    width: "5%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellMake: {
    width: "9%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellModel: {
    width: "9%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellVin: {
    width: "10%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellPrice: {
    width: "9%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellPaid: {
    width: "9%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellDue: {
    width: "9%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellStatus: {
    width: "14%",
    paddingHorizontal: 4,
    fontSize: 9,
  },
  cellPaymentStatus: {
    width: "14%",
    paddingHorizontal: 4,
    fontSize: 9,
  },

  headerText: {
    fontWeight: "bold",
    color: "#66738C",
    fontSize: 9,
  },
  dataText: {
    color: "#66738C",
    fontSize: 9,
  },
  invoiceIdText: {
    color: "#6571FF",
    fontWeight: "500",
    fontSize: 9,
  },

  // Total section (same style as invoice)
  totalContainer: {
    marginTop: 10,
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
    paddingLeft: 4,
    textTransform: "uppercase",
    fontSize: 10,
  },
  totalValue: {
    backgroundColor: "#6571FF",
    color: "white",
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 10,
  },

  // Terms styles (same as invoice)
  terms: {
    marginTop: 20,
    fontSize: 10,
  },

  // Footer styles (same as invoice)
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  link: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#6571ff",
    padding: "4px 16px",
    fontSize: 12,
    color: "#6571ff",
    textDecoration: "none",
  },

  thankYou: {
    textAlign: "center",
    marginTop: "auto",
    fontSize: 10,
  },
});

export const PDFFleetStatement = ({
  fleetData,
  companyDetails,
  fleetCustomer,
  user,
  fleetName,
  contactName,
  totalAmount,
  date,
  authorizedName,
  paymentLink,
  terms,
  policy,
}: PDFFleetStatementProps) => (
  <Document>
    <Page size="A4" style={[styles.page, styles.regular]}>
      {/* Header Section - Same as Invoice */}
      <View style={styles.header}>
        <View style={styles.logo}>
          {companyDetails?.image && (
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

      {/* Main Section - Fleet Statement Content */}
      <View style={styles.section}>
        <Text style={[styles.boldText, { fontSize: 20 }]}>Fleet Statement</Text>
        <View style={styles.mainSection}>
          <View>
            <Text style={[styles.boldText, { marginBottom: 2 }]}>
              Estimate To:
            </Text>
            <Text style={styles.fontSize10}>{fleetName}</Text>
            <Text style={styles.fontSize10}>{contactName}</Text>
            <Text style={styles.fontSize10}>{fleetCustomer?.mobile}</Text>
            <Text style={styles.fontSize10}>{fleetCustomer?.email}</Text>
          </View>

          <View>
            <Text style={[styles.boldText, { marginBottom: 2 }]}>
              Statement Details:
            </Text>
            <Text style={styles.fontSize10}>{date}</Text>
            <Text style={styles.fontSize10}>Fleet Statement</Text>
          </View>

          <View style={styles.totalContainer}>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>{totalAmount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Fleet Table */}
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={styles.cellInvoice}>
            <Text style={styles.headerText}>Invoice#</Text>
          </View>
          <View style={styles.cellYear}>
            <Text style={styles.headerText}>Year</Text>
          </View>
          <View style={styles.cellMake}>
            <Text style={styles.headerText}>Make</Text>
          </View>
          <View style={styles.cellModel}>
            <Text style={styles.headerText}>Model</Text>
          </View>
          <View style={styles.cellVin}>
            <Text style={styles.headerText}>VIN</Text>
          </View>
          <View style={styles.cellPrice}>
            <Text style={styles.headerText}>Amount</Text>
          </View>
          <View style={styles.cellPaid}>
            <Text style={styles.headerText}>Paid</Text>
          </View>
          <View style={styles.cellDue}>
            <Text style={styles.headerText}>Due</Text>
          </View>
          <View style={styles.cellStatus}>
            <Text style={styles.headerText}>Invoice Status</Text>
          </View>
          <View style={styles.cellPaymentStatus}>
            <Text style={styles.headerText}>Payment</Text>
          </View>
        </View>

        {/* Table Rows */}
        {fleetData.map((vehicle, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              ...(index % 2 === 1 ? [styles.tableRowEven] : []),
            ]}
          >
            <View style={styles.cellInvoice}>
              <Text style={styles.invoiceIdText}>{vehicle.id}</Text>
            </View>
            <View style={styles.cellYear}>
              <Text style={styles.dataText}>{vehicle.year || ""}</Text>
            </View>
            <View style={styles.cellMake}>
              <Text style={styles.dataText}>{vehicle.make}</Text>
            </View>
            <View style={styles.cellModel}>
              <Text style={styles.dataText}>{vehicle.model}</Text>
            </View>
            {vehicle.other !== "N/A" && (
              <View style={styles.cellModel}>
                <Text style={styles.dataText}>{vehicle.other}</Text>
              </View>
            )}
            <View style={styles.cellVin}>
              <Text style={[styles.dataText, { fontSize: 7 }]}>
                {vehicle.vin}
              </Text>
            </View>
            <View style={styles.cellPrice}>
              <Text style={styles.dataText}>{vehicle.price}</Text>
            </View>
            <View style={styles.cellPaid}>
              <Text style={styles.dataText}>
                {formatCurrency(vehicle.paidAmount)}
              </Text>
            </View>
            <View style={styles.cellDue}>
              <Text
                style={[
                  styles.dataText,
                  {
                    fontWeight: "bold",
                    color: dueEmphasisColor(vehicle.dueAmount),
                  },
                ]}
              >
                {formatCurrency(vehicle.dueAmount)}
              </Text>
            </View>
            <View style={styles.cellStatus}>
              <Text style={styles.dataText}>{vehicle.status}</Text>
            </View>
            <View style={styles.cellPaymentStatus}>
              <Text
                style={[
                  styles.dataText,
                  {
                    fontWeight: "bold",
                    color: dueEmphasisColor(vehicle.dueAmount),
                  },
                ]}
              >
                {vehicle.paymentStatus}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Terms & Conditions - Same as Invoice */}
      {/* {(terms || companyDetails?.terms) && (
        <View style={styles.terms}>
          <Text style={styles.boldText}>Terms & Conditions:</Text>
          <Text>{terms || companyDetails?.terms}</Text>
        </View>
      )} */}

      {/* Policy & Conditions - Same as Invoice */}
      {/* {(policy || companyDetails?.policy) && (
        <View style={styles.terms}>
          <Text style={styles.boldText}>Policy & Conditions:</Text>
          <Text>{policy || companyDetails?.policy}</Text>
        </View>
      )} */}

      {/* Footer Section - Same as Invoice */}
      <View style={styles.footerSection}>
        <View style={{ marginTop: 20 }}>
          <Text
            style={[styles.boldText, styles.fontSize10, { marginBottom: 2 }]}
          >
            {companyDetails?.name}
          </Text>
          <Text style={styles.fontSize10}>{user?.name}</Text>
        </View>

        {/* {authorizedName && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.boldText, styles.fontSize10]}>
              {authorizedName}
            </Text>
            <Text
              style={[
                styles.fontSize10,
                {
                  color: "#6571FF",
                  padding: "4px 2px",
                },
              ]}
            >
              Authorized
            </Text>
          </View>
        )} */}

        {/* {paymentLink && (
          <View style={{ marginTop: 20 }}>
            <Link src={paymentLink} style={styles.link}>
              Make Payment
            </Link>
          </View>
        )} */}
      </View>

      <Text style={styles.thankYou}>Thank you for shopping with Autoworx</Text>
    </Page>
  </Document>
);
