"use client";

import { useEffect, useState } from "react";
import { avatarGradient, initials } from "@/lib/format";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Names we've already 404'd on — skip re-requesting for the rest of the session.
const noPhoto = new Set<string>();

export function AvatarBadge({
  name,
  isGroup,
  className,
}: {
  name: string;
  isGroup?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [name]);
  const tryPhoto = !isGroup && !!name && !noPhoto.has(name);
  return (
    <div
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white select-none",
        className
      )}
      style={{ background: avatarGradient(name) }}
      aria-hidden
    >
      {isGroup ? <Users className="size-5" /> : initials(name)}
      {tryPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={name}
          src={`/api/avatar?name=${encodeURIComponent(name)}`}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            noPhoto.add(name);
            setLoaded(false);
          }}
          className={cn(
            "absolute inset-0 size-full object-cover",
            !loaded && "opacity-0"
          )}
        />
      )}
    </div>
  );
}
