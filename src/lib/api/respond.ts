import { NextResponse } from 'next/server'

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class Unauthorized extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class BadRequest extends HttpError {
  constructor(message = 'Bad request') {
    super(400, message)
  }
}

export class NotFound extends HttpError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

/** Single error shape for every API route: { error, message }. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.name, message: err.message }, { status: err.status })
  }
  console.error('[api] unhandled error:', err)
  return NextResponse.json(
    { error: 'InternalError', message: 'Something went wrong' },
    { status: 500 },
  )
}
