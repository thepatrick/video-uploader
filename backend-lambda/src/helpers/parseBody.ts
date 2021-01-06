export const parseBody = <T>(
  body: string | undefined,
  validator: (possible: unknown) => possible is T,
): T | undefined => {
  if (body === undefined) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(body) as unknown;

    if (!validator(parsed)) {
      throw new Error('Body does not conform to validator');
    }

    return parsed;
  } catch (err) {
    console.log('Failed to parse body', err);

    return undefined;
  }
};
