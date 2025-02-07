/**
 * Logger utility for standardized logging across the application
 * Provides consistent formatting and context for all log messages
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type DMSType = 'Alfresco' | 'Angora';

interface LogContext {
    dms: DMSType;           // DMS backend type (required)
    component?: string;     // UI component name
    service?: string;       // Service class name
    util?: string;         // Utility class name
    method?: string;       // Method name
    data?: any;           // Additional context data
}

export class Logger {
    // Constants for log formatting
    private static readonly DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    };

    /**
     * Formats log message with consistent structure
     * @param level - Log level
     * @param message - Main log message
     * @param context - Contextual information
     */
    private static formatMessage(level: LogLevel, message: string, context: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextParts = [`DMS:${context.dms}`];

        if (context.component) contextParts.push(`Component:${context.component}`);
        if (context.service) contextParts.push(`Service:${context.service}`);
        if (context.util) contextParts.push(`Util:${context.util}`);
        if (context.method) contextParts.push(`Method:${context.method}`);

        return `${timestamp} | ${level.toUpperCase()} | ${contextParts.join(' | ')} | ${message}`;
    }

    /**
     * Debug level logging - only in development
     */
    static debug(message: string, context: LogContext): void {
        if (__DEV__) {
            console.debug(this.formatMessage('debug', message, context), context.data || '');
        }
    }

    /**
     * Info level logging
     */
    static info(message: string, context: LogContext): void {
        console.log(this.formatMessage('info', message, context), context.data || '');
    }

    /**
     * Warning level logging
     */
    static warn(message: string, context: LogContext): void {
        console.warn(this.formatMessage('warn', message, context), context.data || '');
    }

    /**
     * Error level logging with optional Error object
     */
    static error(message: string, context: LogContext, error?: Error): void {
        console.error(
            this.formatMessage('error', message, context),
            context.data || '',
            error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : ''
        );
    }

    /**
     * Sanitizes sensitive data before logging
     * @param data - Data to be sanitized
     */
    static sanitizeData(data: any): any {
        if (!data) return data;
        
        const sensitiveKeys = ['password', 'token', 'auth', 'key'];
        const sanitized = { ...data };

        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}