import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import SetPasswordPage from './SetPasswordPage'
import AlumnosPanel from './AlumnosPanel'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsNewPassword, setNeedsNewPassword] = useState(false)

  useEffect(() => {
    // Verificar si hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Session check error:', err)
      setLoading(false)
    })

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session?.user?.email)
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsNewPassword(true)
      }
      if (event === 'USER_UPDATED') {
        setNeedsNewPassword(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--white-soft)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--purple-border)',
          borderTopColor: 'var(--purple)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    )
  }

  // Si necesita cambiar contraseña
  if (needsNewPassword) {
    return <SetPasswordPage onDone={() => setNeedsNewPassword(false)} />
  }

  // Si NO hay sesión → mostrar LoginPage
  if (!session) {
    return <LoginPage onLogin={(user) => setSession(user.session || { user })} />
  }

  // Si hay sesión → mostrar panel de alumnos
  return <AlumnosPanel onLogout={handleLogout} />
}
