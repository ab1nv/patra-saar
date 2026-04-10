/**
 * Typed HTTP error classes.
 * Throw these from services — the global error handler catches them
 * and returns the correct status code + message.
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class BadRequest extends AppError {
  constructor(message = 'Bad request') {
    super(400, message)
    this.name = 'BadRequest'
  }
}

export class Unauthorized extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
    this.name = 'Unauthorized'
  }
}

export class Forbidden extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
    this.name = 'Forbidden'
  }
}

export class NotFound extends AppError {
  constructor(message = 'Not found') {
    super(404, message)
    this.name = 'NotFound'
  }
}
