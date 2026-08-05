import { avatarGradient, initials } from "@/lib/format";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvatarBadge({
  name,
  isGroup,
  className,
}: {
  name: string;
  isGroup?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white select-none",
        className
      )}
      style={{ background: avatarGradient(name) }}
      aria-hidden
    >
      {isGroup ? <Users className="size-5" /> : initials(name)}
    </div>
  );
}
