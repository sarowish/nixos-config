import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test, { after } from "node:test"

const source = new URL("../widgets/overlays.ts", import.meta.url).href
const cleanups = []
globalThis.overlayCleanups = cleanups
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === source && specifier === "ags")
      return {
        url: "data:text/javascript,export const onCleanup = fn => globalThis.overlayCleanups.push(fn)",
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
  },
})
const { registerOverlay } = await import(source)
after(() => {
  for (const cleanup of cleanups) cleanup()
  hooks.deregister()
  delete globalThis.overlayCleanups
})

test("nested wallpaper controls retain their parent while dismissing unrelated overlays", () => {
  const group = Symbol("wallpaper")
  const dismissed = []
  registerOverlay(() => dismissed.push("wallpaper"), group)
  const openEditor = registerOverlay(() => dismissed.push("editor"), group)
  const openPanel = registerOverlay(() => dismissed.push("panel"))
  openEditor()
  assert.deepEqual(dismissed, ["panel"])
  dismissed.length = 0
  openPanel()
  assert.deepEqual(dismissed, ["wallpaper", "editor"])
})
