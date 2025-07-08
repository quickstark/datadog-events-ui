import { NextRequest, NextResponse } from 'next/server'
import { DatadogEventsClient } from '@/lib/datadog/events-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, appKey, site, emailAddress } = body

    console.log('Datadog test connection received:', {
      apiKeyPresent: !!apiKey,
      appKeyPresent: !!appKey,
      apiKeyLength: apiKey?.length,
      appKeyLength: appKey?.length,
      apiKeyMasked: apiKey?.includes('...'),
      appKeyMasked: appKey?.includes('...'),
      site,
      emailAddress: !!emailAddress
    })

    if (!apiKey || !appKey || !site) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'API Key, App Key, and Site are required',
        },
        { status: 400 }
      )
    }

    // Check if we're receiving empty or invalid values
    if (!apiKey.trim() || !appKey.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
          message: 'API Key and Application Key cannot be empty.',
        },
        { status: 400 }
      )
    }

    // Create a test client with the provided credentials
    const client = new DatadogEventsClient({
      apiKey,
      appKey,
      site,
      emailAddress: emailAddress || '',
    })

    // Test the connection with a simple validation call
    const testResult = await client.testConnection()

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Datadog API',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection failed',
          message: testResult.error || 'Unable to connect to Datadog API',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error testing Datadog connection:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}