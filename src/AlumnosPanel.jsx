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
  const [showSettings, setShowSettings] = useState(false);
  const [coachId, setCoachId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    fecha_inicio: '',
    fecha_renovacion: '',
    plan_tipo: 'Básico',
    plan_precio: '',
    estado: 'Activo'
  });

  useEffect(() => {
    initializeCoach();
  }, []);

  async function initializeCoach() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create coach
      let { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!coach) {
        const { data: newCoach } = await supabase
          .from('coaches')
          .insert([{ user_id: user.id, nombre: user.email.split('@')[0] }])
          .select('id')
          .single();
        coach = newCoach;
      }

      setCoachId(coach.id);
      loadAlumnos(coach.id);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  async function loadAlumnos(cId) {
    try {
      const { data } = await supabase
        .from('alumnos')
        .select('*')
        .eq('coach_id', cId)
        .order('created_at', { ascending: false });
      setAlumnos(data || []);
    } catch (err) {
      console.error('Error:', err);
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
      const { error: err } = await supabase.from('alumnos').insert([{
        ...formData,
        coach_id: coachId,
        plan_precio: parseFloat(formData.plan_precio) || 0
      }]);
      
      if (err) throw err;
      
      setFormData({
        nombre: '',
        email: '',
        fecha_inicio: '',
        fecha_renovacion: '',
        plan_tipo: 'Básico',
        plan_precio: '',
        estado: 'Activo'
      });
      setShowForm(false);
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

  const getEstadoPago = (diasRestantes) => {
    if (diasRestantes === null) return 'Sin plan';
    if (diasRestantes === 0) return '⚠️ Vence hoy';
    if (diasRestantes === 1) return '🔴 1 día';
    if (diasRestantes === 2) return '🟠 2 días';
    if (diasRestantes === 3) return '🟡 3 días';
    return '✅ Al día';
  };

  const stats = {
    total: alumnos.length,
    activos: alumnos.filter(a => a.estado === 'Activo').length,
    vencerse: alumnos.filter(a => calcularDiasRestantes(a.fecha_renovacion) <= 3 && calcularDiasRestantes(a.fecha_renovacion) !== null).length,
  };

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
          <button onClick={handleLogout} className="btn-logout">Salir</button>
        </div>
      </header>

      <section className="stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total de alumnos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activos}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className="stat-card alert">
          <div className="stat-number">{stats.vencerse}</div>
          <div className="stat-label">Por vencer en 3 días</div>
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
            <input 
              type="date" 
              placeholder="Fecha de inicio"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
            />
            <input 
              type="date" 
              placeholder="Fecha de renovación"
              value={formData.fecha_renovacion}
              onChange={(e) => setFormData({...formData, fecha_renovacion: e.target.value})}
            />
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
          <div className="alumnos-grid">
            {filteredAlumnos.map(alumno => {
              const diasRestantes = calcularDiasRestantes(alumno.fecha_renovacion);
              return (
                <div key={alumno.id} className="alumno-card">
                  <div className="card-header">
                    <h3>{alumno.nombre}</h3>
                    <span className={`badge badge-${alumno.estado.toLowerCase()}`}>{alumno.estado}</span>
                  </div>
                  
                  {alumno.email && <p className="card-email">📧 {alumno.email}</p>}
                  
                  {alumno.plan_tipo && (
                    <div className="card-section">
                      <div className="section-title">Plan</div>
                      <p>{alumno.plan_tipo} ${alumno.plan_precio}</p>
                    </div>
                  )}

                  {alumno.fecha_renovacion && (
                    <div className="card-section">
                      <div className="section-title">Estado</div>
                      <div className="dias-badge">{getEstadoPago(diasRestantes)}</div>
                      {diasRestantes !== null && <p className="dias-texto">{diasRestantes} días restantes</p>}
                    </div>
                  )}

                  {alumno.fecha_inicio && (
                    <div className="card-section">
                      <div className="section-title">Fechas</div>
                      <p>Inicio: {new Date(alumno.fecha_inicio).toLocaleDateString('es-AR')}</p>
                      {alumno.fecha_renovacion && <p>Renovación: {new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</p>}
                    </div>
                  )}

                  <div className="card-actions">
                    <button onClick={() => setSelectedAlumno(alumno)} className="btn-small">Ver detalle</button>
                    <button className="btn-small btn-mail">📧 Mail</button>
                  </div>
                </div>
              );
            })}
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
              {selectedAlumno.fecha_inicio && <p><strong>Inicio:</strong> {new Date(selectedAlumno.fecha_inicio).toLocaleDateString('es-AR')}</p>}
              {selectedAlumno.fecha_renovacion && <p><strong>Renovación:</strong> {new Date(selectedAlumno.fecha_renovacion).toLocaleDateString('es-AR')}</p>}
              {selectedAlumno.estado && <p><strong>Estado:</strong> {selectedAlumno.estado}</p>}
            </div>
            <button onClick={() => setSelectedAlumno(null)} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
