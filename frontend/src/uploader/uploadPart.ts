import { addBreadcrumb, Severity } from '@sentry/browser';
import axios from 'axios';
import { Part } from './apiCalls';

export const uploadPart = async (
  debug: boolean,
  blob: Blob,
  partNumber: number,
  uploadUrl: string,
  onProgress: (loadedBytes: number) => void,
): Promise<Part> => {
  if (debug) {
    console.log(`Part #${partNumber} starting, ${blob.size} bytes.`);
  }

  addBreadcrumb({
    category: 'uploadPart',
    message: `Uploading part ${partNumber}`,
    level: Severity.Info,
  });

  const output = await axios.put(uploadUrl, blob, {
    onUploadProgress: (loadedBytes: ProgressEvent) => onProgress(loadedBytes.loaded),
  });

  const etag = (output.headers as { etag: string }).etag;

  if (!etag) {
    addBreadcrumb({
      category: 'uploadPart',
      message: `Uploading part ${partNumber} returned headers ${JSON.stringify(output.headers)}`,
      level: Severity.Info,
    });

    throw new Error(`No etag returned with part ${partNumber}.`);
  }

  if (debug) {
    console.log(`Part #${partNumber} done. Got headers:`, output.headers);
  }

  return { ETag: etag, PartNumber: partNumber + 1 };
};
