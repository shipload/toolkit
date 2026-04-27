import error400 from './assets/error-400.svg'
import error404 from './assets/error-404.svg'

export type ErrorCode = 400 | 404

const SVG_BY_CODE: Record<ErrorCode, string> = {
  400: error400,
  404: error404,
}

export function errorSvgResponse(code: ErrorCode): Response {
  return new Response(SVG_BY_CODE[code], {
    status: code,
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=300',
    },
  })
}

export function errorTextResponse(code: number, message: string): Response {
  return new Response(message, {
    status: code,
    headers: { 'content-type': 'text/plain' },
  })
}
