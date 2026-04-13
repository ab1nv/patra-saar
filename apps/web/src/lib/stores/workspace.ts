import { writable } from 'svelte/store'

export type SidebarCase = {
  id: string
  name: string
  created_at: number
}

export const activeCaseId = writable<string | null>(null)
export const sidebarCases = writable<SidebarCase[]>([])
export const timelineEvents = writable<{ date: string; event: string }[]>([])
export const referencedLaws = writable<
  { display: string; act: string; section: string; description?: string }[]
>([])
export const crossQuestionContext = writable<string>('')

export function clearWorkspacePanels() {
  timelineEvents.set([])
  referencedLaws.set([])
  crossQuestionContext.set('')
}
