"use server";

import { revalidatePath } from "next/cache";

import { requireCoach } from "@/lib/viewer";

export type NoteState = { error: string } | { saved: number } | null;

const MAX_NOTE = 5000;

/** Add a private coach note about a client, optionally tied to one of their sessions. */
export async function addNote(clientId: string, _prev: NoteState, formData: FormData): Promise<NoteState> {
  const { supabase, user } = await requireCoach(`/coach/clients/${clientId}`);

  const body = String(formData.get("body") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "") || null;
  if (!body) return { error: "Write something first." };
  if (body.length > MAX_NOTE) return { error: `Notes are limited to ${MAX_NOTE.toLocaleString()} characters.` };

  if (sessionId) {
    // The session must belong to this client, or the note would be misfiled.
    const { data: owned } = await supabase
      .from("tracking_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!owned) return { error: "That session doesn't belong to this client." };
  }

  const { error } = await supabase
    .from("coach_notes")
    .insert({ client_id: clientId, session_id: sessionId, author_id: user.id, body });
  if (error) return { error: `The note couldn't be saved: ${error.message}` };

  revalidatePath(`/coach/clients/${clientId}`);
  return { saved: Date.now() };
}

/** Delete a note. RLS only lets its author delete it; anyone else deletes nothing. */
export async function deleteNote(clientId: string, noteId: string) {
  const { supabase } = await requireCoach(`/coach/clients/${clientId}`);
  await supabase.from("coach_notes").delete().eq("id", noteId).eq("client_id", clientId);
  revalidatePath(`/coach/clients/${clientId}`);
}
