import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { getUsersByRole } from "@/actions/user/getUserByRole";
import { EmployeeType } from "@prisma/client";
import { getCompanyId } from "../companyId";

// send notification for New leave request from employee
type TLeaveRequestNotification = {
  companyId?: number;
  startDate: string;
  endDate: string;
  employeeName: string;
  sendRoles?: EmployeeType[];
  employeeId: number;
};

export const sendLeaveRequestNotification = async ({
  companyId,
  startDate,
  endDate,
  employeeName,
  employeeId,
  sendRoles = ["Admin", "Manager"],
}: TLeaveRequestNotification) => {
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
    const redirectUrl = `/dashboard/employee/${employeeId}?view=performance`;
    const title = "Leave Request";
    const description = `${employeeName} has requested leave from ${startDate} to ${endDate}.`;
    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "directory",
        title,
        description,
        type: "LEAVE_REQUEST",
        redirectUrl,
      });
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Employee attempted a second clock-in on a day they already have a record for.
type TDuplicateClockInNotification = {
  companyId?: number;
  employeeId: number;
  employeeName: string;
  sendRoles?: EmployeeType[];
};

export const sendDuplicateClockInNotification = async ({
  companyId,
  employeeId,
  employeeName,
  sendRoles = ["Admin", "Manager"],
}: TDuplicateClockInNotification) => {
  try {
    const companyUniqueId = companyId || (await getCompanyId());
    const getUsers = await getUsersByRole(companyUniqueId, sendRoles, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    for (const user of getUsers) {
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: companyUniqueId,
        iconType: "directory",
        title: "Duplicate Clock In Request",
        description: `${employeeName} tried to clock in again today and needs approval.`,
        redirectUrl: `/dashboard/employee/${employeeId}?view=performance`,
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Admin/manager edited an employee's attendance times.
type TAttendanceEditedNotification = {
  companyId: number;
  employeeId: number;
  employeeName: string;
  employeeEmail?: string | null;
  employeePhone?: string | null;
  field: "clockedIn" | "clockedOut";
  newTime: string;
};

export const sendAttendanceEditedNotification = async ({
  companyId,
  employeeId,
  employeeName,
  employeeEmail,
  employeePhone,
  field,
  newTime,
}: TAttendanceEditedNotification) => {
  try {
    const label = field === "clockedIn" ? "clock in" : "clock out";

    await sendUserNotifications({
      userId: employeeId,
      userName: employeeName,
      userEmail: employeeEmail || "",
      userPhoneNo: employeePhone || "",
      companyId,
      iconType: "directory",
      title: "Attendance Updated",
      description: `Your ${label} time was updated to ${newTime}.`,
      redirectUrl: `/dashboard/employee/${employeeId}?view=performance`,
    });
  } catch (err) {
    console.error(err);
  }
};
