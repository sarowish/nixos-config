import { onCleanup } from "ags"

const dismissers = new Map<() => void, symbol>()

// A single interactive overlay owns keyboard focus, including across monitors.
export function registerOverlay(dismiss: () => void, group = Symbol()) {
  dismissers.set(dismiss, group)
  onCleanup(() => dismissers.delete(dismiss))
  return () => {
    for (const [other, otherGroup] of dismissers) if (otherGroup !== group) other()
  }
}
