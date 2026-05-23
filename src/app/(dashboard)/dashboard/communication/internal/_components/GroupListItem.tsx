import Avatar from "@/components/Avatar";
import { cn } from "@/lib/cn";
import { Group, User } from "@prisma/client";
import { Users } from "lucide-react";

type TGroup = Group & { users: User[] };

const MAX_VISIBLE_AVATARS = 1;

export function GroupListItem({
  group,
  isSelectedGroup,
  onClick,
}: {
  group: TGroup;
  isSelectedGroup: boolean;
  onClick: () => void;
}) {
  const memberCount = group.users.length;
  const visibleUsers = group.users.slice(0, MAX_VISIBLE_AVATARS);
  const extra = Math.max(0, memberCount - MAX_VISIBLE_AVATARS);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl p-3 text-left",
        "border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        isSelectedGroup
          ? "border-transparent bg-gradient-to-r from-teal-700 to-teal-600 ring-1 ring-teal-500/60"
          : "border-zinc-200/70 bg-white hover:border-zinc-300/80 dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-white/20",
      )}
    >
      <div className="relative flex shrink-0 items-center">
        {memberCount === 0 ? (
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isSelectedGroup
                ? "bg-white/20 text-white"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
            )}
          >
            <Users className="h-5 w-5" />
          </div>
        ) : (
          <div className="flex">
            {visibleUsers.map((user, idx) => (
              <div
                key={user.id}
                className={cn(
                  "rounded-full ring-2",
                  isSelectedGroup
                    ? "ring-teal-600"
                    : "ring-white dark:ring-zinc-900",
                  idx > 0 && "-ml-3",
                )}
                style={{ zIndex: MAX_VISIBLE_AVATARS - idx }}
              >
                <Avatar photo={user.image} width={36} height={36} />
              </div>
            ))}
            {extra > 0 && (
              <div
                className={cn(
                  "-ml-3 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold ring-2",
                  isSelectedGroup
                    ? "bg-teal-800 text-white ring-teal-600"
                    : "bg-zinc-200 text-zinc-700 ring-white dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-900",
                )}
              >
                +{extra}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isSelectedGroup ? "text-white" : "text-zinc-800 dark:text-zinc-100",
          )}
        >
          {group?.name}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            isSelectedGroup
              ? "text-white/80"
              : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>
    </button>
  );
}
