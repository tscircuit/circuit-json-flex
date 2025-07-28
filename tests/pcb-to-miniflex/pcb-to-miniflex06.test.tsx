import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { layoutCircuitJsonWithFlex } from "../../lib/layoutCircuitJsonWithFlex"

// Flex layout should work when no board or subcircuit container exists

test("example6 components without container", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <>
      <resistor name="R1" footprint="0402" resistance="10k" />
      <capacitor name="C1" capacitance="10uF" footprint="0603" />
    </>,
  )

  circuit.renderUntilSettled()

  const circuitJson = circuit.toJson()

  const pcbSvg1 = convertCircuitJsonToPcbSvg(circuitJson)
  expect(pcbSvg1).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-to-miniflex06-before",
  )

  const circuitJsonWithFlex = layoutCircuitJsonWithFlex(circuitJson, {
    justifyContent: "space-between",
  })

  const pcbSvg2 = convertCircuitJsonToPcbSvg(circuitJsonWithFlex)
  expect(pcbSvg2).toMatchSvgSnapshot(
    import.meta.path,
    "pcb-to-miniflex06-after",
  )
})
