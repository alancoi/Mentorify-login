# 🚀 Guía de Setup: Shopify + Mercado Pago Integration

Esta guía te muestra cómo configurar completamente la integración automática de Shopify con Mercado Pago en Mentorify.

## 📋 Resumen de lo que hace

1. **Shopify webhook** recibe órdenes de compra
2. **Crea usuario automáticamente** en Supabase Auth con email + número de orden como contraseña
3. **Envía email de bienvenida** con credenciales e instrucciones
4. **Mercado Pago webhook** recibe renovaciones de suscripción
5. **Extiende acceso** automáticamente por 30 días más
6. **Envía email de confirmación** de renovación

---

## 🔧 Paso 1: Variables de entorno

Agrega estas variables a tu `.env.local` (desarrollo) y `vercel.json` en Vercel (producción):

```env
# Supabase
VITE_SUPABASE_URL=https://nufnlvalalandxodgcpr.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_qfqNxB63q60T-u-p3UlLoA_yCH9i0PS
SUPABASE_SERVICE_KEY=<tu_service_key>  # ⚠️ Nunca expongas esto en el cliente

# Brevo (transactional emails)
BREVO_API_KEY=<tu_brevo_api_key>

# Shopify
SHOPIFY_WEBHOOK_SECRET=<secret_from_shopify>

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=<tu_token_acceso>  # TEST-XXXX para desarrollo
MERCADOPAGO_WEBHOOK_TOKEN=<token_para_verificar_webhooks>

# Video tutorial (agregar cuando tengas)
MENTORIFY_VIDEO_LINK=https://youtube.com/...  # Opcional
```

### Dónde obtener cada clave:

**SUPABASE_SERVICE_KEY:**
1. Abre https://app.supabase.com → Tu proyecto
2. Settings → API
3. Copia el `service_role` key (⚠️ Secret)

**BREVO_API_KEY:**
1. Abre https://app.brevo.com
2. Settings → Claves API
3. Copia una API key

**MERCADOPAGO_ACCESS_TOKEN:**
- Ya tienes: `TEST-5507681975965943-061811-bf5632a7586cdbfaad13ac3b14c6ff1e-111653767`

---

## 🏪 Paso 2: Configurar webhooks en Shopify

### 2.1 Obtener credenciales de Shopify

1. Ve a tu admin de Shopify
2. Settings → Apps and integrations
3. Create an app → Custom app
4. Nombre: "Mentorify"
5. Admin API scopes:
   - `write_products`, `read_products`
   - `write_orders`, `read_orders`
6. Instala la app
7. Copia: **API Key** y **Access Token** (no los necesitamos ahora, pero guárdalos)

### 2.2 Crear webhook en Shopify

1. En tu admin de Shopify → Settings → Webhooks
2. Create webhook
3. Rellena:
   - **Event:** `orders/create`
   - **URL:** `https://tu-dominio-vercel.vercel.app/api/shopify-webhook`
   - **Format:** JSON
4. Save webhook

**URLs según tu dominio:**
- Desarrollo: `http://localhost:5173/api/shopify-webhook`
- Producción: `https://mentorify-login.vercel.app/api/shopify-webhook` (cambiar según tu dominio)

---

## 💳 Paso 3: Crear planes en Mercado Pago

### 3.1 Vía API (recomendado)

```bash
# En tu directorio Mentorify-login
npm install axios  # Si no lo tienes

# Exporta tu token
export MERCADOPAGO_ACCESS_TOKEN="TEST-5507681975965943-061811-bf5632a7586cdbfaad13ac3b14c6ff1e-111653767"

# Corre el script
node lib/mercadopago-setup.js
```

El script creará 3 planes y te mostrará los IDs. Guárdalos en tu `.env`.

### 3.2 Vía Mercado Pago Dashboard (manual)

1. Ve a https://www.mercadopago.com.ar/developers
2. My applications → Selecciona tu app
3. Subscriptions → Create plan
4. Crea:
   - **Plan Básica:** $19.990 ARS, 30 días
   - **Plan Estándar:** $29.990 ARS, 30 días
   - **Plan Premium:** $39.990 ARS, 30 días

Copia los IDs de los planes.

### 3.3 Agregar IDs a `.env`

```env
MERCADOPAGO_PLAN_BASICA=<id_del_plan>
MERCADOPAGO_PLAN_ESTANDAR=<id_del_plan>
MERCADOPAGO_PLAN_PREMIUM=<id_del_plan>
```

---

## 📧 Paso 4: Verificar tablas en Supabase

La tabla `coaches` debe tener estas columnas:

```sql
CREATE TABLE coaches (
  id uuid PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,  -- 'Básica', 'Estándar', 'Premium'
  student_limit INT NOT NULL,  -- 15, 50, 150
  order_number TEXT,
  subscription_id TEXT,  -- Para Mercado Pago
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- Fecha de expiración del acceso
  last_renewal TIMESTAMP,
  renewal_order_number TEXT,
  is_active BOOLEAN DEFAULT true
);
```

Si no la tienes, corre este SQL en Supabase:

```sql
CREATE TABLE IF NOT EXISTS coaches (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  student_limit INT NOT NULL DEFAULT 15,
  order_number TEXT,
  subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_renewal TIMESTAMP,
  renewal_order_number TEXT,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT valid_plan CHECK (plan IN ('Básica', 'Estándar', 'Premium'))
);

CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_coaches_subscription_id ON coaches(subscription_id);
```

---

## 🧪 Paso 5: Testear en desarrollo

### Test local de Shopify webhook

```bash
# En otra terminal, abre un túnel
ngrok http 5173

# Usa la URL en Shopify webhooks (ej: https://abc123.ngrok.io/api/shopify-webhook)
```

Haz una compra de prueba en tu Shopify de desarrollo. Verifica:
1. ✅ Usuario creado en Supabase Auth
2. ✅ Registro en tabla `coaches`
3. ✅ Email recibido en tu bandeja

### Test de Mercado Pago webhook

```javascript
// En tu consola del navegador
fetch('http://localhost:5173/api/mercadopago-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'subscription_authorized_payment',
    data: {
      id: 'test-subscription-id',
      status: 'authorized'
    }
  })
})
```

---

## 🚀 Paso 6: Desplegar a Vercel

### 6.1 Agregar variables en Vercel

```bash
# En tu terminal
vercel env add SUPABASE_SERVICE_KEY
# (pega el valor)

vercel env add BREVO_API_KEY
# (pega el valor)

vercel env add MERCADOPAGO_ACCESS_TOKEN
# (pega el valor)

# etc...
```

O vía dashboard:
1. Abre tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada una

### 6.2 Deploy

```bash
git add .
git commit -m "feat: implement Shopify and Mercado Pago integration"
git push
```

Vercel auto-deploya. Verifica que los webhooks apunten a tu URL de producción.

---

## 📝 Estructuras de datos

### Webhook de Shopify (entrada)

```json
{
  "id": 123456789,
  "order_number": 1001,
  "customer": {
    "email": "coach@example.com"
  },
  "line_items": [
    {
      "price": "29.99",
      "quantity": 1
    }
  ]
}
```

### Response del webhook Shopify

```json
{
  "success": true,
  "userId": "uuid...",
  "email": "coach@example.com",
  "plan": "Estándar",
  "studentLimit": 50
}
```

### Webhook de Mercado Pago (entrada)

```json
{
  "type": "subscription_authorized_payment",
  "data": {
    "id": "subscription-id",
    "status": "authorized",
    "subscription_id": "sub-123"
  }
}
```

---

## 🆘 Troubleshooting

### "Usuario no se crea"
- [ ] ¿`SUPABASE_SERVICE_KEY` está en el `.env`?
- [ ] ¿La tabla `coaches` existe?
- [ ] Revisa los logs en Vercel: Settings → Deployments → Logs

### "Email no se envía"
- [ ] ¿`BREVO_API_KEY` es válido?
- [ ] ¿Probaste el API key en Brevo dashboard?
- [ ] Revisa los logs de Vercel

### "Webhook no recibe datos"
- [ ] ¿La URL en Shopify es correcta?
- [ ] ¿Es HTTPS en producción?
- [ ] Prueba con `ngrok` en desarrollo

### "Planes no se crean en Mercado Pago"
- [ ] ¿El token comienza con `TEST-`?
- [ ] ¿Tienes permisos en la app de Mercado Pago?
- [ ] Revisa la respuesta del API: `node lib/mercadopago-setup.js`

---

## 📺 Próximo paso

Cuando tengas el video tutorial:
1. Sube a YouTube o Vimeo
2. Copia el link
3. Agrega a `.env`:
   ```env
   MENTORIFY_VIDEO_LINK=https://youtube.com/watch?v=XXX
   ```
4. Deploya

El email automático incluirá el link.

---

## ✅ Checklist final

- [ ] Variables de entorno configuradas
- [ ] Tabla `coaches` en Supabase
- [ ] Webhook de Shopify creado
- [ ] Planes de Mercado Pago creados
- [ ] Brevo API key validado
- [ ] Test local exitoso
- [ ] Deploy a Vercel
- [ ] URLs de webhooks apuntan a producción
- [ ] Primera compra de prueba exitosa

---

**¿Listo?** Cuando hayas completado el setup, tu plataforma estará 100% automática. Cada compra en Shopify creará usuario, enviará email, y las renovaciones serán automáticas.

¡Dale para adelante! 💪
