interface Part {
  ETag: string;
  PartNumber: number;
}

/** @see {isBeginBody} ts-auto-guard:type-guard */
export interface BeginBody {
  episode: number;
  fileName: string;
}

/** @see {isUploadURLBody} ts-auto-guard:type-guard */
export interface UploadURLBody {
  partNumber: number;
}

/** @see {isFinishBody} ts-auto-guard:type-guard */
export interface FinishBody {
  parts: Part[];
}

/** @see {isVeypearPresentation} ts-auto-guard:type-guard */
export interface VeypearPresentation {
  pk: number;
  name: string;
  slug: string;
  prerecord: boolean;
}

/** @see {isVeypearResponse} ts-auto-guard:type-guard */
export interface VeypearResponse {
  uuid: string;
  name: string;
  presentations: VeypearPresentation[];
}

/** @see {isDecodedBeginJWT} ts-auto-guard:type-guard */
export interface DecodedBeginJWT {
  iss: string;
  aud: string;
  sub: string;
  name: string;
}

/** @see {isDecodedUploadJWT} ts-auto-guard:type-guard */
export interface DecodedUploadJWT {
  iss: string;
  aud: string;
  sub: string;
  objectName: string;
  uuid: string;
  ep: number;
}

export type Result<L, R> = { ok: false; value: L } | { ok: true; value: R };

export const failure = <L, R>(value: L): Result<L, R> => ({ ok: false, value });

export const success = <L, R>(value: R): Result<L, R> => ({ ok: true, value });

export interface HTTPFailure {
  statusCode: number;
  message: string;
}
