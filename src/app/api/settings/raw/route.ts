import { NextRequest, NextResponse } from 'next/server'
import { loadSettings } from '@/lib/storage/settings'

// This endpoint returns the raw, unmasked settings
// It should only be used by the settings modal for editing
export async function GET() {
  try {
    const settings = await loadSettings()
    
    console.log('[Settings API] Returning raw settings')
    
    return NextResponse.json({
      success: true,
      data: settings, // Return unmasked settings
    })
  } catch (error) {
    console.error('Error loading raw settings:', error)
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