import { NextRequest, NextResponse } from 'next/server'
import { SESClient } from '@/lib/aws/ses-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessKeyId, secretAccessKey, sesRegion, fromEmail } = body

    if (!accessKeyId || !secretAccessKey || !sesRegion || !fromEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Access Key ID, Secret Access Key, SES Region, and From Email are required',
        },
        { status: 400 }
      )
    }

    // Create a test client with the provided credentials
    const client = new SESClient({
      accessKeyId,
      secretAccessKey,
      sesRegion,
      fromEmail,
    })

    // Test the connection with a simple validation call
    const testResult = await client.testConnection()

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to AWS SES',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection failed',
          message: testResult.error || 'Unable to connect to AWS SES',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error testing AWS SES connection:', error)
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