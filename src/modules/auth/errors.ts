export class AuthError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413,
    readonly errorKey: string,
  ) {
    super(errorKey);
    this.name = 'AuthError';
  }
}
