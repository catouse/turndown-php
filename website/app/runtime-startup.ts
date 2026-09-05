export function deferRuntimeStartup(start: () => () => void): () => void {
  const events = ['pointerdown', 'keydown', 'input'] as const;
  let pending = true;
  let idleHandle: number | undefined;
  let timerHandle: number | undefined;
  let dispose: (() => void) | undefined;

  function cancelPending() {
    if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    if (timerHandle !== undefined) window.clearTimeout(timerHandle);
    for (const event of events) window.removeEventListener(event, startNow);
  }

  function startNow() {
    if (!pending) return;
    pending = false;
    cancelPending();
    dispose = start();
  }

  for (const event of events) {
    window.addEventListener(event, startNow, { once: true, passive: true });
  }
  if (typeof window.requestIdleCallback === 'function') {
    idleHandle = window.requestIdleCallback(startNow, { timeout: 1500 });
  } else {
    timerHandle = window.setTimeout(startNow, 500);
  }

  return () => {
    pending = false;
    cancelPending();
    dispose?.();
    dispose = undefined;
  };
}
