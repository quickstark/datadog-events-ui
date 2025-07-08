export interface DatadogEvent {
  id: string
  type: "datadog-event"
  title: string
  text: string
  delay: number // seconds from scenario start
  aggregation_key?: string
  alert_type?: "error" | "warning" | "info" | "success" | "user_update" | "recommendation" | "snapshot"
  date_happened?: number
  device_name?: string
  host?: string
  priority?: 1 | 2 | 3 | 4 | 5
  related_event_id?: number
  source_type_name?: string
  tags: string[]
  timestamp?: string // ISO 8601 format, defaults to runtime timestamp
  category?: "change" | "alert" // Event category
  // Change event specific attributes (Option 1)
  change_metadata?: any
  changed_resource?: string
  impacted_resources?: Array<{ type: string; name: string }>
  new_value?: any
  prev_value?: any
  // Alert event specific attributes (Option 2)
  custom?: any
  links?: Array<{ href: string; text: string }>
  status?: "warn" | "error" | "ok"
  integration_id?: string
  message?: string
}

export interface DatadogLog {
  id: string
  type: "datadog-log"
  message: string
  delay: number // seconds from scenario start
  ddsource: string // The integration name (appears in SOURCE column)
  ddtags?: string // Comma-separated tags
  hostname: string // The originating host (appears in HOST column)
  service: string // The application/service name (appears in SERVICE column)
  tags: string[]
}

export interface EmailEvent {
  id: string
  type: "email"
  from: string
  to: string
  subject: string
  messageBody: string
  format: "json" | "plain-text"
  delay: number // seconds from scenario start
  tags: string[]
}

export type EventType = DatadogEvent | DatadogLog | EmailEvent

export interface AlertScenario {
  id: string
  name: string
  description?: string
  events: EventType[]
  status: "draft" | "pending" | "completed" | "failed"
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

export interface ScenarioExecution {
  id: string
  scenarioId: string
  status: "running" | "completed" | "failed"
  startedAt: Date
  completedAt?: Date
  progress: {
    current: number
    total: number
  }
  errors?: string[]
}