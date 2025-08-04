"use client";

import { starUnstarClient } from "@/actions/communication/client/starUnstarClient";
import { Client } from "@prisma/client";
import React, { useState, useTransition } from "react";
import { MdOutlineStar, MdOutlineStarBorder } from "react-icons/md";

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
      className="text-2xl text-yellow-500 disabled:text-gray-600"
      type="button"
    >
      {isStarred ? <MdOutlineStar /> : <MdOutlineStarBorder />}
    </button>
  );
}
