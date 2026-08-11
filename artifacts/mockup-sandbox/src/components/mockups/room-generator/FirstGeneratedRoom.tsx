import { useMemo, useState } from "react";
import { Droplets, RefreshCw, Ruler, Sparkles } from "lucide-react";

type TileId = string;

const TILE_ROOT = "/__mockup/images/tileset";
const COLS = 16;
const ROWS = 11;

const floorTiles = ["B2", "C2", "D2", "E2", "B3", "C3", "D3", "E3", "B4", "C4", "D4", "E4"];
const topWalls = ["A1", "B1", "C1", "D1", "E1", "F1"];
const bottomWalls = ["G3", "H3", "I3", "J3"];

type RoomLayout = {
  name: string;
  seed: string;
  waterX: number;
  waterY: number;
  waterW: number;
  waterH: number;
  stairsUp: [number, number];
  stairsDown: [number, number];
};

const layouts: RoomLayout[] = [
  { name: "Flooded antechamber", seed: "A-017", waterX: 9, waterY: 5, waterW: 4, waterH: 3, stairsUp: [3, 8], stairsDown: [13, 8] },
  { name: "Twin stair cistern", seed: "B-042", waterX: 3, waterY: 5, waterW: 4, waterH: 3, stairsUp: [11, 4], stairsDown: [7, 8] },
  { name: "The low vault", seed: "C-083", waterX: 6, waterY: 3, waterW: 5, waterH: 3, stairsUp: [3, 8], stairsDown: [13, 8] },
];

function imageFor(tile: TileId) {
  return `${TILE_ROOT}/${tile}.png`;
}

function tileFor(layout: RoomLayout, x: number, y: number): TileId {
  if (y === 0) return topWalls[x === 0 ? 0 : x === COLS - 1 ? 5 : (x % 4) + 1];
  if (y === ROWS - 1) return bottomWalls[x === 0 ? 0 : x === COLS - 1 ? 3 : (x % 4)];
  if (x === 0) return ["A2", "A3", "A4"][y % 3];
  if (x === COLS - 1) return ["F2", "F3", "F4"][y % 3];

  const inWater = x >= layout.waterX && x < layout.waterX + layout.waterW && y >= layout.waterY && y < layout.waterY + layout.waterH;
  if (inWater) {
    const edgeTop = y === layout.waterY;
    const edgeLeft = x === layout.waterX;
    const edgeRight = x === layout.waterX + layout.waterW - 1;
    if (edgeTop) return ["H4", "I4", "J4", "K4"][(x - layout.waterX) % 4];
    if (edgeLeft) return "H5";
    if (edgeRight) return "K5";
    return ["I5", "J5"][(x + y) % 2];
  }

  if (x === layout.stairsUp[0] && y === layout.stairsUp[1]) return "G4";
  if (x === layout.stairsDown[0] && y === layout.stairsDown[1]) return "G5";
  return floorTiles[(x * 3 + y * 5) % floorTiles.length];
}

function buildRoom(layout: RoomLayout) {
  return Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => tileFor(layout, x, y)),
  );
}

function roleFor(tile: TileId) {
  if (tile.startsWith("H4") || tile.endsWith("5")) return "water";
  if (tile === "G4" || tile === "G5") return "stairs";
  if (tile.endsWith("1") && tile !== "H1") return "perspective wall";
  if (tile.startsWith("A") || tile.startsWith("F") || tile === "G3" || tile === "H3" || tile === "I3" || tile === "J3") return "wall cap";
  return "floor";
}

export function FirstGeneratedRoom() {
  const [layoutIndex, setLayoutIndex] = useState(0);
  const layout = layouts[layoutIndex];
  const room = useMemo(() => buildRoom(layout), [layout]);

  return (
    <main className="room-shell">
      <style>{`
        .room-shell { min-height:100vh; background:#11151b; color:#e9e0cc; padding:28px; font-family:'Space Mono', ui-monospace, monospace; }
        .room-frame { max-width:1120px; margin:0 auto; border:1px solid #394149; background:#1a2027; box-shadow:0 22px 70px rgba(0,0,0,.35); }
        .room-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:25px 28px 22px; border-bottom:1px solid #394149; }
        .eyebrow { margin:0 0 8px; color:#d3a85f; font-size:10px; letter-spacing:.18em; text-transform:uppercase; }
        .room-title { margin:0; color:#f4eedf; font:600 30px/1.05 Georgia, serif; letter-spacing:-.03em; }
        .room-subtitle { margin:9px 0 0; color:#8e9aa0; font-size:11px; line-height:1.6; max-width:530px; }
        .regen { display:flex; align-items:center; gap:9px; border:1px solid #bd8d45; background:#bd8d45; color:#161a1e; padding:11px 14px; font:700 11px 'Space Mono',monospace; cursor:pointer; text-transform:uppercase; letter-spacing:.06em; }
        .regen:hover { background:#d7ad67; }
        .room-body { padding:24px 28px 28px; }
        .map-stage { overflow:auto; border:1px solid #4b5559; background:#0d1014; padding:22px; }
        .map { display:grid; grid-template-columns:repeat(${COLS}, 32px); grid-template-rows:repeat(${ROWS}, 32px); width:max-content; margin:auto; image-rendering:pixelated; image-rendering:crisp-edges; box-shadow:0 0 0 7px #20272d, 0 0 0 8px #59635f; }
        .tile { width:32px; height:32px; display:block; image-rendering:pixelated; image-rendering:crisp-edges; }
        .tile:hover { outline:1px solid #e1bc78; outline-offset:-1px; position:relative; z-index:1; }
        .under-map { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:18px; color:#849095; font-size:10px; }
        .under-map strong { color:#e3d3b2; font-weight:400; }
        .specs { display:grid; grid-template-columns:1.3fr 1fr 1fr; gap:1px; margin-top:22px; background:#394149; border:1px solid #394149; }
        .spec { background:#20272d; padding:16px; min-height:73px; }
        .spec-label { display:flex; align-items:center; gap:7px; color:#748188; font-size:9px; letter-spacing:.12em; text-transform:uppercase; }
        .spec-value { margin-top:9px; color:#f1e5ca; font-size:12px; }
        .legend { display:flex; align-items:center; flex-wrap:wrap; gap:16px; margin-top:18px; color:#849095; font-size:10px; }
        .legend-item { display:flex; align-items:center; gap:7px; }
        .swatch { width:8px; height:8px; border:1px solid #c7ad7d; background:#c7ad7d; }
        .swatch.water { background:#5d94a0; border-color:#83bbc0; }
        .swatch.stairs { background:#bd8d45; border-color:#e5bd74; }
        .note { margin:19px 0 0; padding:13px 15px; border-left:2px solid #bd8d45; color:#aeb5af; font-size:10px; line-height:1.7; background:#1c2329; }
        @media (max-width:680px) { .room-shell{padding:12px}.room-header{padding:20px;display:block}.regen{margin-top:18px}.room-body{padding:16px}.room-title{font-size:26px}.specs{grid-template-columns:1fr}.under-map{display:block;line-height:1.8} }
      `}</style>
      <section className="room-frame">
        <header className="room-header">
          <div>
            <p className="eyebrow">Room generator / first pass</p>
            <h1 className="room-title">{layout.name}</h1>
            <p className="room-subtitle">A compact stone chamber assembled from the labeled atlas. Perspective walls stay full-face; narrow caps only close the visible boundaries.</p>
          </div>
          <button className="regen" type="button" onClick={() => setLayoutIndex((index) => (index + 1) % layouts.length)}>
            <RefreshCw size={14} strokeWidth={2.5} /> Regenerate room
          </button>
        </header>
        <div className="room-body">
          <div className="map-stage" aria-label={`${layout.name} tile preview`}>
            <div className="map">
              {room.flatMap((row, y) => row.map((tile, x) => (
                <img className="tile" key={`${x}-${y}-${tile}`} src={imageFor(tile)} alt={`${tile}, ${roleFor(tile)}, grid ${x + 1} by ${y + 1}`} title={`${tile} · ${roleFor(tile)}`} />
              )))}
            </div>
          </div>
          <div className="under-map">
            <span><strong>SEED {layout.seed}</strong> · 16 × 11 cells · deterministic layout</span>
            <span>Atlas coordinates preserved in tile IDs</span>
          </div>
          <div className="specs">
            <div className="spec"><div className="spec-label"><Ruler size={12} /> Native scale</div><div className="spec-value">32 × 32 CSS px / tile</div></div>
            <div className="spec"><div className="spec-label"><Droplets size={12} /> Chamber</div><div className="spec-value">{layout.waterW} × {layout.waterH} water pocket</div></div>
            <div className="spec"><div className="spec-label"><Sparkles size={12} /> Tile source</div><div className="spec-value">32 × 32 PNG atlas</div></div>
          </div>
          <div className="legend">
            <span className="legend-item"><i className="swatch" /> floor / wall cap</span>
            <span className="legend-item"><i className="swatch water" /> water + edge transition</span>
            <span className="legend-item"><i className="swatch stairs" /> ascending / descending</span>
          </div>
          <p className="note">Generation rule: labels containing <strong>perspective</strong> render as the room's full back face. Non-perspective wall labels remain thin top or side caps and never substitute for those pieces.</p>
        </div>
      </section>
    </main>
  );
}

export default FirstGeneratedRoom;