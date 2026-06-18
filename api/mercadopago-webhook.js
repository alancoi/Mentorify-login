import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const mercadopagoWebhookToken = process.env.MERCADOPAGO_WEBHOOK_TOKEN

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Extender acceso de coach por 30 días
async function extendCoachAccess(coachId, orderNumber) {
  try {
    // Obtener datos del coach
    const { data: coach, error: fetchError } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .single()

    if (fetchError || !coach) {
      console.error('Error fetching coach:', fetchError)
      return false
    }

    // Calcular nueva fecha de expiración (30 días desde ahora)
    const newExpireDate = new Date()
    newExpireDate.setDate(newExpireDate.getDate() + 30)

    // Actualizar acceso
    const { error: updateError } = await supabase
      .from('coaches')
      .update({
        expires_at: newExpireDate.toISOString(),
        last_renewal: new Date().toISOString(),
        renewal_order_number: orderNumber,
      })
      .eq('id', coachId)

    if (updateError) {
      console.error('Error updating coach access:', updateError)
      return false
    }

    return true
  } catch (err) {
    console.error('Exception extending coach access:', err)
    return false
  }
}

// Enviar email de renovación exitosa
async function sendRenewalEmail(email, plan) {
  const brevoApiKey = process.env.BREVO_API_KEY
  if (!brevoApiKey) {
    console.error('BREVO_API_KEY not configured')
    return false
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email, name: '' }],
        subject: '✅ Tu suscripción a Mentorify ha sido renovada',
        htmlContent: `
          <div style="font-family: Poppins, Arial; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">✅ ¡Renovación exitosa!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu acceso a Mentorify se ha extendido</p>
            </div>

            <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #666;"><strong>Plan:</strong></p>
                <p style="margin: 0; font-size: 16px; color: #10b981; font-weight: 600;">${plan}</p>
              </div>

              <p style="color: #666; line-height: 1.6;">
                Tu pago ha sido procesado exitosamente. Tu acceso a Mentorify se ha renovado por 30 días más.
              </p>

              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #10b981;">¿Qué viene después?</h3>
                <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Continúa usando todas las funciones de tu plan</li>
                  <li>Tus datos y alumnos siguen igual</li>
                  <li>El próximo pago se procesará automáticamente en 30 días</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://mentorify.app" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Volver a Mentorify →
                </a>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                Si tienes preguntas sobre tu suscripción, responde a este email.<br>
                <strong>Mentorify</strong> — El orden detrás del impacto.
              </p>
            </div>
          </div>
        `,
      }),
    })

    return response.ok
  } catch (err) {
    console.error('Exception sending renewal email:', err)
    return false
  }
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar token (si está configurado)
  if (mercadopagoWebhookToken) {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.includes(mercadopagoWebhookToken)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  try {
    const { type, data } = req.body

    console.log(`Mercado Pago webhook: ${type}`)

    // Escuchar eventos de suscripción
    if (type === 'subscription_update' || type === 'subscription_authorized_payment') {
      const subscriptionId = data?.id || data?.subscription_id
      const status = data?.status

      // Buscar el coach por subscription_id
      const { data: coaches, error: fetchError } = await supabase
        .from('coaches')
        .select('id, email, plan')
        .eq('subscription_id', subscriptionId)

      if (fetchError || !coaches || coaches.length === 0) {
        console.warn(`No coach found for subscription: ${subscriptionId}`)
        return res.status(200).json({ success: true })
      }

      const coach = coaches[0]

      // Si el pago fue autorizado/exitoso, extender acceso
      if (status === 'authorized' || status === 'active') {
        const extended = await extendCoachAccess(coach.id, subscriptionId)
        if (extended) {
          await sendRenewalEmail(coach.email, coach.plan)
        }
      }

      return res.status(200).json({ success: true })
    }

    // Otros eventos (no los procesamos por ahora)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: error.message })
  }
}
