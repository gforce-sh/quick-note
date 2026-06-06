/** Request body for POST /api/login. */
export interface LoginRequest {
  passcode: string;
}

/** Success envelope returned by mutating endpoints. */
export interface OkResponse {
  ok: true;
}
