import { ConvertParams, ConvertResponse, Variant } from '@/lib/types';

const API_BASE = '/api/v1';

/**
 * Error raised when the backend returns a non-2xx response.
 * Carries the parsed error body so callers can render detailed messages.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Submit an image and processing parameters to the conversion endpoint.
 *
 * The wire format matches the backend's multipart parser exactly:
 * - image:  the file field
 * - params: JSON string with { scale, threshold, simplify_tolerance, scara? }
 * - variant: "fast" | "detailed" | "balanced"
 */
export async function convert(
  image: File,
  params: ConvertParams & { variant: Variant },
  signal?: AbortSignal
): Promise<ConvertResponse | null> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('params', JSON.stringify(params));
  formData.append('variant', params.variant);

  try {
    const response = await fetch(`${API_BASE}/convert/`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let body: unknown = null;
      try {
        body = await response.json();
        if (body && typeof body === 'object' && 'error' in body) {
          errorMessage = (body as { error: string }).error;
        }
      } catch {
        // Backend did not return JSON; keep the generic status message.
      }
      throw new ApiError(errorMessage, response.status, body);
    }

    return response.json() as Promise<ConvertResponse>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}
