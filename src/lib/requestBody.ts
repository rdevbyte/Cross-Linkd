/**
 * Request-body helpers.
 *
 * `await request.formData()` throws when the body is not form-encoded (an API
 * client sending JSON to a form endpoint, an empty body, a truncated multipart
 * upload). Uncaught, that surfaces as a 500 error page. Routes use these helpers to answer
 * with a proper 400 instead.
 */
export async function readFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

/** A trimmed string field from a form, or '' when missing / not a string (e.g. a File). */
export function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
