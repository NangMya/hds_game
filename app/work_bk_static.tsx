"use client";
import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";

interface Box {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

// for 100 ft
// const ROOM_SIZE_FT = 100;
// const PIXEL_SCALE = 20;
// const BOX_COUNT = 5;
// const STEP_LENGTH = 0.8;
// const PICKUP_RANGE = 2.5;

// for 20 ft
const ROOM_SIZE_FT = 20;
const PIXEL_SCALE = 100;
const BOX_COUNT = 5;
const STEP_LENGTH = 0.5;
const PICKUP_RANGE = 1;

export default function RadarVirtualWorldFix() {
  const [playerPosition, setPlayerPosition] = useState({
    x: ROOM_SIZE_FT / 2,
    y: ROOM_SIZE_FT / 2,
  });
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [inventory, setInventory] = useState<number[]>([]);
  const [nearestInfo, setNearestInfo] = useState({
    distance: 0,
    angle: 0,
    id: -1,
  });
  const [message, setMessage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [mag, setMag] = useState(0);
  const [isOutOfBounds, setIsOutOfBounds] = useState(false);
  const boxesRef = useRef<Box[]>([]);
  const inventoryRef = useRef<HTMLDivElement>(null);

  const gameRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: ROOM_SIZE_FT / 2, y: ROOM_SIZE_FT / 2 });
  const stepCooldown = useRef(0);
  const deviceOrientation = useRef(0);
  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    const newBoxes: any[] = [];
    const center = ROOM_SIZE_FT / 2;
    const maxRadius = Math.max(0, ROOM_SIZE_FT / 2 - 5);
    for (let i = 0; i < BOX_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * maxRadius;
      newBoxes.push({
        id: i,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        collected: false,
      });
    }
    setBoxes(newBoxes);
    boxesRef.current = newBoxes;
    updateNearest(pos.current, newBoxes);
    // updateNearest(pos.current, boxesRef.current);
  }, [ROOM_SIZE_FT]);

  const updateNearest = (
    currentPos: { x: number; y: number },
    currentBoxes: Box[],
  ) => {
    const active = currentBoxes.filter((b) => !b.collected);
    if (active.length === 0) {
      setNearestInfo({ distance: 0, angle: 0, id: -1 });
      return;
    }
    let minD = Infinity;
    let target = active[0];
    active.forEach((b) => {
      const d = Math.sqrt(
        (currentPos.x - b.x) ** 2 + (currentPos.y - b.y) ** 2,
      );
      if (d < minD) {
        minD = d;
        target = b;
      }
    });
    const angle =
      Math.atan2(target.y - currentPos.y, target.x - currentPos.x) *
      (180 / Math.PI);
    setNearestInfo({ distance: minD, angle, id: target.id });
  };

  const onBoxClick = (box: Box) => {
    const dist = Math.sqrt(
      (pos.current.x - box.x) ** 2 + (pos.current.y - box.y) ** 2,
    );
    if (dist <= PICKUP_RANGE) {
      const updatedBoxes = boxes.map((b) =>
        b.id === box.id ? { ...b, collected: true } : b,
      );
      setBoxes(updatedBoxes);
      setInventory((prev) => [...prev, box.id]);
      updateNearest(pos.current, updatedBoxes);
      setMessage("Added to Bag! 🎒");
    } else {
      setMessage(`Too far! Move closer.`);
    }
    setTimeout(() => setMessage(""), 2000);
  };

  const startJourney = async () => {
    const DM = DeviceMotionEvent as any;
    if (typeof DM.requestPermission === "function") {
      const res = await DM.requestPermission();
      if (res === "granted") initGame();
    } else {
      initGame();
    }
  };

  const initGame = () => {
    window.addEventListener("devicemotion", (e) => {
      const acc = e.acceleration;
      if (!acc || acc.x === null) return;

      const m = Math.sqrt(acc.x ** 2 + acc.y! ** 2 + acc.z! ** 2);
      setMag(m);

      const now = Date.now();
      if (m > 0.4 && m < 0.6 && now > stepCooldown.current) {
        stepCooldown.current = now + 600;

        const alpha = deviceOrientation.current;
        pos.current.x += Math.sin(alpha) * STEP_LENGTH;
        pos.current.y -= Math.cos(alpha) * STEP_LENGTH;

        setIsOutOfBounds(
          pos.current.x < 0 ||
            pos.current.x > ROOM_SIZE_FT ||
            pos.current.y < 0 ||
            pos.current.y > ROOM_SIZE_FT,
        );

        pos.current.x = Math.max(
          -0.5,
          Math.min(ROOM_SIZE_FT + 0.5, pos.current.x),
        );
        pos.current.y = Math.max(
          -0.5,
          Math.min(ROOM_SIZE_FT + 0.5, pos.current.y),
        );

        //  ONLY remaining boxes are considered
        updateNearest(pos.current, boxesRef.current);

        setPlayerPosition({ ...pos.current });
      }
    });

    window.addEventListener("deviceorientation", (e) => {
      let alpha = (e as any).webkitCompassHeading || 360 - (e.alpha || 0);
      deviceOrientation.current = (alpha * Math.PI) / 180;
    });
    setIsStarted(true);
  };

  return (
    <main
      ref={gameRef}
      className={`fixed inset-0 w-full h-[100vh] bg-black overflow-hidden flex flex-col items-center justify-center font-sans select-none touch-none transition-all duration-300 ${isOutOfBounds ? "ring-[16px] ring-inset ring-red-600/80 shadow-[0_0_60px_rgba(220,38,38,0.8)]" : ""}`}
    >
      {!isStarted && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black">
          <button
            onClick={startJourney}
            className="bg-indigo-600 text-white px-10 py-5 rounded-full font-black tracking-widest active:scale-95 transition-all"
          >
            START JOURNEY
          </button>
        </div>
      )}

      {/* Bag & Distance */}
      {isStarted && (
        <>
          <button
            onClick={() => setShowBag(true)}
            className="absolute top-6 right-6 z-[200] w-14 h-14 bg-zinc-900 border border-white/20 rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90"
          >
            🎒{" "}
            {inventory.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {inventory.length}
              </span>
            )}
          </button>
          <div className="absolute top-10 z-[200] text-center pointer-events-none">
            <div className="bg-zinc-900/90 px-6 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Target
              </p>
              <div className="text-white font-mono text-3xl font-black">
                {nearestInfo.id === -1
                  ? "---"
                  : `${nearestInfo.distance.toFixed(1)} FT`}
              </div>
              {message && (
                <p className="text-yellow-400 text-[10px] mt-1 font-bold animate-pulse">
                  {message}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* World Map Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-visible">
        <div
          className="absolute transition-transform duration-500 ease-out z-[50]"
          style={{
            transform: `translate(${(ROOM_SIZE_FT / 2 - playerPosition.x) * PIXEL_SCALE}px, ${(ROOM_SIZE_FT / 2 - playerPosition.y) * PIXEL_SCALE}px)`,
          }}
        >
          <div
            className="absolute rounded-full border border-white/5"
            style={{
              width: 90 * PIXEL_SCALE,
              height: 90 * PIXEL_SCALE,
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* Grid lines - Dynamic Scale */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none"
            style={{
              width: `${ROOM_SIZE_FT * PIXEL_SCALE * 4}px`,
              height: `${ROOM_SIZE_FT * PIXEL_SCALE * 4}px`,
              backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
              backgroundSize: `${PIXEL_SCALE}px ${PIXEL_SCALE}px`,
            }}
          />

          {/*  Boxes - High Z-Index to stay on top in Virtual World */}
          {boxes.map(
            (box) =>
              !box.collected && (
                <div
                  key={box.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoxClick(box);
                  }}
                  className="absolute text-7xl cursor-pointer pointer-events-auto active:scale-90 z-[100]"
                  style={{
                    left: `${(box.x - ROOM_SIZE_FT / 2) * PIXEL_SCALE}px`,
                    top: `${(box.y - ROOM_SIZE_FT / 2) * PIXEL_SCALE}px`,
                    transform: "translate(-50%, -50%)",
                    filter:
                      nearestInfo.id === box.id
                        ? "drop-shadow(0 0 25px #fbbf24)"
                        : "brightness(0.2)",
                  }}
                >
                  📦
                </div>
              ),
          )}
        </div>

        {/*  Fixed Player Indicator (Stay in Center) */}
        <div className="relative z-[10] pointer-events-none opacity-90">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
            <div className="w-2.5 h-8 bg-blue-600 rounded-full mb-8" />
          </div>
          <div
            className="absolute -inset-8 border-t-4 border-yellow-400 rounded-full transition-transform"
            style={{ transform: `rotate(${nearestInfo.angle + 90}deg)` }}
          />
        </div>
      </div>

      {/* Popups (Inventory & Victory) */}
      {showBag && (
        <div
          className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowBag(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 w-full max-w-xs rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold uppercase text-xs tracking-widest">
                Inventory
              </h3>
              <button
                onClick={() => setShowBag(false)}
                className="text-zinc-500 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-3xl ${inventory.includes(i) ? "bg-yellow-500/20 border border-yellow-500" : "bg-zinc-800"}`}
                >
                  {inventory.includes(i) ? "📦" : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {inventory.length === BOX_COUNT && (
        <div className="absolute inset-0 z-[400] bg-black flex flex-col items-center justify-center p-8">
          <div
            ref={inventoryRef}
            style={{
              backgroundColor: "#18181b",
              padding: "40px",
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                fontWeight: "900",
                fontSize: "20px",
                marginBottom: "20px",
              }}
            >
              MISSION COMPLETE
            </h2>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {inventory.map((boxId) => (
                <span
                  key={boxId}
                  style={{
                    fontSize: "40px",
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))", // ပုံလေး နည်းနည်းကြွလာအောင်
                  }}
                >
                  📦
                </span>
              ))}
              {inventory && inventory.length < 1 && (
                <span style={{ color: "#52525b", fontSize: "14px" }}>
                  Empty Inventory
                </span>
              )}
            </div>
            <p
              style={{ color: "#71717a", fontSize: "12px", marginTop: "20px" }}
            >
              RADAR VIRTUAL WORLD
            </p>
          </div>

          <button
            onClick={async () => {
              const el = inventoryRef.current;
              if (!el) return;

              try {
                const h2c = (await import("html2canvas")).default;
                const canvas = await h2c(el, {
                  backgroundColor: "#18181b",
                  scale: 2,
                  useCORS: true,
                  ignoreElements: (element) => element.tagName === "IFRAME",
                });

                const data = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = data;
                link.download = "victory.png";
                link.click();
              } catch (e) {
                console.error(e);
                alert(
                  "Capture failed again. Your browser might be forcing a dark mode filter.",
                );
              }
            }}
            className="mt-10 bg-white text-black px-12 py-4 rounded-2xl font-black text-lg active:scale-95 transition-all"
          >
            SAVE SCREENSHOT 📸
          </button>
        </div>
      )}

      {/* Minimap */}
      <div
        className={`absolute bottom-10 right-6 w-28 h-28 bg-zinc-900/80 border rounded-2xl overflow-hidden pointer-events-none z-[200] ${isOutOfBounds ? "border-red-500" : "border-white/10"}`}
      >
        <div className="relative w-full h-full p-1">
          {boxes.map(
            (box) =>
              !box.collected && (
                <div
                  key={`m-${box.id}`}
                  className={`absolute rounded-full ${nearestInfo.id === box.id ? "w-2 h-2 bg-yellow-400 shadow-[0_0_5px_#fbbf24]" : "w-1 h-1 bg-white/40"}`}
                  style={{
                    left: `${(box.x / ROOM_SIZE_FT) * 100}%`,
                    top: `${(box.y / ROOM_SIZE_FT) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ),
          )}
          <div
            className={`absolute w-2 h-2 rounded-full border border-white ${isOutOfBounds ? "bg-red-500" : "bg-blue-500"}`}
            style={{
              left: `${(playerPosition.x / ROOM_SIZE_FT) * 100}%`,
              top: `${(playerPosition.y / ROOM_SIZE_FT) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
    </main>
  );
}
