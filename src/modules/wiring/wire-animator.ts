// src/modules/wiring/wire-animator.ts
import type { Edge } from 'reactflow'

export interface WireAnimationOptions { sweepDurationMs?: number; staggerMs?: number }

export function buildSweepEdges(edges: Edge[], opts: WireAnimationOptions = {}): Edge[] {
  const { sweepDurationMs = 700, staggerMs = 65 } = opts
  return edges.map((edge, i) => ({
    ...edge, animated: false,
    style: { ...edge.style, strokeDasharray: '12 8', strokeDashoffset: '1000', strokeOpacity: 0.25,
      transition: `stroke-dashoffset ${sweepDurationMs}ms cubic-bezier(.4,0,.2,1) ${i * staggerMs}ms, stroke-opacity 400ms ease ${i * staggerMs}ms` },
    data: { ...edge.data, sweepPending: true },
  }))
}

export function resolveSweepEdges(edges: Edge[]): Edge[] {
  return edges.map(edge => !edge.data?.sweepPending ? edge : {
    ...edge,
    style: { ...edge.style, strokeDashoffset: '0', strokeOpacity: 0.92, strokeDasharray: 'none' },
    data: { ...edge.data, sweepPending: false },
  })
}

export function createWireSweeper(
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void,
  opts?: WireAnimationOptions
) {
  return function triggerSweep() {
    setEdges(prev => buildSweepEdges(prev, opts))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setEdges(prev => resolveSweepEdges(prev))
    }))
  }
}
