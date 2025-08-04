import React from "react";

import { getCompanyId } from "@/lib/companyId";
import ShortUrlRedirect from "./components/ShortUrlRedirect";

export default async function page() {
  const companyId = await getCompanyId();
  return (
    <div>
      <ShortUrlRedirect companyId={companyId} />
    </div>
  );
}
