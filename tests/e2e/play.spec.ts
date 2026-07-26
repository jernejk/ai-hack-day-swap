import { expect, test } from '@playwright/test';

type HookState = {
  jewels: (number | null)[];
  shelf: number[];
  moves: number;
  capacity: number;
};

test('selection is visual only, then the shelf tap commits exactly one move', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => (window as never as { __swap: { getState(): HookState } }).__swap.getState());
  await page.locator('[data-cell="0"]').click();
  const selected = await page.evaluate(() => {
    const hook = (window as never as {
      __swap: { getState(): HookState; getSelection(): unknown };
    }).__swap;
    return { state: hook.getState(), selection: hook.getSelection() };
  });
  expect(selected.state).toEqual(before);
  expect(selected.selection).not.toBeNull();
  await page.screenshot({ path: 'artifacts/neural-socket-selected.png' });
  await page.locator('#shelf').click({ position: { x: 6, y: 6 } });
  const after = await page.evaluate(() => (window as never as { __swap: { getState(): HookState } }).__swap.getState());
  expect(after.moves).toBe(1);
  expect(after.shelf.length).toBeGreaterThan(0);
});

test('a partial shelf drop preserves the remaining board selection', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const hook = (window as never as {
      __swap: {
        getState(): HookState & { level: unknown; completed: number[] };
        loadStateForTest(state: HookState & { level: unknown; completed: number[] }): void;
      };
    }).__swap;
    hook.loadStateForTest({ ...hook.getState(), capacity: 2 });
  });
  await page.locator('[data-cell="0"]').click();
  await page.locator('#shelf').click({ position: { x: 6, y: 6 } });
  const result = await page.evaluate(() => {
    const hook = (window as never as {
      __swap: { getState(): HookState; getSelection(): { kind: string; cells: number[] } | null };
    }).__swap;
    return { state: hook.getState(), selection: hook.getSelection() };
  });
  expect(result.state.shelf).toHaveLength(2);
  expect(result.selection?.kind).toBe('board');
  expect(result.selection?.cells.length).toBeGreaterThan(0);
});

test('occupied matching target is not a swap destination', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-cell="0"]').click();
  const selection = await page.evaluate(() => (window as never as {
    __swap: { getSelection(): { colour: number } };
  }).__swap.getSelection());
  const occupiedTarget = await page.evaluate((colour) => {
    const state = (window as never as { __swap: { getState(): HookState & { level: { target: number[] } } } }).__swap.getState();
    return state.level.target.findIndex((target, cell) => target === colour && state.jewels[cell] != null);
  }, selection.colour);
  const before = await page.evaluate(() => JSON.stringify((window as never as { __swap: { getState(): HookState } }).__swap.getState()));
  await page.locator(`[data-cell="${occupiedTarget}"]`).click();
  const after = await page.evaluate(() => JSON.stringify((window as never as { __swap: { getState(): HookState } }).__swap.getState()));
  expect(after).toBe(before);
  await expect(page.locator('#status')).toContainText('occupied');
});

test('a non-front shelf colour pours without FIFO queue behaviour', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const hook = (window as never as {
      __swap: {
        getState(): HookState & { level: { target: number[] }; completed: number[] };
        loadStateForTest(state: HookState & { level: { target: number[] }; completed: number[] }): void;
      };
    }).__swap;
    const current = hook.getState();
    const violetTarget = current.level.target.findIndex((target) => target === 1);
    const jewels = [...current.jewels];
    jewels[violetTarget] = null;
    hook.loadStateForTest({
      ...current,
      jewels,
      shelf: [0, 1, 0],
      capacity: 8,
      completed: [],
      moves: 0,
    });
  });
  await page.locator('[data-slot="1"]').click();
  const violetTarget = await page.evaluate(() => {
    const state = (window as never as {
      __swap: { getState(): HookState & { level: { target: number[] } } };
    }).__swap.getState();
    return state.level.target.findIndex((target, cell) => target === 1 && state.jewels[cell] == null);
  });
  await page.locator(`[data-cell="${violetTarget}"]`).click();
  const final = await page.evaluate(() => (window as never as {
    __swap: { getState(): HookState };
  }).__swap.getState());
  expect(final.jewels[violetTarget]).toBe(1);
  expect(final.shelf).toEqual([0, 0]);
});

test('full certified solution is played through UI handlers', async ({ page }) => {
  await page.goto('/');
  const won = await page.evaluate(() => (window as never as {
    __swap: { solveThroughUi(): Promise<boolean> };
  }).__swap.solveThroughUi());
  const solveStatus = await page.locator('#status').textContent();
  expect(won, solveStatus ?? 'no status').toBe(true);
  await expect(page.locator('body')).toHaveClass(/won/);
  const final = await page.evaluate(() => (window as never as { __swap: { getState(): HookState } }).__swap.getState());
  expect(final.shelf).toEqual([]);
  await expect(page.locator('#win')).toHaveClass(/show/, { timeout: 3_000 });
  await page.screenshot({ path: 'artifacts/neural-socket-win.png' });
});

test('fits at 360 by 740 without clipping the board, buffer, or controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.evaluate(() => (window as never as { __swap: { restart(): void } }).__swap.restart());
  await expect(page.locator('#win')).not.toHaveClass(/show/);
  await page.waitForTimeout(400);
  const layout = await page.evaluate(() => {
    const ids = ['board', 'shelf', 'undo', 'hint', 'restart'];
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewport: { width: innerWidth, height: innerHeight },
      rects: ids.map((id) => ({ id, rect: document.getElementById(id)!.getBoundingClientRect().toJSON() })),
    };
  });
  expect(layout.width).toBeLessThanOrEqual(360);
  expect(layout.height).toBeLessThanOrEqual(740);
  for (const { rect } of layout.rects) {
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(360);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(740);
  }
  await page.screenshot({ path: 'artifacts/neural-socket-initial-360x740.png', fullPage: true });
});

test('desktop layout keeps the board central and all controls in view', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.evaluate(() => (window as never as { __swap: { restart(): void } }).__swap.restart());
  await expect(page.locator('#win')).not.toHaveClass(/show/);
  await page.waitForTimeout(400);
  const boardRect = await page.locator('#board').boundingBox();
  const shelfRect = await page.locator('#shelf').boundingBox();
  expect(boardRect).not.toBeNull();
  expect(shelfRect).not.toBeNull();
  expect(boardRect!.width).toBeGreaterThan(400);
  expect(boardRect!.x + boardRect!.width / 2).toBeCloseTo(640, 0);
  expect(shelfRect!.y).toBeGreaterThan(boardRect!.y + boardRect!.height);
  await page.screenshot({ path: 'artifacts/neural-socket-initial-desktop-final.png' });
});
