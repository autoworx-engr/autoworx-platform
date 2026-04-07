import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export const SectionHeader = ({
  title,
  description,
  className,
  action,
}: SectionHeaderProps) => {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-0">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
