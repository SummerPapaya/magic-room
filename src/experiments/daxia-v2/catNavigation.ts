import * as T from 'three'

/** A small floor grid keeps the cat inside the cutaway and away from furniture. */
export function createCatNavigation(obstacles: T.Box2[], radius = 3.48) {
  const step = .17, span = 21, width = span * 2 + 1
  const padded = obstacles.map(b => b.clone().expandByScalar(.25))
  const canStand = (p: T.Vector2) => p.length() <= radius && !padded.some(b => b.containsPoint(p))
  const cells: (T.Vector2 | null)[] = Array.from({ length: width * width }, (_, i) => {
    const p = new T.Vector2((i % width - span) * step, (Math.floor(i / width) - span) * step)
    return canStand(p) ? p : null
  })
  const clearLine = (a: T.Vector2, b: T.Vector2) => {
    const steps = Math.ceil(a.distanceTo(b) / .05)
    for (let i = 0; i <= steps; i++) if (!canStand(a.clone().lerp(b, steps ? i / steps : 0))) return false
    return true
  }
  return {
    canStand,
    path(from: T.Vector2, to: T.Vector2) {
      let start = -1, nearest = Infinity
      cells.forEach((p, i) => { if (p && p.distanceToSquared(from) < nearest && clearLine(from, p)) { nearest = p.distanceToSquared(from); start = i } })
      if (start < 0) return []
      const previous = new Int32Array(cells.length).fill(-1), queue = [start]; previous[start] = start
      let best = start, distance = cells[start]!.distanceToSquared(to)
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q], x = i % width, y = Math.floor(i / width)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= width) continue
          const n = i + dy * width + dx
          if (!cells[n] || previous[n] >= 0 || (dx && dy && (!cells[i + dx] || !cells[i + dy * width]))) continue
          previous[n] = i; queue.push(n)
          const d = cells[n]!.distanceToSquared(to)
          if (d < distance) { distance = d; best = n }
        }
      }
      const route = [cells[best]!.clone()]
      while (best !== start) { best = previous[best]; route.push(cells[best]!.clone()) }
      route.reverse(); route.unshift(from.clone())
      const smooth: T.Vector2[] = []; let index = 0
      while (index < route.length - 1) {
        let next = route.length - 1
        while (next > index + 1 && !clearLine(route[index], route[next])) next--
        smooth.push(route[next]); index = next
      }
      return smooth.filter(p => p.distanceTo(from) > .045)
    },
  }
}
