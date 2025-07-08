import { DatadogEvent } from '@/types/events'
import { DatadogConfig } from '@/types/settings'

export class DatadogEventsClient {
  private config: DatadogConfig

  constructor(config: DatadogConfig) {
    this.config = config
  }

  async sendEvent(event: DatadogEvent): Promise<any> {
    const url = `https://${this.config.site}/api/v1/events`
    
    // Generate timestamp if not provided (runtime timestamp)
    const date_happened = event.date_happened || Math.floor(Date.now() / 1000)
    
    // Remove any fields that are not part of the Datadog API
    const { id, type, delay, ...cleanEvent } = event
    
    // Validate required fields
    if (!cleanEvent.title?.trim() && !cleanEvent.text?.trim()) {
      throw new Error('Either title or text must be provided for Datadog event')
    }

    // Ensure tags is an array
    const tags = Array.isArray(cleanEvent.tags) ? cleanEvent.tags : []

    // Validate and normalize priority - Datadog expects a string
    let priority = 'low' // default
    if (typeof cleanEvent.priority === 'string') {
      if (cleanEvent.priority === 'normal') priority = 'normal'
      else if (cleanEvent.priority === 'low') priority = 'low'
    } else if (typeof cleanEvent.priority === 'number') {
      // Convert number to string priority
      if (cleanEvent.priority <= 3) priority = 'normal'
      else priority = 'low'
    }

    // Build payload with only valid Datadog Events API fields
    const payload: any = {
      title: cleanEvent.title?.trim() || 'Synthetic Event',
      text: cleanEvent.text?.trim() || cleanEvent.title?.trim() || 'Event occurred. See title and tags for details.',
      tags: tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0),
      alert_type: cleanEvent.alert_type || 'info',
      priority,
      source_type_name: cleanEvent.source_type_name || 'synthetic-events',
      date_happened,
    }

    // Only add optional fields if they have valid values
    if (cleanEvent.host?.trim()) payload.host = cleanEvent.host.trim()
    if (cleanEvent.device_name?.trim()) payload.device_name = cleanEvent.device_name.trim()
    if (cleanEvent.aggregation_key?.trim()) payload.aggregation_key = cleanEvent.aggregation_key.trim()
    if (cleanEvent.related_event_id) payload.related_event_id = cleanEvent.related_event_id

    // For now, let's use a minimal payload that matches v1 API exactly
    // Advanced category features can be added later when we confirm the base structure works

    console.log('Sending Datadog event to URL:', url)
    console.log('Sending Datadog event payload:', JSON.stringify(payload, null, 2))
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'DD-API-KEY': this.config.apiKey?.substring(0, 10) + '...',
      'DD-APPLICATION-KEY': this.config.appKey?.substring(0, 10) + '...',
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.config.apiKey,
        'DD-APPLICATION-KEY': this.config.appKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Provide specific guidance for common errors
      let errorMessage = `Failed to send event: ${response.status}`
      
      if (response.status === 403) {
        errorMessage += ' - Forbidden. Check your API/Application keys and permissions. The Application Key may need "events_write" scope.'
      } else if (response.status === 401) {
        errorMessage += ' - Unauthorized. Check your API Key is valid and not expired.'
      } else if (response.status === 400) {
        errorMessage += ' - Bad Request. Check the event payload format.'
      }
      
      errorMessage += ` ${errorText}`
      
      console.error('Datadog API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
        url: url,
        apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...',
        appKeyPrefix: this.config.appKey?.substring(0, 10) + '...'
      })
      
      throw new Error(errorMessage)
    }

    return await response.json()
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const testEvent: DatadogEvent = {
        id: 'test',
        type: 'datadog-event',
        title: 'Test Connection Event',
        text: 'This is a test event from the Datadog Events UI',
        delay: 0,
        tags: ['source:synthetic-events', 'test:true'],
        alert_type: 'info',
        priority: 5,
      }

      await this.sendEvent(testEvent)
      return {
        success: true,
        message: 'Successfully connected to Datadog Events API',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  validateEvent(event: DatadogEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!event.title?.trim() && !event.text?.trim()) {
      errors.push('Either title or text must be provided')
    }

    if (event.tags && event.tags.some(tag => typeof tag !== 'string' || !tag.trim())) {
      errors.push('All tags must be non-empty strings')
    }

    if (event.delay < 0) {
      errors.push('Delay must be non-negative')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}