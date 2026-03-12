"use client";

export default function CompanyList({
  companies,
  onSelect,
}: {
  companies: any[];
  onSelect: (company: any) => void;
}) {
  return (
    <div className="border-r h-full overflow-y-auto bg-white">
      {companies.map((company) => (
        <div
          key={company.id}
          onClick={() => onSelect(company)}
          className="p-4 border-b cursor-pointer hover:bg-gray-50"
        >
          <p className="font-medium">{company.name}</p>
        </div>
      ))}
    </div>
  );
}
