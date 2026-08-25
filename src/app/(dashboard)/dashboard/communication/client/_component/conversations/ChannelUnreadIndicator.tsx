"use client";

type TProps = {
  count?: number | null;
};

export default function ChannelUnreadIndicator({ count }: TProps) {
  const hasCount = typeof count === "number" && count > 0;

  return (
    <span className="absolute -right-0.5 -top-0.5 z-10">
      <span className="absolute -inset-0.5 animate-ping rounded-full bg-rose-400/70" />
      {hasCount ? (
        <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white/80">
          {count > 9 ? "9+" : count}
        </span>
      ) : (
        <span className="relative flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white/80" />
      )}
    </span>
  );
}
