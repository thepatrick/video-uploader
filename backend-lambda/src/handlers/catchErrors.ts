import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { response } from '../helpers/response';

export const catchErrors = (
  handler: (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyStructuredResultV2>,
): APIGatewayProxyHandlerV2 => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (err) {
    console.log(`Unable to handle request: ${(err as Error).message}`, err);
    return response({ ok: false, error: 'Unexpcted error' }, 500);
  }
};
