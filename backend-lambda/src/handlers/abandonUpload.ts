import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { isDecodedUploadJWT } from '../types.guard';
import { verify } from 'jsonwebtoken';
import { accessDenied, response } from '../helpers/response';
import { bucket, jwtAudience, jwtPrivateKey } from '../helpers/config';
import { client } from '../s3client';

export const abandonUpload: APIGatewayProxyHandlerV2 = async (event, context) => {
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

  const uploadId = decodedToken.sub;
  const objectName = decodedToken.objectName;

  try {
    await client
      .abortMultipartUpload({
        Bucket: bucket,
        Key: objectName,
        UploadId: uploadId,
      })
      .promise();
  } catch (err) {
    console.log('Unable to abandon upload:', err);
  }

  return response({ ok: true });
};
