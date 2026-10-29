'use client';

import { ContactShadows, Edges, Grid, Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as Slider from '@radix-ui/react-slider';
import { Box, Maximize2, Move3d, Rotate3d, Ruler, ScanLine, X } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { BoxGeometry, MathUtils, type Group, type Mesh } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { registerSnapshot } from '@/lib/canvas/snapshotRegistry';
import { TEXTURE_WORLD_SIZE, getMaterialTexture } from '@/lib/canvas/proceduralTextures';
import { getMaterial } from '@/lib/engine/materials';
import { cn } from '@/lib/cn';
import type { ViewerSettings } from '@/store/useConfigurator';
import type { Axis, FurnitureModel, Panel } from '@/types/carpentry';

/**
 * Real-time viewport. The scene works in millimetres inside a group scaled by
 * 0.001, so the camera, lights and shadows live in metres.
 */

const MM = 0.001;
const AXIS_INDEX: Readonly<Record<Axis, 0 | 1 | 2>> = { x: 0, y: 1, z: 2 };
/** BoxGeometry face order: +x, -x, +y, -y, +z, -z; each face's U and V world axes. */
const FACE_AXES: ReadonlyArray<readonly [Axis, Axis]> = [
  ['z', 'y'],
  ['z', 'y'],
  ['x', 'z'],
  ['x', 'z'],
  ['x', 'y'],
  ['x', 'y'],
];

export interface FurnitureViewerProps {
  model: FurnitureModel;
  settings: ViewerSettings;
  selectedPanelId: string | null;
  onSelectPanel: (panelId: string | null) => void;
  onSettingsChange: (patch: Partial<ViewerSettings>) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Box geometry whose UVs are scaled to world size and rotated per face so the
 * procedural grain (painted along U) always follows the panel length.
 */
const createPanelGeometry = (panel: Panel): BoxGeometry => {
  const [sx, sy, sz] = panel.size;
  const geometry = new BoxGeometry(sx, sy, sz);
  const uv = geometry.getAttribute('uv');
  for (let face = 0; face < 6; face += 1) {
    const axes = FACE_AXES[face];
    if (!axes) continue;
    const [uAxis, vAxis] = axes;
    const swap = panel.lengthAxis === vAxis;
    const uSize = panel.size[AXIS_INDEX[swap ? vAxis : uAxis]] / TEXTURE_WORLD_SIZE;
    const vSize = panel.size[AXIS_INDEX[swap ? uAxis : vAxis]] / TEXTURE_WORLD_SIZE;
    for (let vertex = face * 4; vertex < face * 4 + 4; vertex += 1) {
      const u = uv.getX(vertex);
      const v = uv.getY(vertex);
      if (swap) uv.setXY(vertex, v * uSize, u * vSize);
      else uv.setXY(vertex, u * uSize, v * vSize);
    }
  }
  uv.needsUpdate = true;
  return geometry;
};

// ---------------------------------------------------------------------------
// Panel mesh with exploded-view animation
// ---------------------------------------------------------------------------

interface PanelMeshProps {
  panel: Panel;
  explodeRef: MutableRefObject<number>;
  selected: boolean;
  dimmed: boolean;
  showEdges: boolean;
  xray: boolean;
  onSelect: (panelId: string | null) => void;
}

const PanelMesh = memo(function PanelMesh({ panel, explodeRef, selected, dimmed, showEdges, xray, onSelect }: PanelMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(() => createPanelGeometry(panel), [panel]);
  const material = getMaterial(panel.materialId);
  const texture = useMemo(() => getMaterialTexture(material), [material]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const travel = explodeRef.current * panel.explodeDistance;
    mesh.position.set(
      panel.position[0] + panel.explodeDirection[0] * travel,
      panel.position[1] + panel.explodeDirection[1] * travel,
      panel.position[2] + panel.explodeDirection[2] * travel,
    );
  });

  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    onSelect(selected ? null : panel.id);
  };

  const transparent = xray && !selected;
  const highlight = selected ? '#f59e0b' : hovered ? '#fbbf24' : '#000000';

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={panel.position}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <meshStandardMaterial
        map={texture}
        color={texture ? '#ffffff' : material.color}
        roughness={material.family === 'melamine' ? 0.45 : 0.75}
        metalness={0}
        emissive={highlight}
        emissiveIntensity={selected ? 0.35 : hovered ? 0.18 : 0}
        transparent={transparent || dimmed}
        opacity={transparent ? 0.28 : dimmed ? 0.55 : 1}
        depthWrite={!transparent}
      />
      {showEdges && <Edges threshold={15} color={selected ? '#b45309' : '#3f3a36'} />}
      {hovered && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-md bg-stone-900/90 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
            <span className="font-mono text-amber-300">{panel.code}</span> {panel.name}
            <span className="ml-1 text-stone-400">
              {Math.round(panel.length)}×{Math.round(panel.width)}×{panel.thickness}
            </span>
          </div>
        </Html>
      )}
    </mesh>
  );
});

// ---------------------------------------------------------------------------
// Scene helpers
// ---------------------------------------------------------------------------

/** Smoothly animates the shared explode value toward the slider target. */
const ExplodeAnimator = ({ target, explodeRef, liftRef, groupRef, maxDrop }: {
  target: number;
  explodeRef: MutableRefObject<number>;
  liftRef: MutableRefObject<number>;
  groupRef: MutableRefObject<Group | null>;
  maxDrop: number;
}) => {
  const invalidate = useThree((state) => state.invalidate);
  useFrame((_, delta) => {
    const next = MathUtils.damp(explodeRef.current, target, 6, Math.min(delta, 0.1));
    explodeRef.current = Math.abs(next - target) < 1e-4 ? target : next;
    liftRef.current = explodeRef.current * maxDrop;
    if (groupRef.current) groupRef.current.position.y = liftRef.current * MM;
    if (explodeRef.current !== target) invalidate();
  });
  return null;
};

const DimensionLines = ({ model }: { model: FurnitureModel }) => {
  const { min, max } = model.bounds;
  const off = 60;
  const color = '#1d4ed8';
  const label = (text: string) => (
    <div className="whitespace-nowrap rounded bg-white/95 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 shadow ring-1 ring-blue-200">
      {text}
    </div>
  );
  const w = Math.round(max[0] - min[0]);
  const h = Math.round(max[1] - min[1]);
  const d = Math.round(max[2] - min[2]);
  return (
    <group>
      <Line points={[[min[0], min[1], max[2] + off], [max[0], min[1], max[2] + off]]} color={color} lineWidth={1.5} />
      <Html position={[(min[0] + max[0]) / 2, min[1], max[2] + off]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        {label(`${w} mm`)}
      </Html>
      <Line points={[[min[0] - off, min[1], max[2]], [min[0] - off, max[1], max[2]]]} color={color} lineWidth={1.5} />
      <Html position={[min[0] - off, (min[1] + max[1]) / 2, max[2]]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        {label(`${h} mm`)}
      </Html>
      <Line points={[[max[0] + off, min[1], min[2]], [max[0] + off, min[1], max[2]]]} color={color} lineWidth={1.5} />
      <Html position={[max[0] + off, min[1], (min[2] + max[2]) / 2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        {label(`${d} mm`)}
      </Html>
    </group>
  );
};

/** Registers a capture function so the PDF exporter can grab the viewport. */
const SnapshotBridge = () => {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    registerSnapshot(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    });
    return () => registerSnapshot(null);
  }, [gl, scene, camera]);
  return null;
};

/** Places the camera for the current furniture size whenever `frameKey` changes. */
const CameraRig = ({ model, frameKey, controlsRef }: {
  model: FurnitureModel;
  frameKey: number;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) => {
  const camera = useThree((state) => state.camera);
  const { min, max } = model.bounds;
  const sizeX = max[0] - min[0];
  const sizeY = max[1] - min[1];
  const sizeZ = max[2] - min[2];

  useEffect(() => {
    // Fit the bounding sphere (with room for the exploded view) in the vertical FOV.
    const radius = (Math.hypot(sizeX, sizeY, sizeZ) / 2) * MM * 1.35;
    const fov = 'fov' in camera && typeof camera.fov === 'number' ? camera.fov : 38;
    const distance = radius / Math.sin(MathUtils.degToRad(fov / 2));
    const target: [number, number, number] = [0, sizeY * MM * 0.5, 0];
    const direction: [number, number, number] = [0.55, 0.32, 0.77];
    camera.position.set(direction[0] * distance, target[1] + direction[1] * distance, direction[2] * distance);
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...target);
      controls.update();
    } else {
      camera.lookAt(...target);
    }
    // Only reframe on explicit requests, not on every dimension tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, camera, controlsRef]);
  return null;
};

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

const ToggleButton = ({ active, onClick, label, children }: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={label}
    aria-label={label}
    className={cn(
      'grid h-9 w-9 place-items-center rounded-lg border text-stone-700 transition',
      active ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white/90 hover:bg-white',
    )}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FurnitureViewer({ model, settings, selectedPanelId, onSelectPanel, onSettingsChange, className }: FurnitureViewerProps) {
  const explodeRef = useRef(settings.explode);
  const liftRef = useRef(0);
  const groupRef = useRef<Group | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [frameKey, setFrameKey] = useState(0);

  // Reframe when the furniture type changes (its proportions change a lot).
  const template = model.config.template;
  useEffect(() => {
    setFrameKey((key) => key + 1);
  }, [template]);

  // How far the lowest panel travels below the floor at full explosion.
  const maxDrop = useMemo(
    () =>
      model.panels.reduce((drop, p) => {
        const lowest = p.worldBounds.min[1] + Math.min(0, p.explodeDirection[1] * p.explodeDistance);
        return Math.max(drop, -lowest);
      }, 0),
    [model.panels],
  );

  const selectedGroup = model.panels.find((p) => p.id === selectedPanelId)?.group ?? null;
  const height = model.bounds.max[1] - model.bounds.min[1];
  const footprint = Math.max(model.bounds.max[0] - model.bounds.min[0], model.bounds.max[2] - model.bounds.min[2]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        camera={{ fov: 38, position: [2, 1.6, 2.6] }}
        onPointerMissed={() => onSelectPanel(null)}
        aria-label={`Vista 3D de ${model.config.name}`}
      >
        <hemisphereLight args={['#fff7ed', '#a8a29e', 0.9]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />

        <group ref={groupRef}>
          <group scale={MM}>
            {model.panels.map((panel) => (
              <PanelMesh
                key={panel.id}
                panel={panel}
                explodeRef={explodeRef}
                selected={panel.id === selectedPanelId}
                dimmed={selectedGroup !== null && panel.group !== selectedGroup && settings.xray}
                showEdges={settings.showEdges}
                xray={settings.xray}
                onSelect={onSelectPanel}
              />
            ))}
            {settings.showDimensions && settings.explode < 0.05 && <DimensionLines model={model} />}
          </group>
        </group>

        <ExplodeAnimator
          target={settings.explode}
          explodeRef={explodeRef}
          liftRef={liftRef}
          groupRef={groupRef}
          maxDrop={maxDrop}
        />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={Math.max(3, footprint * MM * 4)} blur={2.4} far={height * MM + 0.5} />
        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.6}
          cellColor="#d6d3d1"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#a8a29e"
          fadeDistance={9}
          fadeStrength={1.5}
          infiniteGrid
        />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.4}
          maxDistance={15}
          maxPolarAngle={Math.PI * 0.495}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={0.8}
        />
        <CameraRig model={model} frameKey={frameKey} controlsRef={controlsRef} />
        <SnapshotBridge />
      </Canvas>

      {/* Overlay controls */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="pointer-events-auto whitespace-nowrap rounded-lg bg-white/85 px-2.5 py-1.5 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200 backdrop-blur">
          <span className="font-semibold text-stone-900">{model.panels.length}</span> piezas ·{' '}
          <span className="font-semibold text-stone-900">{model.totalWeightKg.toFixed(1)}</span> kg
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <ToggleButton active={settings.showDimensions} label="Mostrar cotas" onClick={() => onSettingsChange({ showDimensions: !settings.showDimensions })}>
            <Ruler className="h-4 w-4" />
          </ToggleButton>
          <ToggleButton active={settings.showEdges} label="Mostrar aristas" onClick={() => onSettingsChange({ showEdges: !settings.showEdges })}>
            <Box className="h-4 w-4" />
          </ToggleButton>
          <ToggleButton active={settings.xray} label="Rayos X" onClick={() => onSettingsChange({ xray: !settings.xray })}>
            <ScanLine className="h-4 w-4" />
          </ToggleButton>
          <ToggleButton active={settings.autoRotate} label="Girar automáticamente" onClick={() => onSettingsChange({ autoRotate: !settings.autoRotate })}>
            <Rotate3d className="h-4 w-4" />
          </ToggleButton>
          <ToggleButton active={false} label="Reencuadrar cámara" onClick={() => setFrameKey((key) => key + 1)}>
            <Maximize2 className="h-4 w-4" />
          </ToggleButton>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-stone-200 backdrop-blur sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2">
        <Move3d className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <label htmlFor="explode-slider" className="shrink-0 text-xs font-semibold text-stone-700">
          Vista explosionada
        </label>
        <Slider.Root
          id="explode-slider"
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[settings.explode]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(value) => onSettingsChange({ explode: value[0] ?? 0 })}
          aria-label="Separación de piezas"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-stone-200">
            <Slider.Range className="absolute h-full rounded-full bg-amber-500" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-amber-500 bg-white shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200" />
        </Slider.Root>
        <span className="w-9 shrink-0 text-right font-mono text-xs text-stone-500">{Math.round(settings.explode * 100)}%</span>
      </div>

      {selectedPanelId && (
        <SelectedPanelCard model={model} panelId={selectedPanelId} onClose={() => onSelectPanel(null)} />
      )}
    </div>
  );
}

const SelectedPanelCard = ({ model, panelId, onClose }: { model: FurnitureModel; panelId: string; onClose: () => void }) => {
  const panel = model.panels.find((p) => p.id === panelId);
  if (!panel) return null;
  const material = getMaterial(panel.materialId);
  const edges = (['L1', 'L2', 'W1', 'W2'] as const).filter((edge) => panel.edgeBanding[edge]);
  return (
    <div className="absolute left-3 top-14 w-60 rounded-xl bg-white/95 p-3 text-xs shadow-lg ring-1 ring-stone-200 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-bold text-amber-700">{panel.code}</p>
          <p className="text-sm font-semibold text-stone-900">{panel.name}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Cerrar">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-stone-600">
        <dt>Medida</dt>
        <dd className="text-right font-mono text-stone-900">
          {Math.round(panel.length)} × {Math.round(panel.width)}
        </dd>
        <dt>Espesor</dt>
        <dd className="text-right font-mono text-stone-900">{panel.thickness} mm</dd>
        <dt>Material</dt>
        <dd className="text-right text-stone-900">{material.name}</dd>
        <dt>Cantos</dt>
        <dd className="text-right font-mono text-stone-900">{edges.length ? edges.join(' ') : '—'}</dd>
        <dt>Paso de armado</dt>
        <dd className="text-right text-stone-900">{panel.assemblyStep}</dd>
      </dl>
    </div>
  );
};
