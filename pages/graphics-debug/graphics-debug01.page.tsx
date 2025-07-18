import { InteractiveGraphics } from "graphics-debug/react"
import type { GraphicsObject } from "graphics-debug"

const exampleGraphics: GraphicsObject = {
  title: "Example Usage",
  rects: [
    {
      center: { x: 0, y: 0 },
      width: 100,
      height: 100,
      fill: "green",
    },
  ],
  points: [
    {
      x: 50,
      y: 50,
      color: "red",
      label: "Test Output!",
    },
  ],
}

export default function Example01Page() {
  return <InteractiveGraphics graphics={exampleGraphics} />
}
