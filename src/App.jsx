import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import LoginPage from './LoginPage'
import SetPasswordPage from './SetPasswordPage'
import Logo from './Logo'

function Dashboard({ user, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--white-soft)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      animation: 'fadeUp 0.4s ease',
    }}>
      <Logo size={40} />
      <h1 style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: '28px',
        color: 'var(--navy)',
      }}>
        ¡Bienvenido a Mentorify!
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
        Sesión activa como <strong>{user.email}</strong>
      </p>
      <div style={{
        background: 'var(--purple-light)',
        border: '1px solid var(--purple-border)',
        borderRadius: '12px',
        padding: '16px 24px',
        fontSize: '14px',
        color: 'var(--purple-deep)',
        textAlign: 'center',
        maxWidth: '360px',
        lineHeight: 1.6,
      }}>
        Acá irá el panel principal de alumnos. El login está funcionando con Supabase. 🎉
      </div>
      <button
        onClick={onLogout}
        style={{
          marginTop: '8px',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '1.5px solid var(--border)',
          background: '#fff',
          color: 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}

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

  return <Dashboard user={session.user} onLogout={handleLogout} />
}
