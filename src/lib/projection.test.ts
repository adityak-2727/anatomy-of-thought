import { describe, expect, it } from 'vitest';
import { along, between, orbit, projector, pxPerUnit, type Pose } from './projection';

const pose: Pose = { position: [0, 0, 100], target: [0, 0, 0] };
const view = { pose, fov: 28, width: 800, height: 600 };

describe('projection', () => {
  it('puts the target at the centre of the view', () => {
    const p = projector(view)([0, 0, 0]);
    expect(p.x).toBeCloseTo(400);
    expect(p.y).toBeCloseTo(300);
    expect(p.depth).toBeCloseTo(100);
  });

  it('keeps right to the right and up at the top', () => {
    const project = projector(view);
    expect(project([10, 0, 0]).x).toBeGreaterThan(400);
    expect(project([0, 10, 0]).y).toBeLessThan(300);
  });

  it('agrees with its own scale', () => {
    const project = projector(view);
    expect(project([1, 0, 0]).x - 400).toBeCloseTo(pxPerUnit(view, 100));
  });

  it('matches a perspective camera at the edge of the frame', () => {
    const half = 100 * Math.tan((14 * Math.PI) / 180);
    expect(projector(view)([0, half, 0]).y).toBeCloseTo(0);
  });

  it('orbits about the target without moving it or changing the distance', () => {
    const turned = orbit(pose, 12, 6);
    expect(turned.target).toEqual(pose.target);
    expect(Math.hypot(...turned.position)).toBeCloseTo(100);
    expect(turned.position[0]).toBeGreaterThan(0);
    expect(turned.position[1]).toBeGreaterThan(0);
  });

  it('passes through every stop of a path, and stands back between them', () => {
    const stops: Pose[] = [pose, { position: [50, 0, 60], target: [50, 0, 0] }, { position: [-50, 20, 60], target: [-50, 20, 0] }];
    expect(along(stops, 1).position).toEqual([50, 0, 60]);
    expect(along(stops, 2).target).toEqual([-50, 20, 0]);
    const mid = along(stops, 1.5, 0.3);
    const plain = along(stops, 1.5, 0);
    expect(mid.position[2]).toBeGreaterThan(plain.position[2]);
    expect(between(stops[0], stops[1], 1)).toEqual(stops[1]);
  });
});
