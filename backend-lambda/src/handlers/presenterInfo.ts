import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import { invalidRequest, notFound, response } from '../helpers/response';
import { getPresenterInfo } from '../portal-api';
import { jwtAudience, jwtPrivateKey } from '../helpers/config';

export const presenterInfo: APIGatewayProxyHandlerV2 = async (event, context) => {
  const presenter = event.pathParameters?.presenter;
  if (presenter === undefined || presenter.length === 0) {
    return notFound();
  }

  const presenterInfo = await getPresenterInfo(presenter);
  if (presenterInfo.ok === false) {
    if (presenterInfo.value.statusCode === 404) {
      return notFound();
    } else {
      return invalidRequest('Invalid response from portal');
    }
  }

  const { name, presentations } = presenterInfo.value;

  return response({
    ok: true,
    name,
    presentations: presentations.map((presentation) => ({
      pk: presentation.pk,
      name: presentation.name,
    })),
    token: sign(
      {
        iss: jwtAudience,
        aud: jwtAudience,
        sub: presenter,
        name,
      },
      jwtPrivateKey,
      { expiresIn: '24h' },
    ),
  });
};
