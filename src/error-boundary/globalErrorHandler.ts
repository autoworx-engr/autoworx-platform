import { ZodError } from 'zod';
import handleZodError from './handleZodErrors';
import httpStatus from 'http-status';
import { AppError } from './error';
import { TErrorHandler } from '@/types/globalError';
import { handlePrismaError } from './handlePrismaError';
import { AxiosError } from 'axios';

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
    const error: any = new Error('Response not found');
    error.statusCode = httpStatus.NOT_FOUND;
    return {
        message: error.message,
        statusCode: error.statusCode,
        errorSource: [],
    };
};

// global error handler
export const errorHandler = (error: any): TErrorHandler => {
    // NOTE: This is important to log the error

    let message: string = error?.message;
    let statusCode: number =
        error?.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    let errorSource: TErrorSource[] = [
        {
            path: error?.path || '',
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
        statusCode =
            error?.response?.status || httpStatus.INTERNAL_SERVER_ERROR;
        errorSource = [
            {
                path: error?.response?.data?.path || '',
                message: error?.response?.data?.message || error.message,
            },
        ];
    } else if (error instanceof AppError) {
        message = error.message;
        statusCode = error.statusCode;
        errorSource = [
            {
                path: '',
                message: error.message,
            },
        ];
    } else if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        handlePrismaError(error)
    ) {
        console.error('Prisma error:', error);
        const prismaError = handlePrismaError(error);
        message =
            process.env.NODE_ENV === 'development'
                ? prismaError?.message!
                : 'Internal server error';
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
    console.log('Global Error Handler:');
    return {
        success: false,
        type: 'globalError',
        statusCode,
        message,
        errorSource,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : null,
    };
};
