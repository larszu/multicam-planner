# 🎥 MultiCam Planner

Broadcast camera & lens planning tool for multicam setups. Calculate FOV/DoF, plan camera positions in 2D and 3D venue views, and preview camera shots in real time. Available as web app and Windows desktop application.

![License](https://img.shields.io/badge/license-MIT-blue) ![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Windows-lightgrey)

## Features

### Camera & Lens Database
- **54 broadcast cameras** from 10 brands — Sony (HDC, VENICE, FX, FR7, BRC), Canon (C-series, CR-N), Panasonic (AK-UC, VariCam, AW-UE), Blackmagic (URSA, Pocket, Studio, Micro), ARRI (ALEXA Mini LF, ALEXA 35), RED (V-RAPTOR, KOMODO-X), Grass Valley (LDX), Hitachi (SK/UHD), Marshall (POV)
- **163 lenses** — Fujinon B4/PL (UA, HA, XA, ZA, Box, ZK), Canon B4/EF/PL (CJ, HJ, CN, Cinema Servo), Sony E-mount, Sigma Art/Cine, Tamron, Tokina, PTZ integrated
- **11 mount types** — B4, EF, E, PL, MFT, RF, FZ, L, M12, integrated, universal
- **Adapter system** — automatic adapter detection with T-stop light loss, sensor crop info, Speed Booster support (EF→MFT)
- **Custom lenses** — create and save your own lens definitions
- **Favorites** — star cameras and lenses for quick access

### 2D Venue Planner
- Top-down drag & drop camera placement with real-time FOV cones
- Zoom & pan, snap grid, background floor plan import (image + PDF)
- 2-point calibration tool for scaling imported floor plans
- Wall drawing with 45° shift-snapping
- Stage objects — person, guitarist, drums, keys, mic stand, custom

### 3D Venue View
- Interactive 3D visualization with FOV pyramids
- FPS-style controls (WASD + mouse look, Space/Shift for up/down, Ctrl sprint)
- Draggable cameras on ground plane, stage meshes, venue boundary wireframes
- Background floor plan projected on ground, floor grid with metre labels

### Camera Preview
- Live viewfinder simulation with perspective projection
- Ground grid, sky/horizon, stage outlines, reference person/object silhouettes
- Overlays: rule of thirds, safe areas, crosshair, data HUD
- Pan/tilt via mouse drag

### FOV & DoF Calculator
- 9 sensor sizes (Full Frame, Super 35, APS-C, MFT, 1", 2/3", 1/2", 1/3", 1/2.3")
- Focal length, aperture, distance, extender controls
- Outputs: FOV H/V/diagonal, image dimensions at distance, 35mm equivalent, DoF near/far/total, hyperfocal distance, person height in frame

### Project & Layout
- Save/load projects as JSON with version tracking and unsaved-changes detection
- Dockable panel system (FlexLayout) — drag, split, tab, resize
- Layout modes: Focus (single tab) and Grid (2×2)
- Custom layout presets with save/load/delete
- Venue templates — sport, concert, church, conference, custom (save your own)

### Export
- Combined 1920px PNG with 2D plan, 3D view, camera preview, and full technical data sheet

### Desktop App
- Windows installer (NSIS) and portable build via Electron
- Native window controls, external links open in system browser

## Tech Stack

| Technology | Version |
|---|---|
| React | 18.3 |
| TypeScript | 5.7 |
| Vite | 6.0 |
| Zustand | 5.0 |
| React-Konva | 18.2 |
| Three.js / React Three Fiber | 0.170 / 8.17 |
| Tailwind CSS | 3.4 |
| FlexLayout-React | 0.8 |
| Electron | 41.2 |
| electron-builder | 25.1 |

## Getting Started

### Web App
```bash
npm install
npm run dev
```
Open http://localhost:5173

### Desktop App
```bash
# Run in dev mode
npm run desktop

# Build Windows installer + portable
npm run dist:win
```

### All Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run desktop` | Launch Electron dev mode |
| `npm run dist:win` | Build Windows installer + portable |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

MIT
