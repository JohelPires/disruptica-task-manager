/**
 * Application error with explicit error code for reliable error handling.
 * 
 * Extends Error with a code property that allows error middleware to
 * identify error types without relying on string matching.
 */
export class AppError extends Error {
    public readonly code: string
    public readonly statusCode: number

    constructor(message: string, code: string, statusCode: number) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.statusCode = statusCode
        Object.setPrototypeOf(this, AppError.prototype)
    }
}

