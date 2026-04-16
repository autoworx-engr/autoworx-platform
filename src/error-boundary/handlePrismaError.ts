import { Prisma } from "@prisma/client";
import httpStatus from "http-status";

export function handlePrismaError(
  error:
    | Prisma.PrismaClientKnownRequestError
    | Prisma.PrismaClientValidationError
    | Prisma.PrismaClientUnknownRequestError
    | Prisma.PrismaClientRustPanicError
    | Prisma.PrismaClientInitializationError,
): { statusCode: number; message: string } | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === "P2002") {
      const target = error.meta?.target as string[] | string;
      let field = "";

      if (Array.isArray(target)) {
        field = target[0];
      } else if (typeof target === "string") {
        field = target;
      }

      // Provide specific error messages for common fields
      if (
        field === "email" ||
        (Array.isArray(target) && target.includes("email"))
      ) {
        return {
          statusCode: httpStatus.CONFLICT,
          message:
            "Email already exists. Please use a different email address.",
        };
      } else if (
        field === "phone" ||
        (Array.isArray(target) && target.includes("phone"))
      ) {
        return {
          statusCode: httpStatus.CONFLICT,
          message:
            "Phone number already exists. Please use a different phone number.",
        };
      } else {
        return {
          statusCode: httpStatus.CONFLICT,
          message: `Duplicate value for ${field || "field"}. Please use a different value.`,
        };
      }
    }

    // Record not found
    if (error.code === "P2025") {
      return {
        statusCode: httpStatus.NOT_FOUND,
        message: "Record not found",
      };
    }

    // Foreign key constraint failed
    if (error.code === "P2003") {
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Invalid relation",
      };
    }

    // Transaction timeout
    if (error.code === "P2024") {
      return {
        statusCode: httpStatus.REQUEST_TIMEOUT,
        message: "Transaction timeout. Please try again.",
      };
    }

    // Connection timeout
    if (error.code === "P1008") {
      return {
        statusCode: httpStatus.REQUEST_TIMEOUT,
        message: "Database connection timeout. Please try again.",
      };
    }

    // Database connection error
    if (error.code === "P1001") {
      return {
        statusCode: httpStatus.SERVICE_UNAVAILABLE,
        message: "Database connection failed. Please try again later.",
      };
    }

    // Query timeout
    if (error.code === "P1017") {
      return {
        statusCode: httpStatus.REQUEST_TIMEOUT,
        message: "Query execution timeout. Please try again.",
      };
    }

    // Transaction failed
    if (error.code === "P2034") {
      return {
        statusCode: httpStatus.CONFLICT,
        message:
          "Transaction failed due to a write conflict or deadlock. Please try again.",
      };
    }

    // Database server error
    if (error.code === "P1011") {
      return {
        statusCode: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Database server error. Please try again later.",
      };
    }

    // Connection pool timeout
    if (error.code === "P1014") {
      return {
        statusCode: httpStatus.SERVICE_UNAVAILABLE,
        message: "Database connection pool timeout. Please try again.",
      };
    }

    // Raw query failed
    if (error.code === "P2010") {
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Database query failed. Please check your input.",
      };
    }

    // Migration error
    if (error.code === "P3006") {
      return {
        statusCode: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Database migration error. Please contact support.",
      };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: httpStatus.BAD_REQUEST,
      message: "Validation error",
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Unknown database error occurred",
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Database engine error. Please try again later.",
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: httpStatus.SERVICE_UNAVAILABLE,
      message: "Database initialization error. Please try again later.",
    };
  }

  // Handle generic timeout errors (catches various timeout scenarios)
  if (error.message?.toLowerCase().includes("timeout")) {
    return {
      statusCode: httpStatus.REQUEST_TIMEOUT,
      message: "Operation timeout. Please try again with a smaller dataset.",
    };
  }

  // Handle connection errors
  if (error.message?.toLowerCase().includes("connection")) {
    return {
      statusCode: httpStatus.SERVICE_UNAVAILABLE,
      message: "Database connection error. Please try again later.",
    };
  }

  // Handle transaction errors
  if (error.message?.toLowerCase().includes("transaction")) {
    return {
      statusCode: httpStatus.CONFLICT,
      message: "Transaction error. Please try again.",
    };
  }
}
