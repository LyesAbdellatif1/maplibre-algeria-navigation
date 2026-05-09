# Architecture Document — @maplibre/maplibre-react-native

## What Is This Project?

This is **`@maplibre/maplibre-react-native`** (v10.4.2), an open-source React Native library that brings interactive maps to Android and iOS mobile apps using **MapLibre Native** — a free, open-source alternative to Mapbox GL.

The library acts as a **bridge** between JavaScript/TypeScript code and the native map rendering engines on each platform. You write map UI in React Native; the library talks to MapLibre's C++ rendering engine under the hood.

---

## Repository Structure

```
maplibre-algeria-navigation/
├── src/                        # TypeScript library source (the public API)
│   ├── index.ts                # Main entry point
│   ├── MapLibreRN.ts           # All named exports
│   ├── MLRNModule.ts           # Native module interface
│   ├── components/             # React components (MapView, Camera, layers…)
│   ├── modules/                # Singleton managers (Location, Offline, Snapshot)
│   ├── hooks/                  # Internal React hooks
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utilities and animation helpers
│   └── plugin/                 # Expo config plugin
│
├── android/                    # Native Android bridge (Java/Kotlin)
│   └── src/main/java/org/maplibre/reactnative/
│       ├── MLRNPackage.java    # Registers all native modules and view managers
│       ├── components/         # Native view managers (map, camera, layers…)
│       └── modules/            # Native modules (location, offline, snapshot…)
│
├── ios/                        # Native iOS bridge (Objective-C/Swift)
│
├── cpp/                        # Shared C++ code (cross-platform native logic)
│
├── examples/
│   ├── shared/src/             # All example screens used by both apps
│   │   └── examples/           # Organised by feature group
│   ├── react-native-app/       # Plain React Native example app (old arch)
│   └── expo-app/               # Expo example app (new arch)
│
├── docs/                       # Docusaurus documentation website
└── scripts/                    # Code generation scripts
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│          React Native App (JavaScript)       │
│   MapView, Camera, ShapeSource, FillLayer…   │
└─────────────┬───────────────────────────────┘
              │  React Native Bridge (JSI / Old Bridge)
┌─────────────▼───────────────────────────────┐
│         TypeScript Library (src/)            │
│  Components → Hooks → Native Bridge utils    │
└─────────────┬───────────────────────────────┘
              │  NativeModules / requireNativeComponent
┌─────────────▼───────────────────────────────┐
│       Native Bridge (android/ + ios/)        │
│  MLRNPackage → ViewManagers + NativeModules  │
└─────────────┬───────────────────────────────┘
              │  MapLibre Native Android / iOS SDK
┌─────────────▼───────────────────────────────┐
│     MapLibre Native (C++ rendering engine)   │
│  Vector tiles, raster tiles, GeoJSON, GPU    │
└─────────────────────────────────────────────┘
```

---

## Core Components

### MapView
`src/components/MapView.tsx`

The root component. Renders the interactive map surface. Wraps the native `MLRNMapView` (Android) / `MLRNMapView` (iOS) view manager. All other components must be children of `MapView`.

**Key props:** `mapStyle` (tile style URL or JSON), `pitchEnabled`, `scrollEnabled`, `onPress`, `onLongPress`, `onRegionDidChange`

---

### Camera
`src/components/Camera.tsx`

Controls the map viewport — position, zoom, pitch, bearing, and animations. Supports four animation modes:

| Mode | Behaviour |
|---|---|
| `flyTo` | Animated arc flight between locations |
| `easeTo` | Smooth eased transition |
| `linearTo` | Linear interpolation |
| `moveTo` | Instant jump (no animation) |

Also handles **user-tracking mode** — the camera can follow the device's GPS position with three modes: `Follow`, `FollowWithHeading` (compass), `FollowWithCourse` (movement direction).

---

### Data Sources

Sources feed geographic data into the map. All sources must be children of `MapView`.

| Component | What it loads |
|---|---|
| `ShapeSource` | GeoJSON inline data or URL |
| `VectorSource` | Vector tile URL (`.pbf` / Mapbox tile format) |
| `RasterSource` | Raster tile URL (PNG/JPEG tiles) |
| `ImageSource` | A single georeferenced image overlay |

---

### Rendering Layers

Layers read from sources and control how data is drawn. A layer must reference a source via `sourceID`.

| Component | Renders |
|---|---|
| `FillLayer` | Polygons (filled areas) |
| `LineLayer` | Lines and polylines |
| `SymbolLayer` | Icons and text labels |
| `CircleLayer` | Circle markers |
| `HeatmapLayer` | Density heatmaps |
| `FillExtrusionLayer` | 3D extruded buildings |
| `RasterLayer` | Raster tile images |
| `BackgroundLayer` | Map background colour/pattern |

Layer styles use **MapLibre expressions** — data-driven styling based on feature properties.

---

### User Location
`src/components/UserLocation.tsx`

Shows the device's GPS position on the map. Two render modes:

- **`normal`** — renders using a custom React Native child component (fully customisable icon)
- **`native`** — uses the platform's built-in location indicator (more performant)

Uses `LocationManager` internally, which wraps the native `MLRNLocationModule` to subscribe to GPS updates.

---

### Annotations

UI elements overlaid on the map at geographic coordinates:

| Component | Description |
|---|---|
| `PointAnnotation` | A native pin at a coordinate |
| `MarkerView` | Any React Native view placed at a coordinate |
| `Callout` | Popup bubble attached to an annotation |

---

## Singleton Modules

These are JavaScript singletons that communicate with native modules:

### LocationManager
`src/modules/location/LocationManager.ts`

Wraps `MLRNLocationModule` (native). Provides:
- `start()` / `stop()` — begin/end GPS listening
- `getLastKnownLocation()` — cached position
- Event subscription for location updates

Emits `Location` objects with: `latitude`, `longitude`, `altitude`, `speed`, `heading`, `course`, `accuracy`.

### OfflineManager
`src/modules/offline/OfflineManager.ts`

Wraps `MLRNOfflineModule`. Manages downloading map regions for offline use:
- `createPack(options)` — download a bounding box of tiles
- `getPacks()` — list downloaded regions
- `deletePack(name)` — remove a downloaded region
- Progress and error event subscriptions

### SnapshotManager
`src/modules/snapshot/SnapshotManager.ts`

Wraps `MLRNSnapshotModule`. Renders a static PNG image of a map region without displaying a live map — useful for thumbnails and previews.

---

## Animation System
`src/utils/animated/`

Custom animation utilities built on React Native's `Animated` API, designed specifically for map shapes:

| Class | Purpose |
|---|---|
| `AnimatedPoint` | Animates a GeoJSON point coordinate |
| `AnimatedShape` | Animates any GeoJSON shape |
| `AnimatedCoordinatesArray` | Animates an array of coordinates |
| `AnimatedRouteCoordinatesArray` | Animates a route progressively along a line (navigation use case) |

`AnimatedRouteCoordinatesArray` uses **Turf.js** (`@turf/nearest-point-on-line`, `@turf/length`, `@turf/distance`) to calculate intermediate positions along a route as the animation progresses.

---

## Native Android Bridge

**Entry point:** `android/src/main/java/org/maplibre/reactnative/MLRNPackage.java`

`MLRNPackage` implements `ReactPackage` and registers:

**NativeModules** (business logic, callable from JS):
- `MLRNModule` — global config (custom headers, connectivity)
- `MLRNOfflineModule` — offline pack management
- `MLRNSnapshotModule` — static map snapshots
- `MLRNLocationModule` — GPS location streaming
- `MLRNLogging` — log level control

**ViewManagers** (native views, rendered by React Native):
- `MLRNMapViewManager` / `MLRNAndroidTextureMapViewManager` — map surface
- `MLRNCameraManager` — camera control
- `MLRNMarkerViewManager`, `MLRNPointAnnotationManager`, `MLRNCalloutManager` — annotations
- `MLRNNativeUserLocationManager` — native location dot
- Source managers: Vector, Shape, Raster, Image
- Layer managers: Fill, FillExtrusion, Heatmap, Line, Circle, Symbol, Raster, Background

---

## Expo Plugin
`src/plugin/withMapLibre.ts`

A **Config Plugin** that runs during `expo prebuild` to automatically configure native files. It injects:

- **Android** (`gradle.properties`): MapLibre SDK version, rendering variant (OpenGL/Vulkan), location engine choice
- **iOS** (`Podfile`): Native SDK version, Swift Package Manager spec, post-install hook
- **Xcode**: Debug symbol format and signature file cleanup workaround

---

## Example App Structure
`examples/shared/src/`

The example apps show all library features through a navigable list, organised into groups:

| Group | Examples |
|---|---|
| Map | Show map, offline region, local style JSON, layer visibility, tint colour |
| Camera | Fly to, pitch, heading, restrict bounds, snapshot, compass |
| User Location | Follow alignment, render mode, navigation mode, displacement |
| Symbol/Circle | Custom icons, SDF icons, earthquake clustering, data-driven colours |
| Fill/Raster | GeoJSON source, OpenStreetMap raster, indoor building, feature query |
| Line | Gradient line |
| Sources | PMTiles map style, PMTiles vector source |
| Annotations | Point annotation, marker view, heatmap, custom callout |
| Animations | Circle along line, animated length/morph/size, Reanimated integration |

---

## Key Dependencies

| Package | Role |
|---|---|
| `@turf/distance`, `@turf/length`, `@turf/nearest-point-on-line`, `@turf/helpers` | Geospatial math for animations and route calculation |
| `debounce` | Throttle map region change callbacks |
| `@maplibre/maplibre-gl-style-spec` | (dev) Validate and generate map style types |
| `react-native-builder-bob` | Build CommonJS + ESM + TypeScript declaration outputs |
| `@expo/config-plugins` | (peer, optional) Expo plugin system |
