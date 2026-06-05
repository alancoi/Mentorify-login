import { useState, useEffect } from 'react';
import { getAlumnos, createAlumno, updateAlumno, deleteAlumno } from './services/alumnosService';
import { supabase } from './supabase';
import './AlumnosPanel.css';

export default function AlumnosPanel() {
  const [alumnos, setAlumnos] = useState([]);
  const [filtro, setFiltro] = useState('Activo');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', nivel: 'Básico', estado: 'Activo', notas: '' });

  useEffect(() => {
    loadAlumnos();
  }, []);

  async function loadAlumnos() {
    try {
      setLoading(true);
      const data = await getAlumnos();
      setAlumnos(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAlumnos = alumnos.filter(a => {
    const matchFiltro = filtro === 'Todos' || a.estado === filtro;
    const matchSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFiltro && matchSearch;
  });

  async function handleAddAlumno(e) {
    e.preventDefault();
    try {
      await createAlumno(formData);
      setFormData({ nombre: '', email: '', nivel: 'Básico', estado: 'Activo', notas: '' });
      setShowForm(false);
      loadAlumnos();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleDeleteAlumno(id) {
    if (confirm('¿Eliminar alumno?')) {
      try {
        await deleteAlumno(id);
        loadAlumnos();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const stats = {
    total: alumnos.length,
    activos: alumnos.filter(a => a.estado === 'Activo').length,
    pausados: alumnos.filter(a => a.estado === 'Pausado').length,
  };

  return (
    <div className="panel-container">
      <header className="panel-header">
        <div className="header-left">
          <img src="data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 5 A15 15 0 0 0 20 35 A15 15 0 0 0 20 5' fill='none' stroke='%236C4DFF' stroke-width='3'/%3E%3Cpath d='M20 35 A15 15 0 0 0 20 5' fill='none' stroke='%23482DDB' stroke-width='3'/%3E%3C/svg%3E" alt="Logo" className="logo" />
          <h1>Panel de Alumnos</h1>
        </div>
        <button onClick={handleLogout} className="btn-logout">Cerrar sesión</button>
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
        <div className="stat-card">
          <div className="stat-number">{stats.pausados}</div>
          <div className="stat-label">Pausados</div>
        </div>
      </section>

      <section className="controls">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Buscar alumno..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters">
          {['Todos', 'Activo', 'Pausado'].map(estado => (
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
          + Agregar alumno
        </button>
      </section>

      {showForm && (
        <form onSubmit={handleAddAlumno} className="form-alumno">
          <input 
            type="text" 
            placeholder="Nombre" 
            required
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
          />
          <input 
            type="email" 
            placeholder="Email (opcional)"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <select value={formData.nivel} onChange={(e) => setFormData({...formData, nivel: e.target.value})}>
            <option>Básico</option>
            <option>Medio</option>
            <option>Alto</option>
          </select>
          <textarea 
            placeholder="Notas"
            value={formData.notas}
            onChange={(e) => setFormData({...formData, notas: e.target.value})}
          />
          <div className="form-buttons">
            <button type="submit" className="btn-primary">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      <section className="alumnos-list">
        {loading ? (
          <p>Cargando...</p>
        ) : filteredAlumnos.length === 0 ? (
          <p className="empty">No hay alumnos</p>
        ) : (
          <table className="alumnos-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlumnos.map(alumno => (
                <tr key={alumno.id} className={`row-${alumno.estado.toLowerCase()}`}>
                  <td><strong>{alumno.nombre}</strong></td>
                  <td>{alumno.email || '-'}</td>
                  <td>{alumno.nivel}</td>
                  <td>
                    <span className={`badge badge-${alumno.estado.toLowerCase()}`}>
                      {alumno.estado}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setSelectedAlumno(alumno)} className="btn-small">Ver</button>
                    <button onClick={() => handleDeleteAlumno(alumno.id)} className="btn-small btn-danger">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedAlumno && (
        <div className="modal-overlay" onClick={() => setSelectedAlumno(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAlumno.nombre}</h2>
            <p><strong>Email:</strong> {selectedAlumno.email || 'No especificado'}</p>
            <p><strong>Nivel:</strong> {selectedAlumno.nivel}</p>
            <p><strong>Estado:</strong> {selectedAlumno.estado}</p>
            <p><strong>Notas:</strong> {selectedAlumno.notas || 'Sin notas'}</p>
            <button onClick={() => setSelectedAlumno(null)} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
// Panel actualizado
