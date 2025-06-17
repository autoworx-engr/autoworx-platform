import EmployeeWorkInformation from "@/app/(dashboard)/dashboard/employee/components/EmployeeWorkInformation";
import { EmployeeWorkInfo } from "@/app/(dashboard)/dashboard/employee/components/employeeWorkInfoType";
import { User } from "@prisma/client";

export default function TechnicianDetails({
  info,
  employee,
}: {
  info: EmployeeWorkInfo;
  employee: User;
}) {
  return (
    <div className="mt-5 flex h-full w-full flex-col">
      <h2 className="text-xl font-bold">Technician Details</h2>
      <EmployeeWorkInformation info={info} employee={employee} salesInfo={[]} />
    </div>
  );
}
