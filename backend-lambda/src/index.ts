import { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { S3, Endpoint } from 'aws-sdk';
import {
  isBeginBody,
  isDecodedBeginJWT,
  isDecodedUploadJWT,
  isFinishBody,
  isUploadURLBody,
  isVeypearResponse,
} from './FinishBody.guard';
import fetch from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';
import { extname } from 'path';
import { failure, HTTPFailure, Result, success, VeypearResponse } from './FinishBody';
import { parseBody } from './helpers/parseBody';

const bucket = process.env.UPLOADER_BUCKET;
const jwtPrivateKey = process.env.UPLOADER_JWT_PRIVATE_KEY;
const jwtAudience = process.env.UPLOADER_JWT_AUDIENCE;
const portal = process.env.UPLOADER_PORTAL;

if (bucket === undefined) {
  throw new Error('UPLOADER_BUCKET not set');
}
if (portal === undefined) {
  throw new Error('UPLOADER_PORTAL not set');
}
if (jwtPrivateKey === undefined) {
  throw new Error('UPLOADER_JWT_PRIVATE_KEY not set');
}
if (jwtAudience === undefined) {
  throw new Error('UPLOADER_JWT_AUDIENCE not set');
}

const client = new S3({
  signatureVersion: 'v4',
  region: 'ap-southeast-2', // same as your bucket
  endpoint: new Endpoint(`${bucket}.s3-accelerate.amazonaws.com`),
  useAccelerateEndpoint: true,
});

const sanitizeFileNames = (input: string) =>
  input
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const response = (body: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 => ({
  body: JSON.stringify(body),
  statusCode,
  isBase64Encoded: false,
  headers: {},
  cookies: [],
});

const notFound = () => response({ ok: false, error: 'Not found' }, 404);
const invalidRequest = (error = 'Invalid request') => response({ ok: false, error }, 400);
const accessDenied = () => response({ ok: false, error: 'Access Denied' }, 403);

const getPresenterInfo = async (presenter: string): Promise<Result<HTTPFailure, VeypearResponse>> => {
  const portalRequest = await fetch(`${portal}/portal/${presenter}/`);

  if (portalRequest.status !== 200) {
    return failure({ statusCode: 404, message: 'Not Found' }); // invalidRequest('Invalid response from portal');
  }

  const data = (await portalRequest.json()) as unknown;

  if (!isVeypearResponse(data)) {
    return failure({ statusCode: 400, message: 'Invalid response from veyepar portal' });
  }

  return success(data);
};

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

  const data = presenterInfo.value;

  const paylaod = {
    iss: jwtAudience,
    aud: jwtAudience,
    sub: presenter,
    name: data.name,
  };

  return response({
    ok: true,
    name: data.name,
    presentations: data.presentations.map((presentation) => ({
      pk: presentation.pk,
      name: presentation.name,
    })),
    token: sign(paylaod, jwtPrivateKey, { expiresIn: '24h' }),
  });
};

export const beginUpload: APIGatewayProxyHandlerV2 = async (event, context) => {
  const token = (event.headers.authorization || '').substring('Bearer '.length);
  let decodedToken;
  try {
    decodedToken = verify(token, jwtPrivateKey);
  } catch (err) {
    console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
    return accessDenied();
  }

  if (!isDecodedBeginJWT(decodedToken)) {
    return accessDenied();
  }

  if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
    console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
    return accessDenied();
  }

  const body = parseBody(event.body);

  if (!isBeginBody(body, 'body') || body.fileName.trim().length === 0) {
    return invalidRequest();
  }

  const presenterInfo = await getPresenterInfo(decodedToken.sub);
  if (presenterInfo.ok === false) {
    return accessDenied();
  }

  const presentation = presenterInfo.value.presentations.find((presentation) => presentation.pk === body.episode);

  if (presentation === undefined) {
    return invalidRequest();
  }

  const version = Date.now();
  const presenterName = sanitizeFileNames(presenterInfo.value.name);

  const objectName = `${presenterName}/${presentation.slug}-${version}${extname(body.fileName)}`;

  const { UploadId } = await client
    .createMultipartUpload({
      Bucket: bucket,
      Key: objectName,
      Metadata: {
        presenterUuid: presenterInfo.value.uuid,
        presenterName: presenterInfo.value.name,
        episode: `${presentation.pk}`,
      },
    })
    .promise();

  const tokenStatement = {
    iss: jwtAudience,
    aud: jwtAudience,
    sub: UploadId,
    objectName: objectName,
    uuid: presenterInfo.value.uuid,
    ep: body.episode,
  };

  return response({
    ok: true,
    token: sign(tokenStatement, jwtPrivateKey, {
      expiresIn: '24h',
    }),
  });
};

export const getUploadURL: APIGatewayProxyHandlerV2 = async (event, context) => {
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

  const body = parseBody(event.body);

  if (!isUploadURLBody(body, 'body')) {
    return invalidRequest();
  }

  const signedURL = await client.getSignedUrlPromise('uploadPart', {
    Bucket: bucket,
    Key: decodedToken.objectName,
    Expires: 30 * 60, // 30 minutes
    UploadId: decodedToken.sub,
    PartNumber: body.partNumber + 1,
  });

  return response({ ok: true, partURL: signedURL });
};

const notifyPortalUploadFinished = async (
  presenter: string,
  episode: number,
  prerecordUrl: string,
  prerecordPayload: unknown,
): Promise<Result<HTTPFailure, unknown>> => {
  const portalRequest = await fetch(`${portal}/upload/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      presenter,
      episode,
      prerecord_url: prerecordUrl,
      prerecord_payload: JSON.stringify(prerecordPayload),
    }),
  });

  if (!(portalRequest.status >= 200 && portalRequest.status < 300)) {
    const body = await portalRequest.text();
    return failure({ statusCode: portalRequest.status, message: 'Invalid response from veyepar portal', body });
  }

  const data = (await portalRequest.json()) as unknown;

  return success(data);
};

export const finishUpload: APIGatewayProxyHandlerV2 = async (event, context) => {
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

  const body = parseBody(event.body);

  if (!isFinishBody(body, 'body') || body.parts.length === 0) {
    console.log('Body is not valid', body);
    return invalidRequest();
  }

  try {
    await client
      .completeMultipartUpload({
        Bucket: bucket,
        Key: objectName,
        UploadId: uploadId,
        MultipartUpload: { Parts: body.parts },
      })
      .promise();

    const { ContentLength, Metadata } = await client
      .headObject({
        Bucket: bucket,
        Key: objectName,
      })
      .promise();

    const uploadFinished = await notifyPortalUploadFinished(
      decodedToken.uuid,
      decodedToken.ep,
      `s3://${encodeURIComponent(bucket)}/${objectName}`,
      {
        uploadId: uploadId,
        parts: body.parts.length,
        contentLength: ContentLength,
        metadata: Metadata,
      },
    );

    return response({ ok: true, uploadFinished });
  } catch (err) {
    console.log('Unable to complete upload:', err);
    return response({ ok: false, error: 'Unable to complete upload.' }, 500);
  }
};

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
