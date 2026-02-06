import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DATA_KEY = 'project-manager-data'

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ tasks: [], projects: [], lastUpdated: null, source: 'no-db' })
    }

    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', DATA_KEY)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('GET error:', error)
    }

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
      return NextResponse.json({
        tasks: parsed.tasks || [],
        projects: parsed.projects || [],
        lastUpdated: parsed.lastUpdated,
        source: 'supabase'
      })
    }

    return NextResponse.json({ tasks: [], projects: [], lastUpdated: null, source: 'empty' })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ tasks: [], projects: [], lastUpdated: null, source: 'error' })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const lastUpdated = new Date().toISOString()

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured', source: 'no-db' }, { status: 500 })
    }

    const { error } = await supabase
      .from('kv_store')
      .upsert({
        key: DATA_KEY,
        value: { tasks: body.tasks || [], projects: body.projects || [], lastUpdated },
        updated_at: lastUpdated
      }, { onConflict: 'key' })

    if (error) {
      console.error('POST error:', error)
      return NextResponse.json({ success: false, error: error.message, source: 'error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lastUpdated, source: 'supabase' })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ success: false, error: String(error), source: 'error' }, { status: 500 })
  }
}
