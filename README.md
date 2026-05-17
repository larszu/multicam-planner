# 🎥 MultiCam Planner

A fast, focused broadcast camera & lens planning tool for multicam setups. Calculate FOV/DoF, plan camera positions in 2D & 3D, and preview live camera views. Available as a web app and Windows desktop application._

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Philosophy

MultiCam Planner is designed for quick, intuitive camera planning with essential features for real-world broadcast productions. Its streamlined workflow and simple interface make it perfect for fast setups and clear projects—without the complexity and feature overload of traditional CAD or architecture applications.

---

## 🚀 Features

### 📷 Camera & Lens Database
- 54+ broadcast cameras from 10 major brands (Sony, Canon, Panasonic, Blackmagic, ARRI, RED, Grass Valley, Hitachi, Marshall)
- 163+ lenses (Fujinon, Canon, Sony, Sigma, Tamron, Tokina, PTZ integrated)
- 11+ mounts: B4, EF, E, PL, MFT, RF, FZ, L, M12, integrated, universal
- Adapter system: automatic adapter detection with T-stop light loss, sensor crop info, Speed Booster support (e.g., EF→MFT)
- Custom lens support: create and save your own lenses
- Favorites: star cameras and lenses for quick access

### 🗺 2D Venue Planner
- Top-down drag & drop camera placement with real-time FOV cones
- Zoom, pan, snap-to-grid, background floor plan import (image & PDF)
- Two-point calibration tool for scaling imported floor plans
- Draw walls with 45° shift-snapping
- Place stage objects (person, guitarist, drums, keys, mic stand, custom)

### ⚡ 3D Venue View
- Interactive 3D venue visualization with FOV pyramids
- FPS-style controls (WASD + mouse look, Space/Shift up/down, Ctrl sprint)
- Drag cameras in space, visualize stage meshes & venue boundaries
- Background floor plan projection, floor grid with metric labels

### 👀 Camera Preview
- Live viewfinder simulation with accurate perspective
- Ground grid, sky/horizon, stage outlines, reference silhouettes
- Overlays: rule of thirds, safe areas, crosshair, data HUD
- Pan/tilt using mouse drag

### 📐 FOV & DoF Calculator
- 9 sensor sizes (Full Frame, Super 35, APS-C, MFT, 1", 2/3", 1/2", 1/3", 1/2.3")
- Controls for focal length, aperture, distance, extenders
- Outputs: horizontal/vertical/diagonal FOV, image dimensions at distance, 35mm equivalent, DoF near/far/total, hyperfocal distance, person height in frame

### 💾 Project & Layout
- Save/load projects as JSON with version tracking and unsaved changes detection
- Dockable panel system (FlexLayout): drag, split, tab, resize
- Layout modes: Focus (single tab) and Grid (2×2)
- Customizable layout presets (save/load/delete)
- Venue templates: sport, concert, church, conference, custom (save your own)
- Export: Combined 1920px PNG containing 2D plan, 3D view, camera preview, and technical data sheet

### 🖥 Desktop App
- Windows installer (NSIS) and portable build with Electron
- Native window controls, external links open in system browser

---

## 🛠 Tech Stack

| Technology             | Version    |
|------------------------|-----------|
| React                  | 18.3      |
| TypeScript             | 5.7       |
| Vite                   | 6.0       |
| Zustand                | 5.0       |
| React-Konva            | 18.2      |
| Three.js / React Three Fiber | 0.170 / 8.17 |
| Tailwind CSS           | 3.4       |
| FlexLayout-React       | 0.8       |
| Electron               | 41.2      |
| electron-builder       | 25.1      |

---

## 🚦 Getting Started

### Web App

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Desktop App

```bash
# Run in dev mode
npm run desktop

# Build Windows installer & portable
npm run dist:win

# Build macOS DMG + ZIP (x64 + arm64, must run on macOS)
npm run dist:mac
```

A GitHub Actions workflow (`.github/workflows/release-build.yml`) automatically
builds Windows and macOS artifacts whenever a release is published and attaches
the binaries (NSIS installer, portable .exe, DMG, ZIP) directly to the release
page. It can also be triggered manually via the Actions tab for testing.

---

## 📜 Useful Scripts

| Script             | Description                                       |
|--------------------|---------------------------------------------------|
| npm run dev        | Start local Vite dev server                       |
| npm run build      | TypeScript check + production build               |
| npm run desktop    | Launch Electron in dev mode                       |
| npm run dist:win   | Build Windows installer & portable                |
| npm run dist:mac   | Build macOS DMG + ZIP (x64 + arm64, host = macOS) |
| npm run preview    | Preview production build                          |
| npm run lint       | Run ESLint linter                                 |

---

## ❤️ Support / Donate

If MulticamPlanner saves you time on your next show, consider buying me a coffee:

<p>
  <a href="https://paypal.me/larszumpe">
    <img src="https://img.shields.io/badge/PayPal-larszumpe-00457C?logo=paypal&logoColor=white" alt="Donate via PayPal" />
  </a>
</p>

Donations are completely optional — the app stays MIT-licensed and free either way. 🙌

---

## 📝 License

MIT — see [LICENSE](LICENSE)

---

> **Feedback, issues, feature requests, and contributions are welcome!**  
> Demo & contact: [larszu.github.io](https://larszu.github.io)
