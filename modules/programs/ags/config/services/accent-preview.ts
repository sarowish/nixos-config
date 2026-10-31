import { Gdk, Gtk } from "ags/gtk4"

export function createAccentPreview(initialCss: string) {
  let baseCss = initialCss
  let color: string | null = null
  const display = Gdk.Display.get_default()!
  const provider = new Gtk.CssProvider()
  let attached = false

  function update() {
    if (color) {
      // Keep the original declarations and their references in the same provider.
      provider.load_from_string(`${baseCss}\n@define-color accent ${color};`)
      if (!attached) {
        Gtk.StyleContext.add_provider_for_display(
          display,
          provider,
          Gtk.STYLE_PROVIDER_PRIORITY_USER + 1,
        )
        attached = true
      }
    } else if (attached) {
      Gtk.StyleContext.remove_provider_for_display(display, provider)
      attached = false
    }
  }

  return {
    colors() {
      const colors = { accent: "#fb817a", background: "#1e1e2e", foreground: "#d9e0ee" }
      for (const match of baseCss.matchAll(
        /@define-color\s+(accent|background|foreground)\s+(#[\da-f]{6})\s*;/gi,
      ))
        colors[match[1] as keyof typeof colors] = match[2]
      return colors
    },
    set(next: string | null) {
      if (next !== null && !/^#[\da-f]{6}$/i.test(next)) throw new Error("Invalid preview accent")
      color = next
      update()
    },
    reload(css: string) {
      baseCss = css
      update()
    },
  }
}
