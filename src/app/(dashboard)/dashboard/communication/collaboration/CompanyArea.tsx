import { cn } from "@/lib/cn";
import { Company, Message, Attachment } from "@prisma/client";
import { Session } from "next-auth";
import CollaborationEmptyBox from "./CollaborationEmptyBox";
import CompanyMessageBox from "../CompanyMessageBox";
import CompanyProfileCard from "./CompanyProfileCard";

export default function CompanyArea({
  selectedCompany,
  currentUser,
  previousMessages,
}: {
  selectedCompany: Company | null;
  currentUser: Session["user"];
  previousMessages: (Message & { attachment: Attachment[] | null })[];
}) {
  return (
    <div className="grid w-full md:h-[83vh] md:grid-cols-[1fr_380px] gap-4">
      {selectedCompany ? (
        <div>
          <CompanyMessageBox
            company={selectedCompany}
            currentUser={currentUser}
            previousMessages={previousMessages}
          />
        </div>
      ) : (
        <CollaborationEmptyBox />
      )}
      {selectedCompany && <CompanyProfileCard company={selectedCompany} />}
    </div>
  );
}
