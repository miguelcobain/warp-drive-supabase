interface StructuredError {
  title?: string;
  detail?: string;
}

interface ErrorPayload {
  errors?: StructuredError[];
  message?: string;
}

function extractErrorMessage(
  content: unknown,
  fallbackMessage: string,
): string {
  if (content && typeof content === 'object') {
    const payload = content as ErrorPayload;

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    const firstError = payload.errors?.[0];

    if (typeof firstError?.detail === 'string') {
      return firstError.detail;
    }

    if (typeof firstError?.title === 'string') {
      return firstError.title;
    }
  }

  return fallbackMessage;
}

export async function normalizeRequestError(
  error: unknown,
  fallbackMessage: string,
): Promise<string> {
  if (error && typeof error === 'object') {
    if ('content' in error) {
      return extractErrorMessage(
        (error as { content?: unknown }).content,
        fallbackMessage,
      );
    }

    const response = 'response' in error ? error.response : undefined;

    if (response instanceof Response) {
      try {
        const payload: unknown = await response.clone().json();
        return extractErrorMessage(payload, fallbackMessage);
      } catch {
        // fall through to generic handling below
      }
    }
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
