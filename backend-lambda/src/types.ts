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
  parts: {
    ETag: string;
    PartNumber: number;
  }[];
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
