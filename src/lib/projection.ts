// The chart's camera, worked out by hand. three.js, the SVG fallback, the lettered names
// and (in Phase 5) the Fig. 4b inset all project through these functions, so every
// drawing of the chart puts a star on the same pixel. The maths matches three.js's
// PerspectiveCamera looking at a target with the y axis up; fov is vertical, in degrees.

export type Vec3 = readonly [number, number, number];

export interface Pose {
  position: Vec3;
  target: Vec3;
}

export interface View {
  pose: Pose;
  fov: number;
  width: number;
  height: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Distance in front of the camera; at or below zero the point is behind it. */
  depth: number;
}

const sub = (a: Vec3, b: Vec3): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): [number, number, number] => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** The camera's right, up and forward directions. */
export function basis(pose: Pose): { right: Vec3; up: Vec3; forward: Vec3 } {
  const forward = norm(sub(pose.target, pose.position));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { right, up, forward };
}

/** A projector for one view: call it for each point (the basis is worked out once). */
export function projector(view: View): (p: Vec3) => Projected {
  const { right, up, forward } = basis(view.pose);
  const t = Math.tan(((view.fov / 2) * Math.PI) / 180);
  const aspect = view.width / view.height;
  const eye = view.pose.position;
  return (p) => {
    const d = sub(p, eye);
    const depth = dot(d, forward);
    const safe = depth > 1e-6 ? depth : 1e-6;
    const nx = dot(d, right) / (safe * t * aspect);
    const ny = dot(d, up) / (safe * t);
    return { x: ((nx + 1) / 2) * view.width, y: ((1 - ny) / 2) * view.height, depth };
  };
}

/** How many CSS px one unit of the chart spans at a given depth. */
export function pxPerUnit(view: View, depth: number): number {
  return view.height / (2 * depth * Math.tan(((view.fov / 2) * Math.PI) / 180));
}

/** Turn the camera about its target: yaw about the vertical, pitch about its own right. Degrees. */
export function orbit(pose: Pose, yaw: number, pitch: number): Pose {
  if (!yaw && !pitch) return pose;
  const [dx, dy, dz] = sub(pose.position, pose.target);
  const y = (yaw * Math.PI) / 180;
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const x1 = dx * cy + dz * sy;
  const z1 = -dx * sy + dz * cy;
  const r = Math.hypot(x1, dy, z1);
  const flat = Math.hypot(x1, z1);
  const elevation = Math.atan2(dy, flat) + (pitch * Math.PI) / 180;
  const k = (Math.cos(elevation) * r) / (flat || 1);
  return {
    position: [pose.target[0] + x1 * k, pose.target[1] + Math.sin(elevation) * r, pose.target[2] + z1 * k],
    target: pose.target,
  };
}

const mix = (a: Vec3, b: Vec3, t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): [number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    out[k] =
      0.5 *
      (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  }
  return out;
}

/**
 * A pose along a Catmull-Rom path through `stops`, at `s` (0 is the first stop, 1 the
 * second, …). Between stops the camera stands back a little (`lift`, a share of the
 * distance between the targets), so the reader sees where it is going.
 */
export function along(stops: readonly Pose[], s: number, lift = 0): Pose {
  const last = stops.length - 1;
  const clamped = Math.min(Math.max(s, 0), last);
  const i = Math.min(Math.floor(clamped), last - 1);
  const t = clamped - i;
  const at = (k: number) => stops[Math.min(Math.max(k, 0), last)];
  const position = catmull(at(i - 1).position, at(i).position, at(i + 1).position, at(i + 2).position, t);
  const target = catmull(at(i - 1).target, at(i).target, at(i + 1).target, at(i + 2).target, t);
  if (lift > 0 && t > 0 && t < 1) {
    const back = norm(sub(position, target));
    const amount = Math.sin(Math.PI * t) * lift * distance(at(i).target, at(i + 1).target);
    for (let k = 0; k < 3; k++) position[k] += back[k] * amount;
  }
  return { position, target };
}

/** Straight from one pose to another, standing back mid-way as `along` does. */
export function between(a: Pose, b: Pose, t: number, lift = 0): Pose {
  const position = mix(a.position, b.position, t);
  const target = mix(a.target, b.target, t);
  if (lift > 0) {
    const back = norm(sub(position, target));
    const amount = Math.sin(Math.PI * t) * lift * distance(a.target, b.target);
    for (let k = 0; k < 3; k++) position[k] += back[k] * amount;
  }
  return { position, target };
}
