import React from "react";
import ShortUrlRedirect from "@/app/leadurl/[url]/components/ShortUrlRedirect";

export default async function page() {
  return (
    <div>
      <ShortUrlRedirect />
    </div>
  );
}
