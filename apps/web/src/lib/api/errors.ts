export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
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

  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
