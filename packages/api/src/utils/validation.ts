import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  public readonly errors: z.ZodIssue[];
  
  constructor(zodError: ZodError) {
    const message = zodError.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.errors = zodError.errors;
  }
}

/**
 * Validate data against a Zod schema
 */
export function validateData<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

/**
 * Safely validate data and return result with success flag
 */
export function safeValidateData<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const validatedData = validateData(schema, data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    return { 
      success: false, 
      error: new ValidationError(new ZodError([{
        code: 'custom',
        message: 'Unknown validation error',
        path: [],
      }]))
    };
  }
}

/**
 * Validate partial data (useful for updates)
 */
export function validatePartialData<T>(schema: ZodSchema<T>, data: unknown): Partial<T> {
  const partialSchema = (schema as any).partial();
  return validateData(partialSchema, data);
}

/**
 * Common validation schemas
 */
export const CommonValidationSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Pagination parameters
  pagination: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }),
  
  // Sort parameters
  sort: z.object({
    sortBy: z.string().min(1),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).refine(
    (data) => data.startDate <= data.endDate,
    {
      message: "Start date must be before or equal to end date",
      path: ["endDate"],
    }
  ),
  
  // File upload validation
  fileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimetype: z.string().min(1),
    size: z.number().min(1).max(2 * 1024 * 1024 * 1024), // 2GB max
  }),
  
  // Search query validation
  searchQuery: z.object({
    query: z.string().min(1).max(200),
    filters: z.record(z.any()).optional(),
  }),
};

/**
 * Validate request parameters (query, params, body)
 */
export function validateRequestData<T>(
  schema: ZodSchema<T>,
  data: unknown,
  source: 'query' | 'params' | 'body' = 'body'
): T {
  try {
    return validateData(schema, data);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Add context about where the validation failed
      const contextualError = new ValidationError(
        new ZodError(
          error.errors.map(err => ({
            ...err,
            message: `${source}.${err.path.join('.')}: ${err.message}`,
          }))
        )
      );
      throw contextualError;
    }
    throw error;
  }
}

/**
 * Validate request data (alias for validateRequestData with 'body' source)
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  return validateRequestData(schema, data, 'body');
}

/**
 * Sanitize and validate user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate and sanitize text input
 */
export const sanitizedText = (maxLength: number = 1000) =>
  z.string()
    .transform(sanitizeInput)
    .refine(val => val.length <= maxLength, {
      message: `Text must not exceed ${maxLength} characters`,
    });

/**
 * Validate array of UUIDs
 */
export const uuidArray = z.array(CommonValidationSchemas.uuid);

/**
 * Validate JSON object
 */
export const jsonObject = z.record(z.any()).refine(
  (val) => {
    try {
      JSON.stringify(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid JSON object' }
);

/**
 * Create a validation middleware for Express
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  source: 'query' | 'params' | 'body' = 'body'
) {
  return (req: any, res: any, next: any) => {
    try {
      const data = source === 'query' ? req.query : 
                   source === 'params' ? req.params : 
                   req.body;
      
      const validatedData = validateRequestData(schema, data, source);
      
      // Attach validated data to request
      if (source === 'body') {
        req.validatedBody = validatedData;
      } else if (source === 'query') {
        req.validatedQuery = validatedData;
      } else if (source === 'params') {
        req.validatedParams = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.errors,
          },
        });
      }
      
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  };
}