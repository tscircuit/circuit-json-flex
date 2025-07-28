import type { FlexBoxOptions } from "@tscircuit/miniflex"

export function getMinimumFlexContainer(
  items: { width: number; height: number }[],
  options: Partial<FlexBoxOptions> = {},
): { width: number; height: number } {
  const direction = options.direction ?? "row"
  const columnGap = options.columnGap ?? 0
  const rowGap = options.rowGap ?? 0

  if (direction.startsWith("row")) {
    const width =
      items.reduce((sum, it) => sum + it.width, 0) +
      columnGap * Math.max(0, items.length - 1)
    const height = items.reduce((max, it) => Math.max(max, it.height), 0)
    return { width, height }
  }

  const width = items.reduce((max, it) => Math.max(max, it.width), 0)
  const height =
    items.reduce((sum, it) => sum + it.height, 0) +
    rowGap * Math.max(0, items.length - 1)
  return { width, height }
}
