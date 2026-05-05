import { cn } from "@/lib/utils";
import { User, Users, UsersRound } from "lucide-react";
import { GiftCardPurchaseType } from "../../data/gift-card-types";

interface Props {
  selected: GiftCardPurchaseType;
  onSelect: (type: GiftCardPurchaseType) => void;
}

const options: {
  type: GiftCardPurchaseType;
  label: string;
  desc: string;
  icon: typeof User;
}[] = [
  {
    type: "individual",
    label: "Individual",
    desc: "Send one gift card to one recipient",
    icon: User,
  },
  {
    type: "multiple",
    label: "Multiple Recipients",
    desc: "Send separate cards to multiple people",
    icon: Users,
  },
  {
    type: "group",
    label: "Group Gift",
    desc: "Pool contributions for one recipient",
    icon: UsersRound,
  },
];

const PurchaseTypeSelector = ({ selected, onSelect }: Props) => (
  <div className="space-y-4">
    <div>
      <h3
        className="text-lg font-semibold tracking-tight mb-1"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Purchase Type
      </h3>
      <p className="text-sm text-muted-foreground">
        How would you like to send?
      </p>
    </div>
    <div className="grid gap-3">
      {options.map((o) => {
        const Icon = o.icon;
        const isComingSoon = o.type !== "individual";
        return (
          <button
            key={o.type}
            onClick={() => !isComingSoon && onSelect(o.type)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
              selected === o.type
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40",
              isComingSoon && "opacity-50 cursor-not-allowed",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                selected === o.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{o.label}</p>
                {isComingSoon && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default PurchaseTypeSelector;
