// Import each handler file so its registerTool() call fires at module load time.
// The registry is populated as a side-effect of these imports.
import "./handlers/getRevenueSummary";
import "./handlers/getPaymentsSummary";
import "./handlers/getClientByName";
import "./handlers/getVehicleByClient";
import "./handlers/getInventoryItemByName";
import "./handlers/getEstimateByNumber";
import "./handlers/getAppointmentsForDateRange";
import "./handlers/getTasksForUser";
import "./handlers/createLeadTool";
import "./handlers/updateLeadTool";
import "./handlers/createAppointmentTool";
import "./handlers/updateAppointmentTool";
import "./handlers/createTaskTool";
import "./handlers/updateTaskTool";

export { toolsForAnthropic, allTools, getTool } from "./registry";
export type { ToolContext, ToolResult, ToolDefinition } from "./registry";
export { executeTool } from "./dispatcher";
