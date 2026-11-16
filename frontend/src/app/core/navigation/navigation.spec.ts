import type { ActivatedRouteSnapshot } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { FULL_HEIGHT, isFullHeightRoute } from './navigation';

function snapshot(data: Record<string, unknown>, child: ActivatedRouteSnapshot | null = null) {
  return { data, firstChild: child } as unknown as ActivatedRouteSnapshot;
}

describe('isFullHeightRoute', () => {
  it('is false when no route in the tree sets the flag', () => {
    expect(isFullHeightRoute(snapshot({}, snapshot({})))).toBe(false);
  });

  it('is true when the leaf route sets the flag', () => {
    expect(isFullHeightRoute(snapshot({}, snapshot({ [FULL_HEIGHT]: true })))).toBe(true);
  });

  it('lets a deeper route override an ancestor', () => {
    const tree = snapshot({ [FULL_HEIGHT]: true }, snapshot({ [FULL_HEIGHT]: false }));
    expect(isFullHeightRoute(tree)).toBe(false);
  });
});
