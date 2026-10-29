/**
 * Bridge between the R3F canvas and code outside it (the PDF exporter).
 * The viewer registers a capture function; callers get a PNG data URL.
 */
type CaptureFn = () => string | null;

let capture: CaptureFn | null = null;

export const registerSnapshot = (fn: CaptureFn | null): void => {
  capture = fn;
};

export const captureSnapshot = (): string | null => {
  if (!capture) return null;
  try {
    return capture();
  } catch {
    return null;
  }
};
