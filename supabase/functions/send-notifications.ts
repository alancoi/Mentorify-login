// Supabase Edge Function: send-notifications
// Deploy this function in Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      sender: { name: "Mentorify", email: "appmentorify@gmail.com" },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  return response.json();
}

async function checkAndSendNotifications() {
  const today = new Date().toISOString().split("T")[0];

  // Obtener todos los alumnos con coach info
  const { data: alumnos, error } = await supabase
    .from("alumnos")
    .select("*, coaches(*)")
    .not("fecha_renovacion", "is", null);

  console.log("Query result - data:", alumnos, "error:", error);

  if (error) {
    console.error("Error fetching alumnos:", error);
    return;
  }

  if (!alumnos || !Array.isArray(alumnos)) {
    console.error("Alumnos is not an array:", typeof alumnos, alumnos);
    return;
  }

  for (const alumno of alumnos) {
    const fechaRenovacion = new Date(alumno.fecha_renovacion);
    const hoy = new Date(today);
    const diasParaVencer = Math.floor((fechaRenovacion - hoy) / (1000 * 60 * 60 * 24));

    // NOTIFICACIONES PARA ALUMNO (3, 2, 1 día)
    if ([3, 2, 1].includes(diasParaVencer) && alumno.email) {
      // Verificar si ya se envió
      const { data: existente } = await supabase
        .from("notificaciones_enviadas")
        .select("id")
        .eq("alumno_id", alumno.id)
        .eq("tipo", `vencimiento_${diasParaVencer}_dias`)
        .gte("fecha_envio", new Date(today).toISOString());

      if (!existente || existente.length === 0) {
        const nombreNegocio = alumno.coaches.nombre_negocio || alumno.coaches.nombre;
        const htmlContent = `
          <h2>Se te vence la membresía en ${diasParaVencer} ${diasParaVencer === 1 ? 'día' : 'días'}</h2>
          <p>Hola ${alumno.nombre},</p>
          <p>Tu acceso a <strong>${nombreNegocio}</strong> vence el <strong>${new Date(alumno.fecha_renovacion).toLocaleDateString('es-AR')}</strong>.</p>
          <p>Renová ahora para no perder acceso a tu plan.</p>
          <p>Saludos,<br/>El equipo de Mentorify</p>
        `;

        await sendBrevoEmail(
          alumno.email,
          `Se te vence la membresía de ${nombreNegocio}`,
          htmlContent
        );

        // Registrar notificación
        await supabase.from("notificaciones_enviadas").insert({
          alumno_id: alumno.id,
          coach_id: alumno.coach_id,
          tipo: `vencimiento_${diasParaVencer}_dias`,
          email_destino: alumno.email,
        });
      }
    }

    // NOTIFICACIÓN PARA COACH (si se venció y no pagó)
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

    // NOTIFICACIÓN PARA COACH (si renovó)
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
    return new Response("Notificaciones procesadas", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
