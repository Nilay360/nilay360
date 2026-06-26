'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useSavedProperties(userId: string | null) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!userId) { setSavedIds(new Set()); return }
    const supabase = createClient()
    setLoading(true)
    supabase
      .from('saved_properties')
      .select('property_id')
      .eq('user_id', userId)
      .then(({ data, error }: { data: { property_id: string | null }[] | null; error: unknown }) => {
        if (error) console.error('useSavedProperties fetch error:', error)
        if (data) setSavedIds(new Set(data.map(r => String(r.property_id))))
        setLoading(false)
      })
  }, [userId])

  const toggleSave = useCallback(async (
    propertyId: string,
    propertyData?: Record<string, unknown>,
  ): Promise<void> => {
    if (!userId) { router.push('/login'); return }
    const supabase = createClient()
    const id = String(propertyId)

    if (savedIds.has(id)) {
      setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', id)
      if (error) {
        console.error('UNSAVE FAILED — full error:', JSON.stringify(error, null, 2))
        setSavedIds(prev => new Set(prev).add(id))
      }
    } else {
      setSavedIds(prev => new Set(prev).add(id))
      const payload = { user_id: userId, property_id: id, property_data: propertyData ?? {} }
      console.log('ATTEMPTING SAVE with payload:', JSON.stringify(payload, null, 2))
      const { data, error } = await supabase
        .from('saved_properties')
        .insert(payload)
        .select()
      if (error) {
        console.error('SAVE FAILED — full error:', JSON.stringify(error, null, 2))
        setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      } else {
        console.log('SAVE SUCCESS:', JSON.stringify(data, null, 2))
      }
    }
  }, [userId, savedIds, router])

  return { savedIds, toggleSave, loading }
}
