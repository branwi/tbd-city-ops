import { supabase } from './supabaseClient'

export async function updateIncidentStatus(id, previousStatus, newStatus) {
  const { error: updateErr } = await supabase
    .from('incidents')
    .update({ status: newStatus })
    .eq('id', id)

  if (updateErr) return { error: updateErr.message }

  const { error: eventErr } = await supabase
    .from('status_events')
    .insert({
      incident_id:     id,
      previous_status: previousStatus,
      new_status:      newStatus,
      action_note:     `Status changed from ${previousStatus} to ${newStatus}`,
      actor_name:      'demo_operator',
    })

  if (eventErr) return { error: eventErr.message }

  return { error: null }
}
