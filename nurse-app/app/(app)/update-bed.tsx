// nurse-app/app/(app)/update-bed.tsx
// UPDATED: Added 'discharging' status with amber (#FFD166)
// UPDATED: Left-border card style (matching Figma spec)
// UPDATED: Shows current status prominently
// UPDATED: Ordered by clinical frequency

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { COLORS, STATUS_CONFIG, UPDATE_STATUSES } from '../../constants/colors'

export default function UpdateBedScreen() {
  const { bedId, bedNumber, currentStatus } = useLocalSearchParams<{
    bedId: string
    bedNumber: string
    currentStatus: string
  }>()

  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

// Fix B-16: Block nurses from changing EMS-locked beds (client-side guard)
// Add this check at the top of the update() function:

const update = async (newStatus: string) => {
  if (newStatus === currentStatus) {
    router.back()
    return
  }

  // FIX B-16: Check ems_locked before updating
  const { data: bedData } = await supabase
    .from('beds')
    .select('ems_locked')
    .eq('id', bedId)
    .single()

  if (bedData?.ems_locked && newStatus !== 'occupied' && newStatus !== 'available') {
    Alert.alert(
      'Bed Reserved by EMS',
      'This bed is locked by EMS dispatch.\n\nYou can only set it to:\n- Occupied (patient has arrived)\n- Available (request cancelled)',
      [{ text: 'OK' }]
    )
    return
  }

  setSaving(true)
  setSelected(newStatus)

    const { error } = await supabase
      .from('beds')
      .update({ current_status: newStatus })
      .eq('id', bedId)

    setSaving(false)
    setSelected(null)

    if (error) {
      Alert.alert('Update failed', 'Could not update bed status. Check your connection.')
    } else {
      router.back()
    }
  }

  const currentConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['available']

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* ── HEADER ─── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.bedId}>{bedNumber}</Text>
        <Text style={s.subtitle}>Select new status to update</Text>
      </View>

      {/* ── CURRENT STATUS ─── */}
      <View style={[s.currentCard, {
        backgroundColor: currentConfig.bgLight,
        borderLeftColor: currentConfig.border,
      }]}>
        <Text style={s.currentLabel}>Current Status</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={[s.dot, { backgroundColor: currentConfig.color }]} />
          <Text style={[s.currentStatus, { color: currentConfig.color }]}>
            {currentConfig.en}
          </Text>
          <Text style={[s.currentStatusAr, { color: currentConfig.color }]}>
            {currentConfig.ar}
          </Text>
        </View>
      </View>

      {/* ── STATUS OPTIONS ─── */}
      <Text style={s.sectionLabel}>Update To</Text>
      <View style={s.options}>
        {UPDATE_STATUSES.map((status) => {
          const config   = STATUS_CONFIG[status]
          const isCurrent  = status === currentStatus
          const isSelected = selected === status

          return (
            <TouchableOpacity
              key={status}
              style={[
                s.option,
                {
                  backgroundColor: config.bgLight,
                  borderLeftColor: config.border,
                  borderColor: isCurrent ? config.border : 'transparent',
                },
                isCurrent && s.optionCurrent,
              ]}
              onPress={() => update(status)}
              disabled={saving}
              activeOpacity={0.75}
            >
              <View style={s.optionLeft}>
                <View style={[s.optionDot, { backgroundColor: config.color }]} />
                <View>
                  <Text style={[s.optionEn, { color: config.color }]}>{config.en}</Text>
                  <Text style={[s.optionAr, { color: config.color }]}>{config.ar}</Text>
                </View>
              </View>

              {isCurrent && (
                <View style={[s.currentBadge, { backgroundColor: `${config.color}20` }]}>
                  <Text style={[s.currentBadgeText, { color: config.color }]}>Current</Text>
                </View>
              )}

              {isSelected && saving && (
                <ActivityIndicator size="small" color={config.color} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── LOADING OVERLAY ─── */}
      {saving && !selected && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={COLORS.brand} />
          <Text style={s.loadingText}>Updating...</Text>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  content:      { paddingBottom: 40 },

  header:       { backgroundColor: COLORS.brandDark, paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20 },
  backBtn:      { marginBottom: 12 },
  backText:     { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  bedId:        { color: COLORS.white, fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  subtitle:     { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },

  currentCard:  {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: 'transparent',
  },
  currentLabel:  { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentStatus: { fontSize: 17, fontWeight: '700' },
  currentStatusAr: { fontSize: 14, fontWeight: '500' },
  dot:           { width: 8, height: 8, borderRadius: 4 },

  sectionLabel:  { marginHorizontal: 16, marginTop: 20, marginBottom: 8, fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  options:       { marginHorizontal: 16, gap: 8 },

  option: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderLeftWidth: 4,
  },
  optionCurrent: { borderWidth: 2, borderLeftWidth: 4 },
  optionLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionDot:     { width: 10, height: 10, borderRadius: 5 },
  optionEn:      { fontSize: 16, fontWeight: '700' },
  optionAr:      { fontSize: 13, marginTop: 2, fontWeight: '500' },

  currentBadge:  { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  currentBadgeText: { fontSize: 11, fontWeight: '600' },

  loadingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  loadingText:  { color: COLORS.textMuted, fontSize: 13 },
})