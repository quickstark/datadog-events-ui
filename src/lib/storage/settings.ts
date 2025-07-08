import { Settings } from '@/types/settings'
import { readJsonFile, writeJsonFile } from './base'
import path from 'path'

const SETTINGS_FILE = 'settings.json'

export function getDefaultSettings(): Settings {
  return {
    datadog: {
      apiKey: process.env.DD_API_KEY || '',
      appKey: process.env.DD_APP_KEY || '',
      site: process.env.DD_SITE || 'api.datadoghq.com',
      emailAddress: process.env.DD_EMAIL_ADDRESS || '',
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      sesRegion: process.env.SES_REGION || 'us-west-2',
      fromEmail: process.env.SES_FROM_EMAIL || '',
    },
    logging: {
      logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
    },
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const settings = await readJsonFile<Settings>(SETTINGS_FILE)
    
    if (settings) {
      console.log('[Settings] Loaded from file:', SETTINGS_FILE)
      console.log('[Settings] File path:', path.join(process.env.STORAGE_DIR || './data', SETTINGS_FILE))
      console.log('[Settings] Credentials loaded:', {
        datadogApiKeyLength: settings.datadog?.apiKey?.length || 0,
        datadogAppKeyLength: settings.datadog?.appKey?.length || 0,
        awsAccessKeyLength: settings.aws?.accessKeyId?.length || 0,
        awsSecretKeyLength: settings.aws?.secretAccessKey?.length || 0,
      })
      
      // Merge with defaults to ensure all fields exist
      const merged = {
        datadog: {
          ...getDefaultSettings().datadog,
          ...settings.datadog,
        },
        aws: {
          ...getDefaultSettings().aws,
          ...settings.aws,
        },
        logging: {
          ...getDefaultSettings().logging,
          ...settings.logging,
        },
      }
      
      return merged
    }
  } catch (error) {
    console.log('[Settings] Error loading from file, using defaults:', error)
  }
  
  console.log('[Settings] No saved settings found, using defaults/env vars')
  return getDefaultSettings()
}

export async function saveSettings(settings: Settings): Promise<void> {
  console.log('[Settings] Saving to file:', SETTINGS_FILE)
  console.log('[Settings] Storage directory:', process.env.STORAGE_DIR || './data')
  console.log('[Settings] Saving credentials:', {
    datadogApiKeyLength: settings.datadog?.apiKey?.length || 0,
    datadogAppKeyLength: settings.datadog?.appKey?.length || 0,
    awsAccessKeyLength: settings.aws?.accessKeyId?.length || 0,
    awsSecretKeyLength: settings.aws?.secretAccessKey?.length || 0,
  })
  
  await writeJsonFile(SETTINGS_FILE, settings)
  console.log('[Settings] Successfully saved settings to:', path.join(process.env.STORAGE_DIR || './data', SETTINGS_FILE))
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const currentSettings = await loadSettings()
  const newSettings = {
    ...currentSettings,
    ...updates,
    datadog: { ...currentSettings.datadog, ...(updates.datadog || {}) },
    aws: { ...currentSettings.aws, ...(updates.aws || {}) },
    logging: { ...currentSettings.logging, ...(updates.logging || {}) },
  }
  
  await saveSettings(newSettings)
  return newSettings
}