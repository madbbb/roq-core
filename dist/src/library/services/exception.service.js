"use strict";
var ExceptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const graphql_1 = require("graphql");
const enums_1 = require("../../library/enums");
let ExceptionService = ExceptionService_1 = class ExceptionService {
    constructor() { }
    static getProcessedNestedValidationErrorMessage(errMessage) {
        var _a;
        const messageParts = errMessage.split('.');
        const stringifiedJsonAtIndex = messageParts.findIndex((element) => element.startsWith('{') || element.startsWith('['));
        if (stringifiedJsonAtIndex !== -1 && stringifiedJsonAtIndex !== 0) {
            try {
                const completeStringifiedObject = messageParts.slice(stringifiedJsonAtIndex).join('.');
                const details = JSON.parse(completeStringifiedObject);
                const nonAbidingProperty = (_a = details === null || details === void 0 ? void 0 : details.variables) === null || _a === void 0 ? void 0 : _a.property;
                if (nonAbidingProperty) {
                    const basePropertyPath = messageParts.slice(0, stringifiedJsonAtIndex).join('.');
                    details.variables.propertyPath = `${basePropertyPath}.${nonAbidingProperty}`;
                }
                return details;
            }
            catch (_) {
                /* NOTHING TO DO */
            }
        }
        else {
            return errMessage;
        }
    }
    static getProcessedErrorInstance(err, customMessage, customResponseExtension, customHttpCode) {
        var _a, _b, _c, _d, _e;
        const exceptionDetails = (_a = err === null || err === void 0 ? void 0 : err.extensions) === null || _a === void 0 ? void 0 : _a.exception;
        let appendStack = false;
        const extensionsObject = {
            response: customResponseExtension ? customResponseExtension : (_b = err === null || err === void 0 ? void 0 : err.extensions) === null || _b === void 0 ? void 0 : _b.response,
            code: customHttpCode ? customHttpCode : (_c = err === null || err === void 0 ? void 0 : err.extensions) === null || _c === void 0 ? void 0 : _c.code,
        };
        if (!((_d = err === null || err === void 0 ? void 0 : err.extensions) === null || _d === void 0 ? void 0 : _d.isProd) || ((_e = err === null || err === void 0 ? void 0 : err.extensions) === null || _e === void 0 ? void 0 : _e.isProd) === false) {
            // development
            /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
            const _f = err.extensions, { isProd, errorResponseFromFederatedService, response, code } = _f, partialExtensionsObject = tslib_1.__rest(_f, ["isProd", "errorResponseFromFederatedService", "response", "code"]);
            // Complete extensions object with custom response object and code if provided
            Object.assign(extensionsObject, partialExtensionsObject);
            appendStack = true;
        }
        const newGQLException = new graphql_1.GraphQLError(customMessage || err.message, err.nodes, err.source, err.positions, err.path, err.originalError, extensionsObject);
        if (appendStack) {
            // only in dev mode
            if (err.stack) {
                newGQLException.stack = err.stack;
            }
            else if (!err.stack && (exceptionDetails === null || exceptionDetails === void 0 ? void 0 : exceptionDetails.stacktrace)) {
                newGQLException.stack = exceptionDetails === null || exceptionDetails === void 0 ? void 0 : exceptionDetails.stacktrace;
            }
        }
        return newGQLException;
    }
    static processGraphqlValidationError(err) {
        var _a;
        const exceptionDetails = (_a = err === null || err === void 0 ? void 0 : err.extensions) === null || _a === void 0 ? void 0 : _a.exception; // So in prod as well we get the error subcode
        const errorStatusCode = 'GRAPHQL_VALIDATION_FAILED';
        const errorResponseObj = {
            statusCode: 400,
            error: 'ValidationError',
            errorCode: enums_1.ErrorCodeEnum.GRAPHQL_VALIDATION_FAILED,
            errorSubCode: exceptionDetails === null || exceptionDetails === void 0 ? void 0 : exceptionDetails.code,
            message: err.message,
            variables: {},
        };
        return ExceptionService_1.getProcessedErrorInstance(err, errorResponseObj.message, errorResponseObj, errorStatusCode);
    }
    static processInternalServerError(err) {
        var _a;
        const exceptionDetails = (_a = err === null || err === void 0 ? void 0 : err.extensions) === null || _a === void 0 ? void 0 : _a.exception; // So in prod as well we get the error subcode
        const errorStatusCode = 'INTERNAL_SERVER_ERROR';
        const errorResponseObj = {
            statusCode: 500,
            error: 'Internal Server Error',
            errorCode: enums_1.ErrorCodeEnum.INTERNAL_SERVER_ERROR,
            errorSubCode: exceptionDetails === null || exceptionDetails === void 0 ? void 0 : exceptionDetails.code,
            message: 'Something Went Wrong. Please Try Later',
            variables: {},
        };
        return ExceptionService_1.getProcessedErrorInstance(err, errorResponseObj.message, errorResponseObj, errorStatusCode);
    }
    static processOtherErrorType(err) {
        var _a, _b, _c, _d;
        let errorMessageToEvaluate = err.message;
        let parsedErrorMessage = null;
        if (((_b = (_a = err === null || err === void 0 ? void 0 : err.extensions) === null || _a === void 0 ? void 0 : _a.response) === null || _b === void 0 ? void 0 : _b.message) && Array.isArray((_d = (_c = err === null || err === void 0 ? void 0 : err.extensions) === null || _c === void 0 ? void 0 : _c.response) === null || _d === void 0 ? void 0 : _d.message)) {
            const response = ExceptionService_1.getProcessedNestedValidationErrorMessage(err.extensions.response.message[0]);
            if (typeof response === 'object') {
                parsedErrorMessage = response;
            }
            else {
                errorMessageToEvaluate = response;
            }
        }
        const errorObject = parsedErrorMessage || JSON.parse(errorMessageToEvaluate);
        const extensionsResponseObj = Object.assign(Object.assign({}, err.extensions.response), errorObject);
        let httpCode = null;
        for (const enumLiteral in common_1.HttpStatus) {
            /* This ensures code is always a string and not a number */
            if (common_1.HttpStatus[enumLiteral]) {
                const statusCode = extensionsResponseObj === null || extensionsResponseObj === void 0 ? void 0 : extensionsResponseObj.statusCode;
                if (statusCode !== 400 && common_1.HttpStatus[enumLiteral] === statusCode) {
                    // WE ALLOW BAD_USER_INPUT code
                    httpCode = enumLiteral;
                    break;
                }
            }
        }
        return ExceptionService_1.getProcessedErrorInstance(err, errorObject.message, extensionsResponseObj, httpCode);
    }
    static formatGqlErrors(err) {
        var _a, _b;
        if ((_a = err === null || err === void 0 ? void 0 : err.extensions) === null || _a === void 0 ? void 0 : _a.errorResponseFromFederatedService) {
            return ExceptionService_1.getProcessedErrorInstance(err);
        }
        if (((_b = err === null || err === void 0 ? void 0 : err.extensions) === null || _b === void 0 ? void 0 : _b.code) === 'GRAPHQL_VALIDATION_FAILED') {
            return ExceptionService_1.processGraphqlValidationError(err);
        }
        try {
            return ExceptionService_1.processOtherErrorType(err);
        }
        catch (parsingError) {
            /* Errors thrown from interceptors don't actually need to be stringfied, but we do it for consistency reasons */
            return ExceptionService_1.processInternalServerError(err);
        }
    }
};
ExceptionService = ExceptionService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], ExceptionService);
exports.ExceptionService = ExceptionService;