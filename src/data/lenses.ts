import type { Lens } from '../types';

export const LENSES: Lens[] = [
  // ══════════════════════════════════════════════
  //  B4 BROADCAST ZOOM LENSES (2/3" mount)
  // ══════════════════════════════════════════════

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – UA Series (4K UHD Premier)    │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-ua107x8.4', manufacturer: 'Fujinon', model: 'UA107x8.4BESM', focalLengthMin: 8.4, focalLengthMax: 900, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens 107x, 4K Premier' },
  { id: 'fuj-ua80x9', manufacturer: 'Fujinon', model: 'UA80x9BESM', focalLengthMin: 9, focalLengthMax: 720, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens 80x' },
  { id: 'fuj-ua46x9.5', manufacturer: 'Fujinon', model: 'UA46x9.5BERD', focalLengthMin: 9.5, focalLengthMax: 437, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens 46x' },
  { id: 'fuj-ua27x6.5', manufacturer: 'Fujinon', model: 'UA27x6.5BERD', focalLengthMin: 6.5, focalLengthMax: 176, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier handheld 27x' },
  { id: 'fuj-ua24x7.8', manufacturer: 'Fujinon', model: 'UA24x7.8BERD', focalLengthMin: 7.8, focalLengthMax: 187, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier handheld 24x' },
  { id: 'fuj-ua22x8', manufacturer: 'Fujinon', model: 'UA22x8BERD', focalLengthMin: 8, focalLengthMax: 176, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier handheld 22x' },
  { id: 'fuj-ua18x7.6', manufacturer: 'Fujinon', model: 'UA18x7.6BERD', focalLengthMin: 7.6, focalLengthMax: 137, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier handheld 18x' },
  { id: 'fuj-ua18x5.6', manufacturer: 'Fujinon', model: 'UA18x5.6BERD', focalLengthMin: 5.6, focalLengthMax: 101, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier wide-angle 18x' },
  { id: 'fuj-ua14x4.5', manufacturer: 'Fujinon', model: 'UA14x4.5BERD', focalLengthMin: 4.5, focalLengthMax: 63, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier ultra-wide 14x' },
  { id: 'fuj-ua13x4.5', manufacturer: 'Fujinon', model: 'UA13x4.5BERD', focalLengthMin: 4.5, focalLengthMax: 59, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premier ultra-wide 13x' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – HA Series (HD Premier)        │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-ha42x13.5', manufacturer: 'Fujinon', model: 'HA42x13.5BERD', focalLengthMin: 13.5, focalLengthMax: 567, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Super telephoto 42x' },
  { id: 'fuj-ha42x9.7', manufacturer: 'Fujinon', model: 'HA42x9.7BERD', focalLengthMin: 9.7, focalLengthMax: 407, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Telephoto 42x' },
  { id: 'fuj-ha25x16.5', manufacturer: 'Fujinon', model: 'HA25x16.5BERD', focalLengthMin: 16.5, focalLengthMax: 413, maxApertureWide: 2.0, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Telephoto handheld' },
  { id: 'fuj-ha23x7.6', manufacturer: 'Fujinon', model: 'HA23x7.6BERD', focalLengthMin: 7.6, focalLengthMax: 175, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha22x7.3', manufacturer: 'Fujinon', model: 'HA22x7.3BERD', focalLengthMin: 7.3, focalLengthMax: 161, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha18x7.6', manufacturer: 'Fujinon', model: 'HA18x7.6BERM', focalLengthMin: 7.6, focalLengthMax: 137, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha16x6.3', manufacturer: 'Fujinon', model: 'HA16x6.3BERM', focalLengthMin: 6.3, focalLengthMax: 101, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Wide 16x' },
  { id: 'fuj-ha14x4.5', manufacturer: 'Fujinon', model: 'HA14x4.5BERD', focalLengthMin: 4.5, focalLengthMax: 63, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Ultra wide angle' },
  { id: 'fuj-ha13x4.5', manufacturer: 'Fujinon', model: 'HA13x4.5BERM', focalLengthMin: 4.5, focalLengthMax: 59, maxApertureWide: 2.0, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Ultra wide' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – XA Series (HD Standard)       │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-xa20sx8.5', manufacturer: 'Fujinon', model: 'XA20sx8.5BRM', focalLengthMin: 8.5, focalLengthMax: 170, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-xa17x7.6', manufacturer: 'Fujinon', model: 'XA17x7.6BRM', focalLengthMin: 7.6, focalLengthMax: 129, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-xa16x8a', manufacturer: 'Fujinon', model: 'XA16x8A', focalLengthMin: 8, focalLengthMax: 128, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD standard 16x' },
  { id: 'fuj-xs17x5.5', manufacturer: 'Fujinon', model: 'XS17x5.5BRM', focalLengthMin: 5.5, focalLengthMax: 94, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Wide 17x' },
  { id: 'fuj-xs13x3.3', manufacturer: 'Fujinon', model: 'XS13x3.3BRM', focalLengthMin: 3.3, focalLengthMax: 43, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Super wide 13x' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – ZA Series (HD Economy/Std)    │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-za12x4.5', manufacturer: 'Fujinon', model: 'ZA12x4.5BERM', focalLengthMin: 4.5, focalLengthMax: 54, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD economy wide 12x' },
  { id: 'fuj-za17x7.6', manufacturer: 'Fujinon', model: 'ZA17x7.6BERM', focalLengthMin: 7.6, focalLengthMax: 129, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD economy standard 17x' },
  { id: 'fuj-za17x7.6rd', manufacturer: 'Fujinon', model: 'ZA17x7.6BERD', focalLengthMin: 7.6, focalLengthMax: 129, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD economy 17x, digital servo' },
  { id: 'fuj-za22x7.6rm', manufacturer: 'Fujinon', model: 'ZA22x7.6BERM', focalLengthMin: 7.6, focalLengthMax: 167, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD economy 22x' },
  { id: 'fuj-za22x7.6rd', manufacturer: 'Fujinon', model: 'ZA22x7.6BERD', focalLengthMin: 7.6, focalLengthMax: 167, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD economy 22x, digital servo' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – Box Lenses (XA/HA/UA)         │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-xa101x8.9', manufacturer: 'Fujinon', model: 'XA101x8.9BESM', focalLengthMin: 8.9, focalLengthMax: 899, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD box lens 101x' },
  { id: 'fuj-ha87x9.3', manufacturer: 'Fujinon', model: 'HA87x9.3BESM', focalLengthMin: 9.3, focalLengthMax: 810, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD box 87x' },
  { id: 'fuj-ha66x9.5', manufacturer: 'Fujinon', model: 'HA66x9.5BESM', focalLengthMin: 9.5, focalLengthMax: 627, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD box 66x' },
  { id: 'fuj-ha55x9.5', manufacturer: 'Fujinon', model: 'HA55x9.5BESM', focalLengthMin: 9.5, focalLengthMax: 523, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD box 55x' },

  // ┌─────────────────────────────────────────────┐
  // │  CANON B4 – CJ Series (4K UHD)              │
  // └─────────────────────────────────────────────┘
  { id: 'can-cj45ex9.7b', manufacturer: 'Canon', model: 'CJ45ex9.7B', focalLengthMin: 9.7, focalLengthMax: 436, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K field box 45x' },
  { id: 'can-cj27ex7.3b', manufacturer: 'Canon', model: 'CJ27ex7.3B', focalLengthMin: 7.3, focalLengthMax: 197, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K handheld 27x' },
  { id: 'can-cj25ex7.6b', manufacturer: 'Canon', model: 'CJ25ex7.6B', focalLengthMin: 7.6, focalLengthMax: 190, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K handheld 25x' },
  { id: 'can-cj24ex7.5b', manufacturer: 'Canon', model: 'CJ24ex7.5B', focalLengthMin: 7.5, focalLengthMax: 180, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K handheld 24x' },
  { id: 'can-cj20ex7.8b', manufacturer: 'Canon', model: 'CJ20ex7.8B', focalLengthMin: 7.8, focalLengthMax: 156, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K handheld 20x' },
  { id: 'can-cj18ex28b', manufacturer: 'Canon', model: 'CJ18ex28B', focalLengthMin: 28, focalLengthMax: 500, maxApertureWide: 2.0, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K telephoto 18x' },
  { id: 'can-cj17ex6.2b', manufacturer: 'Canon', model: 'CJ17ex6.2B', focalLengthMin: 6.2, focalLengthMax: 105, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K wide 17x' },
  { id: 'can-cj15ex4.3b', manufacturer: 'Canon', model: 'CJ15ex4.3B', focalLengthMin: 4.3, focalLengthMax: 64.5, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K wide 15x' },
  { id: 'can-cj14ex4.3b', manufacturer: 'Canon', model: 'CJ14ex4.3B', focalLengthMin: 4.3, focalLengthMax: 60, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K ultra-wide 14x' },
  { id: 'can-cj12ex4.3b', manufacturer: 'Canon', model: 'CJ12ex4.3B', focalLengthMin: 4.3, focalLengthMax: 51.6, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K ultra-wide 12x' },

  // ┌─────────────────────────────────────────────┐
  // │  CANON B4 – HJ Series (HD)                  │
  // └─────────────────────────────────────────────┘
  { id: 'can-hj40x14b', manufacturer: 'Canon', model: 'HJ40x14B', focalLengthMin: 14, focalLengthMax: 560, maxApertureWide: 2.0, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD telephoto 40x' },
  { id: 'can-hj40x10b', manufacturer: 'Canon', model: 'HJ40x10B', focalLengthMin: 10, focalLengthMax: 400, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD telephoto 40x' },
  { id: 'can-hj24ex7.5b', manufacturer: 'Canon', model: 'HJ24ex7.5B', focalLengthMin: 7.5, focalLengthMax: 180, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD handheld 24x' },
  { id: 'can-hj22ex7.6b', manufacturer: 'Canon', model: 'HJ22ex7.6B', focalLengthMin: 7.6, focalLengthMax: 167, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'can-hj17ex7.6b', manufacturer: 'Canon', model: 'HJ17ex7.6B', focalLengthMin: 7.6, focalLengthMax: 129, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD standard 17x' },
  { id: 'can-hj17ex6.2b', manufacturer: 'Canon', model: 'HJ17ex6.2B', focalLengthMin: 6.2, focalLengthMax: 105, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD wide 17x' },
  { id: 'can-hj14ex4.3b', manufacturer: 'Canon', model: 'HJ14ex4.3B', focalLengthMin: 4.3, focalLengthMax: 60, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD wide 14x' },
  { id: 'can-hj11ex4.7b', manufacturer: 'Canon', model: 'HJ11ex4.7B', focalLengthMin: 4.7, focalLengthMax: 52, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD ultra-wide 11x' },

  // ┌─────────────────────────────────────────────┐
  // │  CANON B4 – Box Lenses (HJ/CJ)              │
  // └─────────────────────────────────────────────┘
  { id: 'can-uj90x9b', manufacturer: 'Canon', model: 'UJ90x9B', focalLengthMin: 9, focalLengthMax: 810, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K field box 90x' },
  { id: 'can-uj86x9.3b', manufacturer: 'Canon', model: 'UJ86x9.3B', focalLengthMin: 9.3, focalLengthMax: 800, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K box 86x' },
  { id: 'can-hj100x5.5b', manufacturer: 'Canon', model: 'HJ100x5.5B', focalLengthMin: 5.5, focalLengthMax: 550, maxApertureWide: 2.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD super-wide box 100x' },
  { id: 'can-hj100x6.2b', manufacturer: 'Canon', model: 'HJ100x6.2B', focalLengthMin: 6.2, focalLengthMax: 620, maxApertureWide: 2.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD box 100x' },
  { id: 'can-hj66x20b', manufacturer: 'Canon', model: 'HJ66x20B', focalLengthMin: 20, focalLengthMax: 1320, maxApertureWide: 2.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'HD super-telephoto box' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON B4 – Legacy HD Series              │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-th17x5b', manufacturer: 'Fujinon', model: 'TH17x5BRMU', focalLengthMin: 5, focalLengthMax: 85, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Legacy HD wide 17x' },
  { id: 'fuj-a22x7.8', manufacturer: 'Fujinon', model: 'A22x7.8BERM', focalLengthMin: 7.8, focalLengthMax: 172, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Legacy HD 22x' },
  { id: 'fuj-a36x10.5', manufacturer: 'Fujinon', model: 'A36x10.5BERD', focalLengthMin: 10.5, focalLengthMax: 378, maxApertureWide: 2.0, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Legacy box 36x' },

  // ══════════════════════════════════════════════
  //  CINEMA / E-MOUNT ZOOMS
  // ══════════════════════════════════════════════

  { id: 'sony-28-135', manufacturer: 'Sony', model: 'FE PZ 28-135mm f/4 G OSS', focalLengthMin: 28, focalLengthMax: 135, maxApertureWide: 4, mount: 'E', type: 'zoom' },
  { id: 'sony-16-35gm', manufacturer: 'Sony', model: 'FE 16-35mm f/2.8 GM II', focalLengthMin: 16, focalLengthMax: 35, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-24-70gm', manufacturer: 'Sony', model: 'FE 24-70mm f/2.8 GM II', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-70-200gm', manufacturer: 'Sony', model: 'FE 70-200mm f/2.8 GM II', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-200-600', manufacturer: 'Sony', model: 'FE 200-600mm f/5.6-6.3 G', focalLengthMin: 200, focalLengthMax: 600, maxApertureWide: 5.6, maxApertureTele: 6.3, mount: 'E', type: 'zoom' },

  // ── Sony E-mount – Standard Photo/Video Zooms ──
  { id: 'sony-fe-pz-16-35-f4g', manufacturer: 'Sony', model: 'FE PZ 16-35mm f/4 G', focalLengthMin: 16, focalLengthMax: 35, maxApertureWide: 4, mount: 'E', type: 'zoom', notes: 'Power zoom, compact' },
  { id: 'sony-fe-12-24gm', manufacturer: 'Sony', model: 'FE 12-24mm f/2.8 GM', focalLengthMin: 12, focalLengthMax: 24, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-fe-24-105g', manufacturer: 'Sony', model: 'FE 24-105mm f/4 G OSS', focalLengthMin: 24, focalLengthMax: 105, maxApertureWide: 4, mount: 'E', type: 'zoom' },
  { id: 'sony-fe-100-400gm', manufacturer: 'Sony', model: 'FE 100-400mm f/4.5-5.6 GM', focalLengthMin: 100, focalLengthMax: 400, maxApertureWide: 4.5, maxApertureTele: 5.6, mount: 'E', type: 'zoom' },
  { id: 'sony-fe-pz-10-20g', manufacturer: 'Sony', model: 'FE PZ 10-20mm f/4 G', focalLengthMin: 10, focalLengthMax: 20, maxApertureWide: 4, mount: 'E', type: 'zoom', notes: 'Ultra-wide power zoom' },

  // ── Sony E-mount – Primes ──
  { id: 'sony-fe-14gm', manufacturer: 'Sony', model: 'FE 14mm f/1.8 GM', focalLengthMin: 14, focalLengthMax: 14, maxApertureWide: 1.8, mount: 'E', type: 'prime' },
  { id: 'sony-fe-20g', manufacturer: 'Sony', model: 'FE 20mm f/1.8 G', focalLengthMin: 20, focalLengthMax: 20, maxApertureWide: 1.8, mount: 'E', type: 'prime' },
  { id: 'sony-fe-24gm', manufacturer: 'Sony', model: 'FE 24mm f/1.4 GM', focalLengthMin: 24, focalLengthMax: 24, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sony-fe-35gm', manufacturer: 'Sony', model: 'FE 35mm f/1.4 GM', focalLengthMin: 35, focalLengthMax: 35, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sony-fe-50gm', manufacturer: 'Sony', model: 'FE 50mm f/1.2 GM', focalLengthMin: 50, focalLengthMax: 50, maxApertureWide: 1.2, mount: 'E', type: 'prime' },
  { id: 'sony-fe-85gm', manufacturer: 'Sony', model: 'FE 85mm f/1.4 GM', focalLengthMin: 85, focalLengthMax: 85, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sony-fe-135gm', manufacturer: 'Sony', model: 'FE 135mm f/1.8 GM', focalLengthMin: 135, focalLengthMax: 135, maxApertureWide: 1.8, mount: 'E', type: 'prime' },

  // ── Sigma E-mount (Art / Contemporary) ──
  { id: 'sigma-16-28-e', manufacturer: 'Sigma', model: '16-28mm f/2.8 DG DN C', focalLengthMin: 16, focalLengthMax: 28, maxApertureWide: 2.8, mount: 'E', type: 'zoom', notes: 'Contemporary' },
  { id: 'sigma-18-50-e', manufacturer: 'Sigma', model: '18-50mm f/2.8 DC DN C', focalLengthMin: 18, focalLengthMax: 50, maxApertureWide: 2.8, mount: 'E', imageCircle: 'APSC', type: 'zoom', notes: 'Contemporary, APS-C' },
  { id: 'sigma-24-70-e', manufacturer: 'Sigma', model: '24-70mm f/2.8 DG DN Art', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sigma-28-70-e', manufacturer: 'Sigma', model: '28-70mm f/2.8 DG DN C', focalLengthMin: 28, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'E', type: 'zoom', notes: 'Contemporary' },
  { id: 'sigma-70-200-e', manufacturer: 'Sigma', model: '70-200mm f/2.8 DG DN OS Sport', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sigma-100-400-e', manufacturer: 'Sigma', model: '100-400mm f/5-6.3 DG DN OS C', focalLengthMin: 100, focalLengthMax: 400, maxApertureWide: 5, maxApertureTele: 6.3, mount: 'E', type: 'zoom' },
  { id: 'sigma-14-e', manufacturer: 'Sigma', model: '14mm f/1.4 DG DN Art', focalLengthMin: 14, focalLengthMax: 14, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-20-e', manufacturer: 'Sigma', model: '20mm f/1.4 DG DN Art', focalLengthMin: 20, focalLengthMax: 20, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-24-e', manufacturer: 'Sigma', model: '24mm f/1.4 DG DN Art', focalLengthMin: 24, focalLengthMax: 24, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-35-e', manufacturer: 'Sigma', model: '35mm f/1.4 DG DN Art', focalLengthMin: 35, focalLengthMax: 35, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-50-e', manufacturer: 'Sigma', model: '50mm f/1.4 DG DN Art', focalLengthMin: 50, focalLengthMax: 50, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-85-e', manufacturer: 'Sigma', model: '85mm f/1.4 DG DN Art', focalLengthMin: 85, focalLengthMax: 85, maxApertureWide: 1.4, mount: 'E', type: 'prime' },
  { id: 'sigma-105-e', manufacturer: 'Sigma', model: '105mm f/2.8 DG DN Macro Art', focalLengthMin: 105, focalLengthMax: 105, maxApertureWide: 2.8, mount: 'E', type: 'prime' },

  // ── Tamron E-mount ──
  { id: 'tamron-11-20-e', manufacturer: 'Tamron', model: '11-20mm f/2.8 Di III-A RXD', focalLengthMin: 11, focalLengthMax: 20, maxApertureWide: 2.8, mount: 'E', imageCircle: 'APSC', type: 'zoom', notes: 'APS-C ultra-wide' },
  { id: 'tamron-17-28-e', manufacturer: 'Tamron', model: '17-28mm f/2.8 Di III RXD', focalLengthMin: 17, focalLengthMax: 28, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'tamron-17-70-e', manufacturer: 'Tamron', model: '17-70mm f/2.8 Di III-A VC RXD', focalLengthMin: 17, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'E', imageCircle: 'APSC', type: 'zoom', notes: 'APS-C' },
  { id: 'tamron-28-75-e', manufacturer: 'Tamron', model: '28-75mm f/2.8 Di III VXD G2', focalLengthMin: 28, focalLengthMax: 75, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'tamron-28-200-e', manufacturer: 'Tamron', model: '28-200mm f/2.8-5.6 Di III RXD', focalLengthMin: 28, focalLengthMax: 200, maxApertureWide: 2.8, maxApertureTele: 5.6, mount: 'E', type: 'zoom' },
  { id: 'tamron-35-150-e', manufacturer: 'Tamron', model: '35-150mm f/2-2.8 Di III VXD', focalLengthMin: 35, focalLengthMax: 150, maxApertureWide: 2.0, maxApertureTele: 2.8, mount: 'E', type: 'zoom' },
  { id: 'tamron-50-400-e', manufacturer: 'Tamron', model: '50-400mm f/4.5-6.3 Di III VC VXD', focalLengthMin: 50, focalLengthMax: 400, maxApertureWide: 4.5, maxApertureTele: 6.3, mount: 'E', type: 'zoom' },
  { id: 'tamron-70-180-e', manufacturer: 'Tamron', model: '70-180mm f/2.8 Di III VXD G2', focalLengthMin: 70, focalLengthMax: 180, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'tamron-150-500-e', manufacturer: 'Tamron', model: '150-500mm f/5-6.7 Di III VC VXD', focalLengthMin: 150, focalLengthMax: 500, maxApertureWide: 5, maxApertureTele: 6.7, mount: 'E', type: 'zoom' },

  // ── Canon Cinema EF / Compact Servo ──
  { id: 'can-cn-e18-80', manufacturer: 'Canon', model: 'CN-E 18-80mm T4.4', focalLengthMin: 18, focalLengthMax: 80, maxApertureWide: 4.4, mount: 'EF', imageCircle: 'S35', type: 'zoom', notes: 'Compact servo, S35' },
  { id: 'can-cn-e70-200', manufacturer: 'Canon', model: 'CN-E 70-200mm T4.4', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 4.4, mount: 'EF', imageCircle: 'S35', type: 'zoom', notes: 'Compact servo, S35' },

  // ── Canon EF – Standard Zooms ──
  { id: 'can-ef-16-35-f28l', manufacturer: 'Canon', model: 'EF 16-35mm f/2.8L III USM', focalLengthMin: 16, focalLengthMax: 35, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'can-ef-24-70-f28l', manufacturer: 'Canon', model: 'EF 24-70mm f/2.8L II USM', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'can-ef-24-105-f4l', manufacturer: 'Canon', model: 'EF 24-105mm f/4L IS II USM', focalLengthMin: 24, focalLengthMax: 105, maxApertureWide: 4, mount: 'EF', type: 'zoom' },
  { id: 'can-ef-70-200-f28l', manufacturer: 'Canon', model: 'EF 70-200mm f/2.8L IS III USM', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'can-ef-100-400-f56l', manufacturer: 'Canon', model: 'EF 100-400mm f/4.5-5.6L IS II USM', focalLengthMin: 100, focalLengthMax: 400, maxApertureWide: 4.5, maxApertureTele: 5.6, mount: 'EF', type: 'zoom' },
  { id: 'can-ef-11-24-f4l', manufacturer: 'Canon', model: 'EF 11-24mm f/4L USM', focalLengthMin: 11, focalLengthMax: 24, maxApertureWide: 4, mount: 'EF', type: 'zoom' },

  // ── Canon EF – Primes ──
  { id: 'can-ef-24-f14l', manufacturer: 'Canon', model: 'EF 24mm f/1.4L II USM', focalLengthMin: 24, focalLengthMax: 24, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'can-ef-35-f14l', manufacturer: 'Canon', model: 'EF 35mm f/1.4L II USM', focalLengthMin: 35, focalLengthMax: 35, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'can-ef-50-f12l', manufacturer: 'Canon', model: 'EF 50mm f/1.2L USM', focalLengthMin: 50, focalLengthMax: 50, maxApertureWide: 1.2, mount: 'EF', type: 'prime' },
  { id: 'can-ef-85-f14l', manufacturer: 'Canon', model: 'EF 85mm f/1.4L IS USM', focalLengthMin: 85, focalLengthMax: 85, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'can-ef-135-f2l', manufacturer: 'Canon', model: 'EF 135mm f/2L USM', focalLengthMin: 135, focalLengthMax: 135, maxApertureWide: 2, mount: 'EF', type: 'prime' },

  // ── Sigma EF-mount (Art / Classic) ──
  { id: 'sigma-18-35-art-ef', manufacturer: 'Sigma', model: 'Art 18-35mm f/1.8 DC HSM', focalLengthMin: 18, focalLengthMax: 35, maxApertureWide: 1.8, mount: 'EF', imageCircle: 'APSC', type: 'zoom', notes: 'APS-C' },
  { id: 'sigma-50-100-art-ef', manufacturer: 'Sigma', model: 'Art 50-100mm f/1.8 DC HSM', focalLengthMin: 50, focalLengthMax: 100, maxApertureWide: 1.8, mount: 'EF', imageCircle: 'APSC', type: 'zoom', notes: 'APS-C' },
  { id: 'sigma-24-35-art-ef', manufacturer: 'Sigma', model: 'Art 24-35mm f/2 DG HSM', focalLengthMin: 24, focalLengthMax: 35, maxApertureWide: 2, mount: 'EF', type: 'zoom' },
  { id: 'sigma-24-70-art-ef', manufacturer: 'Sigma', model: 'Art 24-70mm f/2.8 DG OS HSM', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'sigma-14-ef', manufacturer: 'Sigma', model: 'Art 14mm f/1.8 DG HSM', focalLengthMin: 14, focalLengthMax: 14, maxApertureWide: 1.8, mount: 'EF', type: 'prime' },
  { id: 'sigma-20-ef', manufacturer: 'Sigma', model: 'Art 20mm f/1.4 DG HSM', focalLengthMin: 20, focalLengthMax: 20, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'sigma-24-ef', manufacturer: 'Sigma', model: 'Art 24mm f/1.4 DG HSM', focalLengthMin: 24, focalLengthMax: 24, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'sigma-35-ef', manufacturer: 'Sigma', model: 'Art 35mm f/1.4 DG HSM', focalLengthMin: 35, focalLengthMax: 35, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'sigma-50-ef', manufacturer: 'Sigma', model: 'Art 50mm f/1.4 DG HSM', focalLengthMin: 50, focalLengthMax: 50, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'sigma-85-ef', manufacturer: 'Sigma', model: 'Art 85mm f/1.4 DG HSM', focalLengthMin: 85, focalLengthMax: 85, maxApertureWide: 1.4, mount: 'EF', type: 'prime' },
  { id: 'sigma-135-ef', manufacturer: 'Sigma', model: 'Art 135mm f/1.8 DG HSM', focalLengthMin: 135, focalLengthMax: 135, maxApertureWide: 1.8, mount: 'EF', type: 'prime' },

  // ── Tamron EF-mount ──
  { id: 'tamron-15-30-ef', manufacturer: 'Tamron', model: 'SP 15-30mm f/2.8 Di VC USD G2', focalLengthMin: 15, focalLengthMax: 30, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'tamron-24-70-ef', manufacturer: 'Tamron', model: 'SP 24-70mm f/2.8 Di VC USD G2', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'tamron-70-200-ef', manufacturer: 'Tamron', model: 'SP 70-200mm f/2.8 Di VC USD G2', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 2.8, mount: 'EF', type: 'zoom' },
  { id: 'tamron-100-400-ef', manufacturer: 'Tamron', model: '100-400mm f/4.5-6.3 Di VC USD', focalLengthMin: 100, focalLengthMax: 400, maxApertureWide: 4.5, maxApertureTele: 6.3, mount: 'EF', type: 'zoom' },

  // ── Tokina EF-mount ──
  { id: 'tokina-11-20-ef', manufacturer: 'Tokina', model: 'ATX-i 11-20mm f/2.8 CF', focalLengthMin: 11, focalLengthMax: 20, maxApertureWide: 2.8, mount: 'EF', imageCircle: 'APSC', type: 'zoom', notes: 'APS-C ultra-wide, compact front' },

  // ┌─────────────────────────────────────────────┐
  // │  CANON CN7 / CN10 / CN20 – PL Servo Zooms   │
  // └─────────────────────────────────────────────┘
  { id: 'can-cn7x17', manufacturer: 'Canon', model: 'CN7x17 KAS S / E1 (17-120mm T2.95)', focalLengthMin: 17, focalLengthMax: 120, maxApertureWide: 2.95, mount: 'PL', type: 'zoom', notes: 'Cine-Servo, S35 PL, also EF version' },
  { id: 'can-cn10x25', manufacturer: 'Canon', model: 'CN10x25 IAS S / E1 (25-250mm T2.95-3.95)', focalLengthMin: 25, focalLengthMax: 250, maxApertureWide: 2.95, maxApertureTele: 3.95, mount: 'PL', type: 'zoom', notes: 'Cine-Servo telephoto, S35 PL' },
  { id: 'can-cn20x50', manufacturer: 'Canon', model: 'CN20x50 IAS H / E1 (50-1000mm T5.0-8.9)', focalLengthMin: 50, focalLengthMax: 1000, maxApertureWide: 5.0, maxApertureTele: 8.9, mount: 'PL', extenderFactors: [1.5], type: 'zoom', notes: 'Cine-Servo super-telephoto, S35, 1.5x built-in' },
  { id: 'can-cn-e15.5-47', manufacturer: 'Canon', model: 'CN-E 15.5-47mm T2.8 L S/SP', focalLengthMin: 15.5, focalLengthMax: 47, maxApertureWide: 2.8, mount: 'PL', type: 'zoom', notes: 'Cinema zoom, S35' },
  { id: 'can-cn-e30-105', manufacturer: 'Canon', model: 'CN-E 30-105mm T2.8 L S/SP', focalLengthMin: 30, focalLengthMax: 105, maxApertureWide: 2.8, mount: 'PL', type: 'zoom', notes: 'Cinema zoom, S35' },
  { id: 'can-cn-e14.5-60', manufacturer: 'Canon', model: 'CN-E 14.5-60mm T2.6 L S/SP', focalLengthMin: 14.5, focalLengthMax: 60, maxApertureWide: 2.6, mount: 'PL', type: 'zoom', notes: 'Cinema zoom compact, S35' },
  { id: 'can-cn-e30-300', manufacturer: 'Canon', model: 'CN-E 30-300mm T2.95-3.7 L S/SP', focalLengthMin: 30, focalLengthMax: 300, maxApertureWide: 2.95, maxApertureTele: 3.7, mount: 'PL', type: 'zoom', notes: 'Cinema long zoom, S35' },

  // ┌─────────────────────────────────────────────┐
  // │  FUJINON ZK Series – PL Servo/Cine Zooms    │
  // └─────────────────────────────────────────────┘
  { id: 'fuj-zk2.5x14', manufacturer: 'Fujinon', model: 'ZK2.5x14 (14-35mm T2.9)', focalLengthMin: 14, focalLengthMax: 35, maxApertureWide: 2.9, mount: 'PL', type: 'zoom', notes: 'Cabrio wide, S35' },
  { id: 'fuj-zk3.5x85', manufacturer: 'Fujinon', model: 'ZK3.5x85 (85-300mm T2.9)', focalLengthMin: 85, focalLengthMax: 300, maxApertureWide: 2.9, mount: 'PL', type: 'zoom', notes: 'Cabrio telephoto, S35' },
  { id: 'fuj-zk4.7x19', manufacturer: 'Fujinon', model: 'ZK4.7x19 (19-90mm T2.9)', focalLengthMin: 19, focalLengthMax: 90, maxApertureWide: 2.9, mount: 'PL', type: 'zoom', notes: 'Cabrio standard, S35' },
  { id: 'fuj-zk12x25', manufacturer: 'Fujinon', model: 'ZK12x25 (25-300mm T3.5-3.85)', focalLengthMin: 25, focalLengthMax: 300, maxApertureWide: 3.5, maxApertureTele: 3.85, mount: 'PL', type: 'zoom', notes: 'Cabrio long zoom, S35' },
  { id: 'fuj-zk25-300', manufacturer: 'Fujinon', model: 'ZK25-300mm Premier (T3.5-3.85)', focalLengthMin: 25, focalLengthMax: 300, maxApertureWide: 3.5, maxApertureTele: 3.85, mount: 'PL', type: 'zoom', notes: 'Cabrio Premier, detachable servo' },
  { id: 'fuj-premista-19-45', manufacturer: 'Fujinon', model: 'Premista 19-45mm T2.9', focalLengthMin: 19, focalLengthMax: 45, maxApertureWide: 2.9, mount: 'PL', type: 'zoom', notes: 'Large-format PL zoom' },
  { id: 'fuj-premista-28-100', manufacturer: 'Fujinon', model: 'Premista 28-100mm T2.9', focalLengthMin: 28, focalLengthMax: 100, maxApertureWide: 2.9, mount: 'PL', type: 'zoom', notes: 'Large-format PL zoom' },
  { id: 'fuj-premista-80-250', manufacturer: 'Fujinon', model: 'Premista 80-250mm T2.9-3.5', focalLengthMin: 80, focalLengthMax: 250, maxApertureWide: 2.9, maxApertureTele: 3.5, mount: 'PL', type: 'zoom', notes: 'Large-format PL tele zoom' },

  // ── Sigma Cine ──
  { id: 'sigma-18-35-cine', manufacturer: 'Sigma', model: 'Cine 18-35mm T2.0', focalLengthMin: 18, focalLengthMax: 35, maxApertureWide: 2.0, mount: 'EF', type: 'zoom' },
  { id: 'sigma-50-100-cine', manufacturer: 'Sigma', model: 'Cine 50-100mm T2.0', focalLengthMin: 50, focalLengthMax: 100, maxApertureWide: 2.0, mount: 'EF', type: 'zoom' },

  // ══════════════════════════════════════════════
  //  MFT LENSES (Blackmagic / Olympus / Panasonic)
  // ══════════════════════════════════════════════
  { id: 'oly-12-100', manufacturer: 'Olympus', model: 'M.Zuiko 12-100mm f/4', focalLengthMin: 12, focalLengthMax: 100, maxApertureWide: 4, mount: 'MFT', type: 'zoom' },
  { id: 'pana-10-25', manufacturer: 'Panasonic', model: 'Leica 10-25mm f/1.7', focalLengthMin: 10, focalLengthMax: 25, maxApertureWide: 1.7, mount: 'MFT', type: 'zoom' },
  { id: 'pana-25-50', manufacturer: 'Panasonic', model: 'Leica 25-50mm f/1.7', focalLengthMin: 25, focalLengthMax: 50, maxApertureWide: 1.7, mount: 'MFT', type: 'zoom' },
  { id: 'oly-7-14-pro', manufacturer: 'Olympus', model: 'M.Zuiko 7-14mm f/2.8 PRO', focalLengthMin: 7, focalLengthMax: 14, maxApertureWide: 2.8, mount: 'MFT', type: 'zoom' },
  { id: 'oly-12-40-pro', manufacturer: 'Olympus', model: 'M.Zuiko 12-40mm f/2.8 PRO II', focalLengthMin: 12, focalLengthMax: 40, maxApertureWide: 2.8, mount: 'MFT', type: 'zoom' },
  { id: 'oly-40-150-pro', manufacturer: 'Olympus', model: 'M.Zuiko 40-150mm f/2.8 PRO', focalLengthMin: 40, focalLengthMax: 150, maxApertureWide: 2.8, mount: 'MFT', type: 'zoom' },
  { id: 'pana-12-35-f28', manufacturer: 'Panasonic', model: 'Lumix 12-35mm f/2.8 II', focalLengthMin: 12, focalLengthMax: 35, maxApertureWide: 2.8, mount: 'MFT', type: 'zoom' },
  { id: 'pana-35-100-f28', manufacturer: 'Panasonic', model: 'Lumix 35-100mm f/2.8 II', focalLengthMin: 35, focalLengthMax: 100, maxApertureWide: 2.8, mount: 'MFT', type: 'zoom' },
  { id: 'sigma-16-mft', manufacturer: 'Sigma', model: '16mm f/1.4 DC DN C (MFT)', focalLengthMin: 16, focalLengthMax: 16, maxApertureWide: 1.4, mount: 'MFT', type: 'prime', notes: 'Contemporary' },
  { id: 'sigma-30-mft', manufacturer: 'Sigma', model: '30mm f/1.4 DC DN C (MFT)', focalLengthMin: 30, focalLengthMax: 30, maxApertureWide: 1.4, mount: 'MFT', type: 'prime', notes: 'Contemporary' },
  { id: 'sigma-56-mft', manufacturer: 'Sigma', model: '56mm f/1.4 DC DN C (MFT)', focalLengthMin: 56, focalLengthMax: 56, maxApertureWide: 1.4, mount: 'MFT', type: 'prime', notes: 'Contemporary' },

  // ══════════════════════════════════════════════
  //  PTZ INTEGRATED LENSES (virtual entries)
  // ══════════════════════════════════════════════
  { id: 'ptz-sony-brc-x400', manufacturer: 'Sony', model: 'BRC-X400 integrated 20x', focalLengthMin: 4.4, focalLengthMax: 88, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-sony-srg-x120', manufacturer: 'Sony', model: 'SRG-X120 integrated 12x', focalLengthMin: 4.4, focalLengthMax: 52.8, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '12x optical zoom' },
  { id: 'ptz-sony-brc-h800', manufacturer: 'Sony', model: 'BRC-H800 integrated 12x', focalLengthMin: 4.5, focalLengthMax: 54, maxApertureWide: 1.6, mount: 'integrated', type: 'integrated', notes: '12x optical zoom, HD PTZ' },
  { id: 'ptz-pana-ue150', manufacturer: 'Panasonic', model: 'AW-UE150 integrated 20x', focalLengthMin: 4.08, focalLengthMax: 81.6, maxApertureWide: 1.6, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-pana-ue40', manufacturer: 'Panasonic', model: 'AW-UE40 integrated 24x', focalLengthMin: 4.3, focalLengthMax: 103.2, maxApertureWide: 1.8, mount: 'integrated', type: 'integrated', notes: '24x optical zoom' },
  { id: 'ptz-canon-crn500', manufacturer: 'Canon', model: 'CR-N500 integrated 15x', focalLengthMin: 8.9, focalLengthMax: 133.5, maxApertureWide: 2.8, mount: 'integrated', type: 'integrated', notes: '15x optical zoom' },
  { id: 'ptz-canon-crn300', manufacturer: 'Canon', model: 'CR-N300 integrated 20x', focalLengthMin: 4.3, focalLengthMax: 86, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-sony-fr7', manufacturer: 'Sony', model: 'FR7 (no integrated lens)', focalLengthMin: 28, focalLengthMax: 135, maxApertureWide: 4, mount: 'E', type: 'zoom', notes: 'Use E-mount lens' },
];

export function getLensById(id: string, customLenses?: Lens[]): Lens | undefined {
  return LENSES.find((l) => l.id === id) ?? customLenses?.find((l) => l.id === id);
}

export function getLensesByMount(mount: string): Lens[] {
  return LENSES.filter((l) => l.mount === mount);
}

/**
 * Returns the set of lenses that can physically attach to the camera given the
 * currently fitted mount plate. The mount is determined as `activeMount` if the
 * user has explicitly selected one, otherwise `cameraMount` (the body's native
 * mount).
 *
 * IMPORTANT: this is strict. We do NOT auto-include lenses for other mounts
 * (e.g. B4 lenses for an FZ-native PMW-F5) just because `adaptedMounts` lists
 * them — those mounts are the *menu of plates the user can switch to*, not
 * lenses mountable simultaneously. Picking a B4 lens on a PMW-F5 requires the
 * user to first switch the Mount selector to "B4 (LA-FZB1)".
 *
 * `universal` and `integrated` lenses are returned unconditionally because they
 * either have no mount (PTZ integrated) or are intentionally cross-mount stubs.
 */
export function getCompatibleLenses(cameraMount: string, _adaptedMounts?: string[], activeMount?: string): Lens[] {
  if (cameraMount === 'integrated') return LENSES.filter((l) => l.mount === 'integrated');
  const target = activeMount ?? cameraMount;
  return LENSES.filter((l) => l.mount === target || l.mount === 'universal' || l.mount === 'integrated');
}

/**
 * Pick a sensible default mount + first matching lens for placing a camera or
 * switching to a different body. Tries the camera's native mount first, then
 * each entry in `adaptedMounts`, until it finds a mount with at least one
 * compatible lens. For a Sony PMW-F5 — which has zero FZ-native lenses in the
 * built-in DB — this falls back to PL (with the passive PL plate fitted) or
 * B4 (with the LA-FZB1) instead of dropping the user into an empty dropdown.
 */
export function pickInitialMountAndLens(
  cameraMount: string,
  adaptedMounts?: string[],
  extraLenses: Lens[] = [],
): { mount: string; lens: Lens | undefined } {
  const candidates = [cameraMount, ...(adaptedMounts ?? [])];
  for (const m of candidates) {
    const builtIn = getCompatibleLenses(cameraMount, adaptedMounts, m)[0];
    const custom = extraLenses.find((l) => l.mount === m || l.mount === 'universal' || l.mount === 'integrated');
    const lens = builtIn ?? custom;
    if (lens) return { mount: m, lens };
  }
  return { mount: cameraMount, lens: undefined };
}
