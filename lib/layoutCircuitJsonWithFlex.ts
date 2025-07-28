import { RootFlexBox } from "@tscircuit/miniflex"
import type { FlexBoxOptions } from "@tscircuit/miniflex"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
} from "circuit-json"
import Debug from "debug"
import {
  getCircuitJsonTree,
  repositionPcbComponentTo,
} from "@tscircuit/circuit-json-util"

const debug = Debug("tscircuit:circuit-json-flex:layoutCircuitJsonWithFlex")

const toNumber = (v: unknown): number =>
  typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

type NodeInfo = {
  id: string
  componentIds: string[]
  refCenter: { x: number; y: number }
  width: number
  height: number
}

export function layoutCircuitJsonWithFlex(
  circuitJson: AnyCircuitElement[],
  options: Partial<FlexBoxOptions> = {},
): AnyCircuitElement[] {
  const circuitJsonCopy = circuitJson.map((e) => ({ ...e }))

  // 1. Build a tree of the circuit – this already groups components for us
  const tree = getCircuitJsonTree(circuitJsonCopy)
  Bun.write("circuitJsonTree.json", JSON.stringify(tree, null, 2))

  let rootContainer: PcbBoard | PcbGroup | undefined

  const subcircuitId = tree.sourceGroup?.subcircuit_id

  if (subcircuitId) {
    // Prefer a pcb_board
    rootContainer = circuitJsonCopy.find(
      (e) => e.type === "pcb_board",
    ) as PcbBoard | undefined

    // Fallback to pcb_group (is_subcircuit)
    if (!rootContainer) {
      rootContainer = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_group" &&
          (e as PcbGroup).is_subcircuit === true &&
          e.subcircuit_id === subcircuitId,
      ) as PcbGroup | undefined
    }
  }

  if (!rootContainer) return circuitJsonCopy

  const subcircuitWidth = toNumber(rootContainer.width)
  const subcircuitHeight = toNumber(rootContainer.height)

  // 2. Prepare the flex root for the selected container
  const rootFlex = new RootFlexBox(subcircuitWidth, subcircuitHeight, {
    id: rootContainer.subcircuit_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
  })

  // 3. Build flex items – one per *immediate* child of the tree root. Each
  //    child may be either a component itself or a (nested) group. A helper
  //    walks the child to collect all pcb_components it contains so we can
  //    treat them as a single flex item and later move them together.
  const nodeInfos: NodeInfo[] = []

  tree.childNodes.forEach((child, idx) => {
    // ---------------------------------------------------------------------
    // Build the flex-item definition
    // ---------------------------------------------------------------------
    let refCenter: { x: number; y: number }
    let width = 1
    let height = 1

    if (child.nodeType === "component") {
      const comp = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_component" &&
          e.source_component_id === child.sourceComponent!.source_component_id,
      ) as PcbComponent | undefined
      if (!comp) return

      width = toNumber(comp.width) || 1
      height = toNumber(comp.height) || 1
      refCenter = (comp as any).center ?? { x: (comp as any).x, y: (comp as any).y }
    } else {
      // GROUP: try to locate its pcb_group / board for dimensions
      const scId = child.sourceGroup?.subcircuit_id

      const container = circuitJsonCopy.find(
        (e) =>
          (e.type === "pcb_group" && (e as PcbGroup).is_subcircuit === true) &&
          e.subcircuit_id === scId,
      ) as PcbGroup | undefined

      if (!container) return

      width = toNumber(container.width)
      height = toNumber(container.height)
      refCenter = container.center
    }

    const itemWidth = width
    const itemHeight = height

    const id = child.nodeType === "component" ? child.otherChildElements.find(e => e.type === "pcb_component")!.pcb_component_id as string : child.sourceGroup!.subcircuit_id as string

    rootFlex.addChild({ id, flexBasis: itemWidth, height: itemHeight })
    nodeInfos.push({ id, componentIds: [id], refCenter, width, height })
  })

  // 4. Compute layout & apply translations ----------------------------------
  rootFlex.build()
  // Bun.write("rootFlex.json", JSON.stringify(rootFlex, null, 2))
  const layout = rootFlex.getLayout()

  for (const info of nodeInfos) {
    const l = layout[info.id]
    if (!l) continue

    const { width, height, refCenter: original } = info

    // Convert from screen-space (top-left origin) to Cartesian centre
    const newCenter = {
      x: l.position.x + width / 2 - subcircuitWidth / 2,
      y: -(l.position.y + height / 2) + subcircuitHeight / 2,
    }

    const dx = newCenter.x - original.x
    const dy = newCenter.y - original.y

    for (const compId of info.componentIds) {
      const comp = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_component" && e.pcb_component_id === compId,
      ) as PcbComponent | undefined
      if (!comp) continue

      const current =
        "center" in comp
          ? (comp as any).center
          : { x: (comp as any).x, y: (comp as any).y }
      repositionPcbComponentTo(circuitJsonCopy, compId, {
        x: current.x + dx,
        y: current.y + dy,
      })
    }
  }

  return circuitJsonCopy
}
