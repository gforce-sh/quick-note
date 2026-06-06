/** Request body for POST /api/login. */
export interface LoginRequest {
  passcode: string;
}

/** Success envelope returned by mutating endpoints. */
export interface OkResponse {
  ok: true;
}

/** A markdown Note. */
export interface Note {
  id: string;
  title: string;
  body: string;
  titleIsCustom: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Note fields shown in the sidebar list. */
export type NoteSummary = Pick<Note, "id" | "title" | "updatedAt">;
