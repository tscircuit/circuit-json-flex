import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { layoutCircuitJsonWithFlex } from "../../lib/layoutCircuitJsonWithFlex"

/**
 * Snapshot test: Board without size, containing a subcircuit group also
 * without size. Both should get inferred sizes when `inferContainerSize`
 * is enabled.
 */

test("board & group without size – nested components", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board name="boardNoSize2">
      <group name="groupNoSize" subcircuit>
        <resistor name="R1" footprint="0402" resistance="10k" />
        <capacitor name="C1" capacitance="10uF" footprint="0603" />
      </group>
    </board>,
  )

  circuit.renderUntilSettled()

  const circuitJson = circuit.toJson()

  const pcbSvg1 = convertCircuitJsonToPcbSvg(circuitJson)
  expect(pcbSvg1).toMatchSvgSnapshot(import.meta.path, "pcb-no-size02-before")

  const circuitJsonWithFlex = layoutCircuitJsonWithFlex(circuitJson, {
    justifyContent: "space-between",
    columnGap: 2,
    inferContainerSize: true,
  })

  const pcbSvg2 = convertCircuitJsonToPcbSvg(circuitJsonWithFlex)
  expect(pcbSvg2).toMatchSvgSnapshot(import.meta.path, "pcb-no-size02-after")
})
