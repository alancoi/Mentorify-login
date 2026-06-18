# 🧪 Testing Webhooks Localmente

## Setup inicial

```bash
# Instala dependencias
npm install

# Instala ngrok para exposer localhost
npm install -g ngrok

# En una terminal, inicia tu servidor Vite
npm run dev

# En otra terminal, abre un túnel ngrok
ngrok http 5173
```

Verás algo como:
```
Forwarding                    https://abc123.ngrok.io -> http://localhost:5173
```

---

## Test Shopify Webhook

### 1. Actualiza URL en Shopify

En tu admin de Shopify:
- Settings → Webhooks
- Edita el webhook existente
- Cambia URL a: `https://abc123.ngrok.io/api/shopify-webhook`
- Save

### 2. Test manualmente

```bash
curl -X POST http://localhost:5173/api/shopify-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "order_number": 1001,
    "customer": {
      "email": "test@example.com"
    },
    "line_items": [
      {
        "price": "29.99",
        "quantity": 1
      }
    ]
  }'
```

Esperas:
```json
{
  "success": true,
  "userId": "uuid...",
  "email": "test@example.com",
  "plan": "Estándar",
  "studentLimit": 50
}
```

### 3. Verifica resultados

**En Supabase:**
1. Auth → Users: ¿Se creó el usuario?
2. Database → `coaches`: ¿Existe el registro?

**En email:**
- ¿Recibiste email de bienvenida?

---

## Test Mercado Pago Webhook

```bash
curl -X POST http://localhost:5173/api/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu-token-aqui" \
  -d '{
    "type": "subscription_authorized_payment",
    "data": {
      "id": "test-sub-123",
      "status": "authorized",
      "subscription_id": "test-sub-123"
    }
  }'
```

Esperas:
```json
{
  "success": true
}
```

---

## Problemas comunes

### "Connection refused"
- ¿Vite está corriendo? (`npm run dev`)
- ¿Usas el puerto correcto en curl? (5173)

### "Not found" (404)
- ¿La ruta es `/api/shopify-webhook`?
- ¿No hay typos?

### Webhook no recibe datos
- ¿ngrok está corriendo?
- ¿URL en Shopify incluye `/api/shopify-webhook`?
- ¿ngrok URL es HTTPS?

### Usuario no se crea
- ¿`SUPABASE_SERVICE_KEY` está en `.env.local`?
- Revisa la consola de Vite para errores

### Email no se envía
- ¿`BREVO_API_KEY` es válido?
- Prueba directamente en Brevo dashboard

---

## Simulación completa

### Crear usuario de test

```bash
curl -X POST http://localhost:5173/api/shopify-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": 99999,
    "customer": { "email": "coach-test@example.com" },
    "line_items": [{ "price": "39.99", "quantity": 1 }]
  }'
```

Anotate el `userId` que devuelve.

### Simular renovación

```bash
curl -X POST http://localhost:5173/api/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription_authorized_payment",
    "data": {
      "id": "<userId>",
      "status": "authorized",
      "subscription_id": "<userId>"
    }
  }'
```

---

## Debug avanzado

### Ver logs en Vite

Abre la consola en http://localhost:5173 y revisa:
- Network tab: ¿Qué devuelve el endpoint?
- Console: ¿Hay errores?

### Ver logs en ngrok

En la ventana de ngrok verás todas las requests:
```
POST /api/shopify-webhook HTTP/1.1        200 OK
```

---

## ✅ Checklist antes de producción

- [ ] Test local de Shopify webhook exitoso
- [ ] Usuario creado en Supabase
- [ ] Email de bienvenida recibido
- [ ] Test local de Mercado Pago webhook exitoso
- [ ] URLs actualizadas en Shopify/Mercado Pago para producción
- [ ] Variables de entorno en Vercel
- [ ] Deploy a Vercel
- [ ] Test en producción con compra real o de prueba

---

Cualquier error, checkea los logs en Vercel: tu proyecto → Deployments → Logs
