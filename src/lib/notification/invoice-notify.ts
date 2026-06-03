import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import { getVehicleByInvoiceId } from "@/actions/vehicle/getVehicleByInvoiceId";

// send notification for when invoice is converted
type TInvoiceConvertedNotification = {
  clientName: string;
  companyId?: number;
  invoiceId: string;
  invoiceType: "Estimate" | "Invoice";
  sendRoles?: EmployeeType[];
};

export const sendInvoiceConvertedNotification = async ({
  clientName,
  companyId,
  invoiceId,
  invoiceType,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TInvoiceConvertedNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
    });

    const vehicleInfo = await getVehicleByInvoiceId(invoiceId);
    const { make, model, year } = vehicleInfo || {};
    const vehicleName =
      make && model
        ? `${year ? year : ""} ${make} ${model}`
        : make || invoiceId;

    const redirectUrl = `/dashboard/estimate/view/${invoiceId}`;

    const description = `Estimate ${invoiceId} for ${clientName} (${vehicleName}) converted to invoice ${invoiceId}. View in Autoworx`;

    const title = "Invoice Converted";
    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName ? user.lastName : ""}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "invoice",
        title,
        description,
        type: "INVOICE_CONVERTED",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when invoice are authorize
type TInvoiceAuthorizeNotification = {
  companyId?: number;
  invoiceId: string;
  authorizedName?: string;
  clientName?: string;
  sendRoles?: EmployeeType[];
};

export const sendInvoiceAuthorizeNotification = async ({
  companyId,
  invoiceId,
  clientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TInvoiceAuthorizeNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const vehicleInfo = await getVehicleByInvoiceId(invoiceId);
    const { make, model, year } = vehicleInfo || {};
    const vehicleName =
      make && model
        ? `${year ? year : ""} ${make} ${model}`
        : make || invoiceId;

    const redirectUrl = `/dashboard/estimate/view/${invoiceId}`;
    const description = `Estimate ${invoiceId} for ${clientName} (${vehicleName}) has been approved. See it in your Autoworx dashboard`;
    const title = "Invoice Authorized";

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName ? user.lastName : ""}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "invoice",
        title,
        description,
        type: "INVOICE_AUTHORIZED",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when invoice are created
type TInvoiceCreateNotification = {
  companyId?: number;
  invoiceId: string;
  invoiceType?: "Estimate" | "Invoice";
  clientName?: string;
  sendRoles?: EmployeeType[];
};

export const sendEstimateCreateNotification = async ({
  companyId,
  invoiceId,
  clientName,
  invoiceType = "Estimate",
  sendRoles = ["Admin", "Manager", "Sales"],
}: TInvoiceCreateNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/estimate/view/${invoiceId}`;
    const description = `${invoiceType} ${invoiceId} for ${clientName} has been created. Review it in Autoworx.`;
    const title = "Estimate Created";

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "invoice",
        title,
        description,
        type: "ESTIMATE_CREATED",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

type TInvoiceDeliveredNotification = {
  companyId?: number;
  invoiceId: string;
  clientName?: string;
  sendRoles?: EmployeeType[];
};

// sent notification for when invoice is develivered
export const sendInvoiceDeliveredNotification = async ({
  companyId,
  invoiceId,
  clientName,
  sendRoles = ["Admin", "Manager"],
}: TInvoiceDeliveredNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    // update technician status to complete
    // get all company admins and managers
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const vehicleInfo = await getVehicleByInvoiceId(invoiceId);
    const { make, model, year } = vehicleInfo || {};
    const vehicleName =
      make && model
        ? `${year ? year : ""} ${make} ${model}`
        : make || invoiceId;

    const redirectUrl = `/dashboard/estimate/view/${invoiceId}`;
    const description = `Invoice ${invoiceId}${clientName ? ` for ${clientName} (${vehicleName})` : ""} has been delivered. Review it in Autoworx.`;
    const title = "Invoice Delivered";

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "invoice",
        title,
        description,
        type: "INVOICE_DELIVERY",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};
