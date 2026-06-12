import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'

interface Ward { id: string; name_ar: string; name_en: string; specialty: string; total_beds: number }

export default function WardsScreen() {
  const [wards, setWards] = useState<Ward[]>([])
  const [hospitalName, setHospitalName] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('id', user.id).single()
      if (!profile) return
      const { data: hospital } = await supabase.from('hospitals').select('name_ar').eq('id', profile.hospital_id).single()
      if (hospital) setHospitalName(hospital.name_ar)
      const { data: wardsData } = await supabase.from('wards').select('*')
        .eq('hospital_id', profile.hospital_id).eq('active', true)
      if (wardsData) setWards(wardsData)
    })()
  }, [])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.hospitalName}>{hospitalName}</Text>
        <Text style={s.title}>Select Ward</Text>
      </View>
      <FlatList data={wards} keyExtractor={w => w.id} contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card}
            onPress={() => router.push({ pathname: '/(app)/beds', params: { wardId: item.id, wardName: item.name_ar } })}>
            <Text style={s.nameAr}>{item.name_ar}</Text>
            <Text style={s.nameEn}>{item.name_en}</Text>
            <Text style={s.spec}>{item.specialty} · {item.total_beds} beds</Text>
          </TouchableOpacity>
        )} />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header:    { backgroundColor: COLORS.primary, padding: 20, paddingTop: 60 },
  hospitalName: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  title:     { color: COLORS.white, fontSize: 22, fontWeight: '700', marginTop: 4 },
  list:      { padding: 16, gap: 12 },
  card:      { backgroundColor: COLORS.white, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  nameAr:    { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  nameEn:    { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  spec:      { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
})