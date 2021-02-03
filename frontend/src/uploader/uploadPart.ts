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

  const output = await axios.put(uploadUrl, blob, {
    onUploadProgress: (loadedBytes: ProgressEvent) => onProgress(loadedBytes.loaded),
  });

  const etag = (output.headers as { etag: string }).etag;

  if (debug) {
    console.log(`Part #${partNumber} done. Got headers:`, output.headers);
  }

  return { ETag: etag, PartNumber: partNumber + 1 };
};
