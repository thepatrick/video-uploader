import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { isDecodedUploadJWT, isUploadURLBody } from '../types.guard';
import { verify } from 'jsonwebtoken';
import { parseBody } from '../helpers/parseBody';
import { accessDenied, invalidRequest, response } from '../helpers/response';
import { bucket, jwtAudience, jwtPrivateKey } from '../helpers/config';
import { client } from '../s3client';
import { catchErrors } from './catchErrors';

export const getUploadURL: APIGatewayProxyHandlerV2 = catchErrors(async (event) => {
  const token = (event.headers.authorization || '').substring('Bearer '.length);
  let decodedToken;
  try {
    decodedToken = verify(token, jwtPrivateKey);
  } catch (err) {
    console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
    return accessDenied();
  }

  if (!isDecodedUploadJWT(decodedToken)) {
    return accessDenied();
  }

  if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
    console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
    return accessDenied();
  }

  const body = parseBody(event.body, isUploadURLBody);
  if (body === undefined) {
    return invalidRequest();
  }

  const signedURL = await client.getSignedUrlPromise('uploadPart', {
    Bucket: bucket,
    Key: decodedToken.objectName,
    Expires: 30 * 60,
    UploadId: decodedToken.sub,
    PartNumber: body.partNumber + 1,
  });

  return response({ ok: true, partURL: signedURL });
});
