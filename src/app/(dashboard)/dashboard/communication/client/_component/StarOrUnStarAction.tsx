"use client";
import { Star } from "lucide-react";
import React, { useTransition } from "react";

type TProps = {
  isStarred: boolean;
  clientId?: number;
  onStarChange: (
    event: React.MouseEvent<HTMLButtonElement>,
    isStarred: boolean,
    clientId: number,
  ) => void;
};

export default function StarOrUnStarAction({
  isStarred,
  clientId,
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
        <Star />
      )}
    </button>
  );
}
