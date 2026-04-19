# 🎥 MultiCam Planner

Broadcast camera & lens planning tool for multicam setups. Calculate FOV/DoF, plan camera positions in 2D and 3D venue views, and preview camera shots in real time.

## Features

- **40+ broadcast cameras** (Sony HDC, Canon C-series, Panasonic AK-UC, Blackmagic, ARRI, RED, Grass Valley, Hitachi, PTZ cameras)
- **40+ lenses** (Fujinon B4, Canon CJ/HJ, Sony E-mount, Cinema lenses, MFT, PTZ integrated)
- **2D Venue Planner** – drag & drop cameras on a top-down view with FOV cones (React-Konva)
- **3D Venue View** – interactive 3D visualization with FOV pyramids (Three.js / R3F)
- **Camera Preview** – live preview with reference person, safe areas, zoom slider
- **FOV & DoF Calculator** – standalone calculator with all sensor sizes
- **Venue Templates** – presets for concert, church, sport, conference

## Tech Stack

React 18 + TypeScript + Vite + Zustand + React-Konva + React Three Fiber + Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## License

MIT
