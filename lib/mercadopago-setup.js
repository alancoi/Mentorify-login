/**
 * Script para crear los 3 planes de suscripción en Mercado Pago
 * Usar en production: node lib/mercadopago-setup.js
 */

import axios from 'axios'

const MERCADOPAGO_API = 'https://api.mercadopago.com'
const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('MERCADOPAGO_ACCESS_TOKEN no está configurado')
  process.exit(1)
}

const plans = [
  {
    reason: 'Plan Básica - Mentorify',
    description: 'Plan Básica: Hasta 15 alumnos, 30 días',
    frequency: 1,
    frequency_type: 'months',
    billing_type: 'regular',
    currency_id: 'ARS',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      repetitions: null, // Indefinido
      start_date: new Date().toISOString().split('T')[0],
    },
    back_url: 'https://mentorify.app',
    payment_methods: {
      default_payment_method_id: null,
      allowed_payment_methods: [],
      excluded_payment_types: [],
      installments: null,
      default_installments: null,
    },
  },
  {
    reason: 'Plan Estándar - Mentorify',
    description: 'Plan Estándar: Hasta 50 alumnos, 30 días',
    frequency: 1,
    frequency_type: 'months',
    billing_type: 'regular',
    currency_id: 'ARS',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      repetitions: null,
      start_date: new Date().toISOString().split('T')[0],
    },
    back_url: 'https://mentorify.app',
    payment_methods: {
      default_payment_method_id: null,
      allowed_payment_methods: [],
      excluded_payment_types: [],
      installments: null,
      default_installments: null,
    },
  },
  {
    reason: 'Plan Premium - Mentorify',
    description: 'Plan Premium: Hasta 150 alumnos, 30 días',
    frequency: 1,
    frequency_type: 'months',
    billing_type: 'regular',
    currency_id: 'ARS',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      repetitions: null,
      start_date: new Date().toISOString().split('T')[0],
    },
    back_url: 'https://mentorify.app',
    payment_methods: {
      default_payment_method_id: null,
      allowed_payment_methods: [],
      excluded_payment_types: [],
      installments: null,
      default_installments: null,
    },
  },
]

async function createPlan(plan) {
  try {
    const response = await axios.post(`${MERCADOPAGO_API}/preapproval_plan`, plan, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    return response.data
  } catch (error) {
    console.error('Error creating plan:', error.response?.data || error.message)
    return null
  }
}

async function setupMercadoPagoPlans() {
  console.log('Setting up Mercado Pago subscription plans...\n')

  const results = {
    basica: null,
    estandar: null,
    premium: null,
  }

  // Plan Básica - $19.990
  console.log('Creating Plan Básica ($19.990 ARS)...')
  const basicaPlan = { ...plans[0] }
  // El precio va en cada préstamo, no en el plan
  const basicaResult = await createPlan(basicaPlan)
  if (basicaResult) {
    results.basica = basicaResult
    console.log(`✅ Básica created: ID = ${basicaResult.id}`)
    console.log(`   Status: ${basicaResult.status}`)
  }

  // Plan Estándar - $29.990
  console.log('\nCreating Plan Estándar ($29.990 ARS)...')
  const estandarPlan = { ...plans[1] }
  const estandarResult = await createPlan(estandarPlan)
  if (estandarResult) {
    results.estandar = estandarResult
    console.log(`✅ Estándar created: ID = ${estandarResult.id}`)
    console.log(`   Status: ${estandarResult.status}`)
  }

  // Plan Premium - $39.990
  console.log('\nCreating Plan Premium ($39.990 ARS)...')
  const premiumPlan = { ...plans[2] }
  const premiumResult = await createPlan(premiumPlan)
  if (premiumResult) {
    results.premium = premiumResult
    console.log(`✅ Premium created: ID = ${premiumResult.id}`)
    console.log(`   Status: ${premiumResult.status}`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('Setup complete! Guarda estos IDs en tu .env:\n')
  console.log(`MERCADOPAGO_PLAN_BASICA=${results.basica?.id || 'PENDING'}`)
  console.log(`MERCADOPAGO_PLAN_ESTANDAR=${results.estandar?.id || 'PENDING'}`)
  console.log(`MERCADOPAGO_PLAN_PREMIUM=${results.premium?.id || 'PENDING'}`)
  console.log('='.repeat(50))

  return results
}

// Ejecutar si se llama directamente
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

if (import.meta.url === `file://${process.argv[1]}`) {
  setupMercadoPagoPlans().catch(console.error)
}

export { setupMercadoPagoPlans, createPlan }
