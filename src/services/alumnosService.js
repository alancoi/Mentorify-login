import { supabase } from '../supabase';

// Obtener alumnos del coach actual
export async function getAlumnos() {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coach) return [];

  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Crear alumno
export async function createAlumno(alumno) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('alumnos')
    .insert([{ ...alumno, coach_id: coach.id }])
    .select();

  if (error) throw error;
  return data[0];
}

// Actualizar alumno
export async function updateAlumno(id, updates) {
  const { data, error } = await supabase
    .from('alumnos')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Eliminar alumno
export async function deleteAlumno(id) {
  const { error } = await supabase
    .from('alumnos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Crear coach (después del onboarding)
export async function createCoach(data) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: coach, error } = await supabase
    .from('coaches')
    .insert([{ user_id: user.id, ...data }])
    .select();

  if (error) throw error;
  return coach[0];
}
