/** Shared anchors keep furniture, interaction effects and camera framing together. */
export const STUDY_SHIFT_Z = -.68
// Long edge follows the tangent of the circular lower-left wall. The bench
// sits on the opposite, inward side, leaving its sitter room behind the seat.
export const QIN_POSITION: [number, number, number] = [-2.48, .045, 2.0]
export const QIN_ROTATION = Math.atan2(QIN_POSITION[0], QIN_POSITION[2])
export const QIN_TABLE = { width: 2.16, depth: .66, height: 1.22 }
export const QIN_BENCH = { width: 1.12, depth: .46, height: .68, offset: -.86 }

export const SIDECASE_POSITION: [number, number, number] = [3.28, .04, .30]
export const SIDECASE_ROTATION = Math.atan2(SIDECASE_POSITION[0], SIDECASE_POSITION[2]) + Math.PI
