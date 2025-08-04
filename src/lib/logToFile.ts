// lib/logToFile.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const logToFile = (logData: any) => {
  const logsDir = path.join(process.cwd(), "logs");
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const logPath = path.join(logsDir, "logFile.json");

  let logs: any[] = [];
  if (existsSync(logPath)) {
    try {
      logs = JSON.parse(readFileSync(logPath, "utf8"));
    } catch (err) {
      console.error("Error reading log file:", err);
    }
  }

  logs.push({
    timestamp: new Date().toISOString(),
    data: logData,
  });

  writeFileSync(logPath, JSON.stringify(logs, null, 2), "utf8");
};
