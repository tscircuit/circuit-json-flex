import { expect, test } from "bun:test"
import { getMinimumFlexContainer } from "../lib/getMinimumFlexContainer"

// Children sizes: widths 10, 20, heights 5, 7
// For row direction (default), expected min width = 10 + 20 = 30
// expected min height = max(5,7) = 7

test("getMinimumFlexContainer computes correct size for row direction", () => {
  const children = [
    { width: 10, height: 5 },
    { width: 20, height: 7 },
  ]
  const { width, height } = getMinimumFlexContainer(children, {
    direction: "row",
  })

  expect(width).toBe(30)
  expect(height).toBe(7)
})