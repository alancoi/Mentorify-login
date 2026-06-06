# 📧 CONFIGURACIÓN DE EMAILS AUTOMÁTICOS

## 🔧 PASO 1: Crear tabla en Supabase

1. Ve a tu proyecto Supabase: https://app.supabase.com
2. Abre el **SQL Editor**
3. Copia y pega ESTE SQL:

```sql
-- Tabla para trackear notificaciones enviadas
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  fecha_envio TIMESTAMP DEFAULT now(),
  email_destino TEXT,
  estado TEXT DEFAULT 'enviado'
);

CREATE INDEX IF NOT EXISTS idx_notif_alumno ON notificaciones_enviadas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_notif_coach ON notificaciones_enviadas(coach_id);
CREATE INDEX IF NOT EXISTS idx_notif_tipo_fecha ON notificaciones_enviadas(tipo, fecha_envio);

ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enable_insert_notif" ON notificaciones_enviadas 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "enable_select_notif" ON notificaciones_enviadas 
  FOR SELECT USING (true);
```

4. Haz click en **"Run"** ✅

---

## 🔐 PASO 2: Agregar variable de entorno Brevo

1. En Supabase, ve a **Settings → Edge Functions**
2. En la sección **"Environment variables"**, agrega:
   - **Key**: `BREVO_API_KEY`
   - **Value**: `3954b0a3b8f1a5220856f7149636379ffccab-F1gl2aq2u2a7Ayir`
3. Click en **Save** ✅

---

## 🚀 PASO 3: Crear Edge Function

1. En Supabase, ve a **Edge Functions** (lado izquierdo)
2. Click en **"Create a new function"**
3. Nombre: `send-notifications`
4. Copia TODO el contenido de `supabase/functions/send-notifications.ts`
5. Click en **Deploy** ✅

---

## ⏰ PASO 4: Configurar Cron automático (GRATIS)

Usa **EasyCron** (gratuito) para ejecutar la función automáticamente cada día:

1. Ve a → https://www.easycron.com/
2. **Register** (gratis)
3. Ve a **"Cron Jobs"**
4. Click en **"Add a Cron Job"**
5. Llena así:
   - **URL**: `https://[tu-project].supabase.co/functions/v1/send-notifications`
   - **Cron Expression**: `0 8 * * *` (cada día a las 8 AM)
   - **HTTP Method**: GET
6. Click en **"Create Cron Job"** ✅

---

## ✅ LISTO!

Ahora:
- ✅ **Alumnos** reciben emails 3, 2, 1 día antes del vencimiento
- ✅ **Coach** recibe email cuando se vence (sin pagar)
- ✅ **Coach** recibe email cuando renueva
- ✅ Todo **100% automático** cada día a las 8 AM
- ✅ **Sin duplicados** (una vez por alumno)

---

## 🧪 PROBAR:

Si quieres probar antes de que sea mañana:

1. En Supabase, ve a **Edge Functions → send-notifications**
2. Click en el botón **"Invoke"**
3. Verás los emails que se enviarían

¡Listo! 🎉
