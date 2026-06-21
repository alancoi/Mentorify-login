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

  // ARS 19.990 → Básico
  if (totalPrice >= 19000 && totalPrice < 25000) return { plan: 'basico', limit: 15 }
  // ARS 29.990 → Estándar
  if (totalPrice >= 25000 && totalPrice < 35000) return { plan: 'estandar', limit: 50 }
  // ARS 39.990 → Premium
  if (totalPrice >= 35000) return { plan: 'premium', limit: 150 }

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
async function createCoachRecord(userId, email, plan, studentLimit, orderNumber, nombre, valorPlan) {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .insert({
        id: userId,
        email,
        plan,
        student_limit: studentLimit,
        order_number: orderNumber,
        nombre: nombre || email.split('@')[0], // Si no hay nombre, usa parte del email
        valor_plan: valorPlan || 0,
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

// Crear preferencia de suscripción en Mercado Pago
async function createMercadoPagoSubscriptionPreference(email, plan) {
  const mercadoPagoToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!mercadoPagoToken) {
    console.error('MERCADOPAGO_ACCESS_TOKEN not configured')
    return null
  }

  const planIds = {
    'Básica': process.env.MERCADOPAGO_PLAN_BASICA,
    'Estándar': process.env.MERCADOPAGO_PLAN_ESTANDAR,
    'Premium': process.env.MERCADOPAGO_PLAN_PREMIUM,
  }
  const planId = planIds[plan] || planIds['Básica']

  try {
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        payer_email: email,
        reference_id: `mentorify-${Date.now()}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          start_date: new Date().toISOString(),
          end_date: null,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Mercado Pago error:', error)
      return null
    }

    const data = await response.json()
    console.log('Subscription preference created:', data.id)
    return data.init_point // URL de checkout
  } catch (err) {
    console.error('Exception creating subscription preference:', err)
    return null
  }
}

// Enviar email de bienvenida
async function sendWelcomeEmail(email, password, orderNumber, plan) {
  if (!brevoApiKey) {
    console.error('BREVO_API_KEY not configured')
    return false
  }

  const videoLink = process.env.MENTORIFY_VIDEO_LINK || 'https://vimeo.com/1202653327'
  const logoUrl = 'https://cdn.phototourl.com/free/2026-06-18-03edb6b5-7c34-4634-9c28-c13bc35d47dc.png'

  // Intentar crear preferencia de suscripción en background (sin afectar flujo principal)
  // El botón solo aparecerá cuando esto funcione correctamente
  let mercadoPagoUrl = null
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    mercadoPagoUrl = await createMercadoPagoSubscriptionPreference(email, plan)
    if (!mercadoPagoUrl) {
      console.log(`[DEBUG] Mercado Pago preference creation pending for ${email} (${plan})`)
    }
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
        sender: { name: 'Mentorify', email: 'appmentorify@gmail.com' },
        to: [{ email, name: 'Coach' }],
        subject: `¡Bienvenido a Mentorify! Tu acceso está listo`,
        htmlContent: `
          <div style="font-family: Poppins, Arial; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: linear-gradient(135deg, #6c4dff 0%, #482ddb 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
              <div style="width: 60px; height: 60px; margin: 0 auto 15px;">
                <img src="${logoUrl}" alt="Mentorify" style="width: 100%; height: 100%; object-fit: contain;">
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700;">¡Bienvenid@ a Mentorify!</h1>
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

              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff6b6b;">
                <div style="color: #ff6b6b; font-size: 15px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">⚠️ IMPORTANTE - VE ESTO PRIMERO</div>
                <div style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
                  Antes de entrar a la app, mira este video (menos de 5 minutos) para aprender cómo usarla, cómo fijarla en tu inicio y dejarla anclada.
                </div>
                <a href="https://drive.google.com/file/d/1-hVKxawRtOijnSoSKyh6c-3ESGonDRlv/view?usp=drive_link" style="display: inline-block; background: #0066cc; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Ver video tutorial</a>
                <div style="color: #666; font-size: 12px; margin-top: 10px;">(Podés descargarlo si querés)</div>
              </div>

              ${mercadoPagoUrl ? `
              <div style="background: #fffbf0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff9800;">
                <div style="color: #ff9800; font-size: 15px; font-weight: 600; margin-bottom: 12px;">💳 Activá tu pago mensual</div>
                <div style="color: #555; font-size: 14px; margin-bottom: 15px;">Configura tu suscripción para que el acceso se renueve automáticamente cada mes.</div>
                <a href="${mercadoPagoUrl}" style="display: inline-block; background: #00a8e8; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Ir a Mercado Pago</a>
              </div>
              ` : ''}

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

    // Extraer nombre y precio del cliente
    const firstName = order.customer?.first_name || ''
    const lastName = order.customer?.last_name || ''
    const nombre = `${firstName} ${lastName}`.trim()
    const totalPrice = parseFloat(order.total_price) || 0

    // Determinar plan
    const { plan, limit } = determinePlanByPrice(lineItems)

    // Crear usuario
    const user = await createCoachUser(email, orderNumber)
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Crear registro de coach
    const coach = await createCoachRecord(user.id, email, plan, limit, orderNumber, nombre, totalPrice)
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
