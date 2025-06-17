"use client";

import { useRouter, useSearchParams } from "next/navigation";

const InventoryBackBtn = () => {
  const router = useRouter();
  const search = useSearchParams();

  return (
    <button
      onClick={() => {
        router.push(`/dashboard/inventory?view=${search?.get("view")}`);
      }}
      className="md:hidden "
    >
      <svg
      className="pt-2"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 6L9 12L15 18"
          stroke="#66738C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

export default InventoryBackBtn;
