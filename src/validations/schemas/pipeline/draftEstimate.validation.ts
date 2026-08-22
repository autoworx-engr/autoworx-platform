import { z } from "zod";
export const createDraftEstimateValidationSchema = z.object({
  id: z.string({
    required_error: "Invoice Id must be required",
    message: "Invoice Id must be a string",
  }),
  userId: z.number().int("User Id must be an integer").nonnegative(),
  companyId: z.number().int("Company Id must be an integer").nonnegative(),
  leadId: z
    .number()
    .int("Lead Id must be an integer")
    .nonnegative()
    .optional()
    .nullable(),
  vehicleId: z
    .number({
      required_error: "Vehicle Id must be required",
      message: "Vehicle Id must be a number",
    })
    .optional()
    .nullable(),
  clientId: z
    .number({
      required_error: "Client Id must be required",
      message: "Client Id must be a number",
    })
    .optional(),
  type: z.enum(["Estimate", "Invoice"], {
    message: "Type must be either Estimate or Invoice",
  }),
});

export type TCreateDraftEstimateValidationSchema = z.infer<
  typeof createDraftEstimateValidationSchema
>;
