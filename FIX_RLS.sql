-- ============================================
-- MENTORIFY - FIX RLS POLICIES
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- Panel → SQL Editor → New Query → Pega todo esto
-- ============================================

-- 1. ARREGLAR RLS PARA COACHES
DROP POLICY IF EXISTS "Coaches see own data" ON coaches;
DROP POLICY IF EXISTS "Coaches insert own" ON coaches;

CREATE POLICY "Coaches see own data" ON coaches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Coaches insert own" ON coaches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. ARREGLAR RLS PARA ALUMNOS
DROP POLICY IF EXISTS "Coaches see own alumnos" ON alumnos;
DROP POLICY IF EXISTS "Coaches insert own alumnos" ON alumnos;

CREATE POLICY "Coaches see own alumnos" ON alumnos 
FOR SELECT 
USING (
  coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches insert own alumnos" ON alumnos 
FOR INSERT 
WITH CHECK (
  coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

-- 3. ARREGLAR RLS PARA PREFERENCIAS
DROP POLICY IF EXISTS "Coaches see own preferences" ON coach_preferences;
DROP POLICY IF EXISTS "Coaches insert preferences" ON coach_preferences;
DROP POLICY IF EXISTS "Coaches update preferences" ON coach_preferences;

CREATE POLICY "Coaches see own preferences" ON coach_preferences 
FOR SELECT 
USING (
  coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches insert preferences" ON coach_preferences 
FOR INSERT 
WITH CHECK (
  coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches update preferences" ON coach_preferences 
FOR UPDATE 
USING (
  coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
);

-- ✅ LISTO! Ahora recarga la app
