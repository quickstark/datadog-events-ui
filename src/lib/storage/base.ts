import fs from 'fs/promises'
import path from 'path'

const STORAGE_DIR = process.env.STORAGE_DIR || './data'

console.log('[Storage] Using storage directory:', STORAGE_DIR)
console.log('[Storage] Resolved path:', path.resolve(STORAGE_DIR))

export async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
    
    // Check if directory is writable
    const testFile = path.join(STORAGE_DIR, '.write-test')
    await fs.writeFile(testFile, 'test', 'utf-8')
    await fs.unlink(testFile)
    
    console.log('[Storage] Directory is writable:', STORAGE_DIR)
  } catch (error) {
    console.error('[Storage] Failed to create/verify storage directory:', error)
    throw error
  }
}

export async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(STORAGE_DIR, filename)
    console.log(`[Storage] Reading file: ${filePath}`)
    
    const data = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    
    console.log(`[Storage] Successfully read ${filename}, size: ${data.length} bytes`)
    return parsed
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log(`[Storage] File not found: ${filename}`)
      return null
    }
    console.error(`[Storage] Failed to read file ${filename}:`, error)
    throw error
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  try {
    await ensureStorageDir()
    const filePath = path.join(STORAGE_DIR, filename)
    const jsonData = JSON.stringify(data, null, 2)
    
    console.log(`[Storage] Writing file: ${filePath}, size: ${jsonData.length} bytes`)
    await fs.writeFile(filePath, jsonData, 'utf-8')
    
    // Verify the write was successful
    const written = await fs.readFile(filePath, 'utf-8')
    if (written !== jsonData) {
      throw new Error('Written data does not match expected data')
    }
    
    console.log(`[Storage] Successfully wrote ${filename}`)
  } catch (error) {
    console.error(`[Storage] Failed to write file ${filename}:`, error)
    throw error
  }
}

export async function fileExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(STORAGE_DIR, filename)
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}