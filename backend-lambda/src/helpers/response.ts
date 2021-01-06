import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const response = (body: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 => ({
  body: JSON.stringify(body),
  statusCode,
  isBase64Encoded: false,
  headers: {},
  cookies: [],
});

export const accessDenied = (): APIGatewayProxyStructuredResultV2 =>
  response({ ok: false, error: 'Access Denied' }, 403);

export const invalidRequest = (error = 'Invalid request'): APIGatewayProxyStructuredResultV2 =>
  response({ ok: false, error }, 400);

export const notFound = (): APIGatewayProxyStructuredResultV2 => response({ ok: false, error: 'Not found' }, 404);
