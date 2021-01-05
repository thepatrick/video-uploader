import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3, Endpoint } from 'aws-sdk';
import {
  isBeginBody,
  isDecodedBeginJWT,
  isDecodedUploadJWT,
  isFinishBody,
  isSignBody,
  isVeypearResponse,
} from './FinishBody.guard';
import fetch from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';
import { extname } from 'path';

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

const response = (body: unknown, statusCode = 200) => ({
  body: JSON.stringify(body),
  statusCode,
  isBase64Encoded: false,
  headers: {},
  cookies: [],
});

const notFound = () => response({ ok: false, error: 'Not found' }, 404);
const invalidRequest = (error = 'Invalid request') => response({ ok: false, error }, 400);
const accessDenied = () => response({ ok: false, error: 'Access Denied' }, 403);

export const presenterInfo: APIGatewayProxyHandlerV2 = async (event, context) => {
  const presenter = event.pathParameters?.presenter;

  if (presenter === undefined || presenter.length === 0) {
    return notFound();
  }

  const portalRequest = await fetch(`${portal}/${presenter}.json`);

  if (portalRequest.status !== 200) {
    return notFound();
  }

  const data = (await portalRequest.json()) as unknown;

  if (!isVeypearResponse(data)) {
    return invalidRequest('Invalid response from portal');
  }

  const paylaod = { iss: jwtAudience, aud: jwtAudience, sub: presenter, name: data.name };

  return response({
    ok: true,
    name: data.name,
    token: sign(paylaod, jwtPrivateKey, { expiresIn: '24h' }),
  });
};

const parseBody = (body: string | undefined): unknown | undefined => {
  if (body === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch (err) {
    console.log('Failed to parse body', err);

    return undefined;
  }
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

  if (!isBeginBody(body, 'body') || body.presentationTitle.trim().length === 0 || body.fileName.trim().length === 0) {
    return invalidRequest();
  }

  const version = Date.now();
  const presenterName = sanitizeFileNames(decodedToken.name);
  const presentationTitle = sanitizeFileNames(body.presentationTitle);

  const objectName = `${presenterName}-${presentationTitle}-${version}${extname(body.fileName)}`;

  const { UploadId } = await client.createMultipartUpload({ Bucket: bucket, Key: objectName }).promise();

  return response({
    ok: true,
    token: sign({ iss: jwtAudience, aud: jwtAudience, sub: UploadId, objectName: objectName }, jwtPrivateKey, {
      expiresIn: '24h',
    }),
  });
};

export const signUploadURLs: APIGatewayProxyHandlerV2 = async (event, context) => {
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

  if (!isSignBody(body, 'body') || body.parts === 0) {
    return invalidRequest();
  }

  const promises = [];

  const start = body.start || 0;
  const parts = start + body.parts;

  for (let i = start || 0; i < parts; i++) {
    promises.push(
      client.getSignedUrlPromise('uploadPart', {
        Bucket: bucket,
        Key: decodedToken.objectName,
        Expires: 30 * 60, // 30 minutes
        UploadId: decodedToken.sub,
        PartNumber: i + 1,
      }),
    );
  }

  const signedURLs = await Promise.all(promises);

  console.log('Signed URLs:', signedURLs);

  return response({ ok: true, signedURLs });
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
    return response({ ok: true });
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

// import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
// import cors from 'cors';

// const app = express();

// app.use(cors());

// app.use(express.json()); //Used to parse JSON bodies

// interface AsyncRequestResponse<ResBody> {
//   status?: number;
//   body: ResBody;
// }

// type AsyncRequestHandler<Params, ResBody = unknown> = (
//   req: ExpressRequest<Params, ResBody, unknown>,
// ) => Promise<AsyncRequestResponse<ResBody>>;

// const asyncHandler = <Params = { [key: string]: string }, ResBody = unknown>(
//   fn: AsyncRequestHandler<Params, ResBody>,
// ) => (req: ExpressRequest<Params, ResBody>, res: ExpressResponse, next: NextFunction) => {
//   fn(req)
//     .then(({ status, body }) => {
//       if (status !== undefined) {
//         res.status(status);
//       }
//       res.json(body);
//     })
//     .catch(next);
// };

// app.post('/portal/:presenter', asyncHandler(async ({ params: { presenter } }) => {
//  const response = await presenterInfo({ pathParameters: { presenter }});
//     return { status: response.statusCode, body: JSON.parse(response.body) };
//   }),
// );

// app.post(
//   '/begin',
//   asyncHandler(async (req) => {
//      beginUpload({ headers: { authorization: req.headers.authoriztion }, body: JSON.stringify(req.body) })
//   }),
// );

// app.post(
//   '/sign',
//   asyncHandler(async (req) => {
//      signUploadURLs({ headers: { authorization: req.headers.authoriztion }, body: JSON.stringify(req.body) })
//   }),
// );

// app.post(
//   '/finish',
//   asyncHandler(async (req) => {
//      finishUpload({ headers: { authorization: req.headers.authoriztion }, body: JSON.stringify(req.body) })
//   }),
// );

// app.post(
//   '/abandon',
//   asyncHandler(async (req) => {
//   }),
// );

// app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
//   res.status(404).json({
//     ok: false,
//     error: 'Not found',
//   });
// });

// app.use((err: Error, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
//   console.log('Error', err);

//   res.status(500).json({
//     ok: false,
//     error: 'Internal server errror',
//   });
// });

// app.listen(3000);
