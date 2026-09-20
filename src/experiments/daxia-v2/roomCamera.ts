import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// All views share the room's vertical centre axis. Screen framing never moves it.
export const ROOM_PIVOT = new T.Vector3(0, 2, 0)
export function createRoomOrbit(camera: T.PerspectiveCamera, element: HTMLElement) {
  const controls = new OrbitControls(camera, element)
  controls.target.copy(ROOM_PIVOT); controls.cursor.copy(ROOM_PIVOT); controls.maxTargetRadius = 0
  controls.enablePan = false; controls.zoomToCursor = false
  controls.enableDamping = true; controls.dampingFactor = .065
  controls.minDistance = 3.8; controls.maxDistance = 28
  controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .49
  controls.rotateSpeed = .65; controls.zoomSpeed = .8; controls.autoRotateSpeed = .38
  const framing = new T.Vector2()
  return {
    controls, framing,
    offsetFor(position: T.Vector3, focus: T.Vector3) {
      const probe = camera.clone(); probe.clearViewOffset(); probe.position.copy(position); probe.lookAt(ROOM_PIVOT); probe.updateMatrixWorld()
      const p = focus.clone().project(probe)
      return new T.Vector2(p.x / 2, -p.y / 2)
    },
    pan(dx: number, dy: number, width: number, height: number) {
      framing.x = T.MathUtils.clamp(framing.x - dx / width, -.7, .7)
      framing.y = T.MathUtils.clamp(framing.y - dy / height, -.7, .7)
    },
    apply(width: number, height: number) {
      const x = width * (framing.x + (width >= 1000 ? .035 : 0))
      const y = height * (framing.y + (width < 760 ? .01 : 0))
      camera.setViewOffset(width, height, x, y, width, height)
    },
  }
}
