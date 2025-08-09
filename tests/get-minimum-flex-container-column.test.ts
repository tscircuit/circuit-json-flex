import { expect, test } from "bun:test"
import { getMinimumFlexContainer } from "../lib/getMinimumFlexContainer"

// Children sizes: widths 10, 20, heights 5, 7
// Column direction: width = max(10,20) = 20, height = 5 + 7 = 12

test("getMinimumFlexContainer computes correct size for column direction", () => {
  const children = [
    { width: 10, height: 5 },
    { width: 20, height: 7 },
  ]
  const { width, height } = getMinimumFlexContainer(children, {
    direction: "column",
  })

  expect(width).toBe(20)
  expect(height).toBe(12)
})
