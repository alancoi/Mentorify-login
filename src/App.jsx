import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import SetPasswordPage from './SetPasswordPage'
import AlumnosPanel from './AlumnosPanel'
import Logo from './Logo'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsNewPassword, setNeedsNewPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsNewPassword(true)
      }
      if (event === 'USER_UPDATED') {
        setNeedsNewPassword(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

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

  if (needsNewPassword) {
    return <SetPasswordPage onDone={() => setNeedsNewPassword(false)} />
  }

  if (!session) {
    return <LoginPage onLogin={(user) => setSession({ user })} />
  }

  return <AlumnosPanel />
}
