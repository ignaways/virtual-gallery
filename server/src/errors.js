/**
 * Error dengan kode yang stabil. Klien menerjemahkan `code` ke bahasa pengguna;
 * `message` (bahasa Inggris) hanya untuk log dan klien lain.
 */
export class HttpError extends Error {
  constructor(status, code, message, params) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.params = params;
  }
}
