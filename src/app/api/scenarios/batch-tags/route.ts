import { NextRequest, NextResponse } from 'next/server'
import { batchUpdateTags, BatchTagOperation } from '@/lib/storage/scenarios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API: Batch tag operation request:', body)
    
    // Validate request body
    if (!body.scenarioIds || !Array.isArray(body.scenarioIds) || body.scenarioIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'scenarioIds must be a non-empty array',
        },
        { status: 400 }
      )
    }
    
    if (!body.operation || !['add', 'remove', 'replace'].includes(body.operation)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'operation must be one of: add, remove, replace',
        },
        { status: 400 }
      )
    }
    
    if (!body.tags || !Array.isArray(body.tags)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'tags must be an array',
        },
        { status: 400 }
      )
    }
    
    // Validate tags format
    const invalidTags = body.tags.filter((tag: any) => typeof tag !== 'string' || !tag.trim())
    if (invalidTags.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'All tags must be non-empty strings',
        },
        { status: 400 }
      )
    }
    
    // Clean and normalize tags
    const cleanTags = body.tags.map((tag: string) => tag.trim()).filter(Boolean)
    
    if (cleanTags.length === 0 && body.operation !== 'replace') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'At least one tag is required for add and remove operations',
        },
        { status: 400 }
      )
    }
    
    const operation: BatchTagOperation = {
      scenarioIds: body.scenarioIds,
      operation: body.operation,
      tags: cleanTags
    }
    
    const result = await batchUpdateTags(operation)
    
    if (!result.success && result.errors.length > 0) {
      console.warn('API: Batch tag operation had errors:', result.errors)
    }
    
    return NextResponse.json({
      success: result.success,
      data: {
        updatedScenarios: result.updatedScenarios,
        affectedCount: result.updatedScenarios.length,
        operation: body.operation,
        tags: cleanTags
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      message: result.success 
        ? `Successfully updated ${result.updatedScenarios.length} scenario(s)`
        : `Updated ${result.updatedScenarios.length} scenario(s) with ${result.errors.length} error(s)`
    })
    
  } catch (error) {
    console.error('Error performing batch tag operation:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform batch tag operation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}