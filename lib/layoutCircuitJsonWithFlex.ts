import { RootFlexBox } from "@tscircuit/miniflex"
import type { FlexBoxOptions } from "@tscircuit/miniflex"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
} from "circuit-json"
import Debug from "debug"
import { transformPCBElements } from "@tscircuit/circuit-json-util"
import { translate } from "transformation-matrix"
import { findRootSourceGroup } from "./utils/findRootSourceGroup"

const debug = Debug("tscircuit:circuit-json-flex:layoutCircuitJsonWithFlex")

const toNumber = (v: unknown) =>
  typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : 0

export function layoutCircuitJsonWithFlex(
  circuitJson: AnyCircuitElement[],
  options: Partial<FlexBoxOptions> = {},
): AnyCircuitElement[] {
  const circuitJsonCopy = circuitJson.map((e) => ({ ...e }))

  // Determine the container that defines the root flex area
  let subcircuit: PcbBoard | PcbGroup | undefined

  // Prefer a pcb_board when present – flex layout will treat the board as the container
  const board = circuitJsonCopy.find((e): e is PcbBoard => e.type === "pcb_board")
  if (board) {
    subcircuit = board
  } else {
    // Otherwise fall back to the root pcb_group that corresponds to the root source_group
    const rootSrc = findRootSourceGroup(circuitJsonCopy)
    if (rootSrc) {
      subcircuit = circuitJsonCopy.find(
        (e): e is PcbGroup =>
          e.type === "pcb_group" && e.source_group_id === rootSrc.source_group_id,
      )
    }
  }

  if (!subcircuit) {
    debug("No board / sub-circuit found – nothing to lay out")
    return circuitJsonCopy
  }
  const isContainerGroup = subcircuit.type === "pcb_group"
  const subcircuitWidth = toNumber(subcircuit.width)
  const subcircuitHeight = toNumber(subcircuit.height)

  const root = new RootFlexBox(subcircuitWidth, subcircuitHeight, {
    id: subcircuit.subcircuit_id,
    justifyContent: options.justifyContent ?? "center",
    alignItems: options.alignItems ?? "center",
  })

  // ────────────────────────────────────────────────────────────────
  // 2.  Decide what becomes a flex-item
  //     • every sub-circuit group (except the root container itself)
  //     • every pcb_component NOT inside any group
  //       (or inside the container group when no board exists)
  // ────────────────────────────────────────────────────────────────
  const pcbGroups = circuitJsonCopy.filter(
    (e): e is PcbGroup => e.type === "pcb_group" && !!e.is_subcircuit,
  )

  const childGroups: PcbGroup[] = []
  const childComponents: PcbComponent[] = []

  if (isContainerGroup) {
    // Root group case (no board)
    const rootGroupId = (subcircuit as PcbGroup).pcb_group_id
    childGroups.push(...pcbGroups.filter((g) => g.pcb_group_id !== rootGroupId))
    childComponents.push(
      ...circuitJsonCopy.filter(
        (e): e is PcbComponent =>
          e.type === "pcb_component" && e.pcb_group_id === rootGroupId,
      ),
    )
  } else {
    // Board container case
    childGroups.push(...pcbGroups)
    childComponents.push(
      ...circuitJsonCopy.filter(
        (e): e is PcbComponent => e.type === "pcb_component" && !e.pcb_group_id,
      ),
    )
  }

  // Add groups first
  for (const g of childGroups) {
    root.addChild({
      id: g.pcb_group_id,
      flexBasis: toNumber(g.width),
      height: toNumber(g.height),
    })
  }
  // Then standalone components
  for (const c of childComponents) {
    root.addChild({
      id: c.pcb_component_id,
      flexBasis: toNumber(c.width),
      height: toNumber(c.height),
    })
  }

  // ────────────────────────────────────────────────────────────────
  // 3.  Flex layout
  // ────────────────────────────────────────────────────────────────
  root.build()
  const layout = root.getLayout()

  // Move whole groups
  for (const g of childGroups) {
    const l = layout[g.pcb_group_id]
    if (!l) continue
    const center = {
      x: l.position.x + toNumber(g.width) / 2 - subcircuitWidth / 2,
      y: -(l.position.y + toNumber(g.height) / 2) + subcircuitHeight / 2,
    }

    transformPCBElements(
      circuitJsonCopy.filter(
        (e) =>
          (e.type === "pcb_group" && e.pcb_group_id === g.pcb_group_id) ||
          ("pcb_group_id" in e && e.pcb_group_id === g.pcb_group_id),
      ),
      translate(center.x, center.y),
    )
  }

  // Move individual top-level components
  for (const c of childComponents) {
    const l = layout[c.pcb_component_id]
    if (!l) continue
    const centre = {
      x: l.position.x + toNumber(c.width) / 2 - subcircuitWidth / 2,
      y: -(l.position.y + toNumber(c.height) / 2) + subcircuitHeight / 2,
    }

    transformPCBElements(
      circuitJsonCopy.filter(
        (e) =>
          "pcb_component_id" in e && e.pcb_component_id === c.pcb_component_id,
      ),
      translate(centre.x, centre.y),
    )
  }

  return circuitJsonCopy
}
