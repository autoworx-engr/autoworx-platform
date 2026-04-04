import { useDebounce } from "@/hooks/useDebounce";
import { Company, User } from "@prisma/client";
import { ChevronUp, Search } from "lucide-react";
import React, { SetStateAction } from "react";

type TProps = {
  setOpenUserList: React.Dispatch<React.SetStateAction<boolean>>;
  onSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;

  setCompanyAdmins: React.Dispatch<
    SetStateAction<
      Partial<
        User & {
          isConnected: boolean;
          companyStatus?: string | null;
        }
      >[]
    >
  >;
  companies: (Company & { users: User[] })[];
};

const SearchBox = React.forwardRef(function SearchBox(
  { setOpenUserList, onSearch }: TProps,
  ref: React.Ref<HTMLInputElement>,
) {
  // const [searchText, setSearchText] = useState("");

  const onChangeInput = useDebounce(onSearch, 300);

  return (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" />
      <input
        ref={ref}
        placeholder="Search for a Company"
        onChange={onChangeInput}
        type="text"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-10 text-sm font-medium text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-[#006D77]/40 focus:bg-white focus:ring-2 focus:ring-[#006D77]/15"
      />
      <button
        type="button"
        onClick={() => setOpenUserList((prev) => !prev)}
        className="absolute right-2 flex items-center justify-center rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <ChevronUp className="size-5" />
      </button>
    </div>
  );
});

export default SearchBox;
