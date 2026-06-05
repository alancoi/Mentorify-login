# Mentorify — Login

Sistema de login real con Supabase Auth.

## Setup en 5 pasos

### 1. Instalá dependencias
```bash
npm install
```

### 2. Configurá tus variables de entorno
Copiá el archivo de ejemplo y completá tus datos de Supabase:
```bash
cp .env.example .env
```
Editá `.env` con tus claves reales de Supabase.

### 3. Conseguí tus claves de Supabase
1. Entrá a https://supabase.com y creá un proyecto nuevo
2. Andá a **Settings → API**
3. Copiá:
   - `Project URL` → va en `VITE_SUPABASE_URL`
   - `anon public key` → va en `VITE_SUPABASE_ANON_KEY`

### 4. Configurá autenticación en Supabase
En tu proyecto de Supabase:
- **Authentication → Settings → Site URL**: poné `http://localhost:5173` (dev) y tu dominio en producción
- **Authentication → Settings → Redirect URLs**: agregá `http://localhost:5173/**`

### 5. Levantá el proyecto
```bash
npm run dev
```

Abre en http://localhost:5173

## Para crear el primer usuario (coach)

En el panel de Supabase → **Authentication → Users → Add user** → "Send magic link" o crealo con email/contraseña.

O usá la API del admin (el template que ya tenés) que crea usuarios automáticamente cuando alguien compra.

## Build para producción
```bash
npm run build
```

Subí la carpeta `dist/` a Vercel con `vercel --prod`.

## Flujo de autenticación

1. **Login normal** → email + contraseña → entra al panel
2. **Primer ingreso** → detecta PASSWORD_RECOVERY event → fuerza cambio de contraseña
3. **Olvidé contraseña** → manda email con link de reset → onAuthStateChange detecta PASSWORD_RECOVERY
4. **Sesión persistente** → Supabase guarda el token en localStorage automáticamente

## Estructura de archivos

```
src/
  App.jsx          — Router principal, maneja estado de sesión
  LoginPage.jsx    — Pantalla de login con branding Mentorify
  SetPasswordPage.jsx — Pantalla para crear contraseña nueva
  Logo.jsx         — SVG del logo infinito
  supabase.js      — Cliente de Supabase
  index.css        — Variables CSS globales
```
