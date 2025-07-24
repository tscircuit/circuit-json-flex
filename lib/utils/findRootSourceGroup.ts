import type { AnyCircuitElement, SourceGroup, PcbBoard } from "circuit-json"

/**
 * Returns the *root* `source_group` for a given Circuit-JSON document.
 *
 * The root is defined as the `source_group` that either:
 *   • has `parent_subcircuit_id` **undefined** (top-level sub-circuit), or
 *   • matches the `subcircuit_id` of the sole `pcb_board` element (when a
 *     board is the container).
 *
 * If `childSubcircuitId` is provided, the search starts from that sub-circuit
 * and ascends through `parent_subcircuit_id` until the root is reached.
 */
export function findRootSourceGroup(
  circuitJson: AnyCircuitElement[],
  childSubcircuitId?: string,
): SourceGroup | undefined {
  // Helper to locate a source_group by its subcircuit_id
  const sourceBySubId = (id: string | undefined) =>
    circuitJson.find(
      (e): e is SourceGroup =>
        e.type === "source_group" && e.subcircuit_id === id,
    )

  let current: SourceGroup | undefined

  // 1. Determine starting point
  if (childSubcircuitId) {
    current = sourceBySubId(childSubcircuitId)
  }

  // If no child specified, but there is exactly one pcb_board, start there
  if (!current) {
    const board = circuitJson.find((e): e is PcbBoard => e.type === "pcb_board")
    if (board) {
      current = sourceBySubId(board.subcircuit_id)
    }
  }

  // Fallback: pick any source_group that is_subcircuit && no parent
  if (!current) {
    current = circuitJson.find(
      (e): e is SourceGroup =>
        e.type === "source_group" &&
        !!e.is_subcircuit &&
        (e.parent_subcircuit_id === undefined || e.parent_subcircuit_id === null),
    )
  }

  // 2. Ascend until no parent_subcircuit_id
  while (current && current.parent_subcircuit_id) {
    const parent = sourceBySubId(current.parent_subcircuit_id)
    if (!parent) break
    current = parent
  }

  return current
} 