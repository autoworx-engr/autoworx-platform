import {
  DollarSign,
  FileText,
  Image as ImageIcon,
  Send,
  ShieldCheck,
  Tag,
} from "lucide-react";

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-4 animate-pulse rounded bg-gray-200 ${className}`} />
  );
}

function SectionSkeleton({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-gray-300" />
        <h2 className="text-xl font-bold text-gray-300">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-gray-300">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function GiftCardsTabSkeleton() {
  return (
    <>
      <SectionSkeleton
        icon={ImageIcon}
        title="Gift Card Designs"
        subtitle="Manage gift card templates visible to customers"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1.5fr,auto]">
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-10 w-full" />
            </div>
            <div className="flex items-end">
              <SkeletonLine className="h-10 w-28" />
            </div>
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`template-skeleton-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-4">
                <SkeletonLine className="h-12 w-16" />
                <SkeletonLine className="h-4 w-36" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-6 w-24" />
                <SkeletonLine className="h-6 w-11" />
              </div>
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton
        icon={DollarSign}
        title="Amount Presets"
        subtitle="Configure preset amounts and custom range"
      >
        <div className="space-y-4">
          <SkeletonLine className="h-8 w-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
          </div>
          <SkeletonLine className="h-8 w-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
          </div>
        </div>
      </SectionSkeleton>

      <SectionSkeleton
        icon={Send}
        title="Delivery Options"
        subtitle="Configure how gift cards can be delivered"
      >
        <div className="space-y-4">
          <SkeletonLine className="h-8 w-full" />
          <SkeletonLine className="h-8 w-full" />
          <SkeletonLine className="h-10 w-full" />
          <SkeletonLine className="h-8 w-full" />
        </div>
      </SectionSkeleton>

      <SectionSkeleton
        icon={Tag}
        title="Discount Codes"
        subtitle="Create and manage gift card promo codes"
      >
        <div className="space-y-3">
          <SkeletonLine className="h-10 w-28" />
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`promo-skeleton-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-36" />
                <SkeletonLine className="h-3 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-5 w-5" />
                <SkeletonLine className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      </SectionSkeleton>

      <SectionSkeleton
        icon={FileText}
        title="Policies & Links"
        subtitle="URLs shown at checkout"
      >
        <div className="space-y-4">
          <SkeletonLine className="h-10 w-full" />
          <SkeletonLine className="h-10 w-full" />
        </div>
      </SectionSkeleton>

      <SectionSkeleton icon={ShieldCheck} title="Expiration Policy" subtitle="">
        <SkeletonLine className="h-12 w-full" />
      </SectionSkeleton>

      <div className="flex justify-end">
        <SkeletonLine className="h-10 w-32" />
      </div>
    </>
  );
}
