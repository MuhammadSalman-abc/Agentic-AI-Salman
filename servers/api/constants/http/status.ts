export const HTTP_STATUS = Object.freeze({
  ok: 200,
  noContent: 204,
  badRequest: 400,
  accepted: 202,
  created: 201,
  conflict: 409,
  serviceUnavailable: 503,
  notFound: 404,
  internalServerError: 500
} as const);
