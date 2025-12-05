export interface BaseApiResponse {
  success: boolean;
  message: string;
  code: number;
  timestamp: string;
}

export interface SuccessResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
}

export type ErrorType = 'VALIDATION_ERROR' | 'AUTHENTICATION_ERROR' | 'AUTHORIZATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'BAD_REQUEST' | 'SERVICE_UNAVAILABLE';

export interface ErrorResponse extends BaseApiResponse {
  success: false;
  data: null;
  error: {
    type: ErrorType;
    details?: ValidationError[] | Record<string, any>;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasNextPage: boolean;
  total: number;
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: CursorPaginationMeta;
}
