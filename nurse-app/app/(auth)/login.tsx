import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../constants/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Error', 'Invalid email or password')
    else router.replace('/(app)/wards')
    setLoading(false)
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>BedFlow</Text>
      <Text style={s.subtitle}>Ward Management</Text>
      <View style={s.form}>
        <TextInput style={s.input} placeholder="Email" value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholderTextColor={COLORS.textMuted} />
        <TextInput style={s.input} placeholder="Password" value={password}
          onChangeText={setPassword} secureTextEntry placeholderTextColor={COLORS.textMuted} />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  logo:      { fontSize: 36, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 40 },
  form:      { gap: 12 },
  input:     { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.textPrimary },
  btn:       { backgroundColor: COLORS.primary, borderRadius: 10, padding: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText:   { color: COLORS.white, fontSize: 15, fontWeight: '600' },
})