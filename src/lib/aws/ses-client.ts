import AWS from 'aws-sdk'
import { EmailEvent } from '@/types/events'
import { AWSConfig } from '@/types/settings'

export class SESClient {
  private ses: AWS.SES
  private config: AWSConfig

  constructor(config: AWSConfig) {
    this.config = config
    this.ses = new AWS.SES({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.sesRegion,
    })
  }

  async sendEmail(event: EmailEvent): Promise<any> {
    // Validate email event first
    const validation = this.validateEmail(event)
    if (!validation.valid) {
      throw new Error(`Email validation failed: ${validation.errors.join(', ')}`)
    }
    
    const params: AWS.SES.SendEmailRequest = {
      Source: event.from,
      Destination: { 
        ToAddresses: [event.to] 
      },
      Message: {
        Subject: { 
          Data: event.subject, 
          Charset: 'UTF-8' 
        },
        Body: {
          Text: { 
            Data: event.messageBody, 
            Charset: 'UTF-8' 
          }
        }
      }
    }

    console.log(`[SESClient] Sending email from ${event.from} to ${event.to} with subject: ${event.subject}`)

    try {
      const result = await this.ses.sendEmail(params).promise()
      console.log(`[SESClient] Email sent successfully, MessageId: ${result.MessageId}`)
      return {
        success: true,
        messageId: result.MessageId,
        message: `Email sent successfully (MessageId: ${result.MessageId})`,
      }
    } catch (error: any) {
      console.error(`[SESClient] Email sending failed:`, error)
      
      // Provide more specific error messages based on AWS SES error codes
      if (error.code === 'MessageRejected') {
        throw new Error(`Email rejected by SES: ${error.message}`)
      } else if (error.code === 'MailFromDomainNotVerified') {
        throw new Error(`From email domain not verified in SES: ${event.from}`)
      } else if (error.code === 'ConfigurationSetDoesNotExist') {
        throw new Error(`SES configuration set does not exist`)
      } else if (error.code === 'InvalidParameterValue') {
        throw new Error(`Invalid email parameter: ${error.message}`)
      } else if (error.code === 'SendingPausedException') {
        throw new Error(`Email sending is paused for this account`)
      } else if (error.code === 'AccountSendingPausedException') {
        throw new Error(`Account email sending is paused`)
      } else if (error.code === 'Throttling') {
        throw new Error(`Email sending rate exceeded, please try again later`)
      } else if (error.code === 'InvalidCredentials' || error.code === 'SignatureDoesNotMatch') {
        throw new Error(`Invalid AWS credentials for SES`)
      } else {
        throw new Error(`Failed to send email: ${error.message || 'Unknown AWS SES error'}`)
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const testEmailEvent: EmailEvent = {
        id: 'test',
        type: 'email',
        from: this.config.fromEmail,
        to: this.config.fromEmail, // Send test email to self
        subject: 'Test Email from Datadog Events UI',
        messageBody: 'This is a test email to verify AWS SES configuration.',
        format: 'plain-text',
        delay: 0,
        tags: ['test:true', 'source:synthetic-events'],
      }

      const result = await this.sendEmail(testEmailEvent)
      return {
        success: true,
        message: `Test email sent successfully (MessageId: ${result.messageId})`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  validateEmailConfig(config: AWSConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.accessKeyId?.trim()) {
      errors.push('AWS Access Key ID is required')
    }

    if (!config.secretAccessKey?.trim()) {
      errors.push('AWS Secret Access Key is required')
    }

    if (!config.sesRegion?.trim()) {
      errors.push('SES Region is required')
    }

    if (!config.fromEmail?.trim()) {
      errors.push('From Email is required')
    } else if (!this.isValidEmail(config.fromEmail)) {
      errors.push('From Email must be a valid email address')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  validateEmail(event: EmailEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!event.from?.trim()) {
      errors.push('From email is required')
    } else if (!this.isValidEmail(event.from)) {
      errors.push('From email must be a valid email address')
    }

    if (!event.to?.trim()) {
      errors.push('To email is required')
    } else if (!this.isValidEmail(event.to)) {
      errors.push('To email must be a valid email address')
    }

    if (!event.subject?.trim()) {
      errors.push('Subject is required')
    }

    if (!event.messageBody?.trim()) {
      errors.push('Message body is required')
    }

    if (event.delay < 0) {
      errors.push('Delay must be non-negative')
    }

    if (event.tags && event.tags.some(tag => typeof tag !== 'string' || !tag.trim())) {
      errors.push('All tags must be non-empty strings')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}