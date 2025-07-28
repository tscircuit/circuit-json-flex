This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.github/
  workflows/
    bun-typecheck.yml
    npm-test.yml
    release.yml
benchmarks/
  cju-benchmark.ts
  su-benchmark.ts
docs/
  CIRCUIT_JSON_PCB_ELEMENTS.md
lib/
  readable-name-functions/
    get-readable-name-for-element.ts
    get-readable-name-for-pcb-port.ts
    get-readable-name-for-pcb-smtpad.ts
    get-readable-name-for-pcb-trace.ts
  utils/
    get-layout-debug-object.ts
    is-truthy.ts
    string-hash.ts
  apply-selector.ts
  cju-indexed.ts
  cju.ts
  convert-abbreviation-to-soup-element-type.ts
  direction-to-vec.ts
  find-bounds-and-center.ts
  get-bounds-of-pcb-elements.ts
  get-element-by-id.ts
  get-element-id.ts
  get-primary-id.ts
  getCircuitJsonTree.ts
  getStringFromCircuitJsonTree.ts
  reposition-pcb-component.ts
  subtree.ts
  transform-soup-elements.ts
tests/
  cju-indexed.test.ts
  delete.test.ts
  edit-count.test.ts
  find-bounds-and-center.test.ts
  get-bounds-of-pcb-elements.test.ts
  get-layout-debug-object.test.ts
  get-readable-name-for-element.test.ts
  get-using.test.ts
  get.test.ts
  getCircuitJsonTree1.test.ts
  insert-with-validation.test.ts
  insert.test.ts
  reposition-pcb-component.test.ts
  select.test.ts
  subtree1.test.ts
  subtree2.test.ts
  update.test.ts
.gitignore
ava.config.js
biome.json
bunfig.toml
CLAUDE.md
index.ts
LICENSE
package.json
README.md
tsconfig.json
```

# Files

## File: .github/workflows/bun-typecheck.yml
````yaml
# Created using @tscircuit/plop (npm install -g @tscircuit/plop)
name: Type Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  type-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun i

      - name: Run type check
        run: bunx tsc --noEmit
````

## File: .github/workflows/npm-test.yml
````yaml
# Created using @tscircuit/plop (npm install -g @tscircuit/plop)
name: Bun Test

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Setup bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun run test
````

## File: .github/workflows/release.yml
````yaml
# Created using @tscircuit/plop (npm install -g @tscircuit/plop)
name: Publish to npm
on:
  push:
    branches:
      - main
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org/
      - run: npm install -g pver
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: pver release
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
````

## File: benchmarks/cju-benchmark.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { performance } from "node:perf_hooks"
import { cju } from "../index"
import { cjuIndexed } from "../lib/cju-indexed"

/**
 * Generates a test soup with the specified number of elements of various types
 */
function generateTestSoup(elementCount: number): AnyCircuitElement[] {
  const soup: AnyCircuitElement[] = []

  // Generate source components
  const componentCount = Math.floor(elementCount * 0.2) // 20% of elements are components
  for (let i = 0; i < componentCount; i++) {
    soup.push({
      type: "source_component",
      source_component_id: `source_component_${i}`,
      name: `C${i}`,
      supplier_part_numbers: {},
      ftype: i % 2 === 0 ? "simple_resistor" : "capacitor",
      resistance: i % 2 === 0 ? 10_000 : undefined,
      capacitance: i % 2 === 0 ? undefined : 0.0001,
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  // Generate source ports (3 for each component)
  for (let i = 0; i < componentCount; i++) {
    for (let j = 0; j < 3; j++) {
      const portId = i * 3 + j
      soup.push({
        type: "source_port",
        source_port_id: `source_port_${portId}`,
        source_component_id: `source_component_${i}`,
        name: j === 0 ? "left" : j === 1 ? "right" : "bottom",
        port_hints: [j === 0 ? "input" : j === 1 ? "output" : "ground"],
        subcircuit_id: `sub_${Math.floor(i / 10)}`,
      } as unknown as AnyCircuitElement)
    }
  }

  // Generate pcb_components (one for each source component)
  for (let i = 0; i < componentCount; i++) {
    soup.push({
      type: "pcb_component",
      pcb_component_id: `pcb_component_${i}`,
      source_component_id: `source_component_${i}`,
      x: i * 10,
      y: i * 5,
      width: 10,
      height: 5,
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  // Generate pcb_ports (one for each source port)
  for (let i = 0; i < componentCount; i++) {
    for (let j = 0; j < 3; j++) {
      const portId = i * 3 + j
      soup.push({
        type: "pcb_port",
        pcb_port_id: `pcb_port_${portId}`,
        source_port_id: `source_port_${portId}`,
        x: i * 10 + (j === 0 ? 0 : j === 1 ? 10 : 5),
        y: i * 5 + (j === 0 ? 2.5 : j === 1 ? 2.5 : 5),
        subcircuit_id: `sub_${Math.floor(i / 10)}`,
      } as unknown as AnyCircuitElement)
    }
  }

  // Generate pcb_traces (connections between components)
  const traceCount = Math.floor(elementCount * 0.2) // 20% of elements are traces
  for (let i = 0; i < traceCount; i++) {
    const startComponentIdx = i % componentCount
    const endComponentIdx = (i + 1) % componentCount

    soup.push({
      type: "pcb_trace",
      pcb_trace_id: `pcb_trace_${i}`,
      start_pcb_port_id: `pcb_port_${startComponentIdx * 3 + 1}`, // Connect to "right" port
      end_pcb_port_id: `pcb_port_${endComponentIdx * 3}`, // Connect to "left" port
      width: 0.2,
      layer: "F.Cu",
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  return soup
}

/**
 * Runs benchmarks and returns timing results
 */
function runBenchmarks(soupSize: number) {
  console.log(`\nRunning benchmark with ${soupSize} elements`)
  console.log("-".repeat(40))

  // Generate test soup
  const soup = generateTestSoup(soupSize)
  console.log(`Generated soup with ${soup.length} elements`)

  // Create both utility instances
  const regularSu = cju(soup)
  const indexedSu = cjuIndexed(soup, {
    indexConfig: {
      byId: true,
      byType: true,
      byRelation: true,
      bySubcircuit: true,
      byCustomField: ["name", "ftype"],
    },
  })

  const results: Record<
    string,
    { regular: number; indexed: number; speedup: number }
  > = {}

  // Benchmark 1: Get element by ID
  {
    const start1 = performance.now()
    for (let i = 0; i < 1000; i++) {
      const id = `source_component_${i % 50}`
      regularSu.source_component.get(id)
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 1000; i++) {
      const id = `source_component_${i % 50}`
      indexedSu.source_component.get(id)
    }
    const end2 = performance.now()

    results["Get by ID"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 2: List elements by type
  {
    const start1 = performance.now()
    for (let i = 0; i < 100; i++) {
      regularSu.source_component.list()
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 100; i++) {
      indexedSu.source_component.list()
    }
    const end2 = performance.now()

    results["List by type"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 3: Get using relation
  {
    const start1 = performance.now()
    for (let i = 0; i < 500; i++) {
      const id = `source_component_${i % 50}`
      regularSu.pcb_component.getUsing({ source_component_id: id })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 500; i++) {
      const id = `source_component_${i % 50}`
      indexedSu.pcb_component.getUsing({ source_component_id: id })
    }
    const end2 = performance.now()

    results["Get using relation"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 4: Get where (field matching)
  {
    const start1 = performance.now()
    for (let i = 0; i < 500; i++) {
      const name = `C${i % 50}`
      regularSu.source_component.getWhere({ name })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 500; i++) {
      const name = `C${i % 50}`
      indexedSu.source_component.getWhere({ name })
    }
    const end2 = performance.now()

    results["Get where (field)"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 5: List by subcircuit
  {
    const start1 = performance.now()
    for (let i = 0; i < 100; i++) {
      const subcircuitId = `sub_${i % 10}`
      regularSu.pcb_component.list({ subcircuit_id: subcircuitId })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 100; i++) {
      const subcircuitId = `sub_${i % 10}`
      indexedSu.pcb_component.list({ subcircuit_id: subcircuitId })
    }
    const end2 = performance.now()

    results["List by subcircuit"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Format and display results
  console.log("Operation         | Regular (ms) | Indexed (ms) | Speedup")
  console.log("-".repeat(60))

  for (const [operation, timing] of Object.entries(results)) {
    console.log(
      `${operation.padEnd(18)} | ${timing.regular.toFixed(2).padStart(12)} | ${timing.indexed.toFixed(2).padStart(11)} | ${timing.speedup.toFixed(2)}x`,
    )
  }

  return results
}

// Run benchmarks with different soup sizes
const smallResults = runBenchmarks(100) // ~700 elements (small circuit)
const mediumResults = runBenchmarks(2000)
const largeResults = runBenchmarks(10000)

// Display summary
console.log("\nSummary of speedups across different soup sizes:")
console.log("-".repeat(70))
console.log(
  "Operation         | Small Circuit | Medium Circuit | Large Circuit",
)
console.log("-".repeat(70))

const operations = Object.keys(smallResults)
for (const operation of operations) {
  console.log(
    `${operation.padEnd(18)} | ${smallResults[operation]!.speedup.toFixed(2).padStart(13)}x | ${mediumResults[operation]!.speedup.toFixed(2).padStart(14)}x | ${largeResults[operation]!.speedup.toFixed(2).padStart(13)}x`,
  )
}
````

## File: benchmarks/su-benchmark.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { performance } from "node:perf_hooks"
import { cju } from "../index"
import { cjuIndexed } from "../lib/cju-indexed"

/**
 * Generates a test soup with the specified number of elements of various types
 */
function generateTestSoup(elementCount: number): AnyCircuitElement[] {
  const soup: AnyCircuitElement[] = []

  // Generate source components
  const componentCount = Math.floor(elementCount * 0.2) // 20% of elements are components
  for (let i = 0; i < componentCount; i++) {
    soup.push({
      type: "source_component",
      source_component_id: `source_component_${i}`,
      name: `C${i}`,
      supplier_part_numbers: {},
      ftype: i % 2 === 0 ? "simple_resistor" : "capacitor",
      resistance: i % 2 === 0 ? 10_000 : undefined,
      capacitance: i % 2 === 0 ? undefined : 0.0001,
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  // Generate source ports (3 for each component)
  for (let i = 0; i < componentCount; i++) {
    for (let j = 0; j < 3; j++) {
      const portId = i * 3 + j
      soup.push({
        type: "source_port",
        source_port_id: `source_port_${portId}`,
        source_component_id: `source_component_${i}`,
        name: j === 0 ? "left" : j === 1 ? "right" : "bottom",
        port_hints: [j === 0 ? "input" : j === 1 ? "output" : "ground"],
        subcircuit_id: `sub_${Math.floor(i / 10)}`,
      } as unknown as AnyCircuitElement)
    }
  }

  // Generate pcb_components (one for each source component)
  for (let i = 0; i < componentCount; i++) {
    soup.push({
      type: "pcb_component",
      pcb_component_id: `pcb_component_${i}`,
      source_component_id: `source_component_${i}`,
      x: i * 10,
      y: i * 5,
      width: 10,
      height: 5,
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  // Generate pcb_ports (one for each source port)
  for (let i = 0; i < componentCount; i++) {
    for (let j = 0; j < 3; j++) {
      const portId = i * 3 + j
      soup.push({
        type: "pcb_port",
        pcb_port_id: `pcb_port_${portId}`,
        source_port_id: `source_port_${portId}`,
        x: i * 10 + (j === 0 ? 0 : j === 1 ? 10 : 5),
        y: i * 5 + (j === 0 ? 2.5 : j === 1 ? 2.5 : 5),
        subcircuit_id: `sub_${Math.floor(i / 10)}`,
      } as unknown as AnyCircuitElement)
    }
  }

  // Generate pcb_traces (connections between components)
  const traceCount = Math.floor(elementCount * 0.2) // 20% of elements are traces
  for (let i = 0; i < traceCount; i++) {
    const startComponentIdx = i % componentCount
    const endComponentIdx = (i + 1) % componentCount

    soup.push({
      type: "pcb_trace",
      pcb_trace_id: `pcb_trace_${i}`,
      start_pcb_port_id: `pcb_port_${startComponentIdx * 3 + 1}`, // Connect to "right" port
      end_pcb_port_id: `pcb_port_${endComponentIdx * 3}`, // Connect to "left" port
      width: 0.2,
      layer: "F.Cu",
      subcircuit_id: `sub_${Math.floor(i / 10)}`,
    } as unknown as AnyCircuitElement)
  }

  return soup
}

/**
 * Runs benchmarks and returns timing results
 */
function runBenchmarks(soupSize: number) {
  console.log(`\nRunning benchmark with ${soupSize} elements`)
  console.log("-".repeat(40))

  // Generate test soup
  const soup = generateTestSoup(soupSize)
  console.log(`Generated soup with ${soup.length} elements`)

  // Create both utility instances
  const regularSu = cju(soup)
  const indexedSu = cjuIndexed(soup, {
    indexConfig: {
      byId: true,
      byType: true,
      byRelation: true,
      bySubcircuit: true,
      byCustomField: ["name", "ftype"],
    },
  })

  const results: Record<
    string,
    { regular: number; indexed: number; speedup: number }
  > = {}

  // Benchmark 1: Get element by ID
  {
    const start1 = performance.now()
    for (let i = 0; i < 1000; i++) {
      const id = `source_component_${i % 50}`
      regularSu.source_component.get(id)
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 1000; i++) {
      const id = `source_component_${i % 50}`
      indexedSu.source_component.get(id)
    }
    const end2 = performance.now()

    results["Get by ID"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 2: List elements by type
  {
    const start1 = performance.now()
    for (let i = 0; i < 100; i++) {
      regularSu.source_component.list()
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 100; i++) {
      indexedSu.source_component.list()
    }
    const end2 = performance.now()

    results["List by type"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 3: Get using relation
  {
    const start1 = performance.now()
    for (let i = 0; i < 500; i++) {
      const id = `source_component_${i % 50}`
      regularSu.pcb_component.getUsing({ source_component_id: id })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 500; i++) {
      const id = `source_component_${i % 50}`
      indexedSu.pcb_component.getUsing({ source_component_id: id })
    }
    const end2 = performance.now()

    results["Get using relation"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 4: Get where (field matching)
  {
    const start1 = performance.now()
    for (let i = 0; i < 500; i++) {
      const name = `C${i % 50}`
      regularSu.source_component.getWhere({ name })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 500; i++) {
      const name = `C${i % 50}`
      indexedSu.source_component.getWhere({ name })
    }
    const end2 = performance.now()

    results["Get where (field)"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Benchmark 5: List by subcircuit
  {
    const start1 = performance.now()
    for (let i = 0; i < 100; i++) {
      const subcircuitId = `sub_${i % 10}`
      regularSu.pcb_component.list({ subcircuit_id: subcircuitId })
    }
    const end1 = performance.now()

    const start2 = performance.now()
    for (let i = 0; i < 100; i++) {
      const subcircuitId = `sub_${i % 10}`
      indexedSu.pcb_component.list({ subcircuit_id: subcircuitId })
    }
    const end2 = performance.now()

    results["List by subcircuit"] = {
      regular: end1 - start1,
      indexed: end2 - start2,
      speedup: (end1 - start1) / (end2 - start2),
    }
  }

  // Format and display results
  console.log("Operation         | Regular (ms) | Indexed (ms) | Speedup")
  console.log("-".repeat(60))

  for (const [operation, timing] of Object.entries(results)) {
    console.log(
      `${operation.padEnd(18)} | ${timing.regular.toFixed(2).padStart(12)} | ${timing.indexed.toFixed(2).padStart(11)} | ${timing.speedup.toFixed(2)}x`,
    )
  }

  return results
}

// Run benchmarks with different soup sizes
const smallResults = runBenchmarks(100) // ~700 elements (small circuit)
const mediumResults = runBenchmarks(2000)
const largeResults = runBenchmarks(10000)

// Display summary
console.log("\nSummary of speedups across different soup sizes:")
console.log("-".repeat(70))
console.log(
  "Operation         | Small Circuit | Medium Circuit | Large Circuit",
)
console.log("-".repeat(70))

const operations = Object.keys(smallResults)
for (const operation of operations) {
  console.log(
    `${operation.padEnd(18)} | ${smallResults[operation]!.speedup.toFixed(2).padStart(13)}x | ${mediumResults[operation]!.speedup.toFixed(2).padStart(14)}x | ${largeResults[operation]!.speedup.toFixed(2).padStart(13)}x`,
  )
}
````

## File: docs/CIRCUIT_JSON_PCB_ELEMENTS.md
````markdown
# Circuit JSON Specification: PCB Component Overview

> Created at 2024-09-20T18:37:19.158Z
> Latest Version: https://github.com/tscircuit/circuit-json/blob/main/docs/PCB_COMPONENT_OVERVIEW.md

Any type below can be imported from `circuit-json`. Every type has a corresponding
snake_case version which is a zod type that can be used to parse unknown json,
for example `PcbComponent` has a `pcb_component.parse` function that you
can also import.

```ts
export interface PcbFabricationNotePath {
  type: "pcb_fabrication_note_path"
  pcb_fabrication_note_path_id: string
  pcb_component_id: string
  layer: LayerRef
  route: Point[]
  stroke_width: Length
  color?: string
}

export interface PcbComponent {
  type: "pcb_component"
  pcb_component_id: string
  source_component_id: string
  center: Point
  layer: LayerRef
  rotation: Rotation
  width: Length
  height: Length
}

export interface PcbPortNotMatchedError {
  type: "pcb_port_not_matched_error"
  pcb_error_id: string
  message: string
  pcb_component_ids: string[]
}

export interface PcbSilkscreenText {
  type: "pcb_silkscreen_text"
  pcb_silkscreen_text_id: string
  font: "tscircuit2024"
  font_size: Length
  pcb_component_id: string
  text: string
  layer: LayerRef
  anchor_position: Point
  anchor_alignment:
    | "center"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right"
}

export interface PcbSilkscreenPill {
  type: "pcb_silkscreen_pill"
  pcb_silkscreen_pill_id: string
  pcb_component_id: string
  center: Point
  width: Length
  height: Length
  layer: LayerRef
}

export interface PcbPlatedHoleCircle {
  type: "pcb_plated_hole"
  shape: "circle"
  outer_diameter: number
  hole_diameter: number
  x: Distance
  y: Distance
  layers: LayerRef[]
  port_hints?: string[]
  pcb_component_id?: string
  pcb_port_id?: string
  pcb_plated_hole_id: string
}

export interface PcbPlatedHoleOval {
  type: "pcb_plated_hole"
  shape: "oval" | "pill"
  outer_width: number
  outer_height: number
  hole_width: number
  hole_height: number
  x: Distance
  y: Distance
  layers: LayerRef[]
  port_hints?: string[]
  pcb_component_id?: string
  pcb_port_id?: string
  pcb_plated_hole_id: string
}

export type PcbPlatedHole = PcbPlatedHoleCircle | PcbPlatedHoleOval

export interface PcbFabricationNoteText {
  type: "pcb_fabrication_note_text"
  pcb_fabrication_note_text_id: string
  font: "tscircuit2024"
  font_size: Length
  pcb_component_id: string
  text: string
  layer: VisibleLayer
  anchor_position: Point
  anchor_alignment:
    | "center"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right"
  color?: string
}

export interface PcbSilkscreenCircle {
  type: "pcb_silkscreen_circle"
  pcb_silkscreen_circle_id: string
  pcb_component_id: string
  center: Point
  radius: Length
  layer: VisibleLayer
}

export interface PcbSilkscreenPath {
  type: "pcb_silkscreen_path"
  pcb_silkscreen_path_id: string
  pcb_component_id: string
  layer: VisibleLayerRef
  route: Point[]
  stroke_width: Length
}

export interface PcbText {
  type: "pcb_text"
  pcb_text_id: string
  text: string
  center: Point
  layer: LayerRef
  width: Length
  height: Length
  lines: number
  align: "bottom-left"
}

export type PCBKeepout = z.infer<typeof pcb_keepout>

export interface PcbVia {
  type: "pcb_via"
  pcb_via_id: string
  x: Distance
  y: Distance
  outer_diameter: Distance
  hole_diameter: Distance
  layers: LayerRef[]
}

export interface PcbSilkscreenOval {
  type: "pcb_silkscreen_oval"
  pcb_silkscreen_oval_id: string
  pcb_component_id: string
  center: Point
  radius_x: Distance
  radius_y: Distance
  layer: VisibleLayer
}

export interface PcbPlacementError {
  type: "pcb_placement_error"
  pcb_placement_error_id: string
  message: string
}

export interface PcbPort {
  type: "pcb_port"
  pcb_port_id: string
  source_port_id: string
  pcb_component_id: string
  x: Distance
  y: Distance
  layers: LayerRef[]
}

export interface PcbTraceHint {
  type: "pcb_trace_hint"
  pcb_trace_hint_id: string
  pcb_port_id: string
  pcb_component_id: string
  route: RouteHintPoint[]
}

export interface PcbSmtPadCircle {
  type: "pcb_smtpad"
  shape: "circle"
  pcb_smtpad_id: string
  x: Distance
  y: Distance
  radius: number
  layer: LayerRef
  port_hints?: string[]
  pcb_component_id?: string
  pcb_port_id?: string
}

export interface PcbSmtPadRect {
  type: "pcb_smtpad"
  shape: "rect"
  pcb_smtpad_id: string
  x: Distance
  y: Distance
  width: number
  height: number
  layer: LayerRef
  port_hints?: string[]
  pcb_component_id?: string
  pcb_port_id?: string
}

export type PcbSmtPad = PcbSmtPadCircle | PcbSmtPadRect

export interface PcbSilkscreenLine {
  type: "pcb_silkscreen_line"
  pcb_silkscreen_line_id: string
  pcb_component_id: string
  stroke_width: Distance
  x1: Distance
  y1: Distance
  x2: Distance
  y2: Distance
  layer: VisibleLayer
}

export interface PcbHoleCircleOrSquare {
  type: "pcb_hole"
  pcb_hole_id: string
  hole_shape: "circle" | "square"
  hole_diameter: number
  x: Distance
  y: Distance
}

export interface PcbHoleOval {
  type: "pcb_hole"
  pcb_hole_id: string
  hole_shape: "oval"
  hole_width: number
  hole_height: number
  x: Distance
  y: Distance
}

export type PcbHole = PcbHoleCircleOrSquare | PcbHoleOval

export interface PcbTraceRoutePointWire {
  route_type: "wire"
  x: Distance
  y: Distance
  width: Distance
  start_pcb_port_id?: string
  end_pcb_port_id?: string
  layer: LayerRef
}

export interface PcbTraceRoutePointVia {
  route_type: "via"
  x: Distance
  y: Distance
  from_layer: string
  to_layer: string
}

export type PcbTraceRoutePoint = PcbTraceRoutePointWire | PcbTraceRoutePointVia

export interface PcbTrace {
  type: "pcb_trace"
  source_trace_id?: string
  pcb_component_id?: string
  pcb_trace_id: string
  route_thickness_mode?: "constant" | "interpolated"
  should_round_corners?: boolean
  route: Array<PcbTraceRoutePoint>
}

export interface PcbBoard {
  type: "pcb_board"
  pcb_board_id: string
  width: Length
  height: Length
  center: Point
  outline?: Point[]
}
```
````

## File: lib/readable-name-functions/get-readable-name-for-element.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { getReadableNameForPcbTrace } from "./get-readable-name-for-pcb-trace"
import { getReadableNameForPcbSmtpad } from "./get-readable-name-for-pcb-smtpad"
import { getReadableNameForPcbPort } from "./get-readable-name-for-pcb-port"
import { getElementById } from "lib/get-element-by-id"
import { getElementId } from "lib/get-element-id"

export const getReadableNameForElement = (
  soup: AnyCircuitElement[],
  elm: AnyCircuitElement | string,
): string => {
  if (typeof elm === "string") {
    const elmObj = getElementById(soup, elm)
    if (!elmObj) `unknown (could not find element with id ${elm})`
    return getReadableNameForElement(soup, elmObj as any)
  }
  switch (elm.type) {
    case "pcb_port":
      return getReadableNameForPcbPort(soup, elm.pcb_port_id)
    case "pcb_smtpad":
      return getReadableNameForPcbSmtpad(soup, elm.pcb_smtpad_id)
    case "pcb_trace":
      return getReadableNameForPcbTrace(soup, elm.pcb_trace_id)
    case "source_component":
      return `source_component[${elm.name}]`
    default:
      return `${elm.type}[#${getElementId(elm)}]`
  }
}

export {
  getReadableNameForPcbPort,
  getReadableNameForPcbSmtpad,
  getReadableNameForPcbTrace,
}
````

## File: lib/readable-name-functions/get-readable-name-for-pcb-port.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../cju"

export const getReadableNameForPcbPort = (
  soup: AnyCircuitElement[],
  pcb_port_id: string,
): string => {
  const pcbPort = cju(soup).pcb_port.get(pcb_port_id)
  if (!pcbPort) {
    return `pcb_port[#${pcb_port_id}]`
  }

  // Get the component information
  const pcbComponent = cju(soup).pcb_component.get(pcbPort?.pcb_component_id)

  if (!pcbComponent) {
    return `pcb_port[#${pcb_port_id}]`
  }

  // Get the source component information
  const sourceComponent = cju(soup).source_component.get(
    pcbComponent.source_component_id,
  )

  if (!sourceComponent) {
    return `pcb_port[#${pcb_port_id}]`
  }

  // Get the source port information
  const sourcePort = cju(soup).source_port.get(pcbPort.source_port_id)

  if (!sourcePort) {
    return `pcb_port[#${pcb_port_id}]`
  }

  // Determine the pad number or hint
  let padIdentifier: string
  if (sourcePort?.port_hints && sourcePort.port_hints.length > 0) {
    padIdentifier = sourcePort.port_hints[0]!
  } else if (sourcePort.port_hints && sourcePort.port_hints.length > 0) {
    padIdentifier = sourcePort.port_hints[0]!
  } else {
    padIdentifier = pcb_port_id
  }

  return `pcb_port[.${sourceComponent.name} > .${padIdentifier}]`
}
````

## File: lib/readable-name-functions/get-readable-name-for-pcb-smtpad.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../cju"
import { getReadableNameForPcbPort } from "./get-readable-name-for-pcb-port"

export function getReadableNameForPcbSmtpad(
  soup: AnyCircuitElement[],
  pcb_smtpad_id: string,
): string {
  // Find the pcb_smtpad object
  const pcbSmtpad = cju(soup).pcb_smtpad.get(pcb_smtpad_id)

  if (!pcbSmtpad || !pcbSmtpad.pcb_port_id) {
    return `smtpad[${pcb_smtpad_id}]`
  }

  return getReadableNameForPcbPort(soup, pcbSmtpad.pcb_port_id)
}
````

## File: lib/readable-name-functions/get-readable-name-for-pcb-trace.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../cju"

export function getReadableNameForPcbTrace(
  soup: AnyCircuitElement[],
  pcb_trace_id: string,
) {
  // Find the pcb_trace object
  const pcbTrace = cju(soup).pcb_trace.get(pcb_trace_id)

  if (!pcbTrace) {
    return `trace[${pcb_trace_id}]`
  }

  // Get the connected ports
  const connectedPcbPortIds: string[] = pcbTrace.route
    .flatMap((point: any) => [point.start_pcb_port_id, point.end_pcb_port_id])
    .filter(Boolean)

  if (connectedPcbPortIds.length === 0) {
    return `trace[${pcb_trace_id}]`
  }

  // Function to get component name and port hint
  function getComponentAndPortInfo(pcb_port_id: string) {
    const pcbPort = cju(soup).pcb_port.get(pcb_port_id)
    if (!pcbPort) return null

    const pcbComponent = cju(soup).pcb_component.get(pcbPort.pcb_component_id)
    if (!pcbComponent) return null
    const sourceComponent = cju(soup).source_component.get(
      pcbComponent.source_component_id,
    )
    if (!sourceComponent) return null

    const sourcePort = cju(soup).source_port.get(pcbPort.source_port_id)
    const portHint = sourcePort?.port_hints ? sourcePort.port_hints[1] : ""

    return {
      componentName: sourceComponent.name,
      portHint: portHint,
    }
  }

  // Generate the readable selector
  const selectorParts = connectedPcbPortIds.map((portId) => {
    const info = getComponentAndPortInfo(portId)
    if (info) {
      return `.${info.componentName} > port.${info.portHint}`
    }
    return `port[${portId}]`
  })

  return `trace[${selectorParts.join(", ")}]`
}
````

## File: lib/utils/get-layout-debug-object.ts
````typescript
import { stringHash } from "./string-hash"

export type LayoutDebugObject = {
  x: number
  y: number
  width: number
  height: number
  bg_color: string
  title: string
  content: Object
  secondary?: boolean
}

/**
 * Vendored from "nice-color-palettes" package
 */
const nice_color_palettes = [
  ["#69d2e7", "#a7dbd8", "#e0e4cc", "#f38630", "#fa6900"],
  ["#fe4365", "#fc9d9a", "#f9cdad", "#c8c8a9", "#83af9b"],
  ["#ecd078", "#d95b43", "#c02942", "#542437", "#53777a"],
  ["#556270", "#4ecdc4", "#c7f464", "#ff6b6b", "#c44d58"],
  ["#774f38", "#e08e79", "#f1d4af", "#ece5ce", "#c5e0dc"],
  ["#e8ddcb", "#cdb380", "#036564", "#033649", "#031634"],
  ["#490a3d", "#bd1550", "#e97f02", "#f8ca00", "#8a9b0f"],
  ["#594f4f", "#547980", "#45ada8", "#9de0ad", "#e5fcc2"],
  ["#00a0b0", "#6a4a3c", "#cc333f", "#eb6841", "#edc951"],
  ["#e94e77", "#d68189", "#c6a49a", "#c6e5d9", "#f4ead5"],
  ["#3fb8af", "#7fc7af", "#dad8a7", "#ff9e9d", "#ff3d7f"],
  ["#d9ceb2", "#948c75", "#d5ded9", "#7a6a53", "#99b2b7"],
  ["#ffffff", "#cbe86b", "#f2e9e1", "#1c140d", "#cbe86b"],
  ["#efffcd", "#dce9be", "#555152", "#2e2633", "#99173c"],
  ["#343838", "#005f6b", "#008c9e", "#00b4cc", "#00dffc"],
  ["#413e4a", "#73626e", "#b38184", "#f0b49e", "#f7e4be"],
  ["#ff4e50", "#fc913a", "#f9d423", "#ede574", "#e1f5c4"],
  ["#99b898", "#fecea8", "#ff847c", "#e84a5f", "#2a363b"],
  ["#655643", "#80bca3", "#f6f7bd", "#e6ac27", "#bf4d28"],
  ["#00a8c6", "#40c0cb", "#f9f2e7", "#aee239", "#8fbe00"],
  ["#351330", "#424254", "#64908a", "#e8caa4", "#cc2a41"],
  ["#554236", "#f77825", "#d3ce3d", "#f1efa5", "#60b99a"],
  ["#5d4157", "#838689", "#a8caba", "#cad7b2", "#ebe3aa"],
  ["#8c2318", "#5e8c6a", "#88a65e", "#bfb35a", "#f2c45a"],
  ["#fad089", "#ff9c5b", "#f5634a", "#ed303c", "#3b8183"],
  ["#ff4242", "#f4fad2", "#d4ee5e", "#e1edb9", "#f0f2eb"],
  ["#f8b195", "#f67280", "#c06c84", "#6c5b7b", "#355c7d"],
  ["#d1e751", "#ffffff", "#000000", "#4dbce9", "#26ade4"],
  ["#1b676b", "#519548", "#88c425", "#bef202", "#eafde6"],
  ["#5e412f", "#fcebb6", "#78c0a8", "#f07818", "#f0a830"],
  ["#bcbdac", "#cfbe27", "#f27435", "#f02475", "#3b2d38"],
  ["#452632", "#91204d", "#e4844a", "#e8bf56", "#e2f7ce"],
  ["#eee6ab", "#c5bc8e", "#696758", "#45484b", "#36393b"],
  ["#f0d8a8", "#3d1c00", "#86b8b1", "#f2d694", "#fa2a00"],
  ["#2a044a", "#0b2e59", "#0d6759", "#7ab317", "#a0c55f"],
  ["#f04155", "#ff823a", "#f2f26f", "#fff7bd", "#95cfb7"],
  ["#b9d7d9", "#668284", "#2a2829", "#493736", "#7b3b3b"],
  ["#bbbb88", "#ccc68d", "#eedd99", "#eec290", "#eeaa88"],
  ["#b3cc57", "#ecf081", "#ffbe40", "#ef746f", "#ab3e5b"],
  ["#a3a948", "#edb92e", "#f85931", "#ce1836", "#009989"],
  ["#300030", "#480048", "#601848", "#c04848", "#f07241"],
  ["#67917a", "#170409", "#b8af03", "#ccbf82", "#e33258"],
  ["#aab3ab", "#c4cbb7", "#ebefc9", "#eee0b7", "#e8caaf"],
  ["#e8d5b7", "#0e2430", "#fc3a51", "#f5b349", "#e8d5b9"],
  ["#ab526b", "#bca297", "#c5ceae", "#f0e2a4", "#f4ebc3"],
  ["#607848", "#789048", "#c0d860", "#f0f0d8", "#604848"],
  ["#b6d8c0", "#c8d9bf", "#dadabd", "#ecdbbc", "#fedcba"],
  ["#a8e6ce", "#dcedc2", "#ffd3b5", "#ffaaa6", "#ff8c94"],
  ["#3e4147", "#fffedf", "#dfba69", "#5a2e2e", "#2a2c31"],
  ["#fc354c", "#29221f", "#13747d", "#0abfbc", "#fcf7c5"],
  ["#cc0c39", "#e6781e", "#c8cf02", "#f8fcc1", "#1693a7"],
  ["#1c2130", "#028f76", "#b3e099", "#ffeaad", "#d14334"],
  ["#a7c5bd", "#e5ddcb", "#eb7b59", "#cf4647", "#524656"],
  ["#dad6ca", "#1bb0ce", "#4f8699", "#6a5e72", "#563444"],
  ["#5c323e", "#a82743", "#e15e32", "#c0d23e", "#e5f04c"],
  ["#edebe6", "#d6e1c7", "#94c7b6", "#403b33", "#d3643b"],
  ["#fdf1cc", "#c6d6b8", "#987f69", "#e3ad40", "#fcd036"],
  ["#230f2b", "#f21d41", "#ebebbc", "#bce3c5", "#82b3ae"],
  ["#b9d3b0", "#81bda4", "#b28774", "#f88f79", "#f6aa93"],
  ["#3a111c", "#574951", "#83988e", "#bcdea5", "#e6f9bc"],
  ["#5e3929", "#cd8c52", "#b7d1a3", "#dee8be", "#fcf7d3"],
  ["#1c0113", "#6b0103", "#a30006", "#c21a01", "#f03c02"],
  ["#000000", "#9f111b", "#b11623", "#292c37", "#cccccc"],
  ["#382f32", "#ffeaf2", "#fcd9e5", "#fbc5d8", "#f1396d"],
  ["#e3dfba", "#c8d6bf", "#93ccc6", "#6cbdb5", "#1a1f1e"],
  ["#f6f6f6", "#e8e8e8", "#333333", "#990100", "#b90504"],
  ["#1b325f", "#9cc4e4", "#e9f2f9", "#3a89c9", "#f26c4f"],
  ["#a1dbb2", "#fee5ad", "#faca66", "#f7a541", "#f45d4c"],
  ["#c1b398", "#605951", "#fbeec2", "#61a6ab", "#accec0"],
  ["#5e9fa3", "#dcd1b4", "#fab87f", "#f87e7b", "#b05574"],
  ["#951f2b", "#f5f4d7", "#e0dfb1", "#a5a36c", "#535233"],
  ["#8dccad", "#988864", "#fea6a2", "#f9d6ac", "#ffe9af"],
  ["#2d2d29", "#215a6d", "#3ca2a2", "#92c7a3", "#dfece6"],
  ["#413d3d", "#040004", "#c8ff00", "#fa023c", "#4b000f"],
  ["#eff3cd", "#b2d5ba", "#61ada0", "#248f8d", "#605063"],
  ["#ffefd3", "#fffee4", "#d0ecea", "#9fd6d2", "#8b7a5e"],
  ["#cfffdd", "#b4dec1", "#5c5863", "#a85163", "#ff1f4c"],
  ["#9dc9ac", "#fffec7", "#f56218", "#ff9d2e", "#919167"],
  ["#4e395d", "#827085", "#8ebe94", "#ccfc8e", "#dc5b3e"],
  ["#a8a7a7", "#cc527a", "#e8175d", "#474747", "#363636"],
  ["#f8edd1", "#d88a8a", "#474843", "#9d9d93", "#c5cfc6"],
  ["#046d8b", "#309292", "#2fb8ac", "#93a42a", "#ecbe13"],
  ["#f38a8a", "#55443d", "#a0cab5", "#cde9ca", "#f1edd0"],
  ["#a70267", "#f10c49", "#fb6b41", "#f6d86b", "#339194"],
  ["#ff003c", "#ff8a00", "#fabe28", "#88c100", "#00c176"],
  ["#ffedbf", "#f7803c", "#f54828", "#2e0d23", "#f8e4c1"],
  ["#4e4d4a", "#353432", "#94ba65", "#2790b0", "#2b4e72"],
  ["#0ca5b0", "#4e3f30", "#fefeeb", "#f8f4e4", "#a5b3aa"],
  ["#4d3b3b", "#de6262", "#ffb88c", "#ffd0b3", "#f5e0d3"],
  ["#fffbb7", "#a6f6af", "#66b6ab", "#5b7c8d", "#4f2958"],
  ["#edf6ee", "#d1c089", "#b3204d", "#412e28", "#151101"],
  ["#9d7e79", "#ccac95", "#9a947c", "#748b83", "#5b756c"],
  ["#fcfef5", "#e9ffe1", "#cdcfb7", "#d6e6c3", "#fafbe3"],
  ["#9cddc8", "#bfd8ad", "#ddd9ab", "#f7af63", "#633d2e"],
  ["#30261c", "#403831", "#36544f", "#1f5f61", "#0b8185"],
  ["#aaff00", "#ffaa00", "#ff00aa", "#aa00ff", "#00aaff"],
  ["#d1313d", "#e5625c", "#f9bf76", "#8eb2c5", "#615375"],
  ["#ffe181", "#eee9e5", "#fad3b2", "#ffba7f", "#ff9c97"],
  ["#73c8a9", "#dee1b6", "#e1b866", "#bd5532", "#373b44"],
  ["#805841", "#dcf7f3", "#fffcdd", "#ffd8d8", "#f5a2a2"],
]

export const getDebugLayoutObject = (lo: any): LayoutDebugObject | null => {
  let {
    x,
    y,
    width,
    height,
  }: { x: number; y: number; width?: number; height?: number } = {
    ...lo,
    ...(lo as any).size,
    ...(lo as any).center,
    ...(lo as any).position,
  }

  if (
    lo.x1 !== undefined &&
    lo.x2 !== undefined &&
    lo.y1 !== undefined &&
    lo.y2 !== undefined
  ) {
    x = (lo.x1 + lo.x2) / 2
    y = (lo.y1 + lo.y2) / 2
    width = Math.abs(lo.x1 - lo.x2)
    height = Math.abs(lo.y1 - lo.y2)
  }

  if (lo.points && Array.isArray(lo.points) && lo.points.length > 0) {
    const xCoords = lo.points.map((point: { x: number }) => point.x)
    const yCoords = lo.points.map((point: { y: number }) => point.y)
    
    const minX = Math.min(...xCoords)
    const maxX = Math.max(...xCoords)
    const minY = Math.min(...yCoords)
    const maxY = Math.max(...yCoords)
    
    x = (minX + maxX) / 2
    y = (minY + maxY) / 2
    width = maxX - minX
    height = maxY - minY
  }

  const title = lo.text || lo.name || lo.source?.text || lo.source?.name || "?"
  const content = lo

  if (x === undefined || y === undefined) return null

  if (width === undefined) {
    if ("outer_diameter" in lo) {
      width = lo.outer_diameter
      height = lo.outer_diameter
    }
  }

  if (width === undefined || height === undefined) {
    width = 0.1
    height = 0.1
  }

  return {
    x,
    y,
    width,
    height,
    title,
    content,
    bg_color:
      nice_color_palettes[
        stringHash((lo as any).type || title) % nice_color_palettes.length
      ]?.[4] ?? "#f00",
  }
}
````

## File: lib/utils/is-truthy.ts
````typescript
export const isTruthy = <T>(value: T): value is NonNullable<T> => Boolean(value)
````

## File: lib/utils/string-hash.ts
````typescript
export function stringHash(str: string) {
  let hash = 0
  if (str.length == 0) return hash
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
````

## File: lib/apply-selector.ts
````typescript
import * as parsel from "parsel-js"
import { convertAbbrToType } from "./convert-abbreviation-to-soup-element-type"
import type { AnyCircuitElement } from "circuit-json"

const filterByType = (
  elements: AnyCircuitElement[],
  type: string
): AnyCircuitElement[] => {
  type = convertAbbrToType(type)
  return elements.filter(
    (elm) => ("ftype" in elm && elm.ftype === type) || elm.type === type
  )
}

/**
 * Filter elements to match the selector, e.g. to access the left port of a
 * resistor you can do ".R1 > port.left"
 */
export const applySelector = (
  elements: AnyCircuitElement[],
  selectorRaw: string
): AnyCircuitElement[] => {
  const selectorAST = parsel.parse(selectorRaw)
  return applySelectorAST(elements, selectorAST!)
}

const doesElmMatchClassName = (elm: AnyCircuitElement, className: string) =>
  ("name" in elm && elm.name === className) ||
  ("port_hints" in elm && elm.port_hints?.includes(className))

export const applySelectorAST = (
  elements: AnyCircuitElement[],
  selectorAST: parsel.AST
): AnyCircuitElement[] => {
  switch (selectorAST.type) {
    case "complex": {
      switch (selectorAST.combinator) {
        case " ": // TODO technically should do a deep search
        case ">": {
          const { left, right } = selectorAST
          if (left.type === "class" || left.type === "type") {
            // TODO should also check if content matches any element tags
            let matchElms: AnyCircuitElement[]
            if (left.type === "class") {
              matchElms = elements.filter((elm) =>
                doesElmMatchClassName(elm, left.name)
              )
            } else if (left.type === "type") {
              matchElms = filterByType(elements, left.name)
            } else {
              matchElms = []
            }

            const childrenOfMatchingElms = matchElms.flatMap((matchElm) =>
              elements.filter(
                (elm: any) =>
                  elm[`${matchElm.type}_id`] ===
                    (matchElm as any)[`${matchElm.type}_id`] && elm !== matchElm
              )
            )
            return applySelectorAST(childrenOfMatchingElms, right)
          } else {
            throw new Error(`unsupported selector type "${left.type}" `)
          }
        }
        default: {
          throw new Error(
            `Couldn't apply selector AST for complex combinator "${selectorAST.combinator}"`
          )
        }
      }
      return []
    }
    case "compound": {
      const conditionsToMatch = selectorAST.list.map((part) => {
        switch (part.type) {
          case "class": {
            return (elm: any) => doesElmMatchClassName(elm, part.name)
          }
          case "type": {
            const name = convertAbbrToType(part.name)
            return (elm: any) => elm.type === name
          }
        }
      })

      return elements.filter((elm) =>
        conditionsToMatch.every((condFn) => condFn?.(elm))
      )
    }
    case "type": {
      return filterByType(elements, selectorAST.name) as AnyCircuitElement[]
    }
    case "class": {
      return elements.filter((elm) =>
        doesElmMatchClassName(elm, selectorAST.name)
      )
    }
    default: {
      throw new Error(
        `Couldn't apply selector AST for type: "${
          selectorAST.type
        }" ${JSON.stringify(selectorAST, null, " ")}`
      )
    }
  }
}
````

## File: lib/cju-indexed.ts
````typescript
import type {
  AnyCircuitElement,
  AnyCircuitElementInput,
  SourceComponentBase,
  SourcePort,
} from "circuit-json"
import * as Soup from "circuit-json"
import type {
  CircuitJsonOps,
  CircuitJsonUtilObjects as CircuitJsonUtilObjects,
  CircuitJsonInputUtilObjects as CircuitJsonInputUtilObjects,
} from "./cju"

export type IndexedCircuitJsonUtilOptions = {
  validateInserts?: boolean
  indexConfig?: {
    // Enable specific indexes for faster lookups
    byId?: boolean
    byType?: boolean
    byRelation?: boolean
    bySubcircuit?: boolean
    byCustomField?: string[]
  }
}

export type GetIndexedCircuitJsonUtilFn = ((
  soup: AnyCircuitElement[],
  options?: IndexedCircuitJsonUtilOptions,
) => CircuitJsonUtilObjects) & {
  unparsed: (soup: AnyCircuitElementInput[]) => CircuitJsonInputUtilObjects
}

interface InternalStore {
  counts: Record<string, number>
  editCount: number
  // Indexes for faster lookups
  indexes: {
    byId?: Map<string, AnyCircuitElement>
    byType?: Map<string, AnyCircuitElement[]>
    // Maps relation fields (like component_id) to elements
    byRelation?: Map<string, Map<string, AnyCircuitElement[]>>
    // Maps subcircuit_id to elements
    bySubcircuit?: Map<string, AnyCircuitElement[]>
    // Custom field indexes
    byCustomField?: Map<string, Map<string, AnyCircuitElement[]>>
  }
}

// Creates a unique key for the ID index
function createIdKey(element: AnyCircuitElement): string {
  const type = element.type
  return `${type}:${(element as any)[`${type}_id`]}`
}

export const cjuIndexed: GetIndexedCircuitJsonUtilFn = ((
  soup: AnyCircuitElement[],
  options: IndexedCircuitJsonUtilOptions = {},
) => {
  let internalStore: InternalStore = (soup as any)._internal_store_indexed

  if (!internalStore) {
    internalStore = {
      counts: {},
      editCount: 0,
      indexes: {},
    } as InternalStore

    // Initialize counts
    for (const elm of soup) {
      const type = elm.type
      const idVal = (elm as any)[`${type}_id`]
      if (!idVal) continue
      const idNum = Number.parseInt(idVal.split("_").pop() || "")
      if (!Number.isNaN(idNum)) {
        internalStore.counts[type] = Math.max(
          internalStore.counts[type] ?? 0,
          idNum,
        )
      }
    }

    // Build indexes
    const indexConfig = options.indexConfig || {}
    const indexes = internalStore.indexes

    // Reset indexes before rebuilding
    if (indexConfig.byId) {
      indexes.byId = new Map()
    }

    if (indexConfig.byType) {
      indexes.byType = new Map()
    }

    if (indexConfig.byRelation) {
      indexes.byRelation = new Map()
    }

    if (indexConfig.bySubcircuit) {
      indexes.bySubcircuit = new Map()
    }

    if (indexConfig.byCustomField && indexConfig.byCustomField.length > 0) {
      indexes.byCustomField = new Map()
      for (const field of indexConfig.byCustomField) {
        indexes.byCustomField.set(field, new Map())
      }
    }

    // Build indexes
    for (const element of soup) {
      // Index by ID
      if (indexConfig.byId) {
        const idKey = createIdKey(element)
        indexes.byId!.set(idKey, element)
      }

      // Index by type
      if (indexConfig.byType) {
        const elementsOfType = indexes.byType!.get(element.type) || []
        elementsOfType.push(element)
        indexes.byType!.set(element.type, elementsOfType)
      }

      // Index by relation fields (fields ending with _id)
      if (indexConfig.byRelation) {
        const elementEntries = Object.entries(element)
        for (const [key, value] of elementEntries) {
          if (
            key.endsWith("_id") &&
            key !== `${element.type}_id` &&
            typeof value === "string"
          ) {
            const relationTypeMap = indexes.byRelation!.get(key) || new Map()
            const relatedElements = relationTypeMap.get(value as string) || []
            relatedElements.push(element)
            relationTypeMap.set(value as string, relatedElements)
            indexes.byRelation!.set(key, relationTypeMap)
          }
        }
      }

      // Index by subcircuit_id
      if (indexConfig.bySubcircuit && "subcircuit_id" in element) {
        const subcircuitId = (element as any).subcircuit_id
        if (subcircuitId && typeof subcircuitId === "string") {
          const subcircuitElements =
            indexes.bySubcircuit!.get(subcircuitId) || []
          subcircuitElements.push(element)
          indexes.bySubcircuit!.set(subcircuitId, subcircuitElements)
        }
      }

      // Index by custom fields
      if (indexConfig.byCustomField && indexes.byCustomField) {
        for (const field of indexConfig.byCustomField) {
          if (field in element) {
            const fieldValue = (element as any)[field]
            if (
              fieldValue !== undefined &&
              (typeof fieldValue === "string" || typeof fieldValue === "number")
            ) {
              const fieldValueStr = String(fieldValue)
              const fieldMap = indexes.byCustomField.get(field)!
              const elementsWithFieldValue = fieldMap.get(fieldValueStr) || []
              elementsWithFieldValue.push(element)
              fieldMap.set(fieldValueStr, elementsWithFieldValue)
            }
          }
        }
      }
    }
    // Store internal state
    ;(soup as any)._internal_store_indexed = internalStore
  }

  const suIndexed = new Proxy(
    {},
    {
      get: (proxy_target: any, prop: string) => {
        if (prop === "toArray") {
          return () => {
            ;(soup as any).editCount = internalStore.editCount
            return soup
          }
        }
        if (prop === "editCount") {
          return internalStore.editCount
        }

        const component_type = prop

        return {
          get: (id: string) => {
            const indexConfig = options.indexConfig || {}

            // Use ID index if available
            if (indexConfig.byId && internalStore.indexes.byId) {
              return (
                (internalStore.indexes.byId.get(
                  `${component_type}:${id}`,
                ) as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >) || null
              )
            }

            // Use type index if available
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []
              return (
                (elementsOfType.find(
                  (e: any) => e[`${component_type}_id`] === id,
                ) as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >) || null
              )
            }

            // Fallback to regular search
            return (
              (soup.find(
                (e: any) =>
                  e.type === component_type && e[`${component_type}_id`] === id,
              ) as Extract<
                AnyCircuitElement,
                { type: typeof component_type }
              >) || null
            )
          },

          getUsing: (using: any) => {
            const indexConfig = options.indexConfig || {}
            const keys = Object.keys(using)

            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }",
              )
            }

            const join_key = keys[0] as string
            const join_type = join_key.replace("_id", "")

            // Use relation index if available
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const relationMap = internalStore.indexes.byRelation.get(join_key)
              if (relationMap) {
                const relatedElements = relationMap.get(using[join_key]) || []
                const joiner = relatedElements.find((e) => e.type === join_type)

                if (!joiner) return null

                // Now find the element of component_type with matching ID
                const joinerId =
                  joiner[`${component_type}_id` as keyof typeof joiner]

                if (indexConfig.byId && internalStore.indexes.byId) {
                  return (
                    (internalStore.indexes.byId.get(
                      `${component_type}:${joinerId}`,
                    ) as Extract<
                      AnyCircuitElement,
                      { type: typeof component_type }
                    >) || null
                  )
                }

                if (indexConfig.byType && internalStore.indexes.byType) {
                  const elementsOfType =
                    internalStore.indexes.byType.get(component_type) || []
                  return (
                    (elementsOfType.find(
                      (e: any) => e[`${component_type}_id`] === joinerId,
                    ) as Extract<
                      AnyCircuitElement,
                      { type: typeof component_type }
                    >) || null
                  )
                }

                return (
                  (soup.find(
                    (e: any) =>
                      e.type === component_type &&
                      e[`${component_type}_id`] === joinerId,
                  ) as Extract<
                    AnyCircuitElement,
                    { type: typeof component_type }
                  >) || null
                )
              }
            }

            // Fallback to regular approach
            const joiner: any = soup.find(
              (e: any) =>
                e.type === join_type && e[join_key] === using[join_key],
            )

            if (!joiner) return null

            return (
              (soup.find(
                (e: any) =>
                  e.type === component_type &&
                  e[`${component_type}_id`] === joiner[`${component_type}_id`],
              ) as Extract<
                AnyCircuitElement,
                { type: typeof component_type }
              >) || null
            )
          },

          getWhere: (where: any) => {
            const indexConfig = options.indexConfig || {}
            const keys = Object.keys(where)

            // If we're looking by a single property and it's indexed as a custom field
            if (
              keys.length === 1 &&
              indexConfig.byCustomField &&
              internalStore.indexes.byCustomField
            ) {
              const field = keys[0]
              const fieldMap = internalStore.indexes.byCustomField.get(field!)

              if (fieldMap) {
                const fieldValue = String(where[field!])
                const elementsWithFieldValue = fieldMap.get(fieldValue) || []

                return (
                  (elementsWithFieldValue.find(
                    (e: any) => e.type === component_type,
                  ) as Extract<
                    AnyCircuitElement,
                    { type: typeof component_type }
                  >) || null
                )
              }
            }

            // If we're looking by subcircuit_id and it's indexed
            if (
              "subcircuit_id" in where &&
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit
            ) {
              const subcircuitId = where.subcircuit_id
              const subcircuitElements =
                internalStore.indexes.bySubcircuit.get(subcircuitId) || []

              return (
                (subcircuitElements.find(
                  (e: any) =>
                    e.type === component_type &&
                    keys.every((key) => e[key] === where[key]),
                ) as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >) || null
              )
            }

            // Use type index if available to reduce search space
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []

              return (
                (elementsOfType.find((e: any) =>
                  keys.every((key) => e[key] === where[key]),
                ) as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >) || null
              )
            }

            // Fallback to regular approach
            return (
              (soup.find(
                (e: any) =>
                  e.type === component_type &&
                  keys.every((key) => e[key] === where[key]),
              ) as Extract<
                AnyCircuitElement,
                { type: typeof component_type }
              >) || null
            )
          },

          list: (where?: any) => {
            const indexConfig = options.indexConfig || {}
            const keys = !where ? [] : Object.keys(where)

            // If no filters, just return all elements of this type using the type index
            if (
              keys.length === 0 &&
              indexConfig.byType &&
              internalStore.indexes.byType
            ) {
              return (internalStore.indexes.byType.get(component_type) ||
                []) as Extract<
                AnyCircuitElement,
                { type: typeof component_type }
              >[]
            }

            // If filtering by subcircuit_id and it's the only filter
            if (
              keys.length === 1 &&
              keys[0] === "subcircuit_id" &&
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit
            ) {
              const subcircuitId = where.subcircuit_id
              const subcircuitElements =
                internalStore.indexes.bySubcircuit.get(subcircuitId) || []

              return subcircuitElements.filter(
                (e: any) => e.type === component_type,
              ) as Extract<AnyCircuitElement, { type: typeof component_type }>[]
            }

            // Start with all elements of this type to reduce search space
            let elementsToFilter: AnyCircuitElement[]

            if (indexConfig.byType && internalStore.indexes.byType) {
              elementsToFilter =
                internalStore.indexes.byType.get(component_type) || []
            } else {
              elementsToFilter = soup.filter((e) => e.type === component_type)
            }

            // Apply remaining filters
            if (keys.length > 0) {
              return elementsToFilter.filter((e: any) =>
                keys.every((key) => e[key] === where[key]),
              ) as Extract<AnyCircuitElement, { type: typeof component_type }>[]
            }

            return elementsToFilter as Extract<
              AnyCircuitElement,
              { type: typeof component_type }
            >[]
          },

          insert: (elm: any) => {
            internalStore.counts[component_type] ??= -1
            internalStore.counts[component_type]++
            const index = internalStore.counts[component_type]
            const newElm = {
              type: component_type,
              [`${component_type}_id`]: `${component_type}_${index}`,
              ...elm,
            }

            if (options.validateInserts) {
              const parser =
                (Soup as any)[component_type] ?? Soup.any_soup_element
              parser.parse(newElm)
            }

            soup.push(newElm)
            internalStore.editCount++

            // Update indexes with the new element
            const indexConfig = options.indexConfig || {}

            // Update ID index
            if (indexConfig.byId && internalStore.indexes.byId) {
              const idKey = createIdKey(newElm)
              internalStore.indexes.byId.set(idKey, newElm)
            }

            // Update type index
            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []
              elementsOfType.push(newElm)
              internalStore.indexes.byType.set(component_type, elementsOfType)
            }

            // Update relation index
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const elementEntries = Object.entries(newElm)
              for (const [key, value] of elementEntries) {
                if (
                  key.endsWith("_id") &&
                  key !== `${newElm.type}_id` &&
                  typeof value === "string"
                ) {
                  const relationTypeMap =
                    internalStore.indexes.byRelation.get(key) || new Map()
                  const relatedElements =
                    relationTypeMap.get(value as string) || []
                  relatedElements.push(newElm)
                  relationTypeMap.set(value as string, relatedElements)
                  internalStore.indexes.byRelation.set(key, relationTypeMap)
                }
              }
            }

            // Update subcircuit index
            if (
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit &&
              "subcircuit_id" in newElm
            ) {
              const subcircuitId = (newElm as any).subcircuit_id
              if (subcircuitId && typeof subcircuitId === "string") {
                const subcircuitElements =
                  internalStore.indexes.bySubcircuit.get(subcircuitId) || []
                subcircuitElements.push(newElm)
                internalStore.indexes.bySubcircuit.set(
                  subcircuitId,
                  subcircuitElements,
                )
              }
            }

            // Update custom field indexes
            if (
              indexConfig.byCustomField &&
              internalStore.indexes.byCustomField
            ) {
              for (const field of indexConfig.byCustomField) {
                if (field in newElm) {
                  const fieldValue = (newElm as any)[field]
                  if (
                    fieldValue !== undefined &&
                    (typeof fieldValue === "string" ||
                      typeof fieldValue === "number")
                  ) {
                    const fieldValueStr = String(fieldValue)
                    const fieldMap =
                      internalStore.indexes.byCustomField.get(field)!
                    const elementsWithFieldValue =
                      fieldMap.get(fieldValueStr) || []
                    elementsWithFieldValue.push(newElm)
                    fieldMap.set(fieldValueStr, elementsWithFieldValue)
                  }
                }
              }
            }

            return newElm
          },

          delete: (id: string) => {
            const indexConfig = options.indexConfig || {}
            let elm: AnyCircuitElement | undefined

            // Find the element to delete
            if (indexConfig.byId && internalStore.indexes.byId) {
              elm = internalStore.indexes.byId.get(`${component_type}:${id}`)
            } else if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []
              elm = elementsOfType.find(
                (e: any) => e[`${component_type}_id`] === id,
              )
            } else {
              elm = soup.find((e) => (e as any)[`${component_type}_id`] === id)
            }

            if (!elm) return

            // Remove from array
            const elmIndex = soup.indexOf(elm)
            if (elmIndex >= 0) {
              soup.splice(elmIndex, 1)
              internalStore.editCount++
            }

            // Remove from indexes
            if (indexConfig.byId && internalStore.indexes.byId) {
              const idKey = createIdKey(elm)
              internalStore.indexes.byId.delete(idKey)
            }

            if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []
              const filteredElements = elementsOfType.filter(
                (e: any) => e[`${component_type}_id`] !== id,
              )
              internalStore.indexes.byType.set(component_type, filteredElements)
            }

            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              // This is more complex - we need to find and remove from all relation maps
              // where this element appears
              for (const [
                relationKey,
                relationMap,
              ] of internalStore.indexes.byRelation.entries()) {
                for (const [relationValue, elements] of relationMap.entries()) {
                  const updatedElements = elements.filter((e) => e !== elm)

                  if (updatedElements.length === 0) {
                    relationMap.delete(relationValue)
                  } else {
                    relationMap.set(relationValue, updatedElements)
                  }
                }
              }
            }

            if (
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit &&
              "subcircuit_id" in elm
            ) {
              const subcircuitId = (elm as any).subcircuit_id
              if (subcircuitId) {
                const subcircuitElements =
                  internalStore.indexes.bySubcircuit.get(subcircuitId) || []
                const updatedElements = subcircuitElements.filter(
                  (e) => e !== elm,
                )

                if (updatedElements.length === 0) {
                  internalStore.indexes.bySubcircuit.delete(subcircuitId)
                } else {
                  internalStore.indexes.bySubcircuit.set(
                    subcircuitId,
                    updatedElements,
                  )
                }
              }
            }

            if (
              indexConfig.byCustomField &&
              internalStore.indexes.byCustomField
            ) {
              for (const fieldMap of internalStore.indexes.byCustomField.values()) {
                for (const [fieldValue, elements] of fieldMap.entries()) {
                  const updatedElements = elements.filter((e) => e !== elm)

                  if (updatedElements.length === 0) {
                    fieldMap.delete(fieldValue)
                  } else {
                    fieldMap.set(fieldValue, updatedElements)
                  }
                }
              }
            }
          },

          update: (id: string, newProps: any) => {
            const indexConfig = options.indexConfig || {}
            let elm: AnyCircuitElement | undefined | null

            // Find the element to update
            if (indexConfig.byId && internalStore.indexes.byId) {
              elm = internalStore.indexes.byId.get(`${component_type}:${id}`)
            } else if (indexConfig.byType && internalStore.indexes.byType) {
              const elementsOfType =
                internalStore.indexes.byType.get(component_type) || []
              elm = elementsOfType.find(
                (e: any) => e[`${component_type}_id`] === id,
              )
            } else {
              elm = soup.find(
                (e) =>
                  e.type === component_type &&
                  (e as any)[`${component_type}_id`] === id,
              )
            }

            if (!elm) return null

            // Need to remove from indexes before updating
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              // Remove from relation indexes
              const elementEntries = Object.entries(elm)
              for (const [key, value] of elementEntries) {
                if (
                  key.endsWith("_id") &&
                  key !== `${elm.type}_id` &&
                  typeof value === "string"
                ) {
                  if (key in newProps && newProps[key] !== value) {
                    const relationTypeMap =
                      internalStore.indexes.byRelation.get(key)
                    if (relationTypeMap) {
                      const relatedElements =
                        relationTypeMap.get(value as string) || []
                      const updatedElements = relatedElements.filter(
                        (e) => e !== elm,
                      )

                      if (updatedElements.length === 0) {
                        relationTypeMap.delete(value as string)
                      } else {
                        relationTypeMap.set(value as string, updatedElements)
                      }
                    }
                  }
                }
              }
            }

            if (
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit &&
              "subcircuit_id" in elm &&
              "subcircuit_id" in newProps
            ) {
              const oldSubcircuitId = (elm as any).subcircuit_id
              const newSubcircuitId = newProps.subcircuit_id

              if (oldSubcircuitId !== newSubcircuitId) {
                // Remove from old subcircuit index
                const subcircuitElements =
                  internalStore.indexes.bySubcircuit.get(oldSubcircuitId) || []
                const updatedElements = subcircuitElements.filter(
                  (e) => e !== elm,
                )

                if (updatedElements.length === 0) {
                  internalStore.indexes.bySubcircuit.delete(oldSubcircuitId)
                } else {
                  internalStore.indexes.bySubcircuit.set(
                    oldSubcircuitId,
                    updatedElements,
                  )
                }
              }
            }

            if (
              indexConfig.byCustomField &&
              internalStore.indexes.byCustomField
            ) {
              for (const field of indexConfig.byCustomField) {
                if (
                  field in elm &&
                  field in newProps &&
                  (elm as any)[field] !== newProps[field]
                ) {
                  const fieldMap =
                    internalStore.indexes.byCustomField.get(field)
                  if (fieldMap) {
                    const oldValue = String((elm as any)[field])
                    const elements = fieldMap.get(oldValue) || []
                    const updatedElements = elements.filter((e) => e !== elm)

                    if (updatedElements.length === 0) {
                      fieldMap.delete(oldValue)
                    } else {
                      fieldMap.set(oldValue, updatedElements)
                    }
                  }
                }
              }
            }

            // Update the element
            Object.assign(elm, newProps)
            internalStore.editCount++

            // Add to indexes with updated values
            if (indexConfig.byRelation && internalStore.indexes.byRelation) {
              const elementEntries = Object.entries(elm)
              for (const [key, value] of elementEntries) {
                if (
                  key.endsWith("_id") &&
                  key !== `${elm.type}_id` &&
                  typeof value === "string"
                ) {
                  if (key in newProps) {
                    const relationTypeMap: any =
                      internalStore.indexes.byRelation.get(key) || new Map()
                    const relatedElements: any =
                      relationTypeMap.get(value as string) || []

                    if (!relatedElements.includes(elm)) {
                      relatedElements.push(elm)
                      relationTypeMap.set(value as string, relatedElements)
                      internalStore.indexes.byRelation.set(key, relationTypeMap)
                    }
                  }
                }
              }
            }

            if (
              indexConfig.bySubcircuit &&
              internalStore.indexes.bySubcircuit &&
              "subcircuit_id" in elm &&
              "subcircuit_id" in newProps
            ) {
              const subcircuitId = (elm as any).subcircuit_id
              if (subcircuitId && typeof subcircuitId === "string") {
                const subcircuitElements =
                  internalStore.indexes.bySubcircuit.get(subcircuitId) || []

                if (!subcircuitElements.includes(elm)) {
                  subcircuitElements.push(elm)
                  internalStore.indexes.bySubcircuit.set(
                    subcircuitId,
                    subcircuitElements,
                  )
                }
              }
            }

            if (
              indexConfig.byCustomField &&
              internalStore.indexes.byCustomField
            ) {
              for (const field of indexConfig.byCustomField) {
                if (field in elm && field in newProps) {
                  const fieldValue: any = (elm as any)[field]
                  if (
                    fieldValue !== undefined &&
                    (typeof fieldValue === "string" ||
                      typeof fieldValue === "number")
                  ) {
                    const fieldValueStr = String(fieldValue)
                    const fieldMap =
                      internalStore.indexes.byCustomField.get(field)!
                    const elementsWithFieldValue =
                      fieldMap.get(fieldValueStr) || []

                    if (!elementsWithFieldValue.includes(elm)) {
                      elementsWithFieldValue.push(elm)
                      fieldMap.set(fieldValueStr, elementsWithFieldValue)
                    }
                  }
                }
              }
            }

            return elm as Extract<
              AnyCircuitElement,
              { type: typeof component_type }
            >
          },

          select: (selector: string) => {
            // Selection by selector is specialized enough that we don't use indexes here
            // TODO when applySelector is isolated we can use it, until then we
            // do a poor man's selector implementation for two common cases
            if (component_type === "source_component") {
              return (
                (soup.find(
                  (e) =>
                    e.type === "source_component" &&
                    e.name === selector.replace(/\./g, ""),
                ) as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >) || null
              )
            } else if (
              component_type === "pcb_port" ||
              component_type === "source_port" ||
              component_type === "schematic_port"
            ) {
              const [component_name, port_selector] = selector
                .replace(/\./g, "")
                .split(/[\s\>]+/)
              const source_component = soup.find(
                (e) =>
                  e.type === "source_component" && e.name === component_name,
              ) as SourceComponentBase
              if (!source_component) return null
              const source_port = soup.find(
                (e) =>
                  e.type === "source_port" &&
                  e.source_component_id ===
                    source_component.source_component_id &&
                  (e.name === port_selector ||
                    (e.port_hints ?? []).includes(port_selector!)),
              ) as SourcePort
              if (!source_port) return null
              if (component_type === "source_port")
                return source_port as Extract<
                  AnyCircuitElement,
                  { type: typeof component_type }
                >

              if (component_type === "pcb_port") {
                return (
                  (soup.find(
                    (e) =>
                      e.type === "pcb_port" &&
                      e.source_port_id === source_port.source_port_id,
                  ) as Extract<
                    AnyCircuitElement,
                    { type: typeof component_type }
                  >) || null
                )
              } else if (component_type === "schematic_port") {
                return (
                  (soup.find(
                    (e) =>
                      e.type === "schematic_port" &&
                      e.source_port_id === source_port.source_port_id,
                  ) as Extract<
                    AnyCircuitElement,
                    { type: typeof component_type }
                  >) || null
                )
              }
            }

            return null
          },
        }
      },
    },
  )

  return suIndexed
}) as any

cjuIndexed.unparsed = cjuIndexed as any

export default cjuIndexed
````

## File: lib/cju.ts
````typescript
import type {
  AnyCircuitElement,
  AnyCircuitElementInput,
  SourceComponentBase,
  SourcePort,
} from "circuit-json"
import * as Soup from "circuit-json"
import type { SubtreeOptions } from "./subtree"
import { buildSubtree } from "./subtree"

export type CircuitJsonOps<
  K extends AnyCircuitElement["type"],
  T extends AnyCircuitElement | AnyCircuitElementInput,
> = {
  get: (id: string) => Extract<T, { type: K }> | null
  select: (selector: string) => Extract<T, { type: K }> | null
  getWhere: (where: any) => Extract<T, { type: K }> | null
  getUsing: (using: {
    [key: `${string}_id`]: string
  }) => Extract<T, { type: K }> | null
  insert: (
    elm: Omit<Extract<T, { type: K }>, "type" | `${K}_id`>,
  ) => Extract<T, { type: K }>
  update: (
    id: string,
    newProps: Partial<Extract<T, { type: K }>>,
  ) => Extract<T, { type: K }>
  delete: (id: string) => void
  list: (where?: any) => Extract<T, { type: K }>[]
}

export type CircuitJsonUtilObjects = {
  [K in AnyCircuitElement["type"]]: CircuitJsonOps<K, AnyCircuitElement>
} & {
  subtree: (where?: any) => CircuitJsonUtilObjects
  toArray: () => AnyCircuitElement[]
  editCount: number
}
export type CircuitJsonInputUtilObjects = {
  [K in AnyCircuitElementInput["type"]]: CircuitJsonOps<
    K,
    AnyCircuitElementInput
  >
}

export type CircuitJsonUtilOptions = {
  validateInserts?: boolean
}

export type GetCircuitJsonUtilFn = ((
  soup: AnyCircuitElement[],
  options?: CircuitJsonUtilOptions,
) => CircuitJsonUtilObjects) & {
  unparsed: (soup: AnyCircuitElementInput[]) => CircuitJsonInputUtilObjects
}

interface InternalStore {
  counts: Record<string, number>
  editCount: number
}

export const cju: GetCircuitJsonUtilFn = ((
  circuitJsonInput: any[],
  options: CircuitJsonUtilOptions = {},
) => {
  const circuitJson = circuitJsonInput as AnyCircuitElement[]
  let internalStore: InternalStore = (circuitJson as any)._internal_store
  if (!internalStore) {
    internalStore = {
      counts: {},
      editCount: 0,
    } as InternalStore
    ;(circuitJson as any)._internal_store = internalStore

    // Initialize counts
    for (const elm of circuitJson) {
      const type = elm.type
      const idVal = (elm as any)[`${type}_id`]
      if (!idVal) continue
      const idNum = Number.parseInt(idVal.split("_").pop())
      if (!Number.isNaN(idNum)) {
        internalStore.counts[type] = Math.max(
          internalStore.counts[type] ?? 0,
          idNum,
        )
      }
    }
  }
  const su = new Proxy(
    {},
    {
      get: (proxy_target: any, prop: string) => {
        if (prop === "toArray") {
          return () => {
            ;(circuitJson as any).editCount = internalStore.editCount
            return circuitJson
          }
        }
        if (prop === "editCount") {
          return internalStore.editCount
        }

        if (prop === "subtree") {
          return (opts: SubtreeOptions) =>
            cju(buildSubtree(circuitJson, opts), options)
        }

        const component_type = prop

        return {
          get: (id: string) =>
            circuitJson.find(
              (e: any) =>
                e.type === component_type && e[`${component_type}_id`] === id,
            ),
          getUsing: (using: any) => {
            const keys = Object.keys(using)
            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }",
              )
            }
            const join_key = keys[0] as string
            const join_type = join_key.replace("_id", "")
            const joiner: any = circuitJson.find(
              (e: any) =>
                e.type === join_type && e[join_key] === using[join_key],
            )
            if (!joiner) return null
            return circuitJson.find(
              (e: any) =>
                e.type === component_type &&
                e[`${component_type}_id`] === joiner[`${component_type}_id`],
            )
          },
          getWhere: (where: any) => {
            const keys = Object.keys(where)
            return circuitJson.find(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key]),
            )
          },
          list: (where?: any) => {
            const keys = !where ? [] : Object.keys(where)
            return circuitJson.filter(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key]),
            )
          },
          insert: (elm: any) => {
            internalStore.counts[component_type] ??= -1
            internalStore.counts[component_type]++
            const index = internalStore.counts[component_type]
            const newElm = {
              type: component_type,
              [`${component_type}_id`]: `${component_type}_${index}`,
              ...elm,
            }

            if (options.validateInserts) {
              const parser =
                (Soup as any)[component_type] ?? Soup.any_soup_element
              parser.parse(newElm)
            }

            circuitJson.push(newElm)
            internalStore.editCount++
            return newElm
          },
          delete: (id: string) => {
            const elm = circuitJson.find(
              (e) => (e as any)[`${component_type}_id`] === id,
            )
            if (!elm) return
            circuitJson.splice(circuitJson.indexOf(elm), 1)
            internalStore.editCount++
          },
          update: (id: string, newProps: any) => {
            const elm = circuitJson.find(
              (e) =>
                e.type === component_type &&
                (e as any)[`${component_type}_id`] === id,
            )
            if (!elm) return null
            Object.assign(elm, newProps)
            internalStore.editCount++
            return elm
          },
          select: (selector: string) => {
            // TODO when applySelector is isolated we can use it, until then we
            // do a poor man's selector implementation for two common cases
            if (component_type === "source_component") {
              return circuitJson.find(
                (e) =>
                  e.type === "source_component" &&
                  e.name === selector.replace(/\./g, ""),
              )
            } else if (
              component_type === "pcb_port" ||
              component_type === "source_port" ||
              component_type === "schematic_port"
            ) {
              const [component_name, port_selector] = selector
                .replace(/\./g, "")
                .split(/[\s\>]+/)
              const source_component = circuitJson.find(
                (e) =>
                  e.type === "source_component" && e.name === component_name,
              ) as SourceComponentBase
              if (!source_component) return null
              const source_port = circuitJson.find(
                (e) =>
                  e.type === "source_port" &&
                  e.source_component_id ===
                    source_component.source_component_id &&
                  (e.name === port_selector ||
                    (e.port_hints ?? []).includes(port_selector!)),
              ) as SourcePort
              if (!source_port) return null
              if (component_type === "source_port") return source_port

              if (component_type === "pcb_port") {
                return circuitJson.find(
                  (e) =>
                    e.type === "pcb_port" &&
                    e.source_port_id === source_port.source_port_id,
                )
              } else if (component_type === "schematic_port") {
                return circuitJson.find(
                  (e) =>
                    e.type === "schematic_port" &&
                    e.source_port_id === source_port.source_port_id,
                )
              }
            }
          },
        }
      },
    },
  )

  return su
}) as any
cju.unparsed = cju as any

export const su = cju

export default cju
````

## File: lib/convert-abbreviation-to-soup-element-type.ts
````typescript
export const convertAbbrToType = (abbr: string): string => {
  switch (abbr) {
    case "port":
      return "source_port"
    case "net":
      return "source_net"
    case "power":
      return "simple_power_source"
  }
  return abbr
}
````

## File: lib/direction-to-vec.ts
````typescript
export const directionToVec = (direction: "up" | "down" | "left" | "right") => {
  if (direction === "up") return { x: 0, y: 1 }
  else if (direction === "down") return { x: 0, y: -1 }
  else if (direction === "left") return { x: -1, y: 0 }
  else if (direction === "right") return { x: 1, y: 0 }
  else throw new Error("Invalid direction")
}

export const vecToDirection = ({ x, y }: { x: number; y: number }) => {
  if (x > y) y = 0
  if (y > x) x = 0
  if (x > 0 && y === 0) return "right"
  else if (x < 0 && y === 0) return "left"
  else if (x === 0 && y > 0) return "up"
  else if (x === 0 && y < 0) return "down"
  else throw new Error(`Invalid vector for direction conversion (${x}, ${y})`)
}

export const rotateClockwise = (
  direction: "up" | "down" | "left" | "right"
) => {
  if (direction === "up") return "right"
  else if (direction === "right") return "down"
  else if (direction === "down") return "left"
  else if (direction === "left") return "up"
  throw new Error(`Invalid direction: ${direction}`)
}

export const rotateCounterClockwise = (
  direction: "up" | "down" | "left" | "right"
) => {
  if (direction === "up") return "left"
  else if (direction === "left") return "down"
  else if (direction === "down") return "right"
  else if (direction === "right") return "up"
  throw new Error(`Invalid direction: ${direction}`)
}

export const rotateDirection = (
  direction: "up" | "down" | "left" | "right",
  num90DegreeClockwiseTurns: number
) => {
  while (num90DegreeClockwiseTurns > 0) {
    direction = rotateClockwise(direction)
    num90DegreeClockwiseTurns--
  }
  while (num90DegreeClockwiseTurns < 0) {
    direction = rotateCounterClockwise(direction)
    num90DegreeClockwiseTurns++
  }
  return direction
}

export const oppositeDirection = (
  direction: "up" | "down" | "left" | "right"
) => {
  if (direction === "up") return "down"
  else if (direction === "down") return "up"
  else if (direction === "left") return "right"
  else if (direction === "right") return "left"
  throw new Error(`Invalid direction: ${direction}`)
}

export const oppositeSide = (
  sideOrDir: "up" | "down" | "top" | "bottom" | "left" | "right"
) => {
  if (sideOrDir === "top" || sideOrDir === "up") return "bottom"
  else if (sideOrDir === "bottom" || sideOrDir === "down") return "top"
  else if (sideOrDir === "left") return "right"
  else if (sideOrDir === "right") return "left"
  throw new Error(`Invalid sideOrDir: ${sideOrDir}`)
}
````

## File: lib/find-bounds-and-center.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { getDebugLayoutObject } from "./utils/get-layout-debug-object"
import { isTruthy } from "./utils/is-truthy"

export const findBoundsAndCenter = (
  elements: AnyCircuitElement[],
): { center: { x: number; y: number }; width: number; height: number } => {
  const debugObjects = elements
    .filter((elm) => elm.type.startsWith("pcb_"))
    .concat(
      elements
        .filter((elm) => elm.type === "pcb_trace")
        // @ts-ignore
        .flatMap((elm: PcbTrace) => elm.route),
    )
    .map((elm) => getDebugLayoutObject(elm))
    .filter(isTruthy)

  if (debugObjects.length === 0)
    return { center: { x: 0, y: 0 }, width: 0, height: 0 }

  let minX = debugObjects[0]!.x - debugObjects[0]!.width / 2
  let maxX = debugObjects[0]!.x + debugObjects[0]!.width / 2
  let minY = debugObjects[0]!.y - debugObjects[0]!.height / 2
  let maxY = debugObjects[0]!.y + debugObjects[0]!.height / 2

  for (const obj of debugObjects.slice(1)) {
    minX = Math.min(minX, obj.x - obj.width / 2)
    maxX = Math.max(maxX, obj.x + obj.width / 2)
    minY = Math.min(minY, obj.y - obj.height / 2)
    maxY = Math.max(maxY, obj.y + obj.height / 2)
  }

  const width = maxX - minX
  const height = maxY - minY
  const center = { x: minX + width / 2, y: minY + height / 2 }

  return { center, width, height }
}
````

## File: lib/get-bounds-of-pcb-elements.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"

export const getBoundsOfPcbElements = (
  elements: AnyCircuitElement[],
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const elm of elements) {
    if (!elm.type.startsWith("pcb_")) continue

    let centerX: number | undefined
    let centerY: number | undefined

    let width: number | undefined
    let height: number | undefined

    if ("x" in elm && "y" in elm) {
      centerX = Number((elm as any).x)
      centerY = Number((elm as any).y)
    }

    if ("outer_diameter" in elm) {
      width = Number((elm as any).outer_diameter)
      height = Number((elm as any).outer_diameter)
    }

    if ("width" in elm) {
      width = Number((elm as any).width)
    }

    if ("height" in elm) {
      height = Number((elm as any).height)
    }

    if ("center" in elm) {
      // @ts-ignore
      centerX = elm.center.x
      // @ts-ignore
      centerY = elm.center.y
    }

    if (centerX !== undefined && centerY !== undefined) {
      minX = Math.min(minX, centerX)
      minY = Math.min(minY, centerY)
      maxX = Math.max(maxX, centerX)
      maxY = Math.max(maxY, centerY)

      if (width !== undefined && height !== undefined) {
        minX = Math.min(minX, centerX - width / 2)
        minY = Math.min(minY, centerY - height / 2)
        maxX = Math.max(maxX, centerX + width / 2)
        maxY = Math.max(maxY, centerY + height / 2)
      }

      if ("radius" in elm) {
        minX = Math.min(minX, centerX - elm.radius)
        minY = Math.min(minY, centerY - elm.radius)
        maxX = Math.max(maxX, centerX + elm.radius)
        maxY = Math.max(maxY, centerY + elm.radius)
      }
    } else if (elm.type === "pcb_trace") {
      for (const point of elm.route) {
        // TODO add trace thickness support
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
    }
  }

  return { minX, minY, maxX, maxY }
}
````

## File: lib/get-element-by-id.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { getElementId } from "./get-element-id"

export const getElementById = (
  soup: AnyCircuitElement[],
  id: string,
): AnyCircuitElement | null => {
  return soup.find((elm) => getElementId(elm) === id) ?? null
}
````

## File: lib/get-element-id.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"

export const getElementId = (elm: AnyCircuitElement): string => {
  const type = elm.type
  const id = (elm as any)[`${type}_id`]
  return id
}
````

## File: lib/get-primary-id.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"

export const getPrimaryId = (element: AnyCircuitElement): string => {
  // @ts-ignore
  return element[`${element.type}_id`]
}
````

## File: lib/getCircuitJsonTree.ts
````typescript
import type {
  AnyCircuitElement,
  SourceComponentBase,
  SourceGroup,
} from "circuit-json"

/**
 * A tree of circuit elements. This is often used for layout because you want
 * to consider only the top-level elements of a group for layout (child groups
 * move together)
 */
export interface CircuitJsonTreeNode {
  nodeType: "group" | "component"
  sourceGroup?: SourceGroup
  sourceComponent?: SourceComponentBase
  childNodes: Array<CircuitJsonTreeNode>
  otherChildElements: Array<AnyCircuitElement>
}

export const getCircuitJsonTree = (
  circuitJson: AnyCircuitElement[],
  opts?: {
    source_group_id?: string
  },
): CircuitJsonTreeNode => {
  type ChildGroupId = string
  type ParentGroupId = string
  type GroupId = string
  const groupChildMap: Map<ParentGroupId, ChildGroupId[]> = new Map()

  for (const elm of circuitJson) {
    if (elm.type === "source_group" && elm.parent_source_group_id) {
      const parentId = elm.parent_source_group_id
      const childId = elm.source_group_id
      const children = groupChildMap.get(parentId) ?? []
      children.push(childId)
      groupChildMap.set(parentId, children)
      if (!groupChildMap.has(childId)) {
        groupChildMap.set(childId, [])
      }
    }
  }

  const groupNodes = new Map<GroupId, CircuitJsonTreeNode>()

  const getNextGroupId = () => {
    for (const [parentId, children] of groupChildMap) {
      if (groupNodes.has(parentId)) continue
      if (children.every((childId) => groupNodes.has(childId))) {
        return parentId
      }
    }
    return null
  }

  // Compute any node we have the dependencies for until we've computed all of
  // them
  let lastGroupId: GroupId | null = null
  while (true) {
    const nextGroupId = getNextGroupId()
    if (!nextGroupId) break

    const sourceGroup = circuitJson.find(
      (elm) =>
        elm.type === "source_group" && elm.source_group_id === nextGroupId,
    ) as SourceGroup

    // Create the tree node for this group
    const node: CircuitJsonTreeNode = {
      nodeType: "group",
      sourceGroup,
      otherChildElements: [],
      childNodes: [
        ...(groupChildMap
          .get(nextGroupId)
          ?.map((childId) => groupNodes.get(childId)!) ?? []),
        ...circuitJson
          .filter(
            (elm) =>
              elm.type === "source_component" &&
              elm.source_group_id === nextGroupId,
          )
          .map((elm) => {
            return {
              nodeType: "component",
              sourceComponent: elm,
              childNodes: [],
              otherChildElements: [
                ...circuitJson.filter(
                  (e) =>
                    e.type === "pcb_component" &&
                    e.source_component_id ===
                      (elm as SourceComponentBase).source_component_id,
                ),
              ], // TODO populate
            } as CircuitJsonTreeNode
          }),
      ],
    }

    groupNodes.set(nextGroupId, node)
    lastGroupId = nextGroupId
  }

  if (!lastGroupId) {
    console.warn("No groups were processed, returning tree without sourceGroup")
    return {
      nodeType: "group",
      childNodes: [], // TODO populate
      otherChildElements: circuitJson,
    }
  }

  return groupNodes.get(opts?.source_group_id ?? lastGroupId)!
}
````

## File: lib/getStringFromCircuitJsonTree.ts
````typescript
import type { CircuitJsonTreeNode } from "./getCircuitJsonTree"

export const getStringFromCircuitJsonTree = (
  circuitJsonTree: CircuitJsonTreeNode,
  indent = 0,
): string => {
  if (circuitJsonTree.nodeType === "component") {
    return `${" ".repeat(indent)}${circuitJsonTree.sourceComponent?.name ?? circuitJsonTree.sourceComponent?.source_component_id}`
  }
  const lines = []

  lines.push(
    `${" ".repeat(indent)}${circuitJsonTree.sourceGroup?.name ?? circuitJsonTree.sourceGroup?.source_group_id}`,
  )
  for (const child of circuitJsonTree.childNodes) {
    lines.push(getStringFromCircuitJsonTree(child, indent + 2))
  }
  return lines.join("\n")
}
````

## File: lib/reposition-pcb-component.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { transformPCBElements } from "./transform-soup-elements"
import { translate } from "transformation-matrix"

export const repositionPcbComponentTo = (
  circuitJson: AnyCircuitElement[],
  pcb_component_id: string,
  newCenter: { x: number; y: number },
) => {
  const pcbComponent = circuitJson.find(
    (e) =>
      e.type === "pcb_component" &&
      (e as any).pcb_component_id === pcb_component_id,
  )
  if (!pcbComponent) return

  const currentCenter =
    "center" in pcbComponent
      ? (pcbComponent as any).center
      : { x: (pcbComponent as any).x, y: (pcbComponent as any).y }

  const dx = newCenter.x - currentCenter.x
  const dy = newCenter.y - currentCenter.y

  const portIds = circuitJson
    .filter(
      (e) =>
        e.type === "pcb_port" &&
        (e as any).pcb_component_id === pcb_component_id,
    )
    .map((e) => (e as any).pcb_port_id)

  const elementsToMove = circuitJson.filter((elm) => {
    if (elm === pcbComponent) return true
    const anyElm: any = elm
    if (anyElm.pcb_component_id === pcb_component_id) return true
    if (
      Array.isArray(anyElm.pcb_component_ids) &&
      anyElm.pcb_component_ids.includes(pcb_component_id)
    )
      return true
    if (anyElm.pcb_port_id && portIds.includes(anyElm.pcb_port_id)) return true
    if (
      Array.isArray(anyElm.pcb_port_ids) &&
      anyElm.pcb_port_ids.some((id: string) => portIds.includes(id))
    )
      return true
    if (anyElm.start_pcb_port_id && portIds.includes(anyElm.start_pcb_port_id))
      return true
    if (anyElm.end_pcb_port_id && portIds.includes(anyElm.end_pcb_port_id))
      return true
    if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          (pt.start_pcb_port_id && portIds.includes(pt.start_pcb_port_id)) ||
          (pt.end_pcb_port_id && portIds.includes(pt.end_pcb_port_id)),
      )
    )
      return true
    return false
  })

  const matrix = translate(dx, dy)
  transformPCBElements(elementsToMove, matrix)
}
````

## File: lib/subtree.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"

export type SubtreeOptions = {
  subcircuit_id?: string
  source_group_id?: string
}

function connect(
  map: Map<AnyCircuitElement, Set<AnyCircuitElement>>,
  a: AnyCircuitElement | undefined,
  b: AnyCircuitElement | undefined,
) {
  if (!a || !b) return
  let setA = map.get(a)
  if (!setA) {
    setA = new Set()
    map.set(a, setA)
  }
  setA.add(b)
  let setB = map.get(b)
  if (!setB) {
    setB = new Set()
    map.set(b, setB)
  }
  setB.add(a)
}

export function buildSubtree(
  soup: AnyCircuitElement[],
  opts: SubtreeOptions,
): AnyCircuitElement[] {
  if (!opts.subcircuit_id && !opts.source_group_id) return [...soup]

  const idMap = new Map<string, AnyCircuitElement>()
  for (const elm of soup) {
    const idVal = (elm as any)[`${elm.type}_id`]
    if (typeof idVal === "string") {
      idMap.set(idVal, elm)
    }
  }

  const adj = new Map<AnyCircuitElement, Set<AnyCircuitElement>>()
  for (const elm of soup) {
    const entries = Object.entries(elm as any)
    for (const [key, val] of entries) {
      if (key === "parent_source_group_id") continue
      if (key.endsWith("_id") && typeof val === "string") {
        const other = idMap.get(val)
        connect(adj, elm, other)
      } else if (key.endsWith("_ids") && Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === "string") {
            const other = idMap.get(v)
            connect(adj, elm, other)
          }
        }
      }
    }
  }

  const queue: AnyCircuitElement[] = []
  const included = new Set<AnyCircuitElement>()

  for (const elm of soup) {
    if (
      (opts.subcircuit_id &&
        (elm as any).subcircuit_id === opts.subcircuit_id) ||
      (opts.source_group_id &&
        ((elm as any).source_group_id === opts.source_group_id ||
          (Array.isArray((elm as any).member_source_group_ids) &&
            (elm as any).member_source_group_ids.includes(
              opts.source_group_id,
            ))))
    ) {
      queue.push(elm)
      included.add(elm)
    }
  }

  while (queue.length > 0) {
    const elm = queue.shift()!
    const neighbors = adj.get(elm)
    if (!neighbors) continue
    for (const n of neighbors) {
      if (!included.has(n)) {
        included.add(n)
        queue.push(n)
      }
    }
  }

  return soup.filter((e) => included.has(e))
}
````

## File: lib/transform-soup-elements.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { type Matrix, applyToPoint, decomposeTSR } from "transformation-matrix"
import {
  directionToVec,
  rotateDirection,
  vecToDirection,
} from "./direction-to-vec"

export const transformSchematicElement = (
  elm: AnyCircuitElement,
  matrix: Matrix,
) => {
  if (elm.type === "schematic_component") {
    // TODO handle rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "schematic_port") {
    elm.center = applyToPoint(matrix, elm.center)

    if (elm.facing_direction) {
      elm.facing_direction = rotateDirection(
        elm.facing_direction,
        -(Math.atan2(matrix.b, matrix.a) / Math.PI) * 2,
      )
    }
  } else if (elm.type === "schematic_text") {
    elm.position = applyToPoint(matrix, elm.position)
    // } else if (elm.type === "schematic_group") {
    //   elm.center = applyToPoint(matrix, elm.center)
  } else if (elm.type === "schematic_trace") {
  } else if (elm.type === "schematic_box") {
    const { x, y } = applyToPoint(matrix, { x: elm.x, y: elm.y })
    elm.x = x
    elm.y = y
  } else if (elm.type === "schematic_line") {
    const { x: x1, y: y1 } = applyToPoint(matrix, { x: elm.x1, y: elm.y1 })
    const { x: x2, y: y2 } = applyToPoint(matrix, { x: elm.x2, y: elm.y2 })
    elm.x1 = x1
    elm.y1 = y1
    elm.x2 = x2
    elm.y2 = y2
  }
  return elm
}

export const transformSchematicElements = (
  elms: AnyCircuitElement[],
  matrix: Matrix,
) => {
  return elms.map((elm) => transformSchematicElement(elm, matrix))
}

export const transformPCBElement = (elm: AnyCircuitElement, matrix: Matrix) => {
  if (
    elm.type === "pcb_plated_hole" ||
    elm.type === "pcb_hole" ||
    elm.type === "pcb_via" ||
    elm.type === "pcb_smtpad" ||
    elm.type === "pcb_port"
  ) {
    const { x, y } = applyToPoint(matrix, {
      x: Number((elm as any).x),
      y: Number((elm as any).y),
    })
    ;(elm as any).x = x
    ;(elm as any).y = y
  } else if (elm.type === "pcb_keepout" || elm.type === "pcb_board") {
    // TODO adjust size/rotation
    elm.center = applyToPoint(matrix, elm.center)
  } else if (
    elm.type === "pcb_silkscreen_text" ||
    elm.type === "pcb_fabrication_note_text"
  ) {
    elm.anchor_position = applyToPoint(matrix, elm.anchor_position)
  } else if (
    elm.type === "pcb_silkscreen_circle" ||
    elm.type === "pcb_silkscreen_rect" ||
    elm.type === "pcb_component"
  ) {
    elm.center = applyToPoint(matrix, elm.center)
  } else if (
    elm.type === "pcb_silkscreen_path" ||
    elm.type === "pcb_trace" ||
    elm.type === "pcb_fabrication_note_path"
  ) {
    elm.route = elm.route.map((rp) => {
      const tp = applyToPoint(matrix, rp) as { x: number; y: number }
      rp.x = tp.x
      rp.y = tp.y
      return rp
    })
  } else if (elm.type === "pcb_silkscreen_line") {
    const p1 = { x: elm.x1, y: elm.y1 }
    const p2 = { x: elm.x2, y: elm.y2 }
    const p1t = applyToPoint(matrix, p1)
    const p2t = applyToPoint(matrix, p2)
    elm.x1 = p1t.x
    elm.y1 = p1t.y
    elm.x2 = p2t.x
    elm.y2 = p2t.y
  } else if (elm.type === "cad_component") {
    const newPos = applyToPoint(matrix, {
      x: elm.position.x,
      y: elm.position.y,
    })
    elm.position.x = newPos.x
    elm.position.y = newPos.y
  }
  return elm
}

export const transformPCBElements = (
  elms: AnyCircuitElement[],
  matrix: Matrix,
) => {
  const tsr = decomposeTSR(matrix)
  const flipPadWidthHeight =
    Math.round(tsr.rotation.angle / (Math.PI / 2)) % 2 === 1
  let transformedElms = elms.map((elm) => transformPCBElement(elm, matrix))
  if (flipPadWidthHeight) {
    transformedElms = transformedElms.map((elm) => {
      if (elm.type === "pcb_smtpad" && elm.shape === "rect") {
        ;[elm.width, elm.height] = [elm.height, elm.width]
      }
      return elm
    })
  }
  return transformedElms
}
````

## File: tests/cju-indexed.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"
import { test, expect } from "bun:test"

test("suIndexed produces same output as su", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
      subcircuit_id: "main",
    } as unknown as AnyCircuitElement,
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
      subcircuit_id: "main",
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "simple_resistor_0",
      x: 10,
      y: 20,
      width: 5,
      height: 2,
      subcircuit_id: "main",
    } as unknown as AnyCircuitElement,
  ]

  const regularSu = cju(soup)
  const indexedSu = cjuIndexed(soup, {
    indexConfig: {
      byId: true,
      byType: true,
      byRelation: true,
      bySubcircuit: true,
      byCustomField: ["name", "ftype"],
    },
  })

  // Test get operation
  const regularGet = regularSu.source_component.get("simple_resistor_0")
  const indexedGet = indexedSu.source_component.get("simple_resistor_0")
  expect(indexedGet).toEqual(regularGet)

  // Test getUsing operation
  const regularGetUsing = regularSu.source_component.getUsing({
    pcb_component_id: "pcb_component_0",
  })
  const indexedGetUsing = indexedSu.source_component.getUsing({
    pcb_component_id: "pcb_component_0",
  })
  expect(indexedGetUsing).toEqual(regularGetUsing)

  // Test getWhere operation
  const regularGetWhere = regularSu.source_component.getWhere({ name: "R1" })
  const indexedGetWhere = indexedSu.source_component.getWhere({ name: "R1" })
  expect(indexedGetWhere).toEqual(regularGetWhere)

  // Test list operation
  const regularList = regularSu.source_port.list()
  const indexedList = indexedSu.source_port.list()
  expect(indexedList).toEqual(regularList)

  // Test list with filter
  const regularListWhere = regularSu.source_component.list({
    subcircuit_id: "main",
  })
  const indexedListWhere = indexedSu.source_component.list({
    subcircuit_id: "main",
  })
  expect(indexedListWhere).toEqual(regularListWhere)

  // Test insert operation
  const regularInsert = regularSu.source_port.insert({
    name: "right",
    source_component_id: "simple_resistor_0",
    subcircuit_id: "main",
  })
  const indexedInsert = indexedSu.source_port.insert({
    name: "right",
    source_component_id: "simple_resistor_0",
    subcircuit_id: "main",
  })
  expect(indexedInsert.name).toEqual(regularInsert.name)
  expect(indexedInsert.source_component_id).toEqual(
    regularInsert.source_component_id,
  )

  // Test update operation
  const regularUpdate = regularSu.source_component.update("simple_resistor_0", {
    resistance: 20_000,
  })
  const indexedUpdate = indexedSu.source_component.update("simple_resistor_0", {
    resistance: 20_000,
  })
  expect(indexedUpdate).toEqual(regularUpdate)

  // Test with subcircuit relationship
  const regularBySubcircuit = regularSu.source_component.getWhere({
    subcircuit_id: "main",
  })
  const indexedBySubcircuit = indexedSu.source_component.getWhere({
    subcircuit_id: "main",
  })
  expect(indexedBySubcircuit).toEqual(regularBySubcircuit)

  // Test toArray returns the same soup
  expect(indexedSu.toArray()).toEqual(regularSu.toArray())
})
````

## File: tests/delete.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("delete", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  cju(soup).source_port.delete("source_port_0")

  const sp = cju(soup)
    .toArray()
    .find((e) => e.type === "source_port")

  expect(sp).toBeFalsy()
})
````

## File: tests/edit-count.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju, cjuIndexed } from "../index"
import { test, expect } from "bun:test"

test("cju editCount increments correctly", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 100,
    },
  ]

  const su = cju(soup)
  expect(su.editCount).toBe(0)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(0)

  // Insert
  su.source_port.insert({
    name: "left",
    source_component_id: "sc1",
  })
  expect(su.editCount).toBe(1)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(1)

  // Update
  su.source_component.update("sc1", { resistance: 200 })
  expect(su.editCount).toBe(2)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(2)

  // Delete
  su.source_port.delete("source_port_0")
  expect(su.editCount).toBe(3)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(3)

  // Get should not increment
  su.source_component.get("sc1")
  expect(su.editCount).toBe(3)

  // List should not increment
  su.source_component.list()
  expect(su.editCount).toBe(3)

  // toArray should not increment
  su.toArray()
  expect(su.editCount).toBe(3)
})

test("cjuIndexed editCount increments correctly", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 100,
    },
  ]

  const su = cjuIndexed(soup, {
    indexConfig: { byId: true, byType: true },
  })
  expect(su.editCount).toBe(0)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(0)

  // Insert
  su.source_port.insert({
    name: "left",
    source_component_id: "sc1",
  })
  expect(su.editCount).toBe(1)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(1)

  // Update
  su.source_component.update("sc1", { resistance: 200 })
  expect(su.editCount).toBe(2)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(2)

  // Delete
  su.source_port.delete("source_port_0")
  expect(su.editCount).toBe(3)
  expect((su.toArray() as unknown as { editCount: number }).editCount).toBe(3)

  // Get should not increment
  su.source_component.get("sc1")
  expect(su.editCount).toBe(3)

  // List should not increment
  su.source_component.list()
  expect(su.editCount).toBe(3)

  // toArray should not increment
  su.toArray()
  expect(su.editCount).toBe(3)
})
````

## File: tests/find-bounds-and-center.test.ts
````typescript
import { expect, test } from "bun:test"
import { findBoundsAndCenter } from "lib/find-bounds-and-center"
import type { AnyCircuitElement } from "circuit-json"

test("should return default values for empty input", () => {
  const result = findBoundsAndCenter([])
  expect(result).toEqual({ center: { x: 0, y: 0 }, width: 0, height: 0 })
})

test("should calculate bounds and center for a single element", () => {
  const elements = [
    { type: "pcb_component", x: 10, y: 20, width: 5, height: 5 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 10, y: 20 },
    width: 5,
    height: 5,
  })
})

test("should calculate bounds and center for multiple elements", () => {
  const elements = [
    { type: "pcb_component", x: 0, y: 0, width: 10, height: 10 } as unknown as AnyCircuitElement,
    { type: "pcb_component", x: 20, y: 20, width: 10, height: 10 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 10, y: 10 },
    width: 30,
    height: 30,
  })
})

test("should handle pcb_trace elements correctly", () => {
  const elements = [
    {
      type: "pcb_trace",
      route: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    } as unknown as AnyCircuitElement,
    { type: "pcb_component", x: 20, y: 20, width: 10, height: 10 } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 12.475, y: 12.475 },
    width: 25.05,
    height: 25.05,
  })
})

test("should handle polygon SMT pad elements correctly", () => {
  const elements = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 3 },
        { x: 0, y: 3 },
      ],
      layer: "top",
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_component", 
      x: 10, 
      y: 10, 
      width: 4, 
      height: 4 
    } as unknown as AnyCircuitElement,
  ]
  const result = findBoundsAndCenter(elements as unknown as AnyCircuitElement[])
  expect(result).toEqual({
    center: { x: 6, y: 6 },
    width: 12,
    height: 12,
  })
})
````

## File: tests/get-bounds-of-pcb-elements.test.ts
````typescript
import { getBoundsOfPcbElements } from "../lib/get-bounds-of-pcb-elements"
import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"

test("getBoundsOfPcbElements", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_component",
      pcb_component_id: "comp1",
      source_component_id: "source_comp1",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      x: 15,
      y: 15,
      width: 2,
      height: 2,
      layer: "top",
      shape: "rect",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        { x: -5, y: -5, width: 1, layer: "top", route_type: "wire" },
        { x: 20, y: 20, width: 1, layer: "top", route_type: "wire" },
      ],
    },
  ]

  const bounds = getBoundsOfPcbElements(elements)

  expect(bounds).toEqual({ minX: -5, minY: -5, maxX: 20, maxY: 20 })
})
````

## File: tests/get-layout-debug-object.test.ts
````typescript
import { expect, test } from "bun:test"
import { getDebugLayoutObject } from "../lib/utils/get-layout-debug-object"

test("should handle regular elements with x, y, width, height", () => {
  const element = {
    type: "pcb_component",
    x: 10,
    y: 20,
    width: 5,
    height: 3,
  }
  
  const result = getDebugLayoutObject(element)
  
  expect(result).toEqual({
    x: 10,
    y: 20,
    width: 5,
    height: 3,
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should handle polygon elements with points array", () => {
  const element = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
    ],
    layer: "top",
  }
  
  const result = getDebugLayoutObject(element)
  
  expect(result).toEqual({
    x: 2, // center x: (0 + 4) / 2
    y: 3, // center y: (0 + 6) / 2
    width: 4, // maxX - minX: 4 - 0
    height: 6, // maxY - minY: 6 - 0
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should handle polygon with irregular shape", () => {
  const element = {
    type: "pcb_smtpad",
    shape: "polygon",
    points: [
      { x: 1, y: 1 },
      { x: 5, y: 2 },
      { x: 3, y: 8 },
      { x: -1, y: 4 },
    ],
  }
  
  const result = getDebugLayoutObject(element)
  
  expect(result).toEqual({
    x: 2, // center x: (-1 + 5) / 2
    y: 4.5, // center y: (1 + 8) / 2
    width: 6, // maxX - minX: 5 - (-1)
    height: 7, // maxY - minY: 8 - 1
    title: "?",
    content: element,
    bg_color: expect.any(String),
  })
})

test("should return null for elements without coordinates or points", () => {
  const element = {
    type: "some_element",
    name: "test",
  }
  
  const result = getDebugLayoutObject(element)
  
  expect(result).toBeNull()
})

test("should handle empty points array", () => {
  const element = {
    type: "pcb_smtpad",
    points: [],
  }
  
  const result = getDebugLayoutObject(element)
  
  expect(result).toBeNull()
})
````

## File: tests/get-readable-name-for-element.test.ts
````typescript
import { getReadableNameForElement } from "../lib/readable-name-functions/get-readable-name-for-element"
import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"

test("getReadableNameForElement for pcb_port, pcb_smtpad, and pcb_trace", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
      resistance: 100,
    },
    {
      type: "source_port",
      source_port_id: "sp1",
      source_component_id: "sc1",
      name: "left",
      port_hints: ["1", "left"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      width: 10,
      height: 5,
      rotation: 0,
      center: { x: 5, y: 5 },
      layer: "top",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp1",
      pcb_component_id: "pc1",
      source_port_id: "sp1",
      x: 0,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "ps1",
      pcb_port_id: "pp1",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
      shape: "rect",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      route: [
        {
          x: 0,
          y: 0,
          width: 1,
          layer: "top",
          route_type: "wire",
          start_pcb_port_id: "pp1",
        },
        {
          x: 1,
          y: 0,
          width: 1,
          layer: "top",
          route_type: "wire",
          end_pcb_port_id: "pp2",
        },
      ],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp2",
      pcb_component_id: "pc2",
      source_port_id: "sp2",
      x: 0,
      y: 0,
      layers: ["top"],
    },
    {
      type: "source_component",
      source_component_id: "sc2",
      name: "C1",
      ftype: "simple_capacitor",
      capacitance: 10,
    },
    {
      type: "source_port",
      source_port_id: "sp2",
      source_component_id: "sc2",
      name: "positive",
      port_hints: ["1", "positive"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc2",
      source_component_id: "sc2",
      width: 10,
      height: 5,
      rotation: 0,
      center: { x: 0, y: 0 },
      layer: "top",
    },
  ]

  // Test pcb_port
  expect(getReadableNameForElement(soup, "pp1")).toBe("pcb_port[.R1 > .1]")

  // Test pcb_smtpad
  expect(getReadableNameForElement(soup, "ps1")).toBe("pcb_port[.R1 > .1]")

  // Test pcb_trace
  expect(getReadableNameForElement(soup, "pt1")).toBe(
    "trace[.R1 > port.left, .C1 > port.positive]",
  )
})
````

## File: tests/get-using.test.ts
````typescript
import type { AnyCircuitElementInput } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("getUsing", () => {
  const soup: AnyCircuitElementInput[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: "10k",
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  const sc = cju.unparsed(soup).source_component.getUsing({
    source_port_id: "source_port_0",
  })
  expect(sc?.name).toBe("R1")
})
````

## File: tests/get.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("get", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  const se = cju(soup).source_component.get("simple_resistor_0")
  expect(se?.name).toBe("R1")
})
````

## File: tests/getCircuitJsonTree1.test.ts
````typescript
import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"

test("getCircuitJsonTree1", async () => {
  const circuitJson = await runTscircuitCode(`

  export default () => (
    <board autoroutingDisabled>
      <group name="G1">
        <group name="G2">
          <resistor name="R1" resistance="1k" />
          <capacitor name="C1" capacitance="100nF" />
        </group>
        <resistor name="R2" resistance="2k" />
      </group>
    </board>
  )
  `)

  const tree1 = getCircuitJsonTree(circuitJson)

  expect(getStringFromCircuitJsonTree(tree1)).toMatchInlineSnapshot(`
    "source_group_2
      G1
        G2
          R1
          C1
        R2"
  `)

  const tree2 = getCircuitJsonTree(circuitJson, {
    source_group_id: (circuitJson.find((elm: any) => elm.name === "G1") as any)
      ?.source_group_id!,
  })

  expect(getStringFromCircuitJsonTree(tree2)).toMatchInlineSnapshot(`
    "G1
      G2
        R1
        C1
      R2"
  `)
})
````

## File: tests/insert-with-validation.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("insert with validation", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  expect(() =>
    cju(soup, { validateInserts: true }).pcb_port.insert({
      // @ts-expect-error - this is the error, "top" should be in an array
      layers: "top",
      pcb_component_id: "",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    }),
  ).toThrow()
})
````

## File: tests/insert.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("insert", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  const pp = cju(soup).pcb_port.insert({
    layers: ["top"],
    pcb_component_id: "",
    source_port_id: "source_port_0",
    x: 0,
    y: 0,
  })

  expect(pp?.pcb_port_id).toBe("pcb_port_0")

  const pcb_port = cju(soup)
    .toArray()
    .find((elm) => elm.type === "pcb_port")!

  expect(pcb_port).toBeTruthy()
})
````

## File: tests/reposition-pcb-component.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { repositionPcbComponentTo } from "../lib/reposition-pcb-component"
import { test, expect } from "bun:test"

const makeSoup = (): AnyCircuitElement[] => [
  {
    type: "pcb_component",
    pcb_component_id: "pc1",
    source_component_id: "sc1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "pp1",
    pcb_component_id: "pc1",
    source_port_id: "sp1",
    x: 0,
    y: 0,
    layers: ["top"],
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_port_id: "pp1",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    shape: "rect",
  } as any,
  {
    type: "pcb_trace",
    pcb_trace_id: "t1",
    route: [
      {
        x: 0,
        y: 0,
        width: 1,
        layer: "top",
        route_type: "wire",
        start_pcb_port_id: "pp1",
      },
      { x: 5, y: 0, width: 1, layer: "top", route_type: "wire" },
    ],
  } as any,
]

test("repositionPcbComponentTo moves component and children", () => {
  const soup = makeSoup()

  repositionPcbComponentTo(soup, "pc1", { x: 10, y: 5 })

  const comp = soup.find((e) => e.type === "pcb_component") as any
  const port = soup.find((e) => e.type === "pcb_port") as any
  const pad = soup.find((e) => e.type === "pcb_smtpad") as any
  const trace = soup.find((e) => e.type === "pcb_trace") as any

  expect(comp.center).toEqual({ x: 10, y: 5 })
  expect(port.x).toBe(10)
  expect(port.y).toBe(5)
  expect(pad.x).toBe(10)
  expect(pad.y).toBe(5)
  expect(trace.route[0].x).toBe(10)
  expect(trace.route[0].y).toBe(5)
  expect(trace.route[1].x).toBe(15)
  expect(trace.route[1].y).toBe(5)
})
````

## File: tests/select.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("select", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      layers: ["top"],
      pcb_component_id: "pcb_component_simple_resistor_0",
      x: 0,
      y: 0,
    },
  ]

  const pp = cju(soup).pcb_port.select(".R1 > .left")
  expect(pp?.pcb_port_id).toBe("pcb_port_0")
})
````

## File: tests/subtree1.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("subtree by subcircuit", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "S1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 1000,
      subcircuit_id: "sub1",
    } as unknown as AnyCircuitElement,
    {
      type: "source_port",
      name: "p1",
      source_port_id: "sp1",
      source_component_id: "sc1",
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      center: { x: 0, y: 0 },
      layer: "top",
      rotation: 0,
      width: 1,
      height: 1,
      subcircuit_id: "sub1",
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_port",
      pcb_port_id: "pp1",
      source_port_id: "sp1",
      pcb_component_id: "pc1",
      x: 0,
      y: 0,
      layers: ["top"],
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      pcb_component_id: "pc1",
      route: [],
    } as unknown as AnyCircuitElement,
    {
      type: "source_component",
      source_component_id: "sc2",
      name: "S2",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 2000,
      subcircuit_id: "sub2",
    } as unknown as AnyCircuitElement,
  ]

  const st = cju(soup).subtree({ subcircuit_id: "sub1" })
  const result = st.toArray()

  expect(result.length).toBe(5)
  expect(st.pcb_trace.get("pt1")).toBeTruthy()
  expect(st.source_component.get("sc2")).toBeUndefined()
})
````

## File: tests/subtree2.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("subtree by source group", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_group",
      source_group_id: "g1",
    } as unknown as AnyCircuitElement,
    {
      type: "source_trace",
      source_trace_id: "st1",
      source_group_id: "g1",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    } as unknown as AnyCircuitElement,
    {
      type: "schematic_trace",
      schematic_trace_id: "sct1",
      source_trace_id: "st1",
      junctions: [],
      edges: [],
    } as unknown as AnyCircuitElement,
    {
      type: "pcb_trace",
      pcb_trace_id: "pt1",
      source_trace_id: "st1",
      route: [],
    } as unknown as AnyCircuitElement,
    {
      type: "source_group",
      source_group_id: "g2",
    } as unknown as AnyCircuitElement,
    {
      type: "source_trace",
      source_trace_id: "st2",
      source_group_id: "g2",
      connected_source_port_ids: [],
      connected_source_net_ids: [],
    } as unknown as AnyCircuitElement,
  ]

  const st = cju(soup).subtree({ source_group_id: "g1" })
  const result = st.toArray()

  expect(result.length).toBe(4)
  expect(st.schematic_trace.get("sct1")).toBeTruthy()
  expect(st.source_trace.list().length).toBe(1)
})
````

## File: tests/update.test.ts
````typescript
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"
import { test, expect } from "bun:test"

test("update", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "simple_resistor_0",
      name: "R1",
      supplier_part_numbers: {},
      ftype: "simple_resistor",
      resistance: 10_000,
    },
    {
      type: "source_port",
      name: "left",
      source_port_id: "source_port_0",
      source_component_id: "simple_resistor_0",
    },
  ]

  cju(soup).source_port.update("source_port_0", {
    name: "right",
  })

  const port = cju(soup).source_port.get("source_port_0")

  expect(port?.name).toBe("right")

  cju(soup).source_component.update("simple_resistor_0", {
    supplier_part_numbers: {
      jlcpcb: ["1234567890"],
    },
  })

  const resistor = cju(soup).source_component.get("simple_resistor_0")

  expect(resistor?.supplier_part_numbers).toEqual({
    jlcpcb: ["1234567890"],
  })
})
````

## File: .gitignore
````
node_modules
.vscode
dist
.aider*
package-lock.json
````

## File: ava.config.js
````javascript
export default {
  files: ["tests/**/*.test.ts"],
  extensions: ["ts"],
  require: ["esbuild-register"],
}
````

## File: biome.json
````json
{
  "$schema": "https://biomejs.dev/schemas/1.7.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space"
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "all",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "off"
      },
      "style": {
        "noNonNullAssertion": "off",
        "noUselessElse": "off",
        "useFilenamingConvention": {
          "level": "error",
          "options": {
            "strictCase": true,
            "requireAscii": true,
            "filenameCases": ["kebab-case", "export"]
          }
        }
      }
    }
  }
}
````

## File: bunfig.toml
````toml
# [test]
# preload = ["./tests/fixtures/preload.ts"]

[install.lockfile]
save = false
````

## File: CLAUDE.md
````markdown
# CLAUDE.md - @tscircuit/soup-util

## Build & Test Commands
- Build: `npm run build` (tsup-node ./index.ts --format esm --dts --sourcemap)
- Test all: `bun test`
- Test single file: `bun test tests/file-name.test.ts`
- Lint: `npx @biomejs/biome lint .`
- Format: `npx @biomejs/biome format . --write`

## Code Style
- **TypeScript**: Strict mode enabled with ES2022 target
- **Formatting**: Biome with 2-space indentation
- **File naming**: Kebab-case for filenames (enforced by Biome)
- **Imports**: Use explicit imports, organized with Biome
- **Semicolons**: Optional (asNeeded in Biome config)
- **Types**: Use strict typing; avoid `any` when possible
- **Error handling**: Use explicit error messages with specific details
- **ID conventions**: Elements use type-based ID format: `${type}_${index}`

## Utility Functions
Follow the `su(soup).element_type.operation()` pattern as demonstrated in README examples.
Maintain type safety through generics and proper return types.
````

## File: index.ts
````typescript
export * from "./lib/cju"
export * from "./lib/cju-indexed"
export * from "./lib/transform-soup-elements"
export * from "./lib/direction-to-vec"
export * from "./lib/apply-selector"
export * from "./lib/get-element-by-id"
export * from "./lib/get-element-id"
export * from "./lib/readable-name-functions/get-readable-name-for-element"
export * from "./lib/get-bounds-of-pcb-elements"
export * from "./lib/find-bounds-and-center"
export * from "./lib/get-primary-id"
export * from "./lib/subtree"
export * from "./lib/reposition-pcb-component"
export * from "./lib/getCircuitJsonTree"
export * from "./lib/getStringFromCircuitJsonTree"

export { default as cju } from "./lib/cju"
export { default as cjuIndexed } from "./lib/cju-indexed"
````

## File: LICENSE
````
MIT License

Copyright (c) 2024 tscircuit Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

## File: package.json
````json
{
  "name": "@tscircuit/circuit-json-util",
  "type": "module",
  "version": "0.0.57",
  "description": "Utility library for working with tscircuit circuit json",
  "files": [
    "dist"
  ],
  "main": "dist/index.js",
  "scripts": {
    "test": "bun test",
    "prepublish": "npm run build",
    "build": "tsup-node ./index.ts --format esm --dts --sourcemap",
    "benchmark": "bun run lib/benchmarks/su-benchmark.ts"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "peerDependencies": {
    "circuit-json": "*",
    "transformation-matrix": "*",
    "zod": "*"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.2",
    "@types/bun": "^1.2.9",
    "circuit-json": "^0.0.221",
    "esbuild": "^0.20.2",
    "esbuild-register": "^3.5.0",
    "transformation-matrix": "^2.16.1",
    "tscircuit": "^0.0.562",
    "tsup": "^8.0.2",
    "typescript": "^5.4.5",
    "zod": "^3.23.6"
  },
  "dependencies": {
    "parsel-js": "^1.1.2"
  }
}
````

## File: README.md
````markdown
# @tscircuit/circuit-json-util

> Previously released as `@tscircuit/soup-util`

This is a small utility library for working with [circuit json](https://github.com/tscircuit/circuit-json)

It reduces the amount of code to retrieve or join elements from circuit json, it also neatly handles all the typing.

## Standard Usage

```ts
import { su } from "@tscircuit/circuit-json-util"

const circuitJson = [
  /* [ { type: "source_component", ... }, ... ] */
]

const pcb_component = su(circuitJson).pcb_component.get("1234")

const source_component = su(circuitJson).source_component.getUsing({
  pcb_component_id: "123",
})

const schematic_component = su(circuitJson).schematic_component.getWhere({
  width: 1,
})

const source_traces = su(circuitJson).source_trace.list({
  source_component_id: "123",
})
```

## Optimized Indexed Version

For large circuit json, the library provides an optimized version with indexing for faster lookups:

```ts
import { suIndexed } from "@tscircuit/circuit-json-util"

const circuitJson = [
  /* large soup with many elements */
]

// Configure the indexes you want to use
const indexedSu = suIndexed(circuitJson, {
  indexConfig: {
    byId: true, // Index by element ID for fast .get() operations
    byType: true, // Index by element type for fast .list() operations
    byRelation: true, // Index relation fields (fields ending with _id)
    bySubcircuit: true, // Index by subcircuit_id for fast subcircuit filtering
    byCustomField: ["name", "ftype"], // Index specific fields you query often
  },
})

// Use the same API as the standard version, but with much better performance
const pcb_component = indexedSu.pcb_component.get("1234") // O(1) lookup

// Fast filtering by subcircuit
const subcircuitElements = indexedSu.source_component.list({
  subcircuit_id: "main",
})
```

The indexed version maintains the same API as the standard version but provides significant performance improvements, especially for large circuit json arrays.

## Repositioning PCB Components

Use `repositionPcbComponentTo` to move a component and all of its related elements to a new center:

```ts
import { repositionPcbComponentTo } from "@tscircuit/circuit-json-util"

repositionPcbComponentTo(circuitJson, "pc1", { x: 10, y: 5 })
```

All ports, pads and traces referencing the component are translated by the same offset.
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    // Base Options recommended for all projects
    "baseUrl": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    // Enable strict type checking so you can catch bugs early
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    // We are not transpiling, so preserve our source code and do not emit files
    "module": "ESNext",
    "noEmit": true,
    "lib": ["es2022"],
    "paths": {
      "lib/*": ["lib/*"]
    }
  },
  // Include the necessary files for your project
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
````
