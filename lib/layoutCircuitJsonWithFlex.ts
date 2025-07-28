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

  // 1. Build a tree of the circuit
  const tree = getCircuitJsonTree(circuitJsonCopy)

  let rootContainer: PcbBoard | PcbGroup | undefined

  const rootSubcircuitId = tree.sourceGroup?.subcircuit_id

  if (rootSubcircuitId) {
    // Prefer a pcb_board
    rootContainer = circuitJsonCopy.find((e) => e.type === "pcb_board") as
      | PcbBoard
      | undefined

    // Fallback to pcb_group (is_subcircuit)
    if (!rootContainer) {
      rootContainer = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_group" &&
          (e as PcbGroup).is_subcircuit === true &&
          e.subcircuit_id === rootSubcircuitId,
      ) as PcbGroup | undefined
    }
  }

  if (!rootContainer) return circuitJsonCopy

  const rootSubcircuitWidth = toNumber(rootContainer.width)
  const rootSubcircuitHeight = toNumber(rootContainer.height)

  // 2. Prepare the flex root for the selected container
  const rootFlex = new RootFlexBox(rootSubcircuitWidth, rootSubcircuitHeight, {
    id: rootContainer.subcircuit_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
  })

  // 3. Build flex items – one per *immediate* child of the tree root. Each
  //    child may be either a component itself or a (nested) group.
  const nodeInfos: NodeInfo[] = []

  tree.childNodes.forEach((child, idx) => {
    let refCenter: { x: number; y: number }
    let width: number
    let height: number

    let childFlexItemId: string
    let componentIds: string[]

    if (child.nodeType === "component") {
      const comp = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_component" &&
          e.source_component_id === child.sourceComponent!.source_component_id,
      ) as PcbComponent | undefined
      if (!comp) return

      width = toNumber(comp.width)
      height = toNumber(comp.height)
      refCenter = comp.center

      childFlexItemId = comp.pcb_component_id
      componentIds = [comp.pcb_component_id]
    } else {
      // GROUP: try to locate its pcb_group for dimensions
      const scId = child.sourceGroup?.subcircuit_id

      const pcbGroup = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_group" &&
          (e as PcbGroup).is_subcircuit === true &&
          e.subcircuit_id === scId,
      ) as PcbGroup | undefined

      if (!pcbGroup) return

      width = toNumber(pcbGroup.width)
      height = toNumber(pcbGroup.height)
      refCenter = pcbGroup.center

      childFlexItemId = pcbGroup.subcircuit_id!
      // collect all pcb_components that belong to this group
      componentIds = circuitJsonCopy
        .filter(
          (e): e is PcbComponent =>
            e.type === "pcb_component" &&
            e.subcircuit_id === pcbGroup.subcircuit_id,
        )
        .map((c) => c.pcb_component_id)
    }

    const itemWidth = width
    const itemHeight = height

    rootFlex.addChild({
      id: childFlexItemId,
      flexBasis: itemWidth,
      height: itemHeight,
    })
    nodeInfos.push({
      id: childFlexItemId,
      componentIds,
      refCenter,
      width,
      height,
    })
  })

  // 4. Compute layout & apply translations ----------------------------------
  rootFlex.build()
  const layout = rootFlex.getLayout()

  for (const info of nodeInfos) {
    const l = layout[info.id]
    if (!l) continue

    const { width, height, refCenter: originalCenter } = info

    // Convert from screen-space (top-left origin) to Cartesian centre
    const newCenter = {
      x: l.position.x + width / 2 - rootSubcircuitWidth / 2,
      y: -(l.position.y + height / 2) + rootSubcircuitHeight / 2,
    }

    const dx = newCenter.x - originalCenter.x
    const dy = newCenter.y - originalCenter.y

    for (const compId of info.componentIds) {
      const comp = circuitJsonCopy.find(
        (e) => e.type === "pcb_component" && e.pcb_component_id === compId,
      ) as PcbComponent

      const current = comp.center
      repositionPcbComponentTo(circuitJsonCopy, compId, {
        x: current.x + dx,
        y: current.y + dy,
      })
    }
  }

  return circuitJsonCopy
}
