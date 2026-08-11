import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Droplets, RefreshCw, Ruler, Sparkles } from "lucide-react";

type TileId = string;
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type RoomLayout = {
  name: string;
  seed: string;
  floorRects: Rect[];
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

const randomInt = (random: () => number, min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function createSeed() {
  return `R-${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0")}`;
}

function createRandom(seed: string) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) | 0;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 0x100000000;
  };
}

const lineCells = (start: Point, end: Point) => {
  const cells: Point[] = [];
  if (start.y === end.y) {
    for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x += 1) cells.push({ x, y: start.y });
  } else if (start.x === end.x) {
    for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y += 1) cells.push({ x: start.x, y });
  }
  return cells;
};

const layoutFrom = (
  seed: string,
  name: string,
  floorRects: Rect[],
  waterRects: Rect[],
  bridgeCells: Point[],
  stairsUp: [number, number],
  stairsDown: [number, number],
): RoomLayout => ({ name, seed, floorRects, waterRects, bridgeCells, stairsUp, stairsDown });

function createCourtyardLayout(seed: string, random: () => number) {
  const courtyard: Rect = {
    x: randomInt(random, 2, 3),
    y: randomInt(random, 2, 3),
    w: randomInt(random, 17, 20),
    h: randomInt(random, 11, 13),
  };
  const pool: Rect = {
    x: courtyard.x + 1,
    y: courtyard.y + 1,
    w: courtyard.w - 2,
    h: courtyard.h - 2,
  };
  const entranceY = courtyard.y + randomInt(random, 2, courtyard.h - 3);
  const entrance: Rect = {
    x: courtyard.x + courtyard.w - 1,
    y: entranceY,
    w: COLS - (courtyard.x + courtyard.w - 1) - 1,
    h: 2,
  };

  return layoutFrom(
    seed,
    "Sunken cistern courtyard",
    [courtyard, entrance],
    [pool],
    [],
    [courtyard.x, courtyard.y + 1],
    [courtyard.x + courtyard.w - 1, entranceY],
  );
}

function createSewerLayout(seed: string, random: () => number) {
  const upperX = randomInt(random, 3, 5);
  const firstTurnY = randomInt(random, 6, 8);
  const secondX = randomInt(random, 12, 14);
  const poolW = randomInt(random, 3, 5);
  const pool: Rect = {
    x: 20 - poolW,
    y: 11,
    w: poolW,
    h: randomInt(random, 2, 3),
  };
  const verticalStart: Rect = { x: upperX, y: 2, w: 3, h: firstTurnY + 2 - 2 };
  const firstTurn: Rect = { x: upperX, y: firstTurnY, w: secondX - upperX + 3, h: 3 };
  const secondTurn: Rect = { x: secondX, y: firstTurnY, w: 3, h: 14 - firstTurnY };
  const spillway: Rect = { x: secondX, y: 11, w: 21 - secondX, h: 3 };

  return layoutFrom(
    seed,
    "Sewer spillway",
    [verticalStart, firstTurn, secondTurn, spillway],
    [pool],
    [],
    [upperX + 1, 3],
    [secondX + 1, firstTurnY + 1],
  );
}

function createFloodedWingLayout(seed: string, random: () => number) {
  const leftRoom: Rect = { x: 2, y: 2, w: randomInt(random, 9, 11), h: randomInt(random, 10, 12) };
  const rightRoom: Rect = {
    x: randomInt(random, 14, 15),
    y: randomInt(random, 3, 5),
    w: randomInt(random, 7, 8),
    h: randomInt(random, 8, 10),
  };
  const hallY = randomInt(random, 6, 8);
  const hall: Rect = { x: leftRoom.x + leftRoom.w - 1, y: hallY, w: rightRoom.x - leftRoom.x - leftRoom.w + 2, h: 3 };
  const pool: Rect = { x: leftRoom.x + 1, y: leftRoom.y + 1, w: leftRoom.w - 2, h: leftRoom.h - 2 };

  return layoutFrom(
    seed,
    "Flooded west wing",
    [leftRoom, hall, rightRoom],
    [pool],
    lineCells({ x: pool.x, y: hallY + 1 }, { x: pool.x + pool.w - 1, y: hallY + 1 }),
    [leftRoom.x, leftRoom.y + leftRoom.h - 2],
    [rightRoom.x + rightRoom.w - 2, rightRoom.y + 1],
  );
}

function createBridgeBasinLayout(seed: string, random: () => number) {
  const room: Rect = { x: 2, y: 2, w: 20, h: 12 };
  const verticalBasin = random() > 0.5;
  const pool: Rect = verticalBasin
    ? { x: 9, y: room.y + 1, w: randomInt(random, 5, 7), h: room.h - 2 }
    : { x: room.x + 2, y: 5, w: randomInt(random, 11, 14), h: randomInt(random, 5, 7) };
  const bridgeCells = verticalBasin
    ? lineCells({ x: pool.x + Math.floor(pool.w / 2), y: pool.y }, { x: pool.x + Math.floor(pool.w / 2), y: pool.y + pool.h - 1 })
    : lineCells({ x: pool.x, y: pool.y + Math.floor(pool.h / 2) }, { x: pool.x + pool.w - 1, y: pool.y + Math.floor(pool.h / 2) });

  return layoutFrom(
    seed,
    verticalBasin ? "North-south bridge basin" : "Wide bridge basin",
    [room],
    [pool],
    bridgeCells,
    [room.x + 1, room.y + 1],
    [room.x + room.w - 2, room.y + room.h - 2],
  );
}

function createCrossroadsLayout(seed: string, random: () => number) {
  const verticalX = randomInt(random, 9, 11);
  const horizontalY = randomInt(random, 6, 8);
  const floodedLeft = random() > 0.5;
  const vertical: Rect = { x: verticalX, y: 2, w: 5, h: 13 };
  const horizontal: Rect = { x: 3, y: horizontalY, w: 18, h: 5 };
  const pool: Rect = floodedLeft
    ? { x: 4, y: horizontalY + 1, w: 5, h: 3 }
    : { x: 16, y: horizontalY + 1, w: 5, h: 3 };

  return layoutFrom(
    seed,
    floodedLeft ? "Flooded west crossroads" : "Flooded east crossroads",
    [vertical, horizontal],
    [pool],
    [],
    [verticalX + 2, 3],
    floodedLeft ? [19, horizontalY + 2] : [4, horizontalY + 2],
  );
}

function createRandomLayout(): RoomLayout {
  const seed = createSeed();
  const random = createRandom(seed);
  const archetype = randomInt(random, 0, 4);
  if (archetype === 0) return createCourtyardLayout(seed, random);
  if (archetype === 1) return createSewerLayout(seed, random);
  if (archetype === 2) return createFloodedWingLayout(seed, random);
  if (archetype === 3) return createBridgeBasinLayout(seed, random);
  return createCrossroadsLayout(seed, random);
}

const inRect = (x: number, y: number, rect: Rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
const hasPoint = (points: Point[], x: number, y: number) => points.some((point) => point.x === x && point.y === y);
const isFloor = (layout: RoomLayout, x: number, y: number) => layout.floorRects.some((rect) => inRect(x, y, rect));
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
  // Keep the indent pieces on the lower-facing turns and the perspective
  // corners on the upper-facing turns. The two groups look similar in the
  // atlas, but using them in the opposite pair makes an indent read as a
  // perspective wall at the junction.
  if (south && east && !north && !west) return "I3";
  if (south && west && !north && !east) return "G3";
  if (north && east && !south && !west) return "I1";
  if (north && west && !south && !east) return "G1";
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
  const [layout, setLayout] = useState<RoomLayout>(() => createRandomLayout());
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
         <header className="room-header"><div><p className="eyebrow">Room generator / first pass</p><h1 className="room-title">{layout.name}</h1><p className="room-subtitle">An abstract chamber network assembled from the labeled atlas. Floors remain continuous through halls, while surrounding wall edges define each newly generated footprint.</p></div><button className="regen" type="button" onClick={() => setLayout(createRandomLayout())}><RefreshCw size={14} strokeWidth={2.5} /> Regenerate room</button></header>
        <div className="room-body">
          <div className="map-stage" aria-label={`${layout.name} tile preview`}><div className="map">{room.flatMap((row, y) => row.map((tile, x) => <img className="tile" key={`${x}-${y}-${tile}`} src={`${TILE_ROOT}/${tile}.png`} alt={`${tile}, ${roleFor(tile)}, grid ${x + 1} by ${y + 1}`} title={`${tile} · ${roleFor(tile)}`} />))}<div className="player-sprite" style={{ left: player.x * 32, top: player.y * 32 }} role="img" aria-label={`Pill character at grid ${player.x + 1} by ${player.y + 1}`}><span className="player-label">P1</span></div></div></div>
           <div className="under-map"><span><strong>SEED {layout.seed}</strong> · {COLS} × {ROWS} cells · fresh layout</span><span aria-live="polite">PILL {player.x + 1},{player.y + 1} · {isMobile ? "touch controls active" : "arrow keys / WASD"}</span></div>
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