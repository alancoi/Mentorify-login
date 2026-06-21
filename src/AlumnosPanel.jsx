import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import './AlumnosPanel.css';

export default function AlumnosPanel() {
  const [alumnos, setAlumnos] = useState([]);
  const [filtro, setFiltro] = useState('Activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);
  const [editingAlumno, setEditingAlumno] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showGanancia, setShowGanancia] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [alumnoARenovar, setAlumnoARenovar] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [coachId, setCoachId] = useState(null);
  const [coachNombre, setCoachNombre] = useState('');
  const [coachPlan, setCoachPlan] = useState('basico');
  const [coachPlanLimite, setCoachPlanLimite] = useState(20);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [showNombreNegocioModal, setShowNombreNegocioModal] = useState(false);
  const [tempNombreNegocio, setTempNombreNegocio] = useState('');
  const [importData, setImportData] = useState([]);
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('No hay sesión activa. Por favor ingresa de nuevo.');
        setLoading(false);
        return;
      }

      let { data: coach, error: getError } = await supabase
        .from('coaches')
        .select('id, plan, student_limit, nombre, nombre_negocio')
        .eq('id', user.id)
        .maybeSingle();

      if (getError && getError.code !== 'PGRST116') throw getError;

      if (!coach) {
        const { data: newCoach, error: insertError } = await supabase
          .from('coaches')
          .insert([{ id: user.id, nombre: user.email.split('@')[0], plan: 'basico', student_limit: 15 }])
          .select();
        
        if (insertError) throw insertError;
        if (!newCoach || newCoach.length === 0) throw new Error('Failed to create coach');
        coach = newCoach[0];
      }

      if (!coach || !coach.id) throw new Error('No coach ID');
      setCoachId(coach.id);
      setCoachNombre(coach.nombre || '');
      setCoachPlan(coach.plan || 'basico');
      setCoachPlanLimite(coach.student_limit || 20);
      setNombreNegocio(coach.nombre_negocio || '');

      console.log('Coach data:', coach);
      console.log('nombre_negocio value:', coach.nombre_negocio);
      console.log('Is nombre_negocio falsy?', !coach.nombre_negocio);

      // Si no tiene nombre_negocio, mostrar modal
      if (!coach.nombre_negocio) {
        console.log('Seteando showNombreNegocioModal a true');
        setShowNombreNegocioModal(true);
      }

      loadAlumnos(coach.id);
    } catch (err) {
      console.error('Init error:', err);
      setError(err.message || 'Error al inicializar');
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

  async function saveNombreNegocio() {
    if (!tempNombreNegocio.trim()) {
      alert('Por favor ingresa el nombre de tu negocio');
      return;
    }

    if (!coachId) {
      alert('Error: No se pudo identificar tu cuenta');
      return;
    }

    try {
      console.log('Guardando nombre_negocio:', tempNombreNegocio, 'para coachId:', coachId);

      const { data, error } = await supabase
        .from('coaches')
        .update({ nombre_negocio: tempNombreNegocio })
        .eq('id', coachId)
        .select();

      console.log('Respuesta:', data, error);

      if (error) throw error;

      setNombreNegocio(tempNombreNegocio);
      setShowNombreNegocioModal(false);
      setTempNombreNegocio('');
      alert('✅ Nombre guardado correctamente');
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar: ' + err.message);
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
      setSuccessMsg('❌ Error: ' + err.message);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data = [];

      if (file.name.endsWith('.csv')) {
        // Procesar CSV
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          if (row.nombre) data.push(row);
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Procesar XLSX con FileReader
        const reader = new FileReader();
        
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = (evt) => {
            try {
              const workbook = XLSX.read(evt.target.result, { type: 'binary' });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(worksheet);
              resolve(rows);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Error reading file'));
          reader.readAsBinaryString(file);
        });

        data = fileData.map(row => {
          const normalized = {};
          Object.keys(row).forEach(key => {
            normalized[key.toLowerCase().replace(/\s+/g, '_')] = row[key] || '';
          });
          return normalized;
        }).filter(row => row.nombre || row.name);
      } else {
        alert('Por favor usa un archivo CSV o XLSX');
        return;
      }

      setImportData(data);
      if (data.length === 0) {
        alert('No se encontraron alumnos en el archivo');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al leer el archivo: ' + err.message);
    }
  }

  async function handleConfirmImport() {
    if (!importData.length) {
      alert('No hay datos para importar');
      return;
    }

    try {
      const alumnosToInsert = importData.map(row => ({
        coach_id: coachId,
        nombre: row.nombre || '',
        email: row.email || '',
        plan_tipo: row.plan_tipo || 'Básico',
        plan_precio: parseFloat(row.plan_precio) || 0,
        fecha_inicio: row.fecha_inicio || null,
        fecha_renovacion: row.fecha_renovacion || null,
        estado: row.estado || 'Activo',
        notas: row.notas || ''
      }));

      const { error: err } = await supabase
        .from('alumnos')
        .insert(alumnosToInsert);

      if (err) throw err;

      setSuccessMsg(`✅ ${importData.length} alumnos importados exitosamente`);
      setImportData([]);
      setShowImport(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadAlumnos(coachId);
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  }

  async function handleExportToExcel() {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const dataToExport = alumnos.map(alumno => {
        const dr = calcularDiasRestantes(alumno.fecha_renovacion);
        let estadoReal = 'Sin plan';
        if (dr !== null) {
          if (dr < 0) estadoReal = `Vencido (${Math.abs(dr)} días)`;
          else if (dr === 0) estadoReal = 'Vence hoy';
          else if (dr <= 3) estadoReal = `Por vencer (${dr} días)`;
          else estadoReal = 'Activo';
        }

        return {
          Nombre: alumno.nombre || '',
          Email: alumno.email || '',
          Plan: alumno.plan_tipo || '',
          Precio: alumno.plan_precio || '',
          'Fecha inicio': alumno.fecha_inicio
            ? (() => {
                const str = alumno.fecha_inicio.split('T')[0];
                const [y, m, d] = str.split('-');
                return `${d}/${m}/${y}`;
              })()
            : '',
          'Fecha vencimiento': alumno.fecha_renovacion
            ? (() => {
                const str = alumno.fecha_renovacion.split('T')[0];
                const [y, m, d] = str.split('-');
                return `${d}/${m}/${y}`;
              })()
            : '',
          'Días restantes': dr !== null ? dr : '',
          Estado: estadoReal,
          Notas: alumno.notas || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos');

      worksheet['!cols'] = [
        { wch: 22 }, { wch: 28 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 30 }
      ];

      XLSX.writeFile(workbook, `mentorify_alumnos_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccessMsg('✅ Excel descargado exitosamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Error al descargar: ' + err.message);
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

  const calcularDiasRestantes = (fechaRenovacion) => {
    if (!fechaRenovacion) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Parsear fecha sin convertir a Date para evitar desfase de zona horaria
    const fechaStr = fechaRenovacion.split('T')[0];
    const [year, month, day] = fechaStr.split('-');
    const renovacion = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    renovacion.setHours(0, 0, 0, 0);
    const diff = Math.ceil((renovacion - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredAlumnos = alumnos.filter(a => {
    let matchFiltro = true;
    if (filtro === 'Activos') {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      matchFiltro = dr !== null && dr > 3;
    } else if (filtro === 'Por vencer') {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      matchFiltro = dr !== null && dr >= 0 && dr <= 3;
    }
    const matchSearch = a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       a.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFiltro && matchSearch;
  });

  async function sendEmailAlumno(tipo, alumno) {
    try {
      await fetch('https://nufnlvalalandxodgcpr.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sb_publishable_qfqNxB63q60T-u-p3UlLoA_yCH9i0PS`
        },
        body: JSON.stringify({ tipo, alumno, coachNombre })
      })
    } catch (err) {
      console.error('Error enviando email:', err)
    }
  }

  async function handleAddAlumno(e) {
    e.preventDefault();
    try {
      if (!coachId) throw new Error('Coach not initialized');
      
      // Validar límite de alumnos
      if (!editingAlumno && alumnos.length >= coachPlanLimite) {
        alert(`❌ Límite alcanzado: tu plan ${coachPlan} permite máximo ${coachPlanLimite} alumnos. Contacta al admin para upgrade.`);
        return;
      }
      
      const compensateDate = (dateString) => {
        if (!dateString) return null;
        return dateString;
      };

      if (editingAlumno) {
        const { error: err } = await supabase
          .from('alumnos')
          .update({
            nombre: formData.nombre,
            email: formData.email,
            fecha_inicio: compensateDate(formData.fecha_inicio),
            fecha_renovacion: compensateDate(formData.fecha_renovacion),
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
          fecha_inicio: compensateDate(formData.fecha_inicio),
          fecha_renovacion: compensateDate(formData.fecha_renovacion),
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

  async function handleRenovar(alumno, meses) {
    try {
      let base;
      if (alumno.fecha_renovacion) {
        const fechaStr = alumno.fecha_renovacion.split('T')[0];
        const [year, month, day] = fechaStr.split('-');
        base = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        base = new Date();
        base.setHours(0, 0, 0, 0);
      }
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const desde = base < hoy ? hoy : base;
      const nueva = new Date(desde);
      nueva.setMonth(nueva.getMonth() + meses);
      const año = nueva.getFullYear();
      const mes = String(nueva.getMonth() + 1).padStart(2, '0');
      const día = String(nueva.getDate()).padStart(2, '0');
      const nuevaFecha = `${año}-${mes}-${día}`;

      const { error } = await supabase
        .from('alumnos')
        .update({ fecha_renovacion: nuevaFecha })
        .eq('id', alumno.id);

      if (error) throw error;
      setShowRenovarModal(false);
      setAlumnoARenovar(null);
      loadAlumnos(coachId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDeleteAlumno(id) {
    if (!confirm('¿Eliminar este alumno?')) return;
    try {
      console.log('Eliminando alumno:', id);
      const { error: err } = await supabase.from('alumnos').delete().eq('id', id);
      if (err) {
        console.error('Error eliminando:', err);
        throw err;
      }
      console.log('Alumno eliminado, recargando...');
      await loadAlumnos(coachId);
      alert('✅ Alumno eliminado');
    } catch (err) {
      console.error('Error en handleDeleteAlumno:', err);
      alert('❌ Error al eliminar: ' + err.message);
    }
  }

  function handleEditAlumno(alumno) {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      // Parse sin usar new Date() para evitar desfase de zona horaria
      const dateStr = dateString.split('T')[0];
      return dateStr;
    };

    setEditingAlumno(alumno);
    setFormData({
      nombre: alumno.nombre,
      email: alumno.email || '',
      fecha_inicio: formatDate(alumno.fecha_inicio),
      fecha_renovacion: formatDate(alumno.fecha_renovacion),
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

  const getEstadoBadge = (diasRestantes) => {
    if (diasRestantes === null) return { texto: 'Sin plan', clase: 'sin-plan' };
    if (diasRestantes < 0) return { texto: `${Math.abs(diasRestantes)} días vencido`, clase: 'vencido' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'vence-hoy' };
    if (diasRestantes <= 3) return { texto: `${diasRestantes} días`, clase: 'proximo-vencer' };
    return { texto: 'Al día', clase: 'al-dia' };
  };

  const stats = {
    activos: alumnos.filter(a => {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      return dr !== null && dr > 3;
    }).length,
    porVencer: alumnos.filter(a => {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      return dr !== null && dr >= 0 && dr <= 3;
    }).length,
    vencidos: alumnos.filter(a => {
      const dr = calcularDiasRestantes(a.fecha_renovacion);
      return dr !== null && dr < 0;
    }).length,
  };

  const calcularGanancia = () => {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);

    // Facturación mes pasado: alumnos cuya fecha_inicio fue el mes pasado
    const totalIngresoMesPasado = alumnos
      .filter(a => {
        if (!a.fecha_inicio) return false;
        const fechaStr = a.fecha_inicio.split('T')[0];
        const [year, month, day] = fechaStr.split('-');
        const f = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return f >= inicioMesPasado && f <= finMesPasado;
      })
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    // Facturación este mes: alumnos cuya fecha_inicio es este mes (hasta hoy)
    const totalIngresoEsteMes = alumnos
      .filter(a => {
        if (!a.fecha_inicio) return false;
        const fechaStr = a.fecha_inicio.split('T')[0];
        const [year, month, day] = fechaStr.split('-');
        const f = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return f >= inicioMes && f <= hoy;
      })
      .reduce((sum, a) => sum + (parseFloat(a.plan_precio) || 0), 0);

    // Clientes nuevos este mes
    const clientesNuevos = alumnos.filter(a => {
      if (!a.fecha_inicio) return false;
      const fechaStr = a.fecha_inicio.split('T')[0];
      const [year, month, day] = fechaStr.split('-');
      const f = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return f >= inicioMes && f <= finMes;
    }).length;

    return {
      totalIngreso: totalIngresoEsteMes,
      ingresoMesPasado: totalIngresoMesPasado,
      clientesNuevos,
    };
  };

  const ganancia = calcularGanancia();

  console.log('Render AlumnosPanel - showNombreNegocioModal:', showNombreNegocioModal, 'nombreNegocio:', nombreNegocio);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px', color: '#666' }}>Cargando...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#f00', marginBottom: '20px' }}>Error: {error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            background: '#6C4DFF',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Volver al Login
        </button>
      </div>
    );
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
            {nombreNegocio && (
              <p style={{ fontSize: '16px', color: '#6C4DFF', fontWeight: '600', margin: '4px 0' }}>
                {nombreNegocio}
              </p>
            )}
            <p className="header-plan">
              Plan: <strong>{coachPlan === 'basico' ? 'Básico' : coachPlan === 'estandar' ? 'Estándar' : 'Premium'}</strong>
              ({alumnos.length}/{coachPlanLimite} alumnos)
            </p>
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
              <div className="ganancia-label">Clientes Nuevos Este Mes</div>
              <div className="ganancia-value">{ganancia.clientesNuevos}</div>
              <div className="ganancia-subtitle">incorporados este mes</div>
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
                href="mailto:appmentorify@gmail.com?subject=Reporte%20de%20Error%20o%20Mejora%20-%20Mentorify&body=Hola,%0A%0AQuiero%20reportar%20un%20error%20o%20sugerir%20una%20mejora%20en%20Mentorify:%0A%0A"
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
          <div className="stat-number">{stats.activos}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className={`stat-card ${stats.porVencer > 0 ? 'alert-warning' : ''}`}>
          <div className="stat-number" style={{ color: stats.porVencer > 0 ? '#e65100' : undefined }}>{stats.porVencer}</div>
          <div className="stat-label">⚠️ Por vencer</div>
        </div>
        <div className={`stat-card ${stats.vencidos > 0 ? 'alert' : ''}`}>
          <div className="stat-number" style={{ color: stats.vencidos > 0 ? '#c62828' : undefined }}>{stats.vencidos}</div>
          <div className="stat-label">🔴 Vencidos</div>
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
          {['Todos', 'Activos', 'Por vencer'].map(estado => (
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
        <button onClick={() => setShowImport(!showImport)} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
          📥 Importar Excel
        </button>
        <button onClick={handleExportToExcel} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
          📤 Descargar Excel
        </button>
      </section>

      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setImportData([]); }}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <h2>📥 Importar alumnos desde Excel</h2>

            {importData.length === 0 ? (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '1rem' }}>
                  El archivo debe tener estas columnas (en ese orden):
                </p>
                <div className="import-example" style={{ fontSize: '12px', marginBottom: '1.25rem' }}>
                  nombre · email · plan_tipo · plan_precio · fecha_inicio · fecha_renovacion · notas
                </div>
                <button
                  onClick={() => {
                    const ws = XLSX.utils.aoa_to_sheet([
                      ['nombre','email','plan_tipo','plan_precio','fecha_inicio','fecha_renovacion','notas'],
                      ['Juan Pérez','juan@email.com','Básico','5000','2026-06-01','2026-07-01','']
                    ]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
                    XLSX.writeFile(wb, 'template_alumnos.xlsx');
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  📄 Descargar template de ejemplo
                </button>
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleImportFile}
                    style={{ display: 'none' }}
                  />
                  <span className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                    Seleccionar archivo Excel / CSV
                  </span>
                </label>
              </div>
            ) : (
              <div>
                <p style={{ color: '#333', fontSize: '14px', marginBottom: '1rem' }}>
                  Se encontraron <strong>{importData.length} alumnos</strong>. Vista previa:
                </p>
                <div className="import-table-wrapper">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.nombre}</td>
                          <td>{row.email}</td>
                          <td>{row.plan_tipo || '—'}</td>
                          <td>${row.plan_precio || '0'}</td>
                        </tr>
                      ))}
                      {importData.length > 5 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#999', fontSize: '12px', padding: '8px' }}>
                            ... y {importData.length - 5} alumno{importData.length - 5 !== 1 ? 's' : ''} más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  <button onClick={handleConfirmImport} className="btn-primary" style={{ flex: 1 }}>
                    ✅ Importar {importData.length} alumnos
                  </button>
                  <button onClick={() => setImportData([])} className="btn-secondary" style={{ flex: 1 }}>
                    Volver
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => { setShowImport(false); setImportData([]); }} className="btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

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
                        {alumno.fecha_inicio ? (() => {
                          const str = alumno.fecha_inicio.split('T')[0];
                          const [y, m, d] = str.split('-');
                          return `${d}/${m}/${y}`;
                        })() : '-'}
                      </td>
                      <td className="fecha-cell">
                        {alumno.fecha_renovacion ? (() => {
                          const str = alumno.fecha_renovacion.split('T')[0];
                          const [y, m, d] = str.split('-');
                          return `${d}/${m}/${y}`;
                        })() : '-'}
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
                        <button onClick={() => { setAlumnoARenovar(alumno); setShowRenovarModal(true); }} className="btn-action btn-renovar">🔄 Renovar</button>
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

      {showRenovarModal && alumnoARenovar && (
        <div className="modal-overlay" onClick={() => setShowRenovarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔄 Renovar acceso</h2>
            <p style={{ color: '#555', marginBottom: '1.5rem' }}>
              <strong>{alumnoARenovar.nombre}</strong> — elegí por cuánto tiempo renovar:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              {[1, 3, 6, 12].map(meses => (
                <button
                  key={meses}
                  onClick={() => handleRenovar(alumnoARenovar, meses)}
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #6C4DFF, #482DDB)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '700',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={e => e.target.style.opacity = '0.85'}
                  onMouseOut={e => e.target.style.opacity = '1'}
                >
                  {meses === 1 ? '1 mes' : meses === 12 ? '1 año' : `${meses} meses`}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRenovarModal(false)} className="btn-secondary">Cancelar</button>
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

      {showNombreNegocioModal && (
        <div className="modal-overlay" onClick={() => setShowNombreNegocioModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nombre de tu negocio</h2>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '1rem' }}>Coaching o consultoría</p>

            <input
              type="text"
              placeholder="Academia de Liderazgo, Coaching Ejecutivo, Cantando con Gabriel, Mariana Nutrición"
              value={tempNombreNegocio}
              onChange={(e) => setTempNombreNegocio(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') saveNombreNegocio();
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '1rem',
                fontFamily: 'Inter, sans-serif',
                boxSizing: 'border-box'
              }}
              autoFocus
            />

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Con este nombre se enviarán las notificaciones automáticas a tus alumnos
            </p>

            <button
              onClick={saveNombreNegocio}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #6C4DFF, #482DDB)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                fontFamily: 'Inter, sans-serif',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={e => e.target.style.opacity = '0.85'}
              onMouseOut={e => e.target.style.opacity = '1'}
            >
              Ingresar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
