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
  findBoundsAndCenter,
  repositionPcbComponentTo,
  type CircuitJsonTreeNode,
} from "@tscircuit/circuit-json-util"

const debug = Debug("tscircuit:circuit-json-flex:layoutCircuitJsonWithFlex")

const toNumber = (v: unknown): number =>
  typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

type NodeInfo = {
  id: string
  componentIds: string[]
  bounding: ReturnType<typeof findBoundsAndCenter>
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
      (e) => e.type === "pcb_board" && e.subcircuit_id === subcircuitId,
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

  const collectCompIds = (n: CircuitJsonTreeNode): string[] => {
    if (n.nodeType === "component" && n.sourceComponent) {
      const scId = n.sourceComponent.source_component_id
      const pcb = circuitJsonCopy.find(
        (e) => e.type === "pcb_component" && e.source_component_id === scId,
      ) as PcbComponent | undefined
      return pcb ? [pcb.pcb_component_id] : []
    }
    // For the group nodes, recurse into children
    return n.childNodes.flatMap(collectCompIds)
  }

  tree.childNodes.forEach((child, idx) => {
    const compIds = collectCompIds(child)
    if (compIds.length === 0) return

    const pcbComps = compIds.map((id) =>
      circuitJsonCopy.find(
        (e) => e.type === "pcb_component" && e.pcb_component_id === id,
      ) as PcbComponent,
    )

    const bounding = findBoundsAndCenter(pcbComps)

    const itemWidth = bounding.width || toNumber(pcbComps[0]!.width)
    const itemHeight = bounding.height || toNumber(pcbComps[0]!.height)

    const id =
      (child.nodeType === "component" && compIds[0]) ||
      child.sourceGroup?.source_group_id ||
      `group_${idx}`

    rootFlex.addChild({ id, flexBasis: itemWidth, height: itemHeight })
    nodeInfos.push({ id, componentIds: compIds, bounding })
  })

  // Fallback: if we didn’t find anything, flex each component individually.
  if (nodeInfos.length === 0) {
    const pcbComps = circuitJsonCopy.filter(
      (e) => e.type === "pcb_component",
    ) as PcbComponent[]
    for (const comp of pcbComps) {
      rootFlex.addChild({
        id: comp.pcb_component_id,
        flexBasis: toNumber(comp.width),
        height: toNumber(comp.height),
      })
      nodeInfos.push({
        id: comp.pcb_component_id,
        componentIds: [comp.pcb_component_id],
        bounding: {
          center:
            "center" in comp
              ? (comp as any).center
              : { x: (comp as any).x, y: (comp as any).y },
          width: toNumber(comp.width),
          height: toNumber(comp.height),
        },
      })
    }
  }

  // 4. Compute layout & apply translations ----------------------------------
  rootFlex.build()
  const layout = rootFlex.getLayout()

  for (const info of nodeInfos) {
    const l = layout[info.id]
    if (!l) continue

    const { width, height, center: original } = info.bounding

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
