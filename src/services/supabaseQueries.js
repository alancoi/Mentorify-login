import { supabase } from '../supabase';

export async function getCoachId() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return coach?.id;
}

export async function ensureCoach() {
  const { data: { user } } = await supabase.auth.getUser();
  let { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coach) {
    const { data: newCoach } = await supabase
      .from('coaches')
      .insert([{ user_id: user.id, nombre: user.email.split('@')[0] }])
      .select()
      .single();
    coach = newCoach;
  }
  return coach.id;
}

export async function getCoachPreferences() {
  const coachId = await ensureCoach();
  let { data: prefs } = await supabase
    .from('coach_preferences')
    .select('*')
    .eq('coach_id', coachId)
    .single();

  if (!prefs) {
    const { data: newPrefs } = await supabase
      .from('coach_preferences')
      .insert([{ coach_id: coachId }])
      .select()
      .single();
    prefs = newPrefs;
  }
  return prefs;
}

export async function updateCoachPreferences(updates) {
  const coachId = await ensureCoach();
  const { data } = await supabase
    .from('coach_preferences')
    .update(updates)
    .eq('coach_id', coachId)
    .select()
    .single();
  return data;
}

export async function createAlumnoFull(alumno) {
  const coachId = await ensureCoach();
  const { data, error } = await supabase
    .from('alumnos')
    .insert([{ ...alumno, coach_id: coachId }])
    .select();
  if (error) throw error;
  return data[0];
}

export async function getAlumnosFull() {
  const coachId = await ensureCoach();
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
