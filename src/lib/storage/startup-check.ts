import { loadSettings, saveSettings } from './settings'
import { ensureStorageDir, fileExists } from './base'
import path from 'path'

export async function performStartupCheck() {
  console.log('\n=== Storage Startup Check ===')
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    STORAGE_DIR: process.env.STORAGE_DIR || './data',
    CWD: process.cwd(),
    Resolved: path.resolve(process.env.STORAGE_DIR || './data'),
  })

  try {
    // Ensure storage directory exists
    await ensureStorageDir()
    console.log('✓ Storage directory verified')

    // Check if settings file exists
    const settingsExist = await fileExists('settings.json')
    console.log(`✓ Settings file exists: ${settingsExist}`)

    // Load settings
    const settings = await loadSettings()
    console.log('✓ Settings loaded successfully')
    console.log('  Credentials present:', {
      datadogApiKey: !!settings.datadog.apiKey,
      datadogAppKey: !!settings.datadog.appKey,
      awsAccessKey: !!settings.aws.accessKeyId,
      awsSecretKey: !!settings.aws.secretAccessKey,
    })

    // If no settings exist, save defaults
    if (!settingsExist) {
      await saveSettings(settings)
      console.log('✓ Default settings saved')
    }

    console.log('=== Startup Check Complete ===\n')
    return true
  } catch (error) {
    console.error('✗ Startup check failed:', error)
    console.log('=== Startup Check Failed ===\n')
    return false
  }
}