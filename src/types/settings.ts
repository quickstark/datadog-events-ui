export interface DatadogConfig {
  apiKey: string
  appKey: string
  site: string
  emailAddress: string
}

export interface AWSConfig {
  accessKeyId: string
  secretAccessKey: string
  sesRegion: string
  fromEmail: string
}

export interface LoggingConfig {
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR"
}

export interface Settings {
  datadog: DatadogConfig
  aws: AWSConfig
  logging: LoggingConfig
}

export interface ConnectionStatus {
  status: "idle" | "testing" | "success" | "error"
  message?: string
}