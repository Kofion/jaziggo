import type { BurialSpaceLocation } from "../../types/burial-space"

const LOCATION_PARTS = [
  ["sector", "Setor"],
  ["row", "Quadra/Fila"],
  ["street", "Rua"],
  ["block", "Bloco"],
  ["number", "Número"],
  ["complement", "Complemento"],
] as const satisfies ReadonlyArray<
  readonly [keyof BurialSpaceLocation, string]
>

export function formatLocation(
  location: BurialSpaceLocation,
): string {
  return LOCATION_PARTS.flatMap(([key, label]) => {
    const value = location[key]?.trim()

    return value ? [`${label}: ${value}`] : []
  }).join(", ")
}
