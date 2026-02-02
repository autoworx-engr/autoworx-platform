import { authOptions } from "@/authOptions";
import PrivateRoute from "@/components/PrivateRoute";
import { getServerSession } from "next-auth";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default async function ApiDocs() {
  const session = await getServerSession(authOptions);
  return (
    <PrivateRoute session={session}>
      <SwaggerUI url="/api/docs" />
    </PrivateRoute>
  );
}
