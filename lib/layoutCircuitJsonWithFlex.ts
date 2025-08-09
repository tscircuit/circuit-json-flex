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
  options: Partial<FlexBoxOptions & { inferContainerSize?: boolean }> = {},
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

  // -----------------------------------------------------------------------
  // Collapse a degenerate hierarchy layer: If the current root has exactly
  // one child and that child is itself a *subcircuit* group with explicit
  // dimensions, then we treat that child as the new root container. This
  // allows the layout to operate on the meaningful contents rather than an
  // unnecessary wrapper (common when a board contains a single sub-circuit
  // group).
  // -----------------------------------------------------------------------
  let effectiveTree = tree
  let effectiveRootContainer: PcbBoard | PcbGroup = rootContainer

  while (
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

  const rootSubcircuitWidth = toNumber(effectiveRootContainer.width)
  const rootSubcircuitHeight = toNumber(effectiveRootContainer.height)

  // 2. Gather information about each immediate child of the selected
  //    container. We'll create the flexbox only *after* we've computed a
  //    suitable container size (which might be missing on the PCB board /
  //    group when it's not a sub-circuit).
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

    nodeInfos.push({
      id: childFlexItemId,
      pcbComponentIds,
      refCenter,
      width,
      height,
    })
  }

  // --------------------------------------------------------------
  // 3. Derive container dimensions if they were not explicitly provided ----
  let containerWidth = rootSubcircuitWidth
  let containerHeight = rootSubcircuitHeight

  if (
    options.inferContainerSize === true ||
    !(containerWidth > 0) ||
    !(containerHeight > 0)
  ) {
    const { width: minW, height: minH } = getMinimumFlexContainer(
      nodeInfos.map((n) => ({ width: n.width, height: n.height })),
      options,
    )
    if (options.inferContainerSize === true || !(containerWidth > 0)) {
      containerWidth = minW
    }
    if (options.inferContainerSize === true || !(containerHeight > 0)) {
      containerHeight = minH
    }
    // Persist inferred size back into the container element so that downstream
    // tooling (e.g. SVG export) can rely on meaningful dimensions.
    ;(effectiveRootContainer as any).width = containerWidth
    ;(effectiveRootContainer as any).height = containerHeight
  }

  // 4. Build the flex layout ----------------------------------------------
  const rootFlex = new RootFlexBox(containerWidth, containerHeight, {
    id: effectiveRootContainer.subcircuit_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
    direction: options.direction ?? "row",
    columnGap: options.columnGap ?? 0,
    rowGap: options.rowGap ?? 0,
  })

  for (const info of nodeInfos) {
    rootFlex.addChild({
      id: info.id,
      flexBasis: info.width,
      height: info.height,
    })
  }

  rootFlex.build()
  const layout = rootFlex.getLayout()

  // 5. Apply translations ---------------------------------------------------
  for (const info of nodeInfos) {
    const l = layout[info.id]
    if (!l) continue

    const { width, height, refCenter: originalCenter } = info

    // Convert from screen-space (top-left origin) to Cartesian centre
    const newCenter = {
      x: l.position.x + width / 2 - containerWidth / 2,
      y: -(l.position.y + height / 2) + containerHeight / 2,
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
