import { computed, readonly, shallowRef } from 'vue'
import {
  changeFormation,
  emptyLineup,
  getFormation,
  placePlayer,
  readLineup,
  removePlayer,
  type FormationId,
} from '@/data/lineup'

export const LINEUP_STORAGE_KEY = 'matchday.personal-lineup.v1'
export function usePersonalLineup() {
  const draft = shallowRef(emptyLineup())
  const storageError = shallowRef(false)
  try {
    const saved = localStorage.getItem(LINEUP_STORAGE_KEY)
    if (saved) draft.value = readLineup(JSON.parse(saved)) ?? emptyLineup()
  } catch {
    storageError.value = true
  }
  function commit(next: typeof draft.value) {
    draft.value = next
    try {
      localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(next))
      storageError.value = false
    } catch {
      storageError.value = true
    }
  }
  return {
    draft: readonly(draft),
    storageError: readonly(storageError),
    template: computed(() => getFormation(draft.value.formation)),
    place: (player: string, slot: string) => commit(placePlayer(draft.value, player, slot)),
    remove: (player: string) => commit(removePlayer(draft.value, player)),
    change: (formation: FormationId) => commit(changeFormation(draft.value, formation)),
    clear: () => commit(emptyLineup(draft.value.formation)),
  }
}
