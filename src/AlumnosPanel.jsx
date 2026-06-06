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
      
      if (editingAlumno) {
        // Actualizar alumno existente
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
        // Crear nuevo alumno
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

  // Calcular ganancia mensual
  const calcularGanancia = () => {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    // Clientes nuevos este mes
    const clientesNuevos = alumnos.filter(a => {
      const fechaInicio = new Date(a.fecha_inicio);
      return fechaInicio >= inicioMes && fechaInicio <= finMes;
    });

    // Ingresos este mes (hasta hoy)
    const totalIngresoEsteMes = alumnos
      .filter(a => {
        const fechaInicio = new Date(a.fecha_inicio);
        return fechaInicio >= inicioMes && fechaInicio <= hoy;
      })
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    // Ingresos mes pasado COMPLETO
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

    // Comparación: % del mes pasado que llevas facturado
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
          <svg className="logo-icon" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#6C4DFF', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#482DDB', stopOpacity: 1}} />
              </linearGradient>
            </defs>
            {/* Infinito - lazo izquierdo */}
            <path d="M 40 60 C 40 40, 50 30, 65 30 C 80 30, 85 40, 85 55 C 85 70, 80 80, 65 80 C 50 80, 40 70, 40 60" 
              fill="none" stroke="url(#logoGradient)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Infinito - lazo derecho */}
            <path d="M 115 60 C 115 40, 120 30, 135 30 C 150 30, 160 40, 160 55 C 160 70, 150 80, 135 80 C 120 80, 115 70, 115 60" 
              fill="none" stroke="url(#logoGradient)" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round"/>
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
