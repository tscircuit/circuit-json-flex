import { expect, test } from "bun:test"
import { RootCircuit } from "tscircuit"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { layoutCircuitJsonWithFlex } from "../../lib/layoutCircuitJsonWithFlex"

/**
 * Snapshot test: Board **without** explicit width/height.
 * Flex layout should infer the minimal container size when
 * `inferContainerSize` is enabled.
 */

test("board without size – two components", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board name="boardNoSize">
      <resistor name="R1" footprint="0402" resistance="10k" />
      <capacitor name="C1" capacitance="10uF" footprint="0603" />
    </board>,
  )

  circuit.renderUntilSettled()

  const circuitJson = circuit.toJson()

  const pcbSvg1 = convertCircuitJsonToPcbSvg(circuitJson)
  expect(pcbSvg1).toMatchSvgSnapshot(import.meta.path, "pcb-no-size01-before")

  const circuitJsonWithFlex = layoutCircuitJsonWithFlex(circuitJson, {
    justifyContent: "space-between",
    columnGap: 2,
    inferContainerSize: true,
  })

  const pcbSvg2 = convertCircuitJsonToPcbSvg(circuitJsonWithFlex)
  expect(pcbSvg2).toMatchSvgSnapshot(import.meta.path, "pcb-no-size01-after")
})
