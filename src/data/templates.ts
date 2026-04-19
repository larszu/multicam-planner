import type { VenueTemplate } from '../types';

export const TEMPLATES: VenueTemplate[] = [
  {
    id: 'concert-small',
    name: 'Small Concert / Club (20×15m)',
    category: 'concert',
    venue: { name: 'Small Concert', widthM: 20, heightM: 15, stages: [{ id: 'ts-1', x: 7, y: 0.5, width: 6, height: 3, label: 'Stage' }] },
    cameras: [
      { label: 'CAM 1', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha18x7.6', x: 10, y: 12, z: 1.5, pan: -90, tilt: 0, focalLength: 20, aperture: 2.8, focusDistance: 10, color: '#ef4444', extenderActive: 1 },
      { label: 'CAM 2', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 4, y: 10, z: 1.5, pan: -60, tilt: 0, focalLength: 50, aperture: 2.8, focusDistance: 10, color: '#3b82f6', extenderActive: 1 },
      { label: 'CAM 3', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 16, y: 10, z: 1.5, pan: -120, tilt: 0, focalLength: 50, aperture: 2.8, focusDistance: 10, color: '#22c55e', extenderActive: 1 },
    ],
  },
  {
    id: 'concert-large',
    name: 'Large Concert / Arena (60×40m)',
    category: 'concert',
    venue: { name: 'Large Concert', widthM: 60, heightM: 40, stages: [{ id: 'ts-2', x: 15, y: 0, width: 30, height: 8, label: 'Main Stage' }] },
    cameras: [
      { label: 'CAM 1', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua24x7.8', x: 30, y: 30, z: 1.5, pan: -90, tilt: 0, focalLength: 15, aperture: 2.8, focusDistance: 25, color: '#ef4444', extenderActive: 1 },
      { label: 'CAM 2', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua80x9', x: 30, y: 35, z: 2, pan: -90, tilt: 0, focalLength: 100, aperture: 2.8, focusDistance: 30, color: '#3b82f6', extenderActive: 1 },
      { label: 'CAM 3', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 10, y: 20, z: 1.5, pan: -50, tilt: 0, focalLength: 30, aperture: 2.8, focusDistance: 15, color: '#22c55e', extenderActive: 1 },
      { label: 'CAM 4', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 50, y: 20, z: 1.5, pan: -130, tilt: 0, focalLength: 30, aperture: 2.8, focusDistance: 15, color: '#eab308', extenderActive: 1 },
      { label: 'CAM 5', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha14x4.5', x: 25, y: 5, z: 1.2, pan: -90, tilt: 0, focalLength: 5, aperture: 2.8, focusDistance: 3, color: '#a855f7', extenderActive: 1 },
    ],
  },
  {
    id: 'church-standard',
    name: 'Church / Worship (15×25m)',
    category: 'church',
    venue: { name: 'Church', widthM: 15, heightM: 25, stages: [{ id: 'ts-3', x: 3, y: 0.5, width: 9, height: 4, label: 'Altar / Stage' }] },
    cameras: [
      { label: 'CAM 1', cameraId: 'pana-aw-ue150', lensId: 'ptz-pana-ue150', x: 7.5, y: 20, z: 3, pan: -90, tilt: 0, focalLength: 10, aperture: 2.8, focusDistance: 18, color: '#ef4444', extenderActive: 1 },
      { label: 'CAM 2', cameraId: 'pana-aw-ue150', lensId: 'ptz-pana-ue150', x: 3, y: 15, z: 3, pan: -70, tilt: 0, focalLength: 30, aperture: 2.8, focusDistance: 14, color: '#3b82f6', extenderActive: 1 },
      { label: 'CAM 3', cameraId: 'pana-aw-ue150', lensId: 'ptz-pana-ue150', x: 12, y: 15, z: 3, pan: -110, tilt: 0, focalLength: 30, aperture: 2.8, focusDistance: 14, color: '#22c55e', extenderActive: 1 },
    ],
  },
  {
    id: 'football-stadium',
    name: 'Football / Soccer (110×75m)',
    category: 'sport',
    venue: { name: 'Football Stadium', widthM: 110, heightM: 75, stages: [{ id: 'ts-4', x: 5, y: 5, width: 100, height: 65, label: 'Pitch' }] },
    cameras: [
      { label: 'CAM 1', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua80x9', x: 55, y: 75, z: 8, pan: -90, tilt: -5, focalLength: 20, aperture: 2.8, focusDistance: 40, color: '#ef4444', extenderActive: 1 },
      { label: 'CAM 2', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua107x8.4', x: 55, y: 75, z: 8, pan: -90, tilt: -5, focalLength: 200, aperture: 2.8, focusDistance: 50, color: '#3b82f6', extenderActive: 1 },
      { label: 'CAM 3', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 5, y: 75, z: 5, pan: -80, tilt: -3, focalLength: 40, aperture: 2.8, focusDistance: 30, color: '#22c55e', extenderActive: 1 },
      { label: 'CAM 4', cameraId: 'sony-hdc-3500', lensId: 'fuj-ha23x7.6', x: 105, y: 75, z: 5, pan: -100, tilt: -3, focalLength: 40, aperture: 2.8, focusDistance: 30, color: '#eab308', extenderActive: 1 },
      { label: 'CAM 5', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua107x8.4', x: 0, y: 37, z: 3, pan: 0, tilt: 0, focalLength: 300, aperture: 2.8, focusDistance: 50, color: '#a855f7', extenderActive: 1 },
      { label: 'CAM 6', cameraId: 'sony-hdc-3500', lensId: 'fuj-ua107x8.4', x: 110, y: 37, z: 3, pan: 180, tilt: 0, focalLength: 300, aperture: 2.8, focusDistance: 50, color: '#ec4899', extenderActive: 1 },
    ],
  },
  {
    id: 'conference-room',
    name: 'Conference Room (12×10m)',
    category: 'conference',
    venue: { name: 'Conference Room', widthM: 12, heightM: 10, stages: [{ id: 'ts-5', x: 2, y: 0.5, width: 8, height: 2, label: 'Podium' }] },
    cameras: [
      { label: 'CAM 1', cameraId: 'pana-aw-ue40', lensId: 'ptz-pana-ue40', x: 6, y: 9, z: 2.5, pan: -90, tilt: 0, focalLength: 8, aperture: 2.8, focusDistance: 8, color: '#ef4444', extenderActive: 1 },
      { label: 'CAM 2', cameraId: 'pana-aw-ue40', lensId: 'ptz-pana-ue40', x: 2, y: 7, z: 2.5, pan: -60, tilt: 0, focalLength: 20, aperture: 2.8, focusDistance: 7, color: '#3b82f6', extenderActive: 1 },
    ],
  },
];
