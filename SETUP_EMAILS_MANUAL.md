# ✅ CONFIGURACIÓN DE EMAILS AUTOMÁTICOS - PASOS MANUALES

## 📌 RESUMEN

Tabla creada ✅. Ahora faltan 3 pasos manuales en Supabase.

---

## 🔧 PASO 1: Crear la Edge Function

1. Ve a tu Supabase → **Edge Functions** (menú izquierdo)
2. Click en **"Create a new function"**
3. Nombre: `send-notifications`
4. Selecciona **TypeScript**
5. **Copia COMPLETAMENTE este código:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendBrevoEmail(to: string, subject: string, htmlContent: string) {
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
    const diasParaVencer = Math.floor((fechaRenovacion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // EMAILS ALUMNO: 3, 2, 1 día
    if ([3, 2, 1].includes(diasParaVencer) && alumno.email) {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", `vencimiento_${diasParaVencer}_dias`)
        .gte("fecha_envio", new Date(today).toISOString());

      if (!existente || existente.length === 0) {
        const htmlContent = `
          <h2>Tu sesión vence en ${diasParaVencer} ${diasParaVencer === 1 ? 'día' : 'días'}</h2>
          <p>Hola ${alumno.nombre},</p>
          <p>Tu sesión con <strong>${alumno.coaches.nombre}</strong> vence el <strong>${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong>.</p>
          <p>Renová ahora para no perder acceso a tu plan.</p>
          <p>Saludos,<br/>El equipo de Mentorify</p>
        `;

        await sendBrevoEmail(
          alumno.email,
          `Tu sesión vence en ${diasParaVencer} ${diasParaVencer === 1 ? 'día' : 'días'}`,
          htmlContent
        );

        await supabase.from("notificaciones_enviadas").insert({
          alumno_id: alumno.id,
          coach_id: alumno.coach_id,
          tipo: `vencimiento_${diasParaVencer}_dias`,
          email_destino: alumno.email,
        });
      }
    }

    // EMAIL COACH: Se venció (sin pagar)
    if (diasParaVencer < 0 && alumno.estado !== "Activo" && alumno.coaches.email) {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", "vencido");

      if (!existente || existente.length === 0) {
        const htmlContent = `
          <h2>⚠️ Alumno vencido sin renovar</h2>
          <p>Hola ${alumno.coaches.nombre},</p>
          <p><strong>${alumno.nombre}</strong> (${alumno.email}) tiene una sesión vencida desde el <strong>${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong> y aún no renovó.</p>
          <p>Considera contactarlo para renovar su plan.</p>
        `;

        await sendBrevoEmail(
          alumno.coaches.email,
          `⚠️ ${alumno.nombre} - Sesión vencida sin renovar`,
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

    // EMAIL COACH: Renovó
    if (diasParaVencer > 0 && alumno.estado === "Activo") {
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", "renovado")
        .gte("fecha_envio", new Date(new Date(today).setDate(new Date(today).getDate() - 1)).toISOString());

      if (!existente || existente.length === 0) {
        const htmlContent = `
          <h2>✅ Alumno renovó su sesión</h2>
          <p>Hola ${alumno.coaches.nombre},</p>
          <p><strong>${alumno.nombre}</strong> renovó su plan. Nueva fecha de vencimiento: <strong>${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong>.</p>
        `;

        await sendBrevoEmail(
          alumno.coaches.email,
          `✅ ${alumno.nombre} renovó su sesión`,
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
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
```

6. Click en **"Deploy"** ✅

---

## 🔐 PASO 2: Agregar Variable de Entorno Brevo

1. En Supabase, ve a **Settings → Edge Functions**
2. En la sección **"Environment Variables"**, click en **"New Variable"**
3. Llena:
   - **Name**: `BREVO_API_KEY`
   - **Value**: `3954b0a3b8f1a5220856f7149636379ffccab-F1gl2aq2u2a7Ayir`
4. Click en **"Save"** ✅

---

## ⏰ PASO 3: Configurar Cron Automático (GRATIS)

1. Ve a → https://www.easycron.com/
2. Click en **"Register"** (crear cuenta gratuita)
3. Inicia sesión
4. Ve a **"Cron Jobs"** (menú izquierdo)
5. Click en **"Add a Cron Job"**
6. Llena así:
   - **URL to call**: `https://nufnlvalalandxodgcpr.supabase.co/functions/v1/send-notifications`
   - **Cron Expression**: `0 8 * * *` (cada día a las 8:00 AM)
   - **HTTP Method**: GET
   - **Time zone**: UTC (o tu zona)
7. Click en **"Create Cron Job"** ✅

---

## ✅ ¡LISTO!

Ahora tu app enviará emails automáticamente:

✅ **Alumnos** → Email 3, 2, 1 día antes de vencer
✅ **Coach** → Email cuando alumno se vence (sin pagar)
✅ **Coach** → Email cuando alumno renueva
✅ **Automático** → Cada día a las 8 AM
✅ **Sin duplicados** → Una vez por evento

---

## 🧪 PRUEBA ANTES

Si quieres probar sin esperar a mañana:

1. Supabase → **Edge Functions → send-notifications**
2. Click en el botón **"Invoke"**
3. Verás qué emails se enviarían

¡Listo! 🎉
