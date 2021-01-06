export const parseBody = (body: string | undefined): unknown | undefined => {
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
