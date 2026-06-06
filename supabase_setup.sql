-- Tabla para trackear notificaciones enviadas
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'vencimiento_3_dias', 'vencimiento_2_dias', 'vencimiento_1_dia', 'vencido', 'renovado'
  fecha_envio TIMESTAMP DEFAULT now(),
  email_destino TEXT,
  estado TEXT DEFAULT 'enviado'
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notif_alumno ON notificaciones_enviadas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_notif_coach ON notificaciones_enviadas(coach_id);
CREATE INDEX IF NOT EXISTS idx_notif_tipo_fecha ON notificaciones_enviadas(tipo, fecha_envio);

-- Habilitar RLS
ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "enable_insert_notif" ON notificaciones_enviadas 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "enable_select_notif" ON notificaciones_enviadas 
  FOR SELECT USING (true);
