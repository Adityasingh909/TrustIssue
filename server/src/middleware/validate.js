const { ZodError } = require('zod');

/**
 * Zod validation middleware factory for request parts.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            status: 400,
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        });
      }
      next(error);
    }
  };
}

module.exports = {
  validate,
  validateBody: (schema) => validate(schema, 'body'),
  validateQuery: (schema) => validate(schema, 'query'),
  validateParams: (schema) => validate(schema, 'params')
};
