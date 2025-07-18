import { RootFlexBox, type FlexBoxOptions } from "@tscircuit/miniflex"
import type { AnyCircuitElement, PcbComponent, Point } from "circuit-json"
import Debug from "debug"
/**
 * Lay out PCB components of a Circuit JSON using a flex-box algorithm.
 *
 * The function:
 *   • Finds the first `pcb_board` element to size the root flex container
 *   • Adds every `pcb_component` as a flex-item (leaf)
 *   • Runs `miniflex` to compute positions
 *   • Writes the resulting {x,y} centre back to each `pcb_component`
 * Only the `center` field of `pcb_component`s is mutated – all other data stays intact.
 */
const debug = Debug("tscircuit:circuit-json-flex:layoutCircuitJsonWithFlex")

export function layoutCircuitJsonWithFlex(
  circuitJson: AnyCircuitElement[],
  options: Partial<FlexBoxOptions> = {},
): AnyCircuitElement[] {
  const circuitJsonCopy = circuitJson.map((e) => ({ ...e }))
  /** Helper: turn `"12mm"` → 12, 10 → 10 */
  const toNumber = (v: unknown): number =>
    typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

  // Determine board size for the root flex-box
  const pcbBoard = circuitJsonCopy.find((e) => e.type === "pcb_board")
  if (!pcbBoard) return circuitJsonCopy
  const boardWidth = toNumber(pcbBoard.width)
  const boardHeight = toNumber(pcbBoard.height)

  const root = new RootFlexBox(boardWidth, boardHeight, {
    direction: "row",
    justifyContent: "space-between", // HARDCODED
  })

  // Add every pcb_component as an item
  const pcbComponents = circuitJsonCopy.filter(
    (e) => e.type === "pcb_component",
  ) as PcbComponent[]

  debug("pcbComponents before layout", pcbComponents)

  for (const comp of pcbComponents) {
    root.addChild({
      id: comp.pcb_component_id,
      flexGrow: 1,
      flexBasis: 0,
    })
  }

  root.build()
  const layout = root.getLayout()

  // Apply calculated centres back to the pcb_components
  for (const comp of pcbComponents) {
    const l = layout[comp.pcb_component_id]
    if (!l) continue
    const oldCenter = { ...(comp.center as Point) }
    const newCenter = {
      x: l.position.x + l.size.width / 2,
      y: l.position.y + l.size.height / 2,
    }
    const dx = newCenter.x - (oldCenter?.x ?? 0)
    const dy = newCenter.y - (oldCenter?.y ?? 0)
    comp.center = newCenter
    // Shift any pcb_smtpad(s) that belong to this component
    for (const element of circuitJsonCopy) {
      if (
        element.type === "pcb_smtpad" &&
        element.pcb_component_id === comp.pcb_component_id
      ) {
        if ("x" in element && typeof element.x === "number") element.x += dx
        if ("y" in element && typeof element.y === "number") element.y += dy
        if ("center" in element && element.center) {
          element.center = {
            x: (element.center.x ?? 0) + dx,
            y: (element.center.y ?? 0) + dy,
          }
        }
      }
    }
  }

  debug("pcbComponents after layout", pcbComponents)

  const result = circuitJsonCopy.map((e) =>
    e.type === "pcb_component"
      ? {
          ...e,
          center: pcbComponents.find((c) => c.pcb_component_id === e.pcb_component_id)
            ?.center as Point,
        }
      : e,
  )

  debug("result", result.filter((e) => e.type === "pcb_component"))

  return result
}
