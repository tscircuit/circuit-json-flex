import { RootFlexBox, type FlexBoxOptions } from "@tscircuit/miniflex"
import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import Debug from "debug"
import { transformPCBElements } from "@tscircuit/circuit-json-util"
import { translate } from "transformation-matrix"
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

const toNumber = (v: unknown): number =>
  typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

export function layoutCircuitJsonWithFlex(
  circuitJson: AnyCircuitElement[],
  options: Partial<FlexBoxOptions> = {},
): AnyCircuitElement[] {
  const circuitJsonCopy = circuitJson.map((e) => ({ ...e }))

  // Determine board size for the root flex-box
  const pcbBoard = circuitJsonCopy.find((e) => e.type === "pcb_board")
  if (!pcbBoard) return circuitJsonCopy

  const boardWidth = toNumber(pcbBoard.width)
  const boardHeight = toNumber(pcbBoard.height)

  const root = new RootFlexBox(boardWidth, boardHeight, {
    id: pcbBoard.pcb_board_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
  })

  // Add every pcb_component as an item
  const pcbComponents = circuitJsonCopy.filter(
    (e) => e.type === "pcb_component",
  ) as PcbComponent[]

  for (const comp of pcbComponents) {
    root.addChild({
      id: comp.pcb_component_id,
      flexBasis: toNumber(comp.width),
      height: toNumber(comp.height),
    })
  }

  root.build()
  const layout = root.getLayout()

  // Apply calculated centres back to all the child components of the pcb_component
  for (const comp of pcbComponents) {
    const l = layout[comp.pcb_component_id]
    if (!l) continue

    // Convert from miniflex screen coordinates to cartesian coordinates
    // and miniflex coordinates origin is top-left to center of the board
    const center = {
      x: l.position.x + comp.width / 2 - boardWidth / 2,
      y: -(l.position.y + comp.height / 2) + boardHeight / 2,
    }

    transformPCBElements(
      circuitJsonCopy.filter(
        (e) =>
          "pcb_component_id" in e &&
          e.pcb_component_id === comp.pcb_component_id,
      ),
      translate(center.x, center.y),
    )
  }

  return circuitJsonCopy
}
