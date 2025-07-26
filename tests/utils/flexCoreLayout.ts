import type { AnyCircuitElement, PcbGroup, SourceGroup } from "circuit-json"
import type { FlexBoxOptions } from "@tscircuit/miniflex"
import { layoutCircuitJsonWithFlex } from "../../lib/layoutCircuitJsonWithFlex"

/**
 * Return a *new* Circuit-JSON array with flex layout applied in the same order
 * that the TSCircuit core performs it: each sub-circuit (`pcb_group`) is laid
 * out first, **then** the top-level board.
 *
 * The algorithm is intentionally simplified for test purposes – it is
 * sufficient for the fixture circuits used in this repo (single-level
 * grouping).  If you introduce deeper nesting in your tests you may need to
 * enhance the traversal order to ensure child-most groups are processed first.
 */
export function applyFlexLikeCore(
  circuitJson: AnyCircuitElement[],
  options: Partial<FlexBoxOptions> = {},
): AnyCircuitElement[] {
  // Work on a *copy* so we never mutate the caller's data.
  const circuitJsonCopy = circuitJson.map((e) => ({ ...e }))

  // ────────────────────────────────────────────────────────────────
  // 1. Lay out every `pcb_group` sub-circuit individually
  //    (Core renders child circuits before the parent board)
  // ────────────────────────────────────────────────────────────────
  const groups = circuitJsonCopy.filter(
    (e): e is PcbGroup => e.type === "pcb_group" && !!e.is_subcircuit,
  ) as PcbGroup[]

  for (const g of groups) {
    // Grab the group itself *plus* any elements that belong to the group.
    const subset = circuitJsonCopy.filter((e) => {
      // ① The group itself and any PCB-level element that belongs to it
      if (e.type === "pcb_group" && e.pcb_group_id === g.pcb_group_id) {
        return true
      }
      if ("pcb_group_id" in e && (e as any).pcb_group_id === g.pcb_group_id) {
        return true
      }

      // ② The corresponding source_group (needed for findRootSourceGroup)
      if (
        e.type === "source_group" &&
        ((e as SourceGroup).source_group_id === g.source_group_id ||
          (e as SourceGroup).subcircuit_id === g.subcircuit_id)
      ) {
        return true
      }

      return false
    })

    if (subset.length === 0) continue

    console.log("source_group", subset.filter(e => e.type === "source_group")[0])
    console.log("before layout", subset.filter(e => e.type === "pcb_component")[0])
    const laidOut = layoutCircuitJsonWithFlex(subset, options)
    console.log("after layout", laidOut.filter(e => e.type === "pcb_component")[0])

    // Merge the updated items back into `circuitJsonCopy` (matching by id field)
    for (const updated of laidOut) {
      const id = getElementId(updated)
      const idx = circuitJsonCopy.findIndex(
        (e) => e.type === updated.type && getElementId(e) === id,
      )
      if (idx !== -1) {
        circuitJsonCopy[idx] = updated
      } else {
        circuitJsonCopy.push(updated)
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Finally, lay out the parent board (or root group) as a whole
  // ────────────────────────────────────────────────────────────────
  return layoutCircuitJsonWithFlex(circuitJsonCopy, options)
}

function getElementId(e: AnyCircuitElement): string | undefined {
  if ("pcb_group_id" in e) return e.pcb_group_id
  if ("pcb_component_id" in e) return e.pcb_component_id
  if ("source_group_id" in e) return e.source_group_id
  if ("pcb_board_id" in e) return e.pcb_board_id
  return undefined
} 