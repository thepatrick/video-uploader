export const sanitizeFileNames = (input: string): string =>
  input
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
