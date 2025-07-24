import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { findRootSourceGroup } from "../../lib/utils/findRootSourceGroup"

// Utility to get all source_group IDs for sanity
const sourceGroupIds = (json: any[]) =>
  json.filter((e) => e.type === "source_group").map((e) => e.source_group_id)

test("returns the only source_group for a single sub-circuit", () => {
  const circuit = new RootCircuit()
  circuit.add(
    <group subcircuit width="10mm" height="10mm">
      <resistor name="R1" footprint="0402" resistance="10k" />
    </group>,
  )
  circuit.renderUntilSettled()
  const json = circuit.toJson()

  const root = findRootSourceGroup(json)
  expect(root).toBeDefined()
  expect(root!.type).toBe("source_group")
  expect(root!.parent_subcircuit_id).toBeUndefined()
  expect(sourceGroupIds(json)).toContain(root!.source_group_id)
})

test("returns the board's corresponding source_group when a pcb_board is present", () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board name="board1" width="60mm" height="60mm">
      <group subcircuit width="15mm" height="15mm">
        <resistor name="R1" footprint="0402" resistance="10k" />
      </group>
    </board>,
  )
  circuit.renderUntilSettled()
  const json = circuit.toJson()

  const root = findRootSourceGroup(json)
  expect(root).toBeDefined()
  expect(root!.parent_subcircuit_id).toBeUndefined()
  expect(root?.name).toBe("board1")
})

test("walks up the chain for nested sub-circuits", () => {
  const circuit = new RootCircuit()
  circuit.add(
    <group name="group1" subcircuit width="20mm" height="20mm">
      <group name="group2" subcircuit width="10mm" height="10mm">
        <resistor name="R1" footprint="0402" resistance="10k" />
      </group>
    </group>,
  )
  circuit.renderUntilSettled()
  const json = circuit.toJson()

  // Find inner sub-circuit id
  const inner = json.find((e) => (e as any).type === "source_group" && (e as any).parent_subcircuit_id) as any
  const root = findRootSourceGroup(json, inner.subcircuit_id)
  expect(root).toBeDefined()
  expect(root!.parent_subcircuit_id).toBeUndefined()
  expect(root?.name).toBe("group1")
}) 