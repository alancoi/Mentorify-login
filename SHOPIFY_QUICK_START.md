# ⚡ Quick Start: Shopify + Mercado Pago

## 3 pasos principales

### 1️⃣ Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega:
```env
SUPABASE_SERVICE_KEY=<tu_service_key>
BREVO_API_KEY=<tu_api_key>
MERCADOPAGO_ACCESS_TOKEN=TEST-5507681975965943-061811-bf5632a7586cdbfaad13ac3b14c6ff1e-111653767
```

### 2️⃣ Crear planes en Mercado Pago

```bash
npm install  # si no lo hiciste
npm run setup-mp
```

Esto crea 3 planes ($19.990, $29.990, $39.990) y te da los IDs.

Guárdalos en `.env.local`:
```env
MERCADOPAGO_PLAN_BASICA=...
MERCADOPAGO_PLAN_ESTANDAR=...
MERCADOPAGO_PLAN_PREMIUM=...
```

### 3️⃣ Configurar Shopify webhook

En tu admin de Shopify → Settings → Webhooks:

- **Event:** `orders/create`
- **URL:** `https://tu-dominio.vercel.app/api/shopify-webhook`
- **Format:** JSON

---

## ✅ Verificar que todo funciona

1. Haz una compra de prueba en Shopify
2. Revisa que se creó usuario en Supabase Auth
3. Recibe email de bienvenida
4. ¡Listo!

---

## 📚 Más detalles

Ver `SHOPIFY_MERCADOPAGO_SETUP.md` para configuración completa.
