import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { layoutCircuitJsonWithFlex } from "../../lib/layoutCircuitJsonWithFlex"

test("example5 nested groups inside a board", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board name="board1" width="100mm" height="100mm">
      <group name="group1" subcircuit width="30mm" height="30mm">
        <resistor name="R1" footprint="0402" resistance="10k" />
        <group name="group2" width="10mm" height="10mm">
          <resistor name="R2" footprint="0402" resistance="10k" />
          <capacitor name="C1" capacitance="10uF" footprint="0603" />
        </group>
      </group>
    </board>,
  )

  circuit.renderUntilSettled()

  const circuitJson = circuit.toJson()

  const pcbSvg1 = convertCircuitJsonToPcbSvg(circuitJson)
  expect(pcbSvg1).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-to-miniflex05-before",
  )

  const circuitJsonWithFlex = layoutCircuitJsonWithFlex(circuitJson, {
    justifyContent: "space-between",
  })

  const pcbSvg2 = convertCircuitJsonToPcbSvg(circuitJsonWithFlex)
  expect(pcbSvg2).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-to-miniflex05-after",
  )
})
