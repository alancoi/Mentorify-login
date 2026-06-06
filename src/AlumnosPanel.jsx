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
  const [showForm, setShowForm] = useState(false);
  const [showGanancia, setShowGanancia] = useState(false);
  const [coachId, setCoachId] = useState(null);
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

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const calcularDiasRestantes = (fechaRenovacion) => {
    if (!fechaRenovacion) return null;
    const hoy = new Date();
    const renovacion = new Date(fechaRenovacion);
    const diff = Math.ceil((renovacion - hoy) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getEstadoBadge = (diasRestantes) => {
    if (diasRestantes === null) return { texto: 'Sin plan', clase: 'sin-plan' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'vence-hoy' };
    if (diasRestantes <= 3) return { texto: `${diasRestantes}d`, clase: 'proximo-vencer' };
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

  // Calcular ganancia mensual
  const calcularGanancia = () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const clientesNuevos = alumnos.filter(a => {
      const fechaInicio = new Date(a.fecha_inicio);
      return fechaInicio >= inicioMes && fechaInicio <= finMes;
    });

    const totalIngreso = clientesNuevos.reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);
    
    const alumnosActivos = alumnos.filter(a => a.estado === 'Activo').length;
    const ingresoActual = alumnos
      .filter(a => a.estado === 'Activo')
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    return {
      clientesNuevos: clientesNuevos.length,
      totalIngreso: totalIngreso,
      alumnosActivos: alumnosActivos,
      ingresoActual: ingresoActual,
      proximosVencer: alumnos.filter(a => {
        const dr = calcularDiasRestantes(a.fecha_renovacion);
        return dr !== null && dr <= 7 && dr > 0;
      }).length
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
          <svg className="logo-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 5 A15 15 0 0 0 20 35 A15 15 0 0 0 20 5" fill="none" stroke="#6C4DFF" strokeWidth="3"/>
            <path d="M20 35 A15 15 0 0 0 20 5" fill="none" stroke="#482DDB" strokeWidth="3"/>
          </svg>
          <div className="header-text">
            <h1>Mentorify</h1>
            <p>Panel de Alumnos</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowGanancia(!showGanancia)} className="btn-ganancia">
            💰 Ganancia mensual
          </button>
          <button onClick={handleLogout} className="btn-logout">Salir</button>
        </div>
      </header>

      {showGanancia && (
        <section className="ganancia-section">
          <h2>Reporte de Ganancia Mensual</h2>
          <div className="ganancia-grid">
            <div className="ganancia-card">
              <div className="ganancia-label">Clientes Nuevos (este mes)</div>
              <div className="ganancia-value">{ganancia.clientesNuevos}</div>
              <div className="ganancia-subtitle">personas</div>
            </div>
            <div className="ganancia-card primary">
              <div className="ganancia-label">Ingresos Este Mes</div>
              <div className="ganancia-value">${ganancia.totalIngreso.toFixed(2)}</div>
              <div className="ganancia-subtitle">nuevos ingresos</div>
            </div>
            <div className="ganancia-card">
              <div className="ganancia-label">Clientes Activos</div>
              <div className="ganancia-value">{ganancia.alumnosActivos}</div>
              <div className="ganancia-subtitle">activos ahora</div>
            </div>
            <div className="ganancia-card highlight">
              <div className="ganancia-label">Ingresos Totales</div>
              <div className="ganancia-value">${ganancia.ingresoActual.toFixed(2)}</div>
              <div className="ganancia-subtitle">clientes activos</div>
            </div>
            <div className="ganancia-card alert">
              <div className="ganancia-label">Por Vencer (7 días)</div>
              <div className="ganancia-value">{ganancia.proximosVencer}</div>
              <div className="ganancia-subtitle">a renovar</div>
            </div>
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + Nuevo alumno
        </button>
      </section>

      {showForm && (
        <form onSubmit={handleAddAlumno} className="form-alumno">
          <div className="form-section">
            <h3>Información básica</h3>
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
            <button type="submit" className="btn-primary">Guardar alumno</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
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
                      <td className="notas-cell" title={alumno.notas}>
                        {alumno.notas ? alumno.notas.substring(0, 20) + '...' : '-'}
                      </td>
                      <td className="acciones-cell">
                        <button onClick={() => setSelectedAlumno(alumno)} className="btn-action btn-ver">Ver</button>
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

      {selectedAlumno && (
        <div className="modal-overlay" onClick={() => setSelectedAlumno(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAlumno.nombre}</h2>
            <div className="modal-content">
              {selectedAlumno.email && <p><strong>Email:</strong> {selectedAlumno.email}</p>}
              {selectedAlumno.plan_tipo && <p><strong>Plan:</strong> {selectedAlumno.plan_tipo} - ${selectedAlumno.plan_precio}</p>}
              {selectedAlumno.fecha_inicio && <p><strong>Fecha de inicio:</strong> {new Date(selectedAlumno.fecha_inicio).toLocaleDateString('es-AR')}</p>}
              {selectedAlumno.fecha_renovacion && <p><strong>Fecha de finalización:</strong> {new Date(selectedAlumno.fecha_renovacion).toLocaleDateString('es-AR')}</p>}
              {selectedAlumno.estado && <p><strong>Estado:</strong> {selectedAlumno.estado}</p>}
              {selectedAlumno.notas && <p><strong>Notas:</strong> {selectedAlumno.notas}</p>}
            </div>
            <button onClick={() => setSelectedAlumno(null)} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
