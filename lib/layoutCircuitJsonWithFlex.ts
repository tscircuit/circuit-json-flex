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
    comp.center = {
      x: l.position.x + l.size.width / 2,
      y: l.position.y + l.size.height / 2,
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
