import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS, STATUS_CONFIG } from '../../constants/colors' // Updated import

interface Bed { 
  id: string; 
  bed_number: string; 
  current_status: string 
}

export default function BedsScreen() {
  const { wardId, wardName } = useLocalSearchParams<{ wardId: string; wardName: string }>()
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('beds')
        .select('*')
        .eq('ward_id', wardId)
        .order('bed_number')
      
      if (data) setBeds(data)
      setLoading(false)
    }

    fetchData()

    const channel = supabase.channel(`nurse-ward-${wardId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'beds', filter: `ward_id=eq.${wardId}` },
        (payload) => { setBeds(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b)) })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [wardId])

  const stats = {
    available: beds.filter(b => b.current_status === 'available').length,
    occupied:  beds.filter(b => b.current_status === 'occupied').length,
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    )
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.wardName}>{wardName}</Text>
        <Text style={s.stats}>
          ✓ {stats?.available ?? 0} available · ● {stats?.occupied ?? 0} occupied
        </Text>
      </View>

      <FlatList 
        data={beds} 
        numColumns={3} 
        keyExtractor={b => b.id}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => {
          // Get config from the new STATUS_CONFIG
          const config = STATUS_CONFIG[item.current_status] || STATUS_CONFIG.maintenance
          
          return (
            <TouchableOpacity
              style={[s.bed, { backgroundColor: config.color }]}
              onPress={() => router.push({ 
                pathname: '/(app)/update-bed', 
                params: { 
                  bedId: item.id, 
                  bedNumber: item.bed_number, 
                  currentStatus: item.current_status 
                } 
              })}
              activeOpacity={0.8}
            >
              <Text style={s.bedNum}>{item.bed_number}</Text>
              {/* Access the Arabic label from the new config */}
              <Text style={s.bedAr}>{config.ar}</Text>
            </TouchableOpacity>
          )
        }} 
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Use brandDark as the primary color for the header
  header:    { backgroundColor: COLORS.brandDark, padding: 20, paddingTop: 60, gap: 4 },
  back:      { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  wardName:  { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  stats:     { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  grid:      { padding: 12 },
  bed:       { flex: 1, margin: 5, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  bedNum:    { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  bedAr:     { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
})