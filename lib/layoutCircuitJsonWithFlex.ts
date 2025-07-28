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
import { getMinimumFlexContainer } from "./getMinimumFlexContainer"

const debug = Debug("tscircuit:circuit-json-flex:layoutCircuitJsonWithFlex")

const toNumber = (v: unknown): number =>
  typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

type NodeInfo = {
  id: string
  pcbComponentIds: string[]
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

  if (!rootContainer) {
    debug("no root container found; using implicit container")
  }

  // -----------------------------------------------------------------------
  // Collapse a degenerate hierarchy layer: If the current root has exactly
  // one child and that child is itself a *subcircuit* group with explicit
  // dimensions, then we treat that child as the new root container. This
  // allows the layout to operate on the meaningful contents rather than an
  // unnecessary wrapper (common when a board contains a single sub-circuit
  // group).
  // -----------------------------------------------------------------------
  let effectiveTree = tree
  let effectiveRootContainer: PcbBoard | PcbGroup | undefined = rootContainer

  while (
    effectiveRootContainer &&
    effectiveTree.childNodes.length === 1 &&
    ((): boolean => {
      const firstChild = effectiveTree.childNodes[0]
      return (
        firstChild !== undefined &&
        firstChild.nodeType === "group" &&
        Boolean(firstChild.sourceGroup?.subcircuit_id)
      )
    })()
  ) {
    const firstChild = effectiveTree.childNodes[0]!
    const childSubId = firstChild.sourceGroup!.subcircuit_id!

    const childPcbGroup = circuitJsonCopy.find(
      (e) =>
        e.type === "pcb_group" &&
        (e as PcbGroup).is_subcircuit === true &&
        e.subcircuit_id === childSubId,
    ) as PcbGroup | undefined

    // Stop if we can't find a matching pcb_group or it lacks size info
    if (
      !childPcbGroup ||
      childPcbGroup.width == null ||
      childPcbGroup.height == null
    ) {
      break
    }

    // Drill down one level
    effectiveTree = firstChild
    effectiveRootContainer = childPcbGroup
  }

  // 2. Build flex items – one per *immediate* child of the tree root. Each
  //    child may be either a component itself or a (nested) group.
  const nodeInfos: NodeInfo[] = []

  for (const child of effectiveTree.childNodes) {
    let refCenter: { x: number; y: number }
    let width: number
    let height: number

    let childFlexItemId: string
    let pcbComponentIds: string[]

    if (child.nodeType === "component") {
      const comp = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_component" &&
          e.source_component_id === child.sourceComponent!.source_component_id,
      ) as PcbComponent | undefined
      if (!comp) {
        continue
      }

      width = toNumber(comp.width)
      height = toNumber(comp.height)
      refCenter = comp.center

      childFlexItemId = comp.pcb_component_id
      pcbComponentIds = [comp.pcb_component_id]
    } else {
      // GROUP: try to locate its pcb_group for dimensions
      const scId = child.sourceGroup?.subcircuit_id

      const pcbGroup = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_group" &&
          (e as PcbGroup).is_subcircuit === true &&
          e.subcircuit_id === scId,
      ) as PcbGroup | undefined

      if (!pcbGroup) {
        continue
      }

      width = toNumber(pcbGroup.width)
      height = toNumber(pcbGroup.height)
      refCenter = pcbGroup.center

      childFlexItemId = pcbGroup.subcircuit_id!
      // collect all pcb_components that belong to this group
      pcbComponentIds = circuitJsonCopy
        .filter(
          (e): e is PcbComponent =>
            e.type === "pcb_component" &&
            e.subcircuit_id === pcbGroup.subcircuit_id,
        )
        .map((c) => c.pcb_component_id)
    }

    const itemWidth = width
    const itemHeight = height

    nodeInfos.push({
      id: childFlexItemId,
      pcbComponentIds,
      refCenter,
      width,
      height,
    })
  }
  let rootSubcircuitWidth = effectiveRootContainer
    ? toNumber(effectiveRootContainer.width)
    : 0
  let rootSubcircuitHeight = effectiveRootContainer
    ? toNumber(effectiveRootContainer.height)
    : 0

  if (rootSubcircuitWidth === 0 || rootSubcircuitHeight === 0) {
    const { width: minW, height: minH } = getMinimumFlexContainer(
      nodeInfos.map((i) => ({ width: i.width, height: i.height })),
      options,
    )
    if (rootSubcircuitWidth === 0) rootSubcircuitWidth = minW
    if (rootSubcircuitHeight === 0) rootSubcircuitHeight = minH
    if (effectiveRootContainer) {
      if (effectiveRootContainer.width == null) {
        effectiveRootContainer.width = rootSubcircuitWidth
      }
      if (effectiveRootContainer.height == null) {
        effectiveRootContainer.height = rootSubcircuitHeight
      }
    }
  }

  const rootFlex = new RootFlexBox(rootSubcircuitWidth, rootSubcircuitHeight, {
    id: effectiveRootContainer?.subcircuit_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
    ...(options.direction != null ? { direction: options.direction } : {}),
    ...(options.columnGap != null ? { columnGap: options.columnGap } : {}),
    ...(options.rowGap != null ? { rowGap: options.rowGap } : {}),
  })

  for (const info of nodeInfos) {
    rootFlex.addChild({
      id: info.id,
      flexBasis: info.width,
      height: info.height,
    })
  }

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

    for (const pcbComponentId of info.pcbComponentIds) {
      const pcbComponent = circuitJsonCopy.find(
        (e) =>
          e.type === "pcb_component" && e.pcb_component_id === pcbComponentId,
      ) as PcbComponent

      repositionPcbComponentTo(circuitJsonCopy, pcbComponentId, {
        x: pcbComponent.center.x + dx,
        y: pcbComponent.center.y + dy,
      })
    }
  }

  return circuitJsonCopy
}
