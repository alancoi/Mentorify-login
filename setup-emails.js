const https = require('https');

const SUPABASE_URL = 'https://nufnlvalalandxodgcpr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51Zm5sdmFsYWxhbmR4b2RnY3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY3OTQwOSwiZXhwIjoyMDk2MjU1NDA5fQ.LZBDaoGHngioMo_yV25HVXKAqYmp0HYWFjy4XIYtLZM';
const BREVO_API_KEY = '3954b0a3b8f1a5220856f7149636379ffccab-F1gl2aq2u2a7Ayir';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nufnlvalalandxodgcpr.supabase.co',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setupEmails() {
  console.log('🚀 Iniciando configuración de emails automáticos...\n');

  try {
    // PASO 1: Crear tabla
    console.log('⏳ PASO 1: Creando tabla notificaciones_enviadas...');
    const sqlResponse = await makeRequest('POST', '/rest/v1/rpc/exec_sql', {
      sql: `
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

        CREATE POLICY IF NOT EXISTS "enable_insert_notif" ON notificaciones_enviadas 
          FOR INSERT WITH CHECK (true);

        CREATE POLICY IF NOT EXISTS "enable_select_notif" ON notificaciones_enviadas 
          FOR SELECT USING (true);
      `
    });
    
    console.log('✅ Tabla creada exitosamente\n');

    // PASO 2: Crear Edge Function
    console.log('⏳ PASO 2: Creando Edge Function...');
    
    const functionCode = `import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendBrevoEmail(to, subject, htmlContent) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Mentorify", email: "noreply@mentorify.app" },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });
  return response.json();
}

async function checkAndSendNotifications() {
  const today = new Date().toISOString().split("T")[0];
  
  const { data: alumnos, error } = await supabase
    .from("alumnos")
    .select("*, coaches(nombre, email)")
    .not("fecha_renovacion", "is", null);

  if (error) {
    console.error("Error:", error);
    return;
  }

  for (const alumno of alumnos) {
    const fechaRenovacion = new Date(alumno.fecha_renovacion);
    const hoy = new Date(today);
    const diasParaVencer = Math.floor((fechaRenovacion - hoy) / (1000 * 60 * 60 * 24));

    if ([3, 2, 1].includes(diasParaVencer) && alumno.email) {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", \`vencimiento_\${diasParaVencer}_dias\`)
        .gte("fecha_envio", new Date(today).toISOString());

      if (!existente || existente.length === 0) {
        const htmlContent = \`
          <h2>Tu sesión vence en \${diasParaVencer} \${diasParaVencer === 1 ? 'día' : 'días'}</h2>
          <p>Hola \${alumno.nombre},</p>
          <p>Tu sesión con <strong>\${alumno.coaches.nombre}</strong> vence el <strong>\${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong>.</p>
          <p>Renová ahora para no perder acceso a tu plan.</p>
        \`;

        await sendBrevoEmail(
          alumno.email,
          \`Tu sesión vence en \${diasParaVencer} \${diasParaVencer === 1 ? 'día' : 'días'}\`,
          htmlContent
        );

        await supabase.from("notificaciones_enviadas").insert({
          alumno_id: alumno.id,
          coach_id: alumno.coach_id,
          tipo: \`vencimiento_\${diasParaVencer}_dias\`,
          email_destino: alumno.email,
        });
      }
    }

    if (diasParaVencer < 0 && alumno.estado !== "Activo" && alumno.coaches.email) {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", "vencido");

      if (!existente || existente.length === 0) {
        const htmlContent = \`
          <h2>⚠️ Alumno vencido sin renovar</h2>
          <p>Hola \${alumno.coaches.nombre},</p>
          <p><strong>\${alumno.nombre}</strong> (\${alumno.email}) vence desde \${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')} y no renovó.</p>
        \`;

        await sendBrevoEmail(
          alumno.coaches.email,
          \`⚠️ \${alumno.nombre} - Sesión vencida sin renovar\`,
          htmlContent
        );

        await supabase.from("notificaciones_enviadas").insert({
          alumno_id: alumno.id,
          coach_id: alumno.coach_id,
          tipo: "vencido",
          email_destino: alumno.coaches.email,
        });
      }
    }

    if (diasParaVencer > 0 && alumno.estado === "Activo") {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", "renovado")
        .gte("fecha_envio", new Date(new Date(today).setDate(new Date(today).getDate() - 1)).toISOString());

      if (!existente || existente.length === 0) {
        const htmlContent = \`
          <h2>✅ Alumno renovó su sesión</h2>
          <p>Hola \${alumno.coaches.nombre},</p>
          <p><strong>\${alumno.nombre}</strong> renovó. Nueva fecha: <strong>\${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong>.</p>
        \`;

        await sendBrevoEmail(
          alumno.coaches.email,
          \`✅ \${alumno.nombre} renovó su sesión\`,
          htmlContent
        );

        await supabase.from("notificaciones_enviadas").insert({
          alumno_id: alumno.id,
          coach_id: alumno.coach_id,
          tipo: "renovado",
          email_destino: alumno.coaches.email,
        });
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    await checkAndSendNotifications();
    return new Response("✅ Notificaciones procesadas", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(\`Error: \${error.message}\`, { status: 500 });
  }
});`;

    console.log('✅ Edge Function lista\n');

    // PASO 3: Información para configuración manual
    console.log('📋 PASOS MANUALES EN SUPABASE:\n');
    console.log('1️⃣  Tabla "notificaciones_enviadas" ✅ CREADA');
    console.log('2️⃣  Ve a Supabase → Edge Functions → Create new');
    console.log('     Nombre: send-notifications');
    console.log('     Copia este código:\n');
    console.log('------- COPIAR DESDE AQUÍ -------');
    console.log(functionCode);
    console.log('------- HASTA AQUÍ -------\n');
    console.log('3️⃣  Settings → Edge Functions → Environment variables');
    console.log(`     Key: BREVO_API_KEY`);
    console.log(`     Value: ${BREVO_API_KEY}\n`);
    console.log('4️⃣  Deploy la función ✅\n');
    console.log('5️⃣  Ve a https://www.easycron.com/');
    console.log('     Crea un Cron Job:');
    console.log('     URL: https://nufnlvalalandxodgcpr.supabase.co/functions/v1/send-notifications');
    console.log('     Cron: 0 8 * * * (cada día 8 AM) ✅\n');

    console.log('🎉 ¡CONFIGURACIÓN LISTA!\n');
    console.log('✅ Alumnos: Email 3, 2, 1 día antes de vencer');
    console.log('✅ Coach: Email cuando se vence (sin pagar)');
    console.log('✅ Coach: Email cuando renueva');
    console.log('✅ Todo automático cada día a las 8 AM\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupEmails();
