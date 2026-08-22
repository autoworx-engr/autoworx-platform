"use client";
import { Star } from "lucide-react";
import React, { useTransition } from "react";

type TProps = {
  isStarred: boolean;
  clientId?: number;
  selected?: boolean;
  onStarChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    isStarred: boolean,
    clientId: number,
  ) => void;
};

export default function StarOrUnStarAction({
  isStarred,
  clientId,
  selected,
  onStarChange,
}: TProps) {
  const [pending, startTransaction] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={(event) =>
        startTransaction(() => onStarChange(event, isStarred, clientId!))
      }
      className="text-2xl "
      type="button"
    >
      {isStarred ? (
        <Star fill="#eab308" className="text-yellow-400" />
      ) : (
        <Star className={selected ? "text-white/80" : "text-zinc-400"} />
      )}
    </button>
  );
}
