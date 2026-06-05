import { useState } from 'react'
import { supabase } from './supabase'
import Logo from './Logo'

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--white-soft)',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    animation: 'fadeUp 0.4s ease',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: '20px',
    color: 'var(--navy)',
  },
  badge: {
    background: 'var(--purple-light)',
    color: 'var(--purple-deep)',
    fontSize: '12px',
    fontWeight: '500',
    padding: '4px 10px',
    borderRadius: '20px',
    display: 'inline-block',
    marginBottom: '16px',
  },
  heading: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: '22px',
    color: 'var(--navy)',
    marginBottom: '6px',
  },
  sub: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '24px',
    lineHeight: 1.5,
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
    outline: 'none',
    marginBottom: '16px',
    transition: 'border-color 0.15s',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  check: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    marginBottom: '6px',
  },
  dot: (ok) => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: ok ? 'none' : '1.5px solid var(--border)',
    background: ok ? 'var(--purple-light)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '9px',
    color: 'var(--purple)',
  }),
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
}

export default function SetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)

  const checks = {
    length: password.length >= 8,
    number: /\d/.test(password),
    match: password === confirm && confirm.length > 0,
  }
  const allOk = Object.values(checks).every(Boolean)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allOk) { setError('Corregí los errores antes de continuar.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onDone()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <Logo size={24} />
          <span style={styles.brandName}>Mentorify</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={styles.badge}>Primer ingreso</span>
          <h1 style={styles.heading}>Creá tu contraseña</h1>
          <p style={styles.sub}>Tu contraseña temporal expira en 24 hs. Elegí una definitiva para acceder siempre.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            style={{ ...styles.input, ...(focus === 'pw' ? { borderColor: 'var(--purple)', boxShadow: '0 0 0 3px rgba(108,77,255,0.12)' } : {}) }}
            onFocus={() => setFocus('pw')}
            onBlur={() => setFocus(null)}
            autoFocus
          />

          <label style={styles.label}>Repetir contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repetí la contraseña"
            style={{ ...styles.input, ...(focus === 'cf' ? { borderColor: 'var(--purple)', boxShadow: '0 0 0 3px rgba(108,77,255,0.12)' } : {}) }}
            onFocus={() => setFocus('cf')}
            onBlur={() => setFocus(null)}
          />

          <div style={{ marginBottom: '20px' }}>
            {[
              { key: 'length', label: 'Mínimo 8 caracteres' },
              { key: 'number', label: 'Al menos un número' },
              { key: 'match', label: 'Las contraseñas coinciden' },
            ].map(({ key, label }) => (
              <div key={key} style={styles.check}>
                <div style={styles.dot(checks[key])}>
                  {checks[key] && '✓'}
                </div>
                <span style={{ color: checks[key] ? 'var(--purple-deep)' : 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          <button type="submit" style={{ ...styles.btn, opacity: allOk ? 1 : 0.6 }} disabled={loading || !allOk}>
            {loading ? <span style={styles.spinner} /> : 'Crear contraseña y entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
