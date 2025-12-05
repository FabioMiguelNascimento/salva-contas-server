import { ValidationError } from "@nestjs/common";
import { ErrorResponse, ErrorType, PaginatedResponse, CursorPaginationMeta, SuccessResponse } from "src/types/api-response.type";

export class ApiResponseHelper {
  private static createTimestamp(): string {
    return new Date().toISOString();
  }

  static success<T>(
    data: T,
    message: string = 'Operação realizada com sucesso',
    statusCode: number = 200
  ): SuccessResponse<T> {
    return {
      success: true,
      message,
      code: statusCode,
      timestamp: this.createTimestamp(),
      data
    };
  }

  static successWithPagination<T>(
    data: T[],
    meta: CursorPaginationMeta,
    message: string = 'Dados recuperados com sucesso',
    statusCode: number = 200
  ): PaginatedResponse<T> {
    return {
      success: true,
      message,
      code: statusCode,
      timestamp: this.createTimestamp(),
      data,
      meta
    };
  }

  static error(
    message: string,
    statusCode: number = 500,
    errorType: ErrorType = 'INTERNAL_ERROR',
    details?: ValidationError[] | Record<string, any>
  ): ErrorResponse {
    return {
      success: false,
      message,
      code: statusCode,
      timestamp: this.createTimestamp(),
      data: null,
      error: {
        type: errorType,
        ...(details && { details })
      }
    };
  }

  static validationError(
    validationErrors: ValidationError[],
    message: string = 'Dados de entrada inválidos'
  ): ErrorResponse {
    return this.error(message, 400, 'VALIDATION_ERROR', validationErrors);
  }

  static authenticationError(
    message: string = 'Credenciais inválidas'
  ): ErrorResponse {
    return this.error(message, 401, 'AUTHENTICATION_ERROR');
  }

  static authorizationError(
    message: string = 'Acesso negado'
  ): ErrorResponse {
    return this.error(message, 403, 'AUTHORIZATION_ERROR');
  }

  static notFound(
    message: string = 'Recurso não encontrado',
    details?: Record<string, any>
  ): ErrorResponse {
    return this.error(message, 404, 'NOT_FOUND', details);
  }

  static badRequest(
    message: string = 'Requisição inválida',
    details?: Record<string, any>
  ): ErrorResponse {
    return this.error(message, 400, 'BAD_REQUEST', details);
  }

  static internalError(
    message: string = 'Erro interno do servidor'
  ): ErrorResponse {
    return this.error(message, 500, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(
    message: string = 'Serviço temporariamente indisponível'
  ): ErrorResponse {
    return this.error(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export const success = ApiResponseHelper.success.bind(ApiResponseHelper);
export const successWithPagination = ApiResponseHelper.successWithPagination.bind(ApiResponseHelper);
export const error = ApiResponseHelper.error.bind(ApiResponseHelper);
export const validationError = ApiResponseHelper.validationError.bind(ApiResponseHelper);
export const authenticationError = ApiResponseHelper.authenticationError.bind(ApiResponseHelper);
export const authorizationError = ApiResponseHelper.authorizationError.bind(ApiResponseHelper);
export const notFound = ApiResponseHelper.notFound.bind(ApiResponseHelper);
export const badRequest = ApiResponseHelper.badRequest.bind(ApiResponseHelper);
export const internalError = ApiResponseHelper.internalError.bind(ApiResponseHelper);
export const serviceUnavailable = ApiResponseHelper.serviceUnavailable.bind(ApiResponseHelper);