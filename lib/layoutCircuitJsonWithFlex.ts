import { RootFlexBox, type FlexBoxOptions } from "@tscircuit/miniflex"

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
export function layoutCircuitJsonWithFlex(
  circuitJson: any[],
  options: Partial<FlexBoxOptions> = {}
): any[] {
  if (!Array.isArray(circuitJson)) return circuitJson

  /** Helper: turn `"12mm"` → 12, 10 → 10 */
  const toNumber = (v: unknown): number =>
    typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

  // Determine board size for the root flex-box
  const pcbBoard = circuitJson.find((e) => e.type === "pcb_board")
  if (!pcbBoard) return circuitJson
  const boardWidth = toNumber(pcbBoard.width)
  const boardHeight = toNumber(pcbBoard.height)

  const root = new RootFlexBox(boardWidth, boardHeight, {
    direction: "row",
    ...options,
  })

  // Add every pcb_component as an item
  const pcbComponents = circuitJson.filter(
    (e) => e.type === "pcb_component"
  ) as any[]

  pcbComponents.forEach((comp) => {
    root.addChild({
      id: comp.pcb_component_id,
      flexGrow: 1,
      flexBasis: 0,
    })
  })

  root.build()
  const layout = root.getLayout()

  // Apply calculated centres back to the Circuit JSON
  pcbComponents.forEach((comp) => {
    const l = layout[comp.pcb_component_id]
    if (!l) return
    comp.center = {
      x: l.position.x + l.size.width / 2,
      y: l.position.y + l.size.height / 2,
    }
  })

  return circuitJson
}

export default layoutCircuitJsonWithFlex
