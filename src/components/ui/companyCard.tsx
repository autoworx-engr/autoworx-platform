import { Globe, MapPin, Phone } from "lucide-react";
import Image from "next/image";

export function CompanyCard({ company, rightSlot }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-150">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-indigo-100">
        <Image
          src="/icons/business.png"
          alt={company.name}
          width={20}
          height={20}
          className="opacity-70"
        />
      </div>

      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-600 truncate">
            {company.name}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {company.website && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Globe size={12} className="text-primary/60" />
                {company.website}
              </span>
            )}
            {company.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone size={12} className="text-primary/60" />
                {company.phone}
              </span>
            )}
            {company.address && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} className="text-primary/60" />
                {company.address}
              </span>
            )}
          </div>
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}
