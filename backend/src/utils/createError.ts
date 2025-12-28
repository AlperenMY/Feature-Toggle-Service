export interface AppError extends Error {
  statusCode: number;
  redirectTo?: string;
}

export function createError(
  message: string,
  statusCode: number = 500
): AppError {
  const err = new Error(message) as AppError;

  err.statusCode = statusCode;

  return err;
}
