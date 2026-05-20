// dotenv is only needed locally; Railway injects env vars automatically
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

import "./smsAgentWorker";
