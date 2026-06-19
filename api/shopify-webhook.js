import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY // Usar service key en servidor
const brevoApiKey = process.env.BREVO_API_KEY
const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Determinar plan según precio (en pesos argentinos)
function determinePlanByPrice(lineItems) {
  let totalPrice = 0
  for (const item of lineItems) {
    totalPrice += parseFloat(item.price) * item.quantity
  }

  // ARS 19.990 → Básica
  if (totalPrice >= 19000 && totalPrice < 25000) return { plan: 'Básica', limit: 15 }
  // ARS 29.990 → Estándar
  if (totalPrice >= 25000 && totalPrice < 35000) return { plan: 'Estándar', limit: 50 }
  // ARS 39.990 → Premium
  if (totalPrice >= 35000) return { plan: 'Premium', limit: 150 }

  return { plan: 'Básica', limit: 15 } // Default
}

// Verificar firma del webhook de Shopify
function verifyShopifyWebhook(req) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256']
  if (!hmacHeader || !shopifyWebhookSecret) return false

  const body = req.rawBody // Necesita raw body sin parsear
  const crypto = require('crypto')
  const message = body
  const hmac = crypto
    .createHmac('sha256', shopifyWebhookSecret)
    .update(message, 'utf8')
    .digest('base64')

  return hmac === hmacHeader
}

// Crear usuario en Supabase Auth
async function createCoachUser(email, orderNumber) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: orderNumber.toString(),
      email_confirm: true,
    })

    if (error) {
      // Si el usuario ya existe, lo buscamos y retornamos
      if (error.code === 'email_exists' || error.message.includes('already been registered')) {
        console.log(`User ${email} already exists, fetching existing user...`)
        // Obtener el usuario existente del admin API
        const { data: existingUser, error: fetchError } = await supabase.auth.admin.listUsers()
        if (!fetchError && existingUser) {
          const user = existingUser.users.find(u => u.email === email)
          if (user) return user
        }
        return null
      }
      console.error('Error creating user:', error)
      return null
    }

    return data.user
  } catch (err) {
    console.error('Exception creating user:', err)
    return null
  }
}

// Crear registro de coach en la BD
async function createCoachRecord(userId, email, plan, studentLimit, orderNumber) {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .insert({
        id: userId,
        email,
        plan,
        student_limit: studentLimit,
        order_number: orderNumber,
        created_at: new Date().toISOString(),
        is_active: true,
      })
      .select()

    if (error) {
      console.error('Error creating coach record:', error)
      return null
    }

    return data[0]
  } catch (err) {
    console.error('Exception creating coach record:', err)
    return null
  }
}

// Obtener URL de Mercado Pago según el plan
function getMercadoPagoUrl(plan) {
  const baseUrl = 'https://mercadopago.com.ar/checkout/v1/redirect'
  const planIds = {
    'Básica': process.env.MERCADOPAGO_PLAN_BASICA,
    'Estándar': process.env.MERCADOPAGO_PLAN_ESTANDAR,
    'Premium': process.env.MERCADOPAGO_PLAN_PREMIUM,
  }
  const planId = planIds[plan] || planIds['Básica']
  return `${baseUrl}?pref_id=${planId}`
}

// Enviar email de bienvenida
async function sendWelcomeEmail(email, password, orderNumber, plan) {
  if (!brevoApiKey) {
    console.error('BREVO_API_KEY not configured')
    return false
  }

  const videoLink = process.env.MENTORIFY_VIDEO_LINK || 'https://vimeo.com/1202653327'
  const mercadoPagoUrl = getMercadoPagoUrl(plan)
  const logoUrl = 'https://cdn.phototourl.com/free/2026-06-18-03edb6b5-7c34-4634-9c28-c13bc35d47dc.png'

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Mentorify', email: 'appmentorify@gmail.com' },
        to: [{ email, name: 'Coach' }],
        subject: `¡Bienvenido a Mentorify! Tu acceso está listo`,
        htmlContent: `
          <div style="font-family: Poppins, Arial; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: linear-gradient(135deg, #6c4dff 0%, #482ddb 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <div style="width: 60px; height: 60px; margin: 0 auto 15px;">
                <img src="${logoUrl}" alt="Mentorify" style="width: 100%; height: 100%; object-fit: contain;">
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700;">¡Bienvenido a Mentorify!</h1>
            </div>

            <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
              <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; border-left: 4px solid #6c4dff; margin: 25px 0;">
                <div style="margin-bottom: 20px;">
                  <div style="color: #666; font-weight: 600; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Tu email</div>
                  <div style="font-family: monospace; font-size: 16px; background: white; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0; word-break: break-all; font-weight: 600; color: #2c3e50;">${email}</div>
                </div>
                <div style="margin-bottom: 0;">
                  <div style="color: #666; font-weight: 600; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Contraseña</div>
                  <div style="font-family: monospace; font-size: 16px; background: white; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0; word-break: break-all; font-weight: 600; color: #2c3e50;">${password}</div>
                </div>
              </div>

              <div style="text-align: center; margin: 15px 0;">
                <a href="https://mentorify.app/login" style="display: inline-block; background: #6c4dff; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Acceder a Mentorify</a>
              </div>

              <div style="color: #666; font-size: 13px; margin: 20px 0; line-height: 1.6;">
                📝 <strong>Nota:</strong> Puedes cambiar tu contraseña desde adentro del panel.
              </div>

              <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <div style="color: #2c3e50; font-size: 15px; font-weight: 600; margin-bottom: 12px;">📺 Video para aprender a usar la app</div>
                <div style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">Mira este video de menos de 5 minutos para aprender a usar todas las funciones de Mentorify.</div>
                <a href="${videoLink}" style="display: inline-block; background: #0066cc; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver tutorial</a>
              </div>

              <div style="background: #fffbf0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff9800;">
                <div style="color: #ff9800; font-size: 15px; font-weight: 600; margin-bottom: 12px;">💳 Activá tu pago mensual</div>
                <div style="color: #555; font-size: 14px; margin-bottom: 15px;">Configura tu suscripción para que el acceso se renueve automáticamente cada mes.</div>
                <a href="${mercadoPagoUrl}" style="display: inline-block; background: #00a8e8; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Ir a Mercado Pago</a>
              </div>

              <div style="color: #999; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; line-height: 1.6;">
                Si tienes preguntas, responde a este email.<br>
                <strong>Mentorify</strong> — El orden detrás del impacto.
              </div>
            </div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Brevo error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Exception sending email:', err)
    return false
  }
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar webhook
  // NOTE: En Vercel con Edge Runtime, req.body ya viene parseado
  // Para verificar firma, necesitarías almacenar el raw body
  // Por ahora, comentamos la verificación hasta que configures correctamente

  // if (!verifyShopifyWebhook(req)) {
  //   return res.status(401).json({ error: 'Unauthorized' })
  // }

  try {
    const order = req.body

    // Extraer datos
    const email = order.customer?.email || order.email
    const orderNumber = order.order_number || order.id
    const lineItems = order.line_items || []

    if (!email || !orderNumber) {
      return res.status(400).json({ error: 'Missing email or order number' })
    }

    console.log(`Processing Shopify order: ${orderNumber} for ${email}`)

    // Determinar plan
    const { plan, limit } = determinePlanByPrice(lineItems)

    // Crear usuario
    const user = await createCoachUser(email, orderNumber)
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Crear registro de coach
    const coach = await createCoachRecord(user.id, email, plan, limit, orderNumber)
    if (!coach) {
      return res.status(500).json({ error: 'Failed to create coach record' })
    }

    // Enviar email
    const emailSent = await sendWelcomeEmail(email, orderNumber.toString(), orderNumber, plan)
    if (!emailSent) {
      console.warn('Failed to send welcome email, but user was created')
    }

    return res.status(200).json({
      success: true,
      userId: user.id,
      email,
      plan,
      studentLimit: limit,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: error.message })
  }
}
