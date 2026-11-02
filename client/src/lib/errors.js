/** Error dengan kode yang diterjemahkan di UI lewat i18n (kunci errors.<code>). */
export class AppError extends Error {
  constructor(code, params, status) {
    super(code);
    this.code = code;
    this.params = params;
    this.status = status;
  }
}
