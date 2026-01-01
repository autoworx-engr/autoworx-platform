declare module "swagger-ui-react" {
  import * as React from "react";

  export interface SwaggerUIProps {
    url?: string;
    spec?: object;
    docExpansion?: "list" | "full" | "none";
    [key: string]: any;
  }

  const SwaggerUI: React.ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
