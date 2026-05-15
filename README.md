# Atelier Noire — 3D Spiral Gallery Landing Page

A premium dark editorial landing page for a fictional creative studio, featuring a full-screen 3D spiral image gallery built with Three.js, smooth scrolling via Lenis, and scroll-triggered text reveals with GSAP.

## Features

- **3D Spiral Gallery** — 75 curved tiles arranged in a tapering helix, rendered with custom GLSL shaders
- **Smooth Scroll** — Lenis-powered buttery smooth scrolling with ScrollTrigger sync
- **Mouse Parallax** — Desktop-only subtle tilt response to cursor position
- **Scroll-Driven Spin** — Scroll velocity feeds into spiral rotation for a kinetic feel
- **Custom Shaders** — Per-tile edge vignette, depth-based fade, and cinematic desaturation
- **GSAP Reveals** — Scroll-triggered text animations with `once: true` for performance
- **Editorial Design** — Dark palette, Instrument Serif + DM Sans typography, film grain overlay
- **Responsive** — Mobile-friendly with adjusted camera distance and disabled parallax
- **Deferred WebGL** — Canvas initializes via `requestIdleCallback` so hero text hits LCP first

## Install & Run

```bash
npm install
npm run dev      # development server at localhost:5173
npm run build    # production build to dist/
npm run preview  # preview production build
```

## Project Structure

```
├── index.html           # Semantic HTML, editorial copy, reveal-text classes
├── package.json         # Vite 5, Three.js, Lenis, GSAP
├── vite.config.js       # Vite configuration
├── public/
│   └── images/
│       └── img1-10.jpg  # Gallery images (10 editorial photographs)
└── src/
    ├── script.js        # Entry: Three.js scene, Lenis, GSAP, render loop
    ├── shaders.js       # GLSL vertex + fragment shaders (named exports)
    └── styles.css       # Full design system, no preprocessors
```

## CONFIG Reference

| Key | Default | What it tunes |
|-----|---------|---------------|
| `totalImages` | 10 | Number of source images to cycle across tiles |
| `tilesPerRevolution` | 15 | Tiles per 360° ring — more = denser spiral |
| `revolutions` | 5 | Total helix turns — more = taller spiral |
| `startRadius` | 5 | Outer radius at the top of the spiral |
| `endRadius` | 3.5 | Inner radius at the bottom — creates taper |
| `tileHeightRatio` | 1.1 | Tile height relative to chord length |
| `tileSegments` | 24 | Subdivisions per curved tile — more = smoother |
| `spiralGap` | 0.35 | Vertical spacing between tiles |
| `tileOverlap` | 0.005 | Extra arc angle to prevent seam gaps |
| `cameraZ` | 12 | Base camera distance from spiral center |
| `cameraSmoothing` | 0.075 | Lerp factor for all camera/tilt transitions |
| `baseRotationSpeed` | 0.001 | Constant idle rotation speed (rad/frame) |
| `scrollRotationMultiplier` | 0.0035 | How much scroll velocity feeds spin |
| `rotationDecay` | 0.9 | Spin velocity decay per frame (0–1) |
| `scrollMultiplier` | 1.25 | Additional scroll-to-spin amplification |
| `cameraYMultiplier` | 0.2 | How far camera travels vertically on scroll |
| `parallaxStrength` | 0.1 | Mouse parallax tilt intensity |
| `spiralOffsetY` | -2.0 | Vertical offset of the entire spiral group |

## How It Works

### Geometry
Each tile is a **curved BufferGeometry** — not a flat plane. The function walks `segments + 1` slices along an arc of `arcAngle` radians, placing two vertices per slice (top and bottom) at `sin(θ) × radius` / `cos(θ) × radius`. This creates a tile that physically follows the cylinder surface. 75 tiles are stacked vertically with `spiralGap` spacing, each rotated by `angleStep` radians. The radius linearly interpolates from `startRadius` to `endRadius`, creating a cone-like taper.

### Scroll → Camera
`scrollProgress` (0–1) maps directly to `targetCameraY` via `cameraYMultiplier × 10`. The actual camera Y is lerped toward this target using `cameraSmoothing`, creating a smooth vertical drift. `camera.lookAt()` tracks a point slightly above the camera to maintain a natural downward gaze.

### Lenis Velocity → Rotation
Every Lenis scroll event feeds its `velocity` value into `state.spinVelocity` (scaled by `scrollRotationMultiplier × scrollMultiplier`). Each frame, `spinVelocity` is added to `spiral.rotation.y` and then multiplied by `rotationDecay` (0.9), so fast scrolls create a dramatic spin that smoothly decays to the idle `baseRotationSpeed`.

### Mouse Parallax
On desktop, `mousemove` maps cursor position to `targetTiltX` (vertical) and `targetTiltZ` (horizontal, inverted), both scaled by `parallaxStrength`. These are lerped each frame and applied to `spiral.rotation.x` and `spiral.rotation.z`, giving a gentle orbital tilt that follows the cursor.

### Image Replacement
Drop your own JPG images into `public/images/` named `img1.jpg` through `img10.jpg`. The texture loader cycles through all 10 across the 75 tiles. Failed loads silently fall back to a dark grey 1×1 DataTexture so the spiral always renders.

### Tuning for Different Looks
- **Denser spiral**: Increase `tilesPerRevolution` (e.g. 20) and decrease `spiralGap` (e.g. 0.25)
- **More dramatic taper**: Set `endRadius` lower (e.g. 2.0) relative to `startRadius`
- **Faster spin response**: Increase `scrollRotationMultiplier` and `scrollMultiplier`
- **Slower decay**: Set `rotationDecay` closer to 1.0 (e.g. 0.96)
- **Closer camera**: Decrease `cameraZ` (e.g. 8)
- **Stronger parallax**: Increase `parallaxStrength` (e.g. 0.2)
