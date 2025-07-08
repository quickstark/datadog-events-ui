import { NextRequest, NextResponse } from 'next/server'
import { loadSettings, saveSettings } from '@/lib/storage/settings'

export async function GET() {
  try {
    const settings = await loadSettings()
    
    // Mask sensitive data in response - show more characters for identification
    const maskedSettings = {
      ...settings,
      datadog: {
        ...settings.datadog,
        apiKey: settings.datadog.apiKey ? `${settings.datadog.apiKey.slice(0, 8)}...${settings.datadog.apiKey.slice(-6)}` : '',
        appKey: settings.datadog.appKey ? `${settings.datadog.appKey.slice(0, 8)}...${settings.datadog.appKey.slice(-6)}` : '',
      },
      aws: {
        ...settings.aws,
        accessKeyId: settings.aws.accessKeyId ? `${settings.aws.accessKeyId.slice(0, 8)}...${settings.aws.accessKeyId.slice(-6)}` : '',
        secretAccessKey: settings.aws.secretAccessKey ? `${settings.aws.secretAccessKey.slice(0, 6)}...${settings.aws.secretAccessKey.slice(-4)}` : '',
      },
    }
    
    return NextResponse.json({
      success: true,
      data: maskedSettings,
    })
  } catch (error) {
    console.error('Error loading settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Load current settings
    const currentSettings = await loadSettings()
    
    // Merge with updates
    const updatedSettings = {
      ...currentSettings,
      datadog: { ...currentSettings.datadog, ...(body.datadog || {}) },
      aws: { ...currentSettings.aws, ...(body.aws || {}) },
      logging: { ...currentSettings.logging, ...(body.logging || {}) },
    }
    
    await saveSettings(updatedSettings)
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}