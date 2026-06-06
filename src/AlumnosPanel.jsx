import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './AlumnosPanel.css';

export default function AlumnosPanel() {
  const [alumnos, setAlumnos] = useState([]);
  const [filtro, setFiltro] = useState('Activo');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);
  const [editingAlumno, setEditingAlumno] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showGanancia, setShowGanancia] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [coachId, setCoachId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    fecha_inicio: '',
    fecha_renovacion: '',
    plan_tipo: 'Básico',
    plan_precio: '',
    estado: 'Activo',
    notas: ''
  });

  useEffect(() => {
    initializeCoach();
  }, []);

  async function initializeCoach() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      let { data: coach, error: getError } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (getError && getError.code !== 'PGRST116') throw getError;

      if (!coach) {
        const { data: newCoach, error: insertError } = await supabase
          .from('coaches')
          .insert([{ user_id: user.id, nombre: user.email.split('@')[0] }])
          .select();
        
        if (insertError) throw insertError;
        if (!newCoach || newCoach.length === 0) throw new Error('Failed to create coach');
        coach = newCoach[0];
      }

      if (!coach || !coach.id) throw new Error('No coach ID');
      setCoachId(coach.id);
      loadAlumnos(coach.id);
    } catch (err) {
      console.error('Init error:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  async function loadAlumnos(cId) {
    try {
      if (!cId) throw new Error('No coach ID');
      const { data, error: err } = await supabase
        .from('alumnos')
        .select('*')
        .eq('coach_id', cId)
        .order('created_at', { ascending: false });
      
      if (err) throw err;
      setAlumnos(data || []);
    } catch (err) {
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setSuccessMsg('');
    setErrorReport('');

    if (newPassword !== confirmPassword) {
      setErrorReport('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setErrorReport('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      setSuccessMsg('✅ Contraseña cambiada exitosamente');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowSettings(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      setErrorReport('Error: ' + err.message);
    }
  }

  async function handleReportError(e) {
    e.preventDefault();
    if (!errorReport.trim()) {
      alert('Por favor describe el error');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Guardar reporte en Supabase
      await supabase
        .from('reportes_errores')
        .insert([{
          coach_id: coachId,
          user_email: user?.email,
          descripcion: errorReport,
          fecha: new Date().toISOString(),
          estado: 'Nuevo'
        }])
        .catch(() => {
          console.log('Nota: No se pudo guardar en DB');
        });

      // Preparar el contenido del email
      const subject = `🐛 Reporte de Error - ${user?.email}`;
      const body = `Hola,\n\nReporte de error desde Mentorify:\n\n${errorReport}\n\nFecha: ${new Date().toLocaleString('es-AR')}\nCoach: ${user?.email}`;
      
      // Abrir cliente de email nativo
      const mailtoLink = `mailto:appmentorify@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      // Mostrar mensaje
      setSuccessMsg('✅ Abriendo tu email...');
      setErrorReport('');
      setTimeout(() => {
        setShowSettings(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  const filteredAlumnos = alumnos.filter(a => {
    const matchFiltro = filtro === 'Todos' || a.estado === filtro;
    const matchSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFiltro && matchSearch;
  });

  async function handleAddAlumno(e) {
    e.preventDefault();
    try {
      if (!coachId) throw new Error('Coach not initialized');
      
      if (editingAlumno) {
        const { error: err } = await supabase
          .from('alumnos')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            fecha_inicio: formData.fecha_inicio || null,
            fecha_renovacion: formData.fecha_renovacion || null,
            plan_tipo: formData.plan_tipo,
            plan_precio: parseFloat(formData.plan_precio) || 0,
            estado: formData.estado,
            notas: formData.notas || ''
          })
          .eq('id', editingAlumno.id);
        
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('alumnos').insert([{
          nombre: formData.nombre,
          email: formData.email,
          fecha_inicio: formData.fecha_inicio || null,
          fecha_renovacion: formData.fecha_renovacion || null,
          plan_tipo: formData.plan_tipo,
          plan_precio: parseFloat(formData.plan_precio) || 0,
          estado: formData.estado,
          notas: formData.notas || '',
          coach_id: coachId
        }]);
        
        if (err) throw err;
      }
      
      setFormData({
        nombre: '',
        email: '',
        fecha_inicio: '',
        fecha_renovacion: '',
        plan_tipo: 'Básico',
        plan_precio: '',
        estado: 'Activo',
        notas: ''
      });
      setEditingAlumno(null);
      setShowForm(false);
      loadAlumnos(coachId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDeleteAlumno(id) {
    if (!confirm('¿Eliminar este alumno?')) return;
    try {
      const { error: err } = await supabase.from('alumnos').delete().eq('id', id);
      if (err) throw err;
      loadAlumnos(coachId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function handleEditAlumno(alumno) {
    setEditingAlumno(alumno);
    setFormData({
      nombre: alumno.nombre,
      email: alumno.email || '',
      fecha_inicio: alumno.fecha_inicio || '',
      fecha_renovacion: alumno.fecha_renovacion || '',
      plan_tipo: alumno.plan_tipo || 'Básico',
      plan_precio: alumno.plan_precio || '',
      estado: alumno.estado || 'Activo',
      notas: alumno.notas || ''
    });
    setShowForm(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const calcularDiasRestantes = (fechaRenovacion) => {
    if (!fechaRenovacion) return null;
    const hoy = new Date();
    const renovacion = new Date(fechaRenovacion);
    const diff = Math.ceil((renovacion - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getEstadoBadge = (diasRestantes) => {
    if (diasRestantes === null) return { texto: 'Sin plan', clase: 'sin-plan' };
    if (diasRestantes < 0) return { texto: `${Math.abs(diasRestantes)} días vencido`, clase: 'vencido' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'vence-hoy' };
    if (diasRestantes <= 3) return { texto: `${diasRestantes} días`, clase: 'proximo-vencer' };
    return { texto: 'Al día', clase: 'al-dia' };
  };

  const stats = {
    total: alumnos.length,
    activos: alumnos.filter(a => a.estado === 'Activo').length,
    vencerse: alumnos.filter(a => {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      return dr !== null && dr <= 3;
    }).length,
  };

  const calcularGanancia = () => {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    const clientesNuevos = alumnos.filter(a => {
      const fechaInicio = new Date(a.fecha_inicio);
      return fechaInicio >= inicioMes && fechaInicio <= finMes;
    });

    const totalIngresoEsteMes = alumnos
      .filter(a => {
        const fechaInicio = new Date(a.fecha_inicio);
        return fechaInicio >= inicioMes && fechaInicio <= hoy;
      })
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    const totalIngresoMesPasado = alumnos
      .filter(a => {
        const fechaInicio = new Date(a.fecha_inicio);
        return fechaInicio >= inicioMesPasado && fechaInicio <= finMesPasado;
      })
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);
    
    const alumnosActivos = alumnos.filter(a => a.estado === 'Activo').length;
    const ingresoActual = alumnos
      .filter(a => a.estado === 'Activo')
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    const porcentajeComparacion = totalIngresoMesPasado > 0 
      ? (totalIngresoEsteMes / totalIngresoMesPasado * 100).toFixed(1)
      : (totalIngresoEsteMes > 0 ? 100 : 0);

    const diasTranscurridos = hoy.getDate();
    const diasEnMes = finMes.getDate();
    const proyeccion = (totalIngresoEsteMes / diasTranscurridos * diasEnMes).toFixed(2);

    return {
      clientesNuevos: clientesNuevos.length,
      totalIngreso: totalIngresoEsteMes,
      ingresoMesPasado: totalIngresoMesPasado,
      alumnosActivos: alumnosActivos,
      ingresoActual: ingresoActual,
      proximosVencer: alumnos.filter(a => {
        const dr = calcularDiasRestantes(a.fecha_renovacion);
        return dr !== null && dr <= 7 && dr > 0;
      }).length,
      porcentajeComparacion: porcentajeComparacion,
      proyeccion: proyeccion
    };
  };

  const ganancia = calcularGanancia();

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px', color: '#666' }}>Cargando...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px', color: '#f00' }}>Error: {error}</div>;
  }

  return (
    <div className="panel-container">
      <header className="panel-header">
        <div className="header-left">
          <img 
            src="https://i.postimg.cc/JG918Zps/2__5_.png" 
            alt="Mentorify Logo"
            className="logo-icon"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div className="header-text">
            <h1>Mentorify</h1>
          </div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-compact" title="Configuración">
            Configuración
          </button>
          <button onClick={handleLogout} className="btn-compact" title="Salir">
            Salir
          </button>
        </div>
      </header>

      {showGanancia && (
        <section className="ganancia-section">
          <h2>Reporte de Ganancia Mensual</h2>
          <div className="ganancia-grid">
            <div className="ganancia-card">
              <div className="ganancia-label">Facturación Mes Pasado</div>
              <div className="ganancia-value">${ganancia.ingresoMesPasado.toFixed(2)}</div>
              <div className="ganancia-subtitle">ingresos</div>
            </div>
            <div className="ganancia-card primary">
              <div className="ganancia-label">Facturación Este Mes</div>
              <div className="ganancia-value">${ganancia.totalIngreso.toFixed(2)}</div>
              <div className="ganancia-subtitle">hasta hoy</div>
            </div>
            <div className="ganancia-card">
              <div className="ganancia-label">Comparación con Mes Pasado</div>
              <div className={`ganancia-value ${ganancia.porcentajeComparacion >= 0 ? 'positivo' : 'negativo'}`}>
                {ganancia.porcentajeComparacion >= 0 ? '+' : ''}{ganancia.porcentajeComparacion}%
              </div>
              <div className="ganancia-subtitle">diferencia</div>
            </div>
            <div className="ganancia-card">
              <div className="ganancia-label">Activos Nuevos Este Mes</div>
              <div className="ganancia-value">{ganancia.clientesNuevos}</div>
              <div className="ganancia-subtitle">clientes nuevos</div>
            </div>
            <div className="ganancia-card">
              <div className="ganancia-label">Clientes Activos (total)</div>
              <div className="ganancia-value">{ganancia.alumnosActivos}</div>
              <div className="ganancia-subtitle">activos ahora</div>
            </div>
            <div className="ganancia-card alert">
              <div className="ganancia-label">Por Vencer (7 días)</div>
              <div className="ganancia-value">{ganancia.proximosVencer}</div>
              <div className="ganancia-subtitle">a renovar</div>
            </div>
          </div>
        </section>
      )}

      <div className="ganancia-button-container">
        <button onClick={() => setShowGanancia(!showGanancia)} className="btn-ganancia-fine">
          💰 Ver ganancia mensual
        </button>
      </div>

      {showSettings && (
        <section className="settings-section">
          <div className="settings-content">
            <h2>⚙️ Configuración</h2>

            <div className="settings-tab">
              <h3>🔐 Cambiar Contraseña</h3>
              <form onSubmit={handleChangePassword} className="settings-form">
                <input 
                  type="password" 
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <input 
                  type="password" 
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary">Cambiar contraseña</button>
              </form>
            </div>

            <div className="settings-tab">
              <h3>📧 Reportar Errores o Mejoras</h3>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                ¿Encontraste un error? ¿Tienes una idea de mejora?
              </p>
              <p style={{ color: '#6C4DFF', fontWeight: 'bold', marginBottom: '1rem' }}>
                appmentorify@gmail.com
              </p>
              <a 
                href="https://mail.google.com/mail/u/0/?to=appmentorify@gmail.com&subject=Reporte%20de%20Error%20o%20Mejora%20-%20Mentorify"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
              >
                ✉️ Escribir a Gmail
              </a>
            </div>

            {successMsg && <p className="success-msg">{successMsg}</p>}
            <button onClick={() => setShowSettings(false)} className="btn-secondary">Cerrar</button>
          </div>
        </section>
      )}

      <section className="stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activos}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className="stat-card alert">
          <div className="stat-number">{stats.vencerse}</div>
          <div className="stat-label">Por vencer</div>
        </div>
      </section>

      <section className="controls">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters">
          {['Todos', 'Activo'].map(estado => (
            <button 
              key={estado}
              className={`filter-btn ${filtro === estado ? 'active' : ''}`}
              onClick={() => setFiltro(estado)}
            >
              {estado}
            </button>
          ))}
        </div>
        <button onClick={() => {
          setEditingAlumno(null);
          setFormData({
            nombre: '',
            email: '',
            fecha_inicio: '',
            fecha_renovacion: '',
            plan_tipo: 'Básico',
            plan_precio: '',
            estado: 'Activo',
            notas: ''
          });
          setShowForm(!showForm);
        }} className="btn-primary">
          + Nuevo alumno
        </button>
      </section>

      {showForm && (
        <form onSubmit={handleAddAlumno} className="form-alumno">
          <div className="form-section">
            <h3>{editingAlumno ? 'Editar alumno' : 'Información básica'}</h3>
            <div className="form-grid">
              <input 
                type="text" 
                placeholder="Nombre completo *" 
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Plan</h3>
            <div className="form-grid">
              <select value={formData.plan_tipo} onChange={(e) => setFormData({...formData, plan_tipo: e.target.value})}>
                <option>Básico</option>
                <option>Estándar</option>
                <option>Premium</option>
              </select>
              <input 
                type="number" 
                placeholder="Precio del plan"
                step="0.01"
                value={formData.plan_precio}
                onChange={(e) => setFormData({...formData, plan_precio: e.target.value})}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Fechas</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha de inicio</label>
                <input 
                  type="date" 
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Fecha de finalización</label>
                <input 
                  type="date" 
                  value={formData.fecha_renovacion}
                  onChange={(e) => setFormData({...formData, fecha_renovacion: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Notas</h3>
            <textarea 
              placeholder="Agregar notas sobre este alumno..."
              value={formData.notas}
              onChange={(e) => setFormData({...formData, notas: e.target.value})}
              className="form-textarea"
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn-primary">
              {editingAlumno ? 'Guardar cambios' : 'Guardar alumno'}
            </button>
            <button type="button" onClick={() => {
              setShowForm(false);
              setEditingAlumno(null);
            }} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      <section className="alumnos-list">
        {filteredAlumnos.length === 0 ? (
          <p className="empty">No hay alumnos. ¡Agrega tu primer alumno!</p>
        ) : (
          <div className="table-wrapper">
            <table className="alumnos-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Precio</th>
                  <th>Inicio</th>
                  <th>Finalización</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumnos.map(alumno => {
                  const diasRestantes = calcularDiasRestantes(alumno.fecha_renovacion);
                  const estadoBadge = getEstadoBadge(diasRestantes);
                  const esUrgente = diasRestantes !== null && diasRestantes <= 3;
                  return (
                    <tr key={alumno.id} className={`row-${alumno.estado.toLowerCase()} ${esUrgente ? 'urgente' : ''}`}>
                      <td className="nombre-cell">
                        <strong>{alumno.nombre}</strong>
                      </td>
                      <td className="email-cell">{alumno.email || '-'}</td>
                      <td>{alumno.plan_tipo}</td>
                      <td className="precio-cell">${alumno.plan_precio}</td>
                      <td className="fecha-cell">
                        {alumno.fecha_inicio ? new Date(alumno.fecha_inicio).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className="fecha-cell">
                        {alumno.fecha_renovacion ? new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className={`dias-cell ${esUrgente ? 'urgente' : ''}`}>
                        {diasRestantes !== null ? diasRestantes : '-'}
                      </td>
                      <td>
                        <span className={`badge badge-${estadoBadge.clase}`}>{estadoBadge.texto}</span>
                      </td>
                      <td className="notas-cell">
                        {alumno.notas ? (
                          <button onClick={() => setSelectedNota(alumno)} className="btn-nota">
                            📝 Ver
                          </button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="acciones-cell">
                        <button onClick={() => handleEditAlumno(alumno)} className="btn-action btn-editar">✏️ Editar</button>
                        <button onClick={() => handleDeleteAlumno(alumno.id)} className="btn-action btn-delete">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedNota && (
        <div className="modal-overlay" onClick={() => setSelectedNota(null)}>
          <div className="modal modal-nota" onClick={(e) => e.stopPropagation()}>
            <h2>Notas de {selectedNota.nombre}</h2>
            <div className="modal-nota-content">
              {selectedNota.notas}
            </div>
            <button onClick={() => setSelectedNota(null)} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
