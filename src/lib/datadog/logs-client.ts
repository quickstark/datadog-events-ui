import { DatadogLog } from '@/types/events'
import { DatadogConfig } from '@/types/settings'

export class DatadogLogsClient {
  private config: DatadogConfig

  constructor(config: DatadogConfig) {
    this.config = config
  }

  async sendLog(log: DatadogLog): Promise<any> {
    // Extract the domain part from the site
    let site = this.config.site
    if (site.startsWith('api.')) {
      site = site.substring(4)
    }
    site = site.replace('https://', '').replace('http://', '')

    const url = `https://http-intake.logs.${site}/api/v2/logs`
    
    const logEntry = {
      message: log.message,
      ddsource: log.ddsource, // This populates the SOURCE column
      service: log.service,
      hostname: log.hostname, // This populates the HOST column
      ddtags: log.ddtags || log.tags.join(','), // Use ddtags if provided, otherwise join tags
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.config.apiKey,
      },
      body: JSON.stringify([logEntry]),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to send log: ${response.status} ${errorText}`)
    }

    return { status: 'success', statusCode: response.status }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const testLog: DatadogLog = {
        id: 'test',
        type: 'datadog-log',
        message: 'Test log entry from Datadog Events UI',
        delay: 0,
        ddsource: 'synthetic-events',
        hostname: 'synthetic-events-host',
        service: 'synthetic-events',
        tags: ['test:true', 'source:synthetic-events'],
      }

      await this.sendLog(testLog)
      return {
        success: true,
        message: 'Successfully connected to Datadog Logs API',
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  validateLog(log: DatadogLog): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!log.message?.trim()) {
      errors.push('Message is required')
    }

    if (!log.ddsource?.trim()) {
      errors.push('DD Source is required')
    }

    if (!log.hostname?.trim()) {
      errors.push('Hostname is required')
    }

    if (!log.service?.trim()) {
      errors.push('Service is required')
    }

    if (log.tags && log.tags.some(tag => typeof tag !== 'string' || !tag.trim())) {
      errors.push('All tags must be non-empty strings')
    }

    if (log.delay < 0) {
      errors.push('Delay must be non-negative')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  formatLogEntry(log: DatadogLog): any {
    return {
      message: log.message,
      ddsource: log.ddsource,
      service: log.service,
      hostname: log.hostname,
      ddtags: log.ddtags || log.tags.join(','),
      timestamp: new Date().toISOString(),
    }
  }
}