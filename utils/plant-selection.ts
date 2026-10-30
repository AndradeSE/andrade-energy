export function plantSelectionExists(plants: readonly { id: string }[], selectedId?: string | null) {
  return Boolean(selectedId && plants.some((plant) => plant.id === selectedId));
}
