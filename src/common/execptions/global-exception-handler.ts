import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { authenticationError, authorizationError, badRequest, internalError, notFound, serviceUnavailable } from "../../utils/api-response-helper.js";

@Catch()
export class GlobalExceptionHandler implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            
            switch (status) {
                case 400:
                    return this.handleBadRequest(exception, response);
                case 401:
                    return response.status(401).json(authenticationError(exception.message || "Credenciais inválidas"));
                case 403:
                    return response.status(403).json(authorizationError(exception.message || "Acesso negado"));
                case 404:
                    return response.status(404).json(notFound(exception.message || "Recurso não encontrado"));
                case 500:
                case 503:
                default:
                    if (status === 503) {
                        return response.status(503).json(serviceUnavailable(exception.message || "Serviço temporariamente indisponível. Tente novamente em instantes."));
                    }
                    return response.status(500).json(internalError(exception.message || "Erro interno do servidor"));
            }
        } else {
            console.error('Erro não-HTTP capturado:', exception);
            if (this.isAIServiceUnavailable(exception)) {
                return response.status(503).json(serviceUnavailable("O modelo de IA está sobrecarregado. Tente novamente mais tarde."));
            }
            return response.status(500).json(internalError("Erro interno do servidor"));
        }
    }

    private handleBadRequest(exception: HttpException, response: Response) {
        const exceptionResponse = exception.getResponse();
        const validationErrors = this.extractZodValidationErrors(exceptionResponse);

        if (validationErrors) {
            return response.status(400).json({
                success: false,
                message: "Dados de entrada inválidos",
                code: 400,
                timestamp: new Date().toISOString(),
                data: null,
                error: {
                    type: "VALIDATION_ERROR",
                    details: validationErrors
                }
            });
        }

        return response.status(400).json(badRequest(exception.message || "Requisição inválida"));
    }

    private extractZodValidationErrors(exceptionResponse: any): any[] | null {
        if (this.isZodIssuesArray(exceptionResponse)) {
            return exceptionResponse;
        }

        if (this.isObjectWithZodMessages(exceptionResponse)) {
            return exceptionResponse.message;
        }

        if (this.isObjectWithZodErrors(exceptionResponse)) {
            return exceptionResponse.error;
        }

        return null;
    }

    private isZodIssuesArray(value: any): boolean {
        return Array.isArray(value) && 
               value.length > 0 && 
               this.hasZodIssueStructure(value[0]);
    }

    private isObjectWithZodMessages(value: any): boolean {
        return typeof value === 'object' && 
               value !== null && 
               'message' in value && 
               this.isZodIssuesArray(value.message);
    }

    private isObjectWithZodErrors(value: any): boolean {
        return typeof value === 'object' && 
               value !== null && 
               'error' in value && 
               this.isZodIssuesArray(value.error);
    }

    private hasZodIssueStructure(value: any): boolean {
        return typeof value === 'object' && 
               value !== null && 
               'code' in value;
    }

    private isAIServiceUnavailable(exception: any): boolean {
        return exception?.name === 'GoogleGenerativeAIFetchError' ||
               exception?.status === 503 ||
               typeof exception?.message === 'string' && exception.message.includes('model is overloaded');
    }
}