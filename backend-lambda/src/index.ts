import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import cors from 'cors';
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

const app = express();

app.use(cors());

app.use(express.json()); //Used to parse JSON bodies

const sanitizeFileNames = (input: string) =>
  input
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const presenter = event.pathParameters?.presenter;

  if (presenter === undefined || presenter.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ ok: false, error: '404 not found' }) };
  }

  const portalRequest = await fetch(`${portal}/${presenter}.json`);

  const data = (await portalRequest.json()) as unknown;

  if (!isVeypearResponse(data)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid response from portal' }) };
  }

  const paylaod = { iss: jwtAudience, aud: jwtAudience, sub: presenter, name: data.name };

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      name: data.name,
      token: sign(paylaod, jwtPrivateKey, { expiresIn: '24h' }),
    }),
  };
};

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

// app.post(
//   '/portal/:presenter',
//   asyncHandler(async ({ params: { presenter } }) => {
//     const portalRequest = await fetch(`${portal}/${presenter}.json`);

//     const data = (await portalRequest.json()) as unknown;

//     if (!isVeypearResponse(data)) {
//       return { status: 400, body: 'Invalid response from portal' };
//     }

//     const paylaod = { iss: jwtAudience, aud: jwtAudience, sub: presenter, name: data.name };

//     return {
//       body: {
//         ok: true,
//         name: data.name,
//         token: sign(paylaod, jwtPrivateKey, { expiresIn: '24h' }),
//       },
//     };
//   }),
// );

// app.post(
//   '/begin',
//   asyncHandler(async (req) => {
//     const token = (req.headers['authorization'] || '').substring('Bearer '.length);
//     let decodedToken;
//     try {
//       decodedToken = verify(token, jwtPrivateKey);
//     } catch (err) {
//       console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (!isDecodedBeginJWT(decodedToken)) {
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
//       console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     const body = req.body;

//     if (!isBeginBody(body, 'body') || body.presentationTitle.trim().length === 0 || body.fileName.trim().length === 0) {
//       return { status: 400, body: 'Invalid request' };
//     }

//     const version = Date.now();
//     const presenterName = sanitizeFileNames(decodedToken.name);
//     const presentationTitle = sanitizeFileNames(body.presentationTitle);

//     const objectName = `${presenterName}-${presentationTitle}-${version}${extname(body.fileName)}`;

//     const { UploadId } = await client.createMultipartUpload({ Bucket: bucket, Key: objectName }).promise();

//     return {
//       body: {
//         token: sign({ iss: jwtAudience, aud: jwtAudience, sub: UploadId, objectName: objectName }, jwtPrivateKey, {
//           expiresIn: '24h',
//         }),
//       },
//     };
//   }),
// );

// app.post(
//   '/sign',
//   asyncHandler(async (req) => {
//     const token = (req.headers['authorization'] || '').substring('Bearer '.length);
//     let decodedToken;
//     try {
//       decodedToken = verify(token, jwtPrivateKey);
//     } catch (err) {
//       console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (!isDecodedUploadJWT(decodedToken)) {
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
//       console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     const body = req.body;

//     if (!isSignBody(body, 'body') || body.parts === 0) {
//       return { status: 400, body: 'Invalid request' };
//     }

//     const promises = [];

//     for (let i = 0; i < body.parts; i++) {
//       promises.push(
//         client.getSignedUrlPromise('uploadPart', {
//           Bucket: bucket,
//           Key: decodedToken.objectName,
//           Expires: 30 * 60, // 30 minutes
//           UploadId: decodedToken.sub,
//           PartNumber: i + 1,
//         }),
//       );
//     }

//     const signedURLs = await Promise.all(promises);

//     console.log('Signed URLs:', signedURLs);

//     return { body: { signedURLs } };
//   }),
// );

// app.post(
//   '/finish',
//   asyncHandler(async (req) => {
//     const token = (req.headers['authorization'] || '').substring('Bearer '.length);
//     let decodedToken;
//     try {
//       decodedToken = verify(token, jwtPrivateKey);
//     } catch (err) {
//       console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (!isDecodedUploadJWT(decodedToken)) {
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
//       console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     const uploadId = decodedToken.sub;
//     const objectName = decodedToken.objectName;

//     const body = req.body;

//     if (!isFinishBody(body, 'body') || body.parts.length === 0) {
//       console.log('Body is not valid', body);
//       return { status: 400, body: 'Invalid request' };
//     }

//     await client
//       .completeMultipartUpload({
//         Bucket: bucket,
//         Key: objectName,
//         UploadId: uploadId,
//         MultipartUpload: { Parts: body.parts },
//       })
//       .promise();

//     return { body: { ok: true } };
//   }),
// );

// app.post(
//   '/abandon',
//   asyncHandler(async (req) => {
//     const token = (req.headers['authorization'] || '').substring('Bearer '.length);
//     let decodedToken;
//     try {
//       decodedToken = verify(token, jwtPrivateKey);
//     } catch (err) {
//       console.log(`Error decoding JWT: ${(err as Error).message} for ${token}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (!isDecodedUploadJWT(decodedToken)) {
//       return { status: 403, body: 'Access Denied' };
//     }

//     if (decodedToken.iss !== jwtAudience || decodedToken.aud !== jwtAudience) {
//       console.log(`Unexpected iss ${decodedToken.iss} or aud ${decodedToken.aud}`);
//       return { status: 403, body: 'Access Denied' };
//     }

//     const uploadId = decodedToken.sub;
//     const objectName = decodedToken.objectName;

//     await client
//       .abortMultipartUpload({
//         Bucket: bucket,
//         Key: objectName,
//         UploadId: uploadId,
//       })
//       .promise();

//     return { body: { ok: true } };
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
