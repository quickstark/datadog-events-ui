export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TestConnectionRequest {
  type: "datadog" | "aws"
  config: any
}

export interface TestConnectionResponse {
  success: boolean
  message: string
  details?: any
}

export interface ExecuteScenarioRequest {
  scenarioId: string
}

export interface ExecuteScenarioResponse {
  executionId: string
  message: string
}

export interface ImportScenariosRequest {
  scenarios: any[]
  merge?: boolean
}

export interface ExportScenariosRequest {
  scenarioIds: string[]
}