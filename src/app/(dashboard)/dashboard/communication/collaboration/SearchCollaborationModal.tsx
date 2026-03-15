import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import { SetStateAction, useEffect, useRef, useState } from "react";
import { Company, User } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { errorToast, successToast } from "@/lib/toast";
import { connectWithCompany } from "@/actions/settings/myNetwork";
import SearchBox from "./SearchBox";
import { searchCompanyQuery } from "@/actions/communication/collaboration/searchQuery";
import { ChevronDown, Plus } from "lucide-react";

type TProps = {
  companyAdmins: Partial<
    User & {
      isConnected: boolean;
    }
  >[];
  setCompanyAdmins: React.Dispatch<
    SetStateAction<
      Partial<
        User & {
          isConnected: boolean;
        }
      >[]
    >
  >;
  companies: (Company & { users: User[] })[];
};

export default function SearchCollaborationModal({
  companyAdmins,
  setCompanyAdmins,
  companies,
}: TProps) {
  const [open, setOpen] = useState(false);

  const [openUserList, setOpenUserList] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setOpenUserList(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event?: React.ChangeEvent<HTMLInputElement>) {
    // event && event.preventDefault();
    try {
      const inputValue = event?.target?.value || "";
      const response = await searchCompanyQuery(inputValue?.trim());
      if (response.success) {
        const updateCompanyAdmins = response.data
          .map((company) => {
            return company.users.map((user) => {
              return {
                ...user,
                companyName: company.name,
                isConnected: companies.some((c) => c.id === user.companyId),
              };
            });
          })
          .flat();
        setCompanyAdmins(updateCompanyAdmins);
      }
    } catch (err: any) {
      errorToast(err.message);
    }
  }

  useEffect(() => {
    if (inputRef?.current) {
      // inputRef.current.focus();
      handleSubmit();
    }
  }, [openUserList]);

  async function handleConnectCompany(companyId: number) {
    try {
      const result = await connectWithCompany({
        targetCompanyId: companyId,
        revalidatePathName: "/communication/collaboration",
      });
      // @ts-ignore
      setCompanyAdmins((prevAdmin) => {
        return prevAdmin.map((admin) => {
          if (admin.companyId === companyId) {
            return { ...admin, isConnected: true };
          } else {
            return admin;
          }
        });
      });
      if (result.success) {
        successToast("Connected with the company");
      } else {
        errorToast(result.message);
      }
    } catch (err: any) {
      setError(err.message);
      errorToast(err.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#005a63] active:scale-95">
          <Plus size={16} strokeWidth={2.5} />
          Search for Collaborators
        </button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg"
      >
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <h2 className="mb-4 text-xl font-bold text-slate-600">
          Search for Collaborators
        </h2>
        <div className="w-full sm:min-w-96">
          {openUserList ? (
            <>
              <div className="mb-1.5 px-1 text-sm font-semibold text-slate-600">
                Enter Company Name
              </div>
              <div className="h-fit w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:p-4">
                {/* Search box */}
                <SearchBox
                  onSearch={handleSubmit}
                  setCompanyAdmins={setCompanyAdmins}
                  companies={companies}
                  ref={inputRef}
                  setOpenUserList={setOpenUserList}
                />
                {/* user list */}
                <div className="flex h-72 flex-col items-start space-y-2 overflow-y-auto thin-scrollbar p-1">
                  {companyAdmins &&
                    companyAdmins?.length > 0 &&
                    companyAdmins.map((user) => (
                      <div
                        key={user?.id}
                        className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-white p-2 transition-colors hover:bg-slate-50 sm:flex-nowrap sm:gap-3 sm:p-2.5"
                      >
                        <Avatar
                          className="flex-shrink-0"
                          photo={user?.image}
                          width={40}
                          height={40}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-2">
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {user?.firstName} {user?.lastName}
                            </p>
                            <span className="flex-shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-[#006D77] sm:text-xs">
                              {user?.companyName}
                            </span>
                          </div>
                          <div className="flex flex-col text-[10px] text-slate-400 sm:flex-row sm:items-center sm:gap-2 sm:text-xs">
                            {user?.phone && <span>{user?.phone}</span>}
                            <span className="truncate">{user?.email}</span>
                          </div>
                        </div>
                        <div className="w-full flex-shrink-0 sm:w-auto">
                          {!user?.isConnected ? (
                            <button
                              onClick={() =>
                                handleConnectCompany(user?.companyId!)
                              }
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#006D77] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#005a63] active:scale-95 sm:w-auto"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                              <span>Invite</span>
                            </button>
                          ) : (
                            <span className="block w-full rounded-lg bg-slate-100 px-3 py-1.5 text-center text-xs font-semibold text-slate-500 sm:inline sm:w-auto sm:text-left">
                              Connected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setOpenUserList((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 transition-all hover:border-slate-300 hover:bg-white"
            >
              <span>Enter Company Name</span>
              <ChevronDown className="size-5 text-slate-400" />
            </button>
          )}
        </div>
        <DialogFooter className="flex-row-reverse gap-x-2 sm:flex-row">
          <DialogClose className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-95">
            Cancel
          </DialogClose>
          <button
            onClick={() => {
              setOpen(false);
              setOpenUserList(false);
            }}
            className="rounded-lg bg-[#6571FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#525ceb] active:scale-95"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
