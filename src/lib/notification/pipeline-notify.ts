import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";
import getUser from "../getUser";

// send notification for when new lead comes in
type TNewLeadNotification = {
  companyId?: number;
  leadClientName: string;
  sendRoles?: EmployeeType[];
};
export const sendNewLeadNotification = async ({
  companyId,
  leadClientName,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TNewLeadNotification) => {
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

    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;
    const description = `A new leads for ${leadClientName} added to your pipeline. View in Autoworx`;
    const title = "New Lead Added";
    await Promise.all(
      getUsers.map((user) =>
        sendUserNotifications({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email || "",
          userPhoneNo: user.phone || "",
          iconType: "pipelines",
          companyId: companyUniqueId,
          title,
          description,
          type: "LEADS_GENERATED",
          redirectUrl,
        }),
      ),
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when lead is assigned to employee
type TLeadAssignNotification = {
  companyId?: number;
  leadClientName: string;
  assignedEmployeeId: number;
  sendRoles?: EmployeeType[];
};

export const sendLeadAssignNotification = async ({
  companyId,
  leadClientName,
  assignedEmployeeId,
  sendRoles = ["Admin", "Manager"],
}: TLeadAssignNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const employeeUser = await getUser(assignedEmployeeId);
    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;
    const description = `New lead "${leadClientName}" assigned to ${employeeUser.firstName} ${employeeUser.lastName}. View in Autoworx.`;
    const title = "Lead Assigned";
    await Promise.all(
      getUsers.map((user) =>
        sendUserNotifications({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email || "",
          userPhoneNo: user.phone || "",
          iconType: "pipelines",
          companyId: companyUniqueId,
          title,
          description,
          type: "LEADS_ASSIGNED",
          redirectUrl,
        }),
      ),
    );

    // send notification to assigned employee
    await sendUserNotifications({
      userId: assignedEmployeeId,
      userName: `${employeeUser.firstName} ${employeeUser.lastName}`,
      userEmail: employeeUser.email || "",
      userPhoneNo: employeeUser.phone || "",
      companyId: companyUniqueId,
      iconType: "pipelines",
      title,
      description,
      type: "LEADS_ASSIGNED",
      redirectUrl,
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// send notification for when lead change to another column
type TLeadStageChangeNotification = {
  companyId?: number;
  title: string;
  description: string;
  notificationType: "STAGE" | "LEADS_CLOSED";
  sendRoles?: EmployeeType[];
};

export const sendLeadStageChangeOrCloseNotification = async ({
  companyId,
  description,
  title,
  notificationType,
  sendRoles = ["Admin", "Manager", "Sales"],
}: TLeadStageChangeNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());

    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    const redirectUrl = `/dashboard/pipeline/sales/pipeline`;

    await Promise.all(
      getUsers.map((user) =>
        sendUserNotifications({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email || "",
          userPhoneNo: user.phone || "",
          companyId: companyUniqueId,
          iconType: "pipelines",
          title,
          description,
          type: notificationType,
          redirectUrl,
        }),
      ),
    );
  } catch (err) {
    console.log({ err });
    throw err;
  }
};
