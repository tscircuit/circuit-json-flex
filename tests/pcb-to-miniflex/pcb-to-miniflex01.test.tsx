import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"

test("example1", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="12mm" height="10mm">
      <resistor
        name="R1"
        footprint="0402"
        resistance="10k"
      />
      <capacitor
        name="C1"
        capacitance="10uF"
        footprint="0603"
      />
    </board>,
  )

  circuit.renderUntilSettled()

  const circuitJson = circuit.toJson()
  
  const modifiedCircuitJson = layoutCircuitJsonWithFlex(circuitJson, {
    justifyContent: "space-between",
  })

  const pcbSvg = convertCircuitJsonToPcbSvg(modifiedCircuitJson)
  expect(pcbSvg).toMatchSvgSnapshot(import.meta.path)
})
