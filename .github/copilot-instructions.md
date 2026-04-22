# Copilot / AI agent instructions for multicam-planner

These instructions apply to every AI coding assistant (GitHub Copilot, Claude,
Cursor, etc.) contributing to this repository. They describe **non-negotiable
project-wide rules** that must hold across all code paths, assets and UI.

## 1. Language policy — English is the native UI language

- All **user-visible strings** (labels, tooltips, menus, placeholders, buttons,
  error messages, toasts, empty-state text, etc.) must be written in **English**.
- This applies to 2D and 3D views, sidebars, preview panels, export dialogs and
  all future surfaces.
- Internal identifiers (enum values, IDs, keys) stay English as well.
- Comments and commit messages should also be English.
- Do **not** mix German, French, etc. strings into the UI. If you find existing
  non-English strings while editing a file, translate them in the same change.
- Short technical abbreviations that are identical across languages
  (e.g. `Hz`, `m`, `lx`, `ppm`, `CCT`) are fine.

## 2. Responsive UI — it must resize gracefully

- Every panel, sidebar, preview window and canvas must work on screens from
  ~1280 px wide (laptop) up to 4K.
- Use **flex/grid layouts** with `min-w-0` / `min-h-0` guards so children can
  shrink. Do not assume fixed pixel widths for containers.
- Sidebars must be **scrollable** (`overflow-y-auto`) when their content exceeds
  the viewport. Nested scroll regions must be avoided unless explicitly needed.
- Canvas-based views (Konva, three.js) must react to `ResizeObserver` on their
  wrapper and redraw on resize.
- Avoid hard-coded `width` / `height` inline styles for layout containers;
  prefer `className="w-full h-full"` and let the parent distribute space.
- Overlays (zoom indicators, legends, hints) must stay inside their container
  (`position: absolute` + `position: relative` parent) and never overflow.

## 3. Cross-platform compatibility — macOS and Windows

- The app is packaged for **both** macOS and Windows (Electron). Every change
  must continue to run on both.
- Do **not** use POSIX-only shell commands or Windows-only paths in build
  scripts, Electron main process, or runtime code.
- File paths: always use `path.join` / `path.resolve`. Never hard-code `/` or
  `\\` separators. Never rely on case-insensitive imports.
- Keyboard shortcuts: offer a Cmd-equivalent on macOS (`event.metaKey`) and a
  Ctrl-equivalent on Windows/Linux (`event.ctrlKey`).
- File-system operations must use Node's `fs.promises`, not shell pipes.
- PDF / image export paths must use the Electron `dialog.showSaveDialog` API,
  which handles platform-specific path conventions automatically.
- CI and local dev scripts must work with both PowerShell and bash. Prefer npm
  scripts over inline shell one-liners in `package.json`.

## 4. Stack & conventions

- React 18 + TypeScript + Vite + Tailwind + Zustand.
- 3D: `@react-three/fiber` + `@react-three/drei` + `three`.
- 2D canvas: `react-konva`.
- Electron 41 for desktop shell.
- Theme tokens live in `tailwind.config.js`: `bc-panel`, `bc-border`, `bc-dark`,
  `bc-accent`, `bc-yellow`, `bc-green`, `bc-red`. Use them instead of raw hex.
- State mutations go through Zustand actions defined in `src/store/useStore.ts`.
  Do not `set` store fields directly from components.
- All photometric math lives in `src/utils/lightCalc.ts`. Do not duplicate lux
  formulas in components.

## 5. Quality gates before committing

- `npx tsc --noEmit` must be clean.
- New strings that are user-visible must be English.
- New panels must scroll and resize without breaking the layout at 1280×720.
- Any native-OS integration (file dialogs, menus, shortcuts) must be checked
  for both macOS and Windows paths/modifiers.
