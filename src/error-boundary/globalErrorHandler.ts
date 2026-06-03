import { ZodError } from "zod";
import handleZodError from "./handleZodErrors";
import httpStatus from "http-status";
import { AppError } from "./error";
import { TErrorHandler } from "@/types/globalError";
import { handlePrismaError } from "./handlePrismaError";
import { AxiosError } from "axios";
import { queueProductionTelegramAlert } from "./sendProductionTelegramAlert";

export type TErrorSource = {
  path: string | number;
  message: string;
};

export type TGenericErrorResponse = {
  message: string;
  statusCode: number;
  errorSource: TErrorSource[];
};

// response error handler
export const notFoundError = () => {
  const error: any = new Error("Response not found");
  error.statusCode = httpStatus.NOT_FOUND;
  return {
    message: error.message,
    statusCode: error.statusCode,
    errorSource: [],
  };
};

/** Builds the API/client error payload without side effects (no Telegram). */
export function normalizeGlobalError(error: any): TErrorHandler {
  let message: string = error?.message;
  let statusCode: number =
    error?.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let errorSource: TErrorSource[] = [
    {
      path: error?.path || "",
      message: error?.message,
    },
  ];
  // check zod error instance
  if (error instanceof ZodError) {
    const zodError = handleZodError(error);
    message = zodError.message;
    statusCode = zodError.statusCode;
    errorSource = zodError.errorSource;
  } else if (error instanceof AxiosError) {
    message = error?.response?.data?.message || error.message;
    statusCode = error?.response?.status || httpStatus.INTERNAL_SERVER_ERROR;
    errorSource = [
      {
        path: error?.response?.data?.path || "",
        message: error?.response?.data?.message || error.message,
      },
    ];
  } else if (error instanceof AppError) {
    message = error.message;
    statusCode = error.statusCode;
    errorSource = [
      {
        path: "",
        message: error.message,
      },
    ];
  } else if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    handlePrismaError(error)
  ) {
    console.error("Prisma error:", error);
    const prismaError = handlePrismaError(error);

    // Show user-friendly validation errors (4xx) in both dev and production
    // Hide only sensitive system errors (5xx) in production
    const isUserFacingError =
      prismaError?.statusCode && prismaError.statusCode < 500;

    message =
      isUserFacingError || process.env.NODE_ENV === "development"
        ? prismaError?.message!
        : "Internal server error";
    statusCode = prismaError?.statusCode || 500;
    errorSource = [];
  }
  // TODO: Future more implementation
  //   if (error.name === "ValidationError") {
  //     const mongooseValidationError = handleValidationError(error);
  //     message = mongooseValidationError.message;
  //     statusCode = mongooseValidationError.statusCode;
  //     errorSource = mongooseValidationError.errorSource;
  //   } else if (error.name === "CastError") {
  //     const castError = handleCastError(error);
  //     message = castError.message;
  //     statusCode = castError.statusCode;
  //     errorSource = castError.errorSource;
  //   } else if (error.code === 11000) {
  //     const duplicateError = handleDuplicateError(error);
  //     message = duplicateError.message;
  //     statusCode = duplicateError.statusCode;
  //     errorSource = duplicateError.errorSource;
  //   }

  // send error response to client
  console.log("Global Error Handler:", {
    message,
    statusCode,
    path: error?.path || "",
    stack: error?.stack,
  });

  return {
    success: false,
    type: "globalError",
    statusCode,
    message,
    errorSource,
    stack: process.env.NODE_ENV === "development" ? error?.stack : null,
  };
}

// global error handler
export const errorHandler = (error: any): TErrorHandler => {
  const result = normalizeGlobalError(error);
  queueProductionTelegramAlert({
    errorMessage: result.message,
    statusCode: result.statusCode ?? httpStatus.INTERNAL_SERVER_ERROR,
    stack: error?.stack ?? null,
  });
  return result;
};
