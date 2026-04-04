import { Company, Attachment, CollaborationMessage } from "@prisma/client";
import { Session } from "next-auth";
import CollaborationEmptyBox from "./CollaborationEmptyBox";
import CompanyMessageBox from "../CompanyMessageBox";
import CompanyProfileCard from "./CompanyProfileCard";
import { useSession } from "next-auth/react";

export default function CompanyArea({
  selectedCompany,
  currentUser,
  previousMessages,
  setSelectedCompany,
}: {
  selectedCompany: Company | null;
  currentUser: Session["user"];
  previousMessages: (CollaborationMessage & {
    attachment: Attachment[] | null;
  })[];
  setSelectedCompany?: React.Dispatch<React.SetStateAction<Company | null>>;
}) {
  const { data: session } = useSession();
  const currentCompanyId = session?.user?.companyId;

  return (
    <div
      className={` w-full ${!setSelectedCompany ? "grid md:h-[83vh] md:grid-cols-[1fr_350px] gap-4" : "h-full"}`}
    >
      {selectedCompany ? (
        <div>
          <CompanyMessageBox
            company={selectedCompany}
            currentUser={currentUser}
            previousMessages={previousMessages}
            {...(setSelectedCompany && {
              onBack: () => setSelectedCompany(null),
            })}
          />
        </div>
      ) : (
        <div className="col-span-2">
          <CollaborationEmptyBox />
        </div>
      )}
      {selectedCompany && !setSelectedCompany && (
        <CompanyProfileCard
          companyId={selectedCompany?.id}
          currentCompanyId={currentCompanyId!}
          userId={Number(currentUser?.id!)}
        />
      )}
    </div>
  );
}
