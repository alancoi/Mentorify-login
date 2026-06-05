import { supabase } from '../supabase';

export async function getCoachId() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: coach, error } = await supabase
    .from('coaches')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') throw error;
  return coach?.id;
}

export async function ensureCoach() {
  const { data: { user } } = await supabase.auth.getUser();
  let coachId = await getCoachId();

  if (!coachId) {
    const { data: newCoach, error } = await supabase
      .from('coaches')
      .insert([{ 
        user_id: user.id, 
        nombre: user.email.split('@')[0],
        practica: 'General'
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating coach:', error);
      throw error;
    }
    coachId = newCoach.id;
  }
  return coachId;
}

export async function getCoachPreferences() {
  const coachId = await ensureCoach();
  
  const { data: prefs, error } = await supabase
    .from('coach_preferences')
    .select('*')
    .eq('coach_id', coachId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  if (!prefs) {
    const { data: newPrefs, error: insertError } = await supabase
      .from('coach_preferences')
      .insert([{ coach_id: coachId }])
      .select()
      .single();
    
    if (insertError) throw insertError;
    return newPrefs;
  }
  return prefs;
}

export async function updateCoachPreferences(updates) {
  const coachId = await ensureCoach();
  const { data, error } = await supabase
    .from('coach_preferences')
    .update(updates)
    .eq('coach_id', coachId)
    .select()
    .single();
  
  if (error) throw error;
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

export async function updateAlumnoFull(id, updates) {
  const { data, error } = await supabase
    .from('alumnos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAlumnoFull(id) {
  const { error } = await supabase
    .from('alumnos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
