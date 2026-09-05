import { writable } from 'svelte/store'

export const timelineEvents = writable<{ date: string; event: string }[]>([])
export const referencedLaws = writable<
  { display: string; act: string; section: string; description?: string }[]
>([])
export const crossQuestionContext = writable<string>('')
