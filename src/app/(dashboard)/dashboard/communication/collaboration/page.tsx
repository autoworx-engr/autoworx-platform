import { getCompany } from "@/actions/settings/getCompany";
import { getUserPermissions } from "@/actions/settings/teamManagement";
import { authOptions } from "@/authOptions";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Collaboration from "./Collaboration";

export const metadata: Metadata = {
  title: "Communication Hub - Collaboration",
};

export default async function CollaborationPage() {
  const session = await getServerSession(authOptions);
  const userCompanyId = session?.user?.companyId;

  const company = await getCompany();

  if (!userCompanyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const connectedCompanies = await db.companyJoin.findMany({
    where: {
      OR: [
        {
          companyOneId: userCompanyId,
          companyTwo: {
            isCollaborators: true,
          },
        },
        {
          companyTwoId: userCompanyId,
          companyOne: {
            isCollaborators: true,
          },
        },
      ],
      status: "ACCEPTED",
    },
    include: {
      companyOne: {
        include: {
          users: {
            where: {
              employeeType: {
                in: ["Admin", "Manager", "Sales"],
              },
            },
          },
        },
      },
      companyTwo: {
        include: {
          users: {
            where: {
              employeeType: {
                in: ["Admin", "Manager", "Sales"],
              },
            },
          },
        },
      },
    },
  });

  const oppositeCompanies = connectedCompanies.map((join) => {
    if (join.companyOneId === userCompanyId) {
      return join.companyTwo;
    } else {
      return join.companyOne;
    }
  });

  console.log("=== STARTING FILTER PROCESS ===");
  console.log("Current User Company ID:", userCompanyId);
  console.log("Total companies to check:", oppositeCompanies.length);

  // Filter users in oppositeCompanies based on their collaboration permissions
  const filteredOppositeCompanies = await Promise.all(
    oppositeCompanies.map(async (company) => {
      console.log(`\n--- Company: ${company.name} (ID: ${company.id}) ---`);
      console.log(`Total users in company: ${company.users.length}`);

      // Filter users who have collaboration permission
      const filteredUsers = await Promise.all(
        company.users.map(async (user) => {
          console.log(`\nChecking user: ${user.firstName} ${user.lastName}`);
          console.log(`  User ID: ${user.id}`);
          console.log(`  Employee Type: ${user.employeeType}`);

          try {
            const permissions = await getUserPermissions(
              user.id,
              user.employeeType
            );
            console.log(
              `  Full permissions object:`,
              JSON.stringify(permissions, null, 2)
            );
            console.log(
              `  permissions.communicationHubCollaboration value:`,
              permissions?.communicationHubCollaboration
            );

            // Check communicationHubCollaboration permission
            const hasCollaboration =
              permissions?.communicationHubCollaboration === true;
            console.log(`  Final hasCollaboration result: ${hasCollaboration}`);

            if (hasCollaboration) {
              console.log(`  ✓ User ${user.firstName} INCLUDED`);
            } else {
              console.log(`  ✗ User ${user.firstName} EXCLUDED`);
            }

            return hasCollaboration ? user : null;
          } catch (error) {
            console.error(`  ERROR for user ${user.firstName}:`, error);
            return null;
          }
        })
      );

      const filtered = filteredUsers.filter((user) => user !== null);
      console.log(
        `\nCompany ${company.name} result: ${filtered.length}/${company.users.length} users have collaboration access`
      );

      return {
        ...company,
        users: filtered,
      };
    })
  );

  // Remove companies that have no users with collaboration permission
  const finalCompanies = filteredOppositeCompanies.filter(
    (company) => company.users.length > 0
  );

  console.log("\n=== FINAL COMPANIES RESULT ===");
  console.log(`Companies with users: ${finalCompanies.length}`);
  finalCompanies.forEach((company) => {
    console.log(`  ${company.name}: ${company.users.length} users`);
    company.users.forEach((user) => {
      console.log(`    - ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    });
  });

  const messages = await db.message.findMany({
    where: {
      OR: [
        {
          from: parseInt(session?.user?.id),
        },
        {
          to: parseInt(session?.user?.id),
        },
      ],
    },
    include: {
      attachment: true,
    },
  });

  const companyWithAdmin = await db.company.findMany({
    where: {
      NOT: { id: userCompanyId },
      isCollaborators: true,
    },
    select: {
      id: true,
      name: true,
      users: {
        where: { employeeType: "Admin" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyId: true,
          email: true,
          role: true,
          image: true,
          employeeType: true,
        },
      },
    },
  });

  console.log("\n=== FILTERING COMPANY ADMINS ===");
  console.log("Total companies with admins:", companyWithAdmin.length);

  // Filter admins based on collaboration permission
  const filteredCompanyWithAdminPromises = companyWithAdmin.map(
    async (company) => {
      console.log(`\nFiltering admins for company: ${company.name}`);
      const filteredAdmins = await Promise.all(
        company.users.map(async (user) => {
          console.log(`  Checking admin: ${user.firstName} (ID: ${user.id})`);
          try {
            const permissions = await getUserPermissions(
              user.id,
              user.employeeType
            );
            console.log(
              `    communicationHubCollaboration:`,
              permissions?.communicationHubCollaboration
            );

            // Check communicationHubCollaboration permission
            const hasCollaboration =
              permissions?.communicationHubCollaboration === true;

            if (hasCollaboration) {
              console.log(`    ✓ Admin ${user.firstName} INCLUDED`);
            } else {
              console.log(`    ✗ Admin ${user.firstName} EXCLUDED`);
            }

            return hasCollaboration
              ? {
                  ...user,
                  companyName: company.name,
                  isConnected: finalCompanies.some(
                    (c) => c.id === user.companyId
                  ),
                }
              : null;
          } catch (error) {
            console.error(
              `    ERROR checking permissions for admin ${user.id}:`,
              error
            );
            return null;
          }
        })
      );
      return filteredAdmins.filter((user) => user !== null);
    }
  );

  const filteredCompanyWithAdmin = (
    await Promise.all(filteredCompanyWithAdminPromises)
  ).flat();

  console.log("\n=== FINAL ADMINS RESULT ===");
  console.log(
    `Total admins with collaboration access: ${filteredCompanyWithAdmin.length}`
  );
  filteredCompanyWithAdmin.forEach((admin) => {
    console.log(
      `  ${admin.firstName} ${admin.lastName} from ${admin.companyName} (ID: ${admin.id})`
    );
  });

  console.log("\n=== DATA BEING PASSED TO COLLABORATION COMPONENT ===");
  console.log("finalCompanies count:", finalCompanies.length);
  console.log(
    "filteredCompanyWithAdmin count:",
    filteredCompanyWithAdmin.length
  );

  return (
    <div>
      <Title className="hidden sm:block">
        Communication Hub - Collaboration
      </Title>
      <Collaboration
        companyWithAdmin={filteredCompanyWithAdmin}
        companies={finalCompanies}
        currentUser={session?.user}
        messages={messages}
        isCollaborators={company?.isCollaborators}
      />
    </div>
  );
}




// import { authOptions } from "@/authOptions";
// import Title from "@/components/Title";
// import { db } from "@/lib/db";
// import { Metadata } from "next";
// import { getServerSession } from "next-auth";
// import Collaboration from "./Collaboration";
// import { getCompany } from "@/actions/settings/getCompany";

// export const metadata: Metadata = {
//   title: "Communication Hub - Collaboration",
// };

// export default async function CollaborationPage() {
//   const session = await getServerSession(authOptions);
//   const userCompanyId = session?.user?.companyId;

//   const company = await getCompany();

//   if (!userCompanyId) {
//     throw new Error("Company ID is required to create an email template.");
//   }

//   const connectedCompanies = await db.companyJoin.findMany({
//     where: {
//       OR: [
//         {
//           companyOneId: userCompanyId,
//           companyTwo: {
//             isCollaborators: true,
//           },
//         },
//         {
//           companyTwoId: userCompanyId,
//           companyOne: {
//             isCollaborators: true,
//           },
//         },
//       ],
//       status: "ACCEPTED",
//     },
//     include: {
//       companyOne: {
//         include: {
//           users: {
//             where: {
//               employeeType: {
//                 in: ["Admin", "Manager", "Sales"],
//               },
//             },
//           },
//         },
//       },
//       companyTwo: {
//         include: {
//           users: {
//             where: {
//               employeeType: {
//                 in: ["Admin", "Manager", "Sales"],
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   const oppositeCompanies = connectedCompanies.map((join) => {
//     if (join.companyOneId === userCompanyId) {
//       return join.companyTwo;
//     } else {
//       return join.companyOne;
//     }
//   });

//   const messages = await db.message.findMany({
//     where: {
//       OR: [
//         {
//           from: parseInt(session?.user?.id),
//         },
//         {
//           to: parseInt(session?.user?.id),
//         },
//       ],
//     },
//     include: {
//       attachment: true,
//     },
//   });

//   const companyWithAdmin = await db.company.findMany({
//     where: {
//       NOT: { id: userCompanyId },
//       isCollaborators: true,
//     },
//     select: {
//       id: true,
//       name: true,
//       users: {
//         where: { employeeType: "Admin" },
//         select: {
//           firstName: true,
//           lastName: true,
//           companyId: true,
//           email: true,
//           role: true,
//           image: true,
//         },
//       },
//     },
//   });

//   const filteredCompanyWithAdmin = companyWithAdmin
//     .map((company) => {
//       return company.users.map((user) => {
//         return {
//           ...user,
//           companyName: company.name,
//           isConnected: oppositeCompanies.some((c) => c.id === user.companyId),
//         };
//       });
//     })
//     .flat();

//   return (
//     <div>
//       <Title className="hidden sm:block">
//         Communication Hub - Collaboration
//       </Title>
//       <Collaboration
//         companyWithAdmin={filteredCompanyWithAdmin}
//         companies={oppositeCompanies}
//         currentUser={session?.user}
//         messages={messages}
//         isCollaborators={company?.isCollaborators}
//       />
//     </div>
//   );
// }
