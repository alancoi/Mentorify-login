# 📋 MENTORIFY - INFORMACIÓN COMPLETA DEL PROYECTO

**Fecha: 06/06/2026**
**Estado: ✅ En producción**

---

## 🎨 BRANDING

### Logo
- **Tipo**: Infinito (∞) con trazo grueso redondeado
- **Color**: Púrpura (#6C4DFF → #482DDB gradiente)
- **URL**: https://i.postimg.cc/JG918Zps/2__5_.png
- **Slogan**: "El orden detrás del impacto"

### Paleta de Colores
- **Primary Purple**: #6C4DFF
- **Deep Purple**: #482DDB
- **Midnight Navy**: #091A48
- **Soft White**: #FAF8FF
- **Light Gray**: #F4F8FA

### Fuentes
- **Principal**: Inter
- **Secundaria**: Poppins

### Valores
- Claridad, Confianza, Empatía, Innovación, Impacto

---

## 🔧 STACK TÉCNICO

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Emails**: Brevo
- **Pagos**: Mercado Pago

---

## 🌐 SUPABASE

```
Project ID: nufnlvalalandxodgcpr
URL: https://nufnlvalalandxodgcpr.supabase.co
Anon Key: sb_publishable_qfqNxB63q60T-u-p3UlLoA_yCH9i0PS
Región: West US (Oregon)
```

### Tablas: coaches, alumnos, sesiones, coach_preferences, notificaciones

---

## 🚀 VERCEL

- **URL**: https://mentorify-login.vercel.app
- **Repo**: https://github.com/alancoi/Mentorify-login

---

## 📱 MOBILE-FIRST (Coaches en celular)

✅ Optimizada para iPhone/Android
✅ Responsive: Tablet (768px) + Mobile (480px)
✅ Touch-friendly: Botones min 44px
✅ Tabla: Scroll horizontal suave
✅ Formularios: 1 columna en mobile
✅ Inputs: 16px font-size (no zoom auto)
✅ Modales: 95% ancho celular
✅ Probado en iPhone ✨

---

## ✨ FEATURES

✅ Autenticación multi-tenant
✅ Panel de Alumnos con tabla completa
✅ Estados dinámicos (Al día, Por vencer, Vencido)
✅ Filas en rojo cuando ≤3 días o vencidos
✅ Editar/Eliminar alumnos
✅ Notas con modal
✅ Búsqueda y filtros
✅ Dashboard Ganancia Mensual (comparación día a día)
✅ Estadísticas en tiempo real

---

## 📝 CAMPOS DE ALUMNO

- Nombre *
- Email
- Plan tipo (Básico/Estándar/Premium)
- Precio del plan
- Fecha de inicio
- Fecha de finalización
- Notas
- Estado

---

## 🎯 ÚLTIMO COMMIT

**51a6aed** - Replace SVG logo with official Mentorify logo image from postimg

---

## ⏳ PRÓXIMOS PASOS

1. Emails automáticos (Brevo)
2. Importar Excel/Google Sheets
3. Integración Mercado Pago
4. Panel Admin
5. Personalizar columnas
6. Editar inline

---

**⚠️ GUARDAR SIEMPRE ESTA INFO PARA NO PERDER NADA**

---

## 📧 EMAILS AUTOMÁTICOS - ESTADO ACTUAL (Junio 6, 2026)

### ✅ CONFIGURADO:
1. **Edge Function** `send-notifications` ✅ DESPLEGADA en Supabase
2. **Tabla** `notificaciones_enviadas` ✅ CREADA en Supabase
3. **Cron Job** ✅ CREADO en cron-job.org
   - URL: https://nufnlvalalandxodgcpr.supabase.co/functions/v1/send-notifications
   - Schedule: Cada día 11 AM UTC = 8 AM Argentina
   - Habilitado ✅

### ⏳ PENDIENTE (PRÓXIMA SESIÓN):
1. **Agregar Variable Brevo** en Supabase → Settings → Secrets
   - Name: `BREVO_API_KEY`
   - Value: `3954b0a3b8f1a5220856f7149636379ffccab-F1gl2aq2u2a7Ayir`

### 🎯 QUÉ HACE UNA VEZ COMPLETADO:
- ✅ Alumnos reciben email 3, 2, 1 día antes de vencer
- ✅ Coach recibe email cuando alumno se vence (sin pagar)
- ✅ Coach recibe email cuando alumno renueva
- ✅ Automático cada día a las 8 AM
- ✅ Sin duplicados (trackea con notificaciones_enviadas)

### 📋 CREDENCIALES GUARDADAS:
- Brevo API Key: `3954b0a3b8f1a5220856f7149636379ffccab-F1gl2aq2u2a7Ayir`
- Supabase: nufnlvalalandxodgcpr
- Cron Job: cron-job.org (usuario: alancoimieres@gmail.com)

