import { ZodError } from "zod";

export default function handleZodError(error: ZodError) {
  let message = "validation error";
  const statusCode = 400;

  const errorSource = error.issues.map((issue) => {
    return {
      path: issue.path[issue.path.length - 1],
      message: issue.message,
    };
  });

  if (errorSource.length > 0) {
    message = errorSource[0].message;
  }

  return {
    message,
    statusCode,
    errorSource,
  };
}
