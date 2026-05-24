import { ZodError } from 'zod';

/**
 * Middleware factory that validates req.body against a Zod schema (A03).
 * Returns 400 with structured field errors on failure.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Datos inválidos', fields: errors });
    }
    // Replace req.body with the parsed+coerced data
    req.body = result.data;
    next();
  };
}

/**
 * Validate req.query against a Zod schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Parámetros inválidos', fields: errors });
    }
    req.query = result.data;
    next();
  };
}

/**
 * Validate req.params against a Zod schema.
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Parámetros de ruta inválidos', fields: errors });
    }
    req.params = result.data;
    next();
  };
}
