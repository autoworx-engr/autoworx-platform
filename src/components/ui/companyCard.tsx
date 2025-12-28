import Image from "next/image";

export function CompanyCard({ company, rightSlot }: any) {
  return (
    <div className="flex items-start rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-indigo-300 transition">
      <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
        <Image
          src="/icons/business.png"
          alt={company.name}
          width={24}
          height={24}
        />
      </div>

      <div className="flex w-full justify-between">
        <div>
          <p className="text-lg font-medium text-gray-800">{company.name}</p>
          <div className="mt-1 space-y-0.5 text-sm text-gray-500">
            {company.website && <p>{company.website}</p>}
            {company.phone && <p>{company.phone}</p>}
            {company.address && <p>{company.address}</p>}
          </div>
        </div>

        {rightSlot}
      </div>
    </div>
  );
}
