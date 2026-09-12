/** FastAPI request-validation issue. */
export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** Error body returned by the backend: `{ detail }` for application errors, `{ detail: [...] }` for validation. */
export interface ApiErrorBody {
  detail: string | ValidationIssue[];
}
