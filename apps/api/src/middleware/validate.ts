import { RequestHandler } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        _res.status(400).json({
          error: 'Validation failed',
          details: err.flatten(),
        })
        return
      }
      next(err)
    }
  }
}
