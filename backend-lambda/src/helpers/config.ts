const maybeBucket = process.env.UPLOADER_BUCKET;
const myabeJWTPrivateKey = process.env.UPLOADER_JWT_PRIVATE_KEY;
const maybeJWTAudience = process.env.UPLOADER_JWT_AUDIENCE;
const maybePortal = process.env.UPLOADER_PORTAL;

if (maybeBucket === undefined) {
  throw new Error('UPLOADER_BUCKET not set');
}

if (myabeJWTPrivateKey === undefined) {
  throw new Error('UPLOADER_JWT_PRIVATE_KEY not set');
}

if (maybeJWTAudience === undefined) {
  throw new Error('UPLOADER_JWT_AUDIENCE not set');
}

if (maybePortal === undefined) {
  throw new Error('UPLOADER_PORTAL not set');
}

export const bucket = maybeBucket;
export const jwtPrivateKey = myabeJWTPrivateKey;
export const jwtAudience = maybeJWTAudience;
export const portal = maybePortal;
