export interface FieldError {
  field: string;
  message: string;
  type: string;
}

/** RFC 7807 body returned by the API for every failure. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  /** Stable machine-readable identifier (translated via messages `errors.<code>`). */
  code?: string;
  errors?: FieldError[];
  [extra: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail || problem.title || `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  /** e.g. "not_found", "duplicate", "four_eyes_required". */
  get code(): string {
    return this.problem.code ?? (this.status === 0 ? "network" : "unknown");
  }

  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
