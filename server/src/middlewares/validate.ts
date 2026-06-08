import type {
  Request,
  Response,
  NextFunction,
} from "express";
import {
  z,
  ZodError,
  type ZodType,
} from "zod";

type ValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate =
  (schemas: ValidationSchemas) =>
    (
      req: Request,
      res: Response,
      next: NextFunction
    ): void => {
      try {
        if (schemas.params) {
          Object.defineProperty(req, "params", {
            value: schemas.params.parse(req.params),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        if (schemas.query) {
          Object.defineProperty(req, "query", {
            value: schemas.query.parse(req.query),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        if (schemas.body) {
          Object.defineProperty(req, "body", {
            value: schemas.body.parse(req.body),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }

        next();
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            error: "Validation failed",
            details: z.flattenError(error),
          });
          return;
        }

        next(error);
      }
    };