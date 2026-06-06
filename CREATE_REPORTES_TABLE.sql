-- Crear tabla de reportes de errores
CREATE TABLE IF NOT EXISTS reportes_errores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  user_email TEXT,
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP DEFAULT now(),
  estado TEXT DEFAULT 'Nuevo',
  created_at TIMESTAMP DEFAULT now()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_reportes_coach_id ON reportes_errores(coach_id);
CREATE INDEX IF NOT EXISTS idx_reportes_fecha ON reportes_errores(fecha);

-- Habilitar RLS
ALTER TABLE reportes_errores ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "enable_insert_reportes" ON reportes_errores 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "enable_select_reportes" ON reportes_errores 
  FOR SELECT USING (true);
