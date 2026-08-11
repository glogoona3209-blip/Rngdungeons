import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Droplets, RefreshCw, Ruler, Sparkles } from "lucide-react";

type TileId = string;
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type RoomLayout = {
  name: string;
  seed: string;
  floorRects: Rect[];
  cutCells?: Point[];
  waterRects: Rect[];
  bridgeCells: Point[];
  stairsUp: [number, number];
  stairsDown: [number, number];
};

const TILE_ROOT = "/images/tileset";
const COLS = 24;
const ROWS = 17;
const floorTiles = ["B2", "C2", "D2", "E2", "B3", "C3", "D3", "E3", "B4", "C4", "D4", "E4"];
const topWalls = ["A1", "B1", "C1", "D1", "E1", "F1"];
const bottomCaps = ["A5", "B5", "C5", "D5", "E5", "F5"];
const voidTile = "H2";

const layouts: RoomLayout[] = [
  { name: "Flooded antechamber", seed: "A-017", floorRects: [{ x: 2, y: 3, w: 12, h: 9 }, { x: 13, y: 8, w: 6, h: 2 }, { x: 17, y: 5, w: 6, h: 7 }, { x: 7, y: 12, w: 2, h: 4 }], waterRects: [{ x: 5, y: 6, w: 5, h: 5 }], bridgeCells: Array.from({ length: 5 }, (_, i) => ({ x: 5 + i, y: 8 })), stairsUp: [3, 10], stairsDown: [19, 8] },
  { name: "Twin stair cistern", seed: "B-042", floorRects: [{ x: 3, y: 3, w: 9, h: 9 }, { x: 11, y: 7, w: 7, h: 2 }, { x: 16, y: 4, w: 7, h: 8 }, { x: 6, y: 11, w: 2, h: 5 }], cutCells: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 21, y: 11 }, { x: 22, y: 11 }], waterRects: [{ x: 4, y: 5, w: 4, h: 4 }], bridgeCells: Array.from({ length: 4 }, (_, i) => ({ x: 4 + i, y: 7 })), stairsUp: [5, 10], stairsDown: [20, 7] },
  { name: "The low vault", seed: "C-083", floorRects: [{ x: 2, y: 4, w: 10, h: 7 }, { x: 11, y: 8, w: 5, h: 2 }, { x: 14, y: 5, w: 9, h: 7 }, { x: 5, y: 10, w: 2, h: 6 }], cutCells: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 21, y: 11 }], waterRects: [{ x: 5, y: 5, w: 4, h: 4 }], bridgeCells: Array.from({ length: 4 }, (_, i) => ({ x: 5 + i, y: 7 })), stairsUp: [3, 9], stairsDown: [19, 8] },
];

const inRect = (x: number, y: number, rect: Rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
const hasPoint = (points: Point[], x: number, y: number) => points.some((point) => point.x === x && point.y === y);
const isFloor = (layout: RoomLayout, x: number, y: number) => layout.floorRects.some((rect) => inRect(x, y, rect)) && !hasPoint(layout.cutCells ?? [], x, y);
const isWater = (layout: RoomLayout, x: number, y: number) => layout.waterRects.some((rect) => inRect(x, y, rect)) && !hasPoint(layout.bridgeCells, x, y);
const isOpen = (layout: RoomLayout, x: number, y: number) => isFloor(layout, x, y) || isWater(layout, x, y);
const isWalkable = (layout: RoomLayout, x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS && isFloor(layout, x, y) && !isWater(layout, x, y);

function waterTile(layout: RoomLayout, x: number, y: number): TileId {
  const edgeTop = !isWater(layout, x, y - 1);
  const edgeLeft = !isWater(layout, x - 1, y);
  const edgeRight = !isWater(layout, x + 1, y);
  if (edgeTop) return ["H4", "I4", "J4", "K4"][(x + y) % 4];
  if (edgeLeft) return "H5";
  if (edgeRight) return "K5";
  return ["I5", "J5"][(x + y) % 2];
}
const topWallTile = (x: number, y: number) => topWalls[1 + ((x * 3 + y) % 4)];
const bottomWallTile = (x: number, y: number) => bottomCaps[1 + ((x * 5 + y) % 4)];
const sideWallTile = (x: number, y: number, side: "left" | "right") => (side === "left" ? ["A2", "A3", "A4"] : ["F2", "F3", "F4"])[(x + y) % 3];

function wallTileFor(layout: RoomLayout, x: number, y: number): TileId {
  const north = isOpen(layout, x, y - 1), south = isOpen(layout, x, y + 1), west = isOpen(layout, x - 1, y), east = isOpen(layout, x + 1, y);
  const northEast = isOpen(layout, x + 1, y - 1), northWest = isOpen(layout, x - 1, y - 1), southEast = isOpen(layout, x + 1, y + 1), southWest = isOpen(layout, x - 1, y + 1);
  // These four compound tiles join the two wall runs at an inside corner.
  // The wall faces sit on the opposite edges from their open neighbors:
  // G1/I1 are the top-facing indents and G3/I3 are their lower-facing pair.
  if (south && east && !north && !west) return "G1";
  if (south && west && !north && !east) return "I1";
  if (north && east && !south && !west) return "G3";
  if (north && west && !south && !east) return "I3";
  if (!north && !south && !west && !east) {
    if (southEast) return "A1";
    if (southWest) return "F1";
    if (northEast) return "A5";
    if (northWest) return "F5";
    return voidTile;
  }
  if (south && !north) return topWallTile(x, y);
  if (north && !south) return bottomWallTile(x, y);
  if (east && !west) return sideWallTile(x, y, "left");
  if (west && !east) return sideWallTile(x, y, "right");
  if (east) return sideWallTile(x, y, "left");
  if (west) return sideWallTile(x, y, "right");
  return south ? topWallTile(x, y) : bottomWallTile(x, y);
}
function tileFor(layout: RoomLayout, x: number, y: number): TileId {
  if (!isOpen(layout, x, y)) return wallTileFor(layout, x, y);
  if (isWater(layout, x, y)) return waterTile(layout, x, y);
  if (x === layout.stairsUp[0] && y === layout.stairsUp[1]) return "G4";
  if (x === layout.stairsDown[0] && y === layout.stairsDown[1]) return "G5";
  return floorTiles[(x * 3 + y * 5) % floorTiles.length];
}
const buildRoom = (layout: RoomLayout) => Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => tileFor(layout, x, y)));
function roleFor(tile: TileId) {
  if (tile === voidTile) return "void";
  if (["H4", "I4", "J4", "K4", "H5", "I5", "J5", "K5"].includes(tile)) return "water";
  if (tile === "G4" || tile === "G5") return "stairs";
  if (tile.endsWith("1") && tile !== "H1") return "perspective wall";
  if (tile.startsWith("A") || tile.startsWith("F") || ["A5", "B5", "C5", "D5", "E5", "F5"].includes(tile)) return "wall cap";
  return "floor";
}

export function FirstGeneratedRoom() {
  const [layoutIndex, setLayoutIndex] = useState(0);
  const layout = layouts[layoutIndex];
  const [player, setPlayer] = useState<Point>({ x: layout.stairsUp[0], y: layout.stairsUp[1] });
  const [isMobile, setIsMobile] = useState(false);
  const room = useMemo(() => buildRoom(layout), [layout]);
  useEffect(() => setPlayer({ x: layout.stairsUp[0], y: layout.stairsUp[1] }), [layout]);
  useEffect(() => {
    const pointer = window.matchMedia("(pointer: coarse)");
    const update = () => setIsMobile(pointer.matches || window.innerWidth <= 680);
    update(); window.addEventListener("resize", update); pointer.addEventListener?.("change", update);
    return () => { window.removeEventListener("resize", update); pointer.removeEventListener?.("change", update); };
  }, []);
  const movePlayer = useCallback((dx: number, dy: number) => setPlayer((current) => {
    const next = { x: current.x + dx, y: current.y + dy };
    return isWalkable(layout, next.x, next.y) ? next : current;
  }), [layout]);
  useEffect(() => {
    const directions: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
    const onKeyDown = (event: KeyboardEvent) => { const direction = directions[event.key]; if (!direction) return; event.preventDefault(); movePlayer(direction.x, direction.y); };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [movePlayer]);
  const moveButtons = [{ className: "up", label: "Move up", icon: <ArrowUp size={20} />, dx: 0, dy: -1 }, { className: "left", label: "Move left", icon: <ArrowLeft size={20} />, dx: -1, dy: 0 }, { className: "down", label: "Move down", icon: <ArrowDown size={20} />, dx: 0, dy: 1 }, { className: "right", label: "Move right", icon: <ArrowRight size={20} />, dx: 1, dy: 0 }];
  return (
    <main className="room-shell">
      <section className="room-frame">
        <header className="room-header"><div><p className="eyebrow">Room generator / first pass</p><h1 className="room-title">{layout.name}</h1><p className="room-subtitle">An abstract chamber network assembled from the labeled atlas. Floors remain continuous through halls, while surrounding wall edges and occasional corner cuts keep each room inside its footprint.</p></div><button className="regen" type="button" onClick={() => setLayoutIndex((index) => (index + 1) % layouts.length)}><RefreshCw size={14} strokeWidth={2.5} /> Regenerate room</button></header>
        <div className="room-body">
          <div className="map-stage" aria-label={`${layout.name} tile preview`}><div className="map">{room.flatMap((row, y) => row.map((tile, x) => <img className="tile" key={`${x}-${y}-${tile}`} src={`${TILE_ROOT}/${tile}.png`} alt={`${tile}, ${roleFor(tile)}, grid ${x + 1} by ${y + 1}`} title={`${tile} · ${roleFor(tile)}`} />))}<div className="player-sprite" style={{ left: player.x * 32, top: player.y * 32 }} role="img" aria-label={`Pill character at grid ${player.x + 1} by ${player.y + 1}`}><span className="player-label">P1</span></div></div></div>
          <div className="under-map"><span><strong>SEED {layout.seed}</strong> · {COLS} × {ROWS} cells · deterministic layout</span><span aria-live="polite">PILL {player.x + 1},{player.y + 1} · {isMobile ? "touch controls active" : "arrow keys / WASD"}</span></div>
          <div className="controls" aria-label="Movement instructions"><span><strong>Move the pill</strong> with arrow keys or WASD.</span><span>Walls and water block movement · bridges remain open.</span></div>
          <div className="mobile-controls" style={isMobile ? { display: "grid" } : undefined} aria-label="Touch movement controls">{moveButtons.map((button) => <button className={`move-button ${button.className}`} key={button.label} type="button" aria-label={button.label} onClick={() => movePlayer(button.dx, button.dy)}>{button.icon}</button>)}</div>
          <div className="specs"><div className="spec"><div className="spec-label"><Ruler size={12} /> Native scale</div><div className="spec-value">32 × 32 CSS px / tile</div></div><div className="spec"><div className="spec-label"><Droplets size={12} /> Water pockets</div><div className="spec-value">{layout.waterRects.map((rect) => `${rect.w} × ${rect.h}`).join(" · ")} floor bridges</div></div><div className="spec"><div className="spec-label"><Sparkles size={12} /> Tile source</div><div className="spec-value">32 × 32 PNG atlas</div></div></div>
          <div className="legend"><span className="legend-item"><i className="swatch" /> floor + wall cap</span><span className="legend-item"><i className="swatch water" /> water + edge transition</span><span className="legend-item"><i className="swatch stairs" /> ascending / descending</span></div>
          <p className="note">Generation rule: floors stay on the room footprint and walls occupy the surrounding void. Top edges use perspective pieces, side and lower edges use thin caps, and corner pieces appear only where a boundary actually turns.</p>
        </div>
      </section>
    </main>
  );
}
export default FirstGeneratedRoom;