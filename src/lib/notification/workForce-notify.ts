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
