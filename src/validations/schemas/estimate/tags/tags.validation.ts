import { z } from "zod";

export const estimateTagsValidationSchema = z.object({
  id: z.number({
    message: "Tag id is required",
    invalid_type_error: "Tag id must be number",
  }),
  name: z
    .string({
      message: "name must be required",
      invalid_type_error: "name must be string",
    })
    .nonempty("Tag name is required"),
  textColor: z
    .string({ invalid_type_error: "Text color must be string" })
    .nullable()
    .optional(),
  bgColor: z
    .string({ invalid_type_error: "background Color must be string" })
    .nullable()
    .optional(),
  companyId: z.number({
    message: "Company id is required",
    invalid_type_error: "companyId must be number",
  }),
  createdAt: z.date({ message: "Created at is required" }),
  updatedAt: z.date({ message: "Updated at is required" }),
});
