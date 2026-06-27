import { useState } from 'react'
import { supabase } from './supabase'
import Logo from './Logo'

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: 'var(--white-soft)',
  },
  left: {
    width: '420px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '48px',
    background: '#fff',
    borderRight: '1px solid var(--border)',
  },
  right: {
    flex: 1,
    background: 'var(--navy)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
    position: 'relative',
    overflow: 'hidden',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '40px',
  },
  brandName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: '22px',
    color: 'var(--navy)',
    letterSpacing: '-0.5px',
  },
  heading: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: '26px',
    color: 'var(--navy)',
    marginBottom: '6px',
    letterSpacing: '-0.5px',
  },
  subheading: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginBottom: '32px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--navy)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    color: 'var(--navy)',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    marginBottom: '16px',
  },
  inputFocus: {
    borderColor: 'var(--purple)',
    boxShadow: '0 0 0 3px rgba(108,77,255,0.12)',
  },
  btn: {
    width: '100%',
    padding: '13px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    background: 'var(--purple)',
    color: '#fff',
    marginTop: '4px',
    transition: 'background 0.15s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--purple)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'center',
    display: 'block',
    width: '100%',
    marginTop: '14px',
  },
  error: {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#DC2626',
    marginBottom: '16px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  rightDecor: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(108,77,255,0.15)',
    pointerEvents: 'none',
  },
  tagline: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: '32px',
    color: '#fff',
    lineHeight: 1.3,
    textAlign: 'center',
    marginBottom: '16px',
    zIndex: 1,
  },
  taglineSub: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    maxWidth: '320px',
    lineHeight: 1.6,
    zIndex: 1,
  },
  featList: {
    marginTop: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    zIndex: 1,
  },
  featItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
  },
  featDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--purple)',
    flexShrink: 0,
  },
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completá email y contraseña.'); return }
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      if (err.message.includes('Invalid login')) setError('Email o contraseña incorrectos.')
      else setError(err.message)
      return
    }
    // Esperar a que onAuthStateChange actualice la sesión
    setTimeout(() => {
      window.location.href = '/'
    }, 500)
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) { setError('Ingresá tu email primero.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setForgotSent(true)
  }

  const inputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocus : {}),
  })

  return (
    <div style={styles.page}>
      {/* Panel izquierdo — formulario */}
      <div style={styles.left}>
        <div style={styles.logoWrap}>
          <Logo size={28} />
          <span style={styles.brandName}>Mentorify</span>
        </div>

        {forgotSent ? (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{ ...styles.heading, fontSize: '22px' }}>Revisá tu email</h1>
            <p style={styles.subheading}>
              Te enviamos un link para restablecer tu contraseña a <strong>{email}</strong>.
            </p>
            <div style={{ background: 'var(--purple-light)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--purple-deep)', lineHeight: 1.6 }}>
              Si no lo ves en unos minutos, revisá la carpeta de spam.
            </div>
            <button style={{ ...styles.link, marginTop: '20px' }} onClick={() => { setForgotMode(false); setForgotSent(false) }}>
              ← Volver al login
            </button>
          </div>
        ) : forgotMode ? (
          <form onSubmit={handleForgot} style={{ animation: 'fadeUp 0.3s ease' }}>
            <h1 style={{ ...styles.heading, fontSize: '22px' }}>Recuperar contraseña</h1>
            <p style={styles.subheading}>Te enviamos un link para crear una nueva.</p>
            {error && <div style={styles.error}>{error}</div>}
            <label style={styles.label}>Tu email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={inputStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoFocus
            />
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? <span style={styles.spinner} /> : 'Enviar link de recuperación'}
            </button>
            <button type="button" style={styles.link} onClick={() => { setForgotMode(false); setError('') }}>
              ← Volver al login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={styles.heading}>Bienvenido de vuelta</h1>
            <p style={styles.subheading}>Ingresá con tu cuenta de coach</p>
            {error && <div style={styles.error}>{error}</div>}
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={inputStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoFocus
            />
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputStyle('password'), marginBottom: '4px' }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <button
              type="submit"
              style={styles.btn}
              disabled={loading}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--purple-deep)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--purple)'}
            >
              {loading ? <span style={styles.spinner} /> : 'Ingresar al panel'}
            </button>
          </form>
        )}
      </div>

      {/* Panel derecho — branding */}
      <div style={styles.right}>
        <div style={{ ...styles.rightDecor, width: '400px', height: '400px', top: '-100px', right: '-100px' }} />
        <div style={{ ...styles.rightDecor, width: '300px', height: '300px', bottom: '-80px', left: '-60px' }} />
        <div style={{ ...styles.rightDecor, width: '150px', height: '150px', top: '40%', left: '20%', background: 'rgba(72,45,219,0.2)' }} />

        <div style={{ zIndex: 1, textAlign: 'center' }}>
          <Logo size={48} />
        </div>

        <p style={{ ...styles.tagline, marginTop: '24px' }}>
          El orden detrás<br />del <span style={{ color: 'var(--purple)' }}>impacto.</span>
        </p>
        <p style={styles.taglineSub}>
          La plataforma de gestión para coaches que quieren escalar sin perder el control.
        </p>

        <div style={styles.featList}>
          {[
            'Todos tus alumnos en un solo lugar',
            'Seguimiento de pagos sin Excel',
            'Notas y progreso por alumno',
            'Importá tu base en segundos',
          ].map((f, i) => (
            <div key={i} style={styles.featItem}>
              <div style={styles.featDot} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
