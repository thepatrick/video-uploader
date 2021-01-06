import { S3, Endpoint } from 'aws-sdk';
import { bucket } from './helpers/config';

export const client = new S3({
  signatureVersion: 'v4',
  region: 'ap-southeast-2',
  endpoint: new Endpoint(`${bucket}.s3-accelerate.amazonaws.com`),
  useAccelerateEndpoint: true,
});
