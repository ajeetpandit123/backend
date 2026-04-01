// Custom API Error class
class apiError extends Error {

    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {

        // Call parent Error constructor
        super(message)

        // HTTP status code (e.g., 404, 500)
        this.statusCode = statusCode

        // No data when error occurs
        this.data = null

        // Error message
        this.message = message

        // Indicate failure
        this.success = false

        // Array of detailed errors (validation, etc.)
        this.errors = errors

        // Handle stack trace
        if (stack) {
            this.stack = stack   // ✅ FIXED
        } else {
            // Automatically capture stack trace
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

// Export the class to use in other files
export { apiError }