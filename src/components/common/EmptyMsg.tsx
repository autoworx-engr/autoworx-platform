import { Search } from "lucide-react";

export default function EmptyMsg({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Search className="mb-4 size-6 text-gray-400" />
      <h3 className="text-lg text-gray-700 md:text-[#797979]">{message}</h3>
    </div>
  );
}
