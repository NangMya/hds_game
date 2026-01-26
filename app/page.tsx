"use client";
import { useState, useEffect, useRef } from "react";

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
  const [usernameInput, setUsernameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [forceFinalScreen, setForceFinalScreen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string } | null>(
    null,
  );
  const gameRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: ROOM_SIZE_FT / 2, y: ROOM_SIZE_FT / 2 });
  const deviceOrientation = useRef(0);
  let lastStepTime = 0;
  // const lastStepTime = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [calibPopup, setCalibPopup] = useState<string | null>(null);
  const calibrating = useRef(false);
  const calibSamples = useRef<number[]>([]);
  const stepThresholdRef = useRef(10);
  const gravityBaseRef = useRef(9.5);

  useEffect(() => {
    boxesRef.current = boxes;
    const savedUser = localStorage.getItem("game_user");
    if (savedUser) setUser(JSON.parse(savedUser));
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

  const onBoxClick = async (box: Box) => {
    const dist = Math.sqrt(
      (pos.current.x - box.x) ** 2 + (pos.current.y - box.y) ** 2,
    );
    if (dist <= PICKUP_RANGE) {
      const updatedBoxes = boxes.map((b) =>
        b.id === box.id ? { ...b, collected: true } : b,
      );
      setBoxes(updatedBoxes);
      updateNearest(pos.current, updatedBoxes);
      try {
        const response = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            pointsToAdd: 10,
            itemName: "test",
          }),
        });

        if (response.ok) {
          setInventory((prev) => [...prev, box.id]);
          setMessage("Added to Bag! 🎒");
        }
      } catch (err) {
        console.error("Save error:", err);
      }
    } else {
      setMessage(`Too far! Move closer.`);
    }
    setTimeout(() => setMessage(""), 2000);
  };

  const startJourney = async () => {
    const DM = DeviceMotionEvent as any;

    if (typeof DM.requestPermission === "function") {
      const res = await DM.requestPermission();
      if (res !== "granted") return;
    }

    startCalibration(); // 👈 NEW
  };
  const startCalibration = () => {
    calibrating.current = true;
    calibSamples.current = [];

    setCalibPopup("GO! 🏃");

    setTimeout(() => {
      initGame();
    }, 1000);
    setTimeout(() => {
      finishCalibration();
      setCalibPopup(null);
    }, 6000);
  };

  const finishCalibration = () => {
    calibrating.current = false;
    const avg =
      calibSamples.current.reduce((a, b) => a + b, 0) /
      calibSamples.current.length;

    const max = Math.max(...calibSamples.current);

    gravityBaseRef.current = avg * 0.96;
    stepThresholdRef.current = max * 0.85;
  };
  const updatePositionThrottled = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      setPlayerPosition({ ...pos.current });
      updateNearest(pos.current, boxesRef.current);
      rafRef.current = null;
    });
  };

  let peakStartTime = 0;
  let isRising = false;

  // const initGame = () => {
  //   window.addEventListener("devicemotion", (e) => {
  //     const acc = e.accelerationIncludingGravity;
  //     if (!acc || acc.z === null) return;

  //     const m = Math.sqrt(acc.x! ** 2 + acc.y! ** 2 + acc.z! ** 2);
  //     setMag(m);
  //     if (calibrating.current) {
  //       calibSamples.current.push(m);
  //       return;
  //     }

  //     const now = Date.now();
  //     let STEP_THRESHOLD = stepThresholdRef.current;
  //     let GRAVITY_BASE = gravityBaseRef.current;
  //     if (stepThresholdRef.current <= 8.8) {
  //       STEP_THRESHOLD = 9.5;
  //     } else if (stepThresholdRef.current <= 10) {
  //       STEP_THRESHOLD = 10;
  //     }

  //     if (gravityBaseRef.current <= 9) {
  //       GRAVITY_BASE = 9;
  //     } else if (gravityBaseRef.current <= 9.5) {
  //       GRAVITY_BASE = 9.5;
  //     }

  //     if (m > GRAVITY_BASE && !isRising) {
  //       isRising = true;
  //       peakStartTime = now;
  //     }

  //     if (m > STEP_THRESHOLD && isRising) {
  //       const riseDuration = now - peakStartTime;

  //       if (riseDuration > 120 && riseDuration < 450) {
  //         if (now - lastStepTime.current > 500) {
  //           // Cooldown
  //           const alpha = deviceOrientation.current;
  //           pos.current.x += Math.sin(alpha) * STEP_LENGTH;
  //           pos.current.y -= Math.cos(alpha) * STEP_LENGTH;
  //           updatePositionThrottled();
  //           setIsOutOfBounds(
  //             pos.current.x < 0 ||
  //               pos.current.x > ROOM_SIZE_FT ||
  //               pos.current.y < 0 ||
  //               pos.current.y > ROOM_SIZE_FT,
  //           );

  //           // pos.current.x = Math.max(
  //           //   -0.5,
  //           //   Math.min(ROOM_SIZE_FT + 0.5, pos.current.x),
  //           // );
  //           // pos.current.y = Math.max(
  //           //   -0.5,
  //           //   Math.min(ROOM_SIZE_FT + 0.5, pos.current.y),
  //           // );

  //           // updateNearest(pos.current, boxesRef.current);
  //           // setPlayerPosition({ ...pos.current });

  //           lastStepTime.current = now;
  //           if (navigator.vibrate) navigator.vibrate(40);
  //         }
  //       }
  //       isRising = false;
  //     }

  //     if (m < GRAVITY_BASE) {
  //       isRising = false;
  //     }
  //   });

  //   window.addEventListener("deviceorientation", (e) => {
  //     let alpha = (e as any).webkitCompassHeading || 360 - (e.alpha || 0);
  //     deviceOrientation.current = (alpha * Math.PI) / 180;
  //   });

  //   setIsStarted(true);
  // };



const initGame = () => {
  window.addEventListener("devicemotion", (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.z === null) return;

    const m = Math.sqrt(acc.x! ** 2 + acc.y! ** 2 + acc.z! ** 2);
    setMag(m);

    const now = Date.now();
    const STEP_THRESHOLD = 10.0;
    const GRAVITY_BASE = 9.5;

    // ၁။ အရှိန် စတက်တာကို ဖမ်းမယ်
    if (m > GRAVITY_BASE && !isRising) {
      isRising = true;
      peakStartTime = now; // အရှိန် စတက်တဲ့ အချိန်ကို မှတ်လိုက်တယ်
    }

    // ၂။ အရှိန်က Threshold ကို ကျော်သွားတဲ့အခါ ကြာချိန်ကို စစ်မယ်
    if (m > STEP_THRESHOLD && isRising) {
      const riseDuration = now - peakStartTime; // အရှိန်တက်ဖို့ ကြာတဲ့အချိန် (Speed)

      // --- Logic ---
      // Shake ရင် riseDuration က အရမ်းတိုတယ် (ဥပမာ < 100ms)
      // လမ်းလျှောက်ရင် riseDuration က ပိုရှည်တယ် (ဥပမာ 150ms ~ 400ms)
      
      if (riseDuration > 120 && riseDuration < 450) {
        if (now - lastStepTime > 500) { // Cooldown
          const alpha = deviceOrientation.current;
          pos.current.x += Math.sin(alpha) * STEP_LENGTH;
          pos.current.y -= Math.cos(alpha) * STEP_LENGTH;

          setPlayerPosition({ ...pos.current });
          updateNearest(pos.current, boxesRef.current);
          
          lastStepTime = now;
          if (navigator.vibrate) navigator.vibrate(40);
        }
      }
      
      // Peak ရောက်သွားပြီမို့ ပြန် Reset လုပ်တယ်
      isRising = false; 
    }

    // ၃။ အရှိန် ပြန်ကျသွားရင် Reset လုပ်ပေးရမယ်
    if (m < GRAVITY_BASE) {
      isRising = false;
    }
  });

  window.addEventListener("deviceorientation", (e) => {
    let alpha = (e as any).webkitCompassHeading || 360 - (e.alpha || 0);
    deviceOrientation.current = (alpha * Math.PI) / 180;
  });

  setIsStarted(true);
};
  const handleRegister = async () => {
    if (!usernameInput) return alert("Please Enter Your Name");
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        body: JSON.stringify({ username: usernameInput }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("game_user", JSON.stringify(data.user));
        setUser(data.user);
        startJourney();
      }
    } catch (err) {
      alert("Error ဖြစ်သွားပါပြီ");
    } finally {
      setIsLoading(false);
    }
  };
  // Confetti အတွက် script ကို load လုပ်ရန်
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const triggerFireworks = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      // @ts-ignore
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      // @ts-ignore
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };
  useEffect(() => {
    if (inventory.length === BOX_COUNT && isStarted) {
      triggerFireworks();
    }
  }, [inventory.length]);

  if (!user || !isStarted) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-5 text-white text-center">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700">
          <h1 className="text-3xl font-bold mb-6">HDS Game 🎮</h1>
          <input
            type="text"
            className="w-full p-4 rounded-xl bg-slate-700 mb-4 outline-none focus:ring-2 ring-yellow-500"
            placeholder="Username..."
            value={usernameInput || user?.username || ""}
            onChange={(e) => setUsernameInput(e.target.value)}
          />
          <button
            onClick={user?.username ? startJourney : handleRegister}
            disabled={isLoading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 p-4 rounded-xl font-bold text-black transition-all"
          >
            {isLoading ? "Please wait..." : "Play"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <main
      ref={gameRef}
      className={`fixed inset-0 w-full h-[100vh] bg-black overflow-hidden flex flex-col items-center justify-center font-sans select-none touch-none transition-all duration-300 ${isOutOfBounds ? "ring-16 ring-inset ring-red-600/80 shadow-[0_0_60px_rgba(220,38,38,0.8)]" : ""}`}
    >
      {isStarted && !forceFinalScreen && (
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="absolute top-6 left-6 z-200 w-14 h-14 bg-red-900/40 border border-red-500/50 rounded-full flex items-center justify-center text-xl shadow-xl active:scale-90 cursor-pointer"
        >
          🛑
        </button>
      )}
      {calibPopup != null && (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="relative">
            {/* စာသားနောက်က အလင်းဝိုင်း (Glow Effect) */}
            <div className="absolute inset-0 bg-yellow-500/20 blur-[80px] rounded-full animate-pulse" />

            <h2 className="text-8xl font-black text-white italic tracking-tighter animate-bounce transition-all duration-300">
              {calibPopup}
            </h2>

            <p className="text-zinc-400 text-center mt-8 font-bold uppercase tracking-widest text-xs">
              {calibPopup === "GO! 🏃"
                ? "Walk forward normally..."
                : "Calibration Starting"}
            </p>
          </div>
        </div>
      )}
      {isStarted && (
        <>
          <button
            onClick={() => setShowBag(true)}
            className="absolute top-6 right-6 z-200 w-14 h-14 bg-zinc-900 border border-white/20 rounded-full flex items-center justify-center text-2xl shadow-xl active:scale-90 cursor-pointer"
          >
            🎁
            {inventory.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {inventory.length}
              </span>
            )}
          </button>
          <div className="absolute top-10 z-200 text-center pointer-events-none">
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
              <p className="text-gray-400 text-[10px] mt-1 font-bold animate-pulse">
                Mag - {mag.toFixed(2)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* World Map Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-visible">
        <div
          className="absolute transition-transform duration-500 ease-out z-50"
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
                  className="absolute text-7xl cursor-pointer pointer-events-auto active:scale-90 z-100"
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
        <div className="relative z-10 pointer-events-none opacity-90">
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
          className="absolute inset-0 z-300 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowBag(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 w-full max-w-xs rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold capitalize text-xs tracking-widest">
                {user?.username}
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

      {(inventory.length === BOX_COUNT || forceFinalScreen) && (
        <div className="absolute inset-0 z-400 bg-black flex flex-col items-center justify-center p-8 text-center">
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
                marginBottom: "10px",
              }}
            >
              {forceFinalScreen ? "GAME OVER" : "MISSION COMPLETE"}
            </h2>
            <p
              style={{
                color: "#fbbf24",
                fontSize: "14px",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              {user?.username}
            </p>

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
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
                  }}
                >
                  📦
                </span>
              ))}
              {inventory.length === 0 && (
                <span style={{ color: "#52525b", fontSize: "14px" }}>
                  No items collected
                </span>
              )}
            </div>
          </div>

          <p className="text-zinc-500 mt-6 text-sm mb-4">
            Save your result to finish
          </p>
          <button
            onClick={async () => {
              const el = inventoryRef.current;
              if (!el) return;

              try {
                const h2c = (await import("html2canvas")).default;
                const canvas = await h2c(el, {
                  backgroundColor: "#18181b",
                  scale: 2,
                });
                const data = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = data;
                link.download = `${user?.username}_victory.png`;
                link.click();

                // "Saved Successfully" ပြရန်
                setIsSaved(true);

                // ၃ စက္ကန့်နေရင် localstorage ရှင်းပြီး ထွက်မယ်
                setTimeout(() => {
                  localStorage.removeItem("game_user");
                  window.location.reload();
                }, 3000);
              } catch (e) {
                console.error(e);
              }
            }}
            className="relative bg-linear-to-r from-green-500 to-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-lg active:scale-95 transition-all overflow-hidden"
          >
            {isSaved ? "✅ SAVED SUCCESSFULLY!" : "SAVE SCREENSHOT 📸 & EXIT"}

            {/* Saved ဖြစ်သွားရင် ပေါ်လာမယ့် အစိမ်းရောင် အလင်းတန်း animation */}
            {isSaved && (
              <div className="absolute inset-0 bg-green-400 animate-pulse opacity-20"></div>
            )}
          </button>

          {isSaved && (
            <p className="mt-4 text-green-400 font-bold animate-bounce">
              Closing mission in 3 seconds...
            </p>
          )}
        </div>
      )}
      {showQuitConfirm && (
        <div className="absolute inset-0 z-500 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 w-full max-w-xs text-center">
            <h3 className="text-white font-bold text-lg mb-6">
              Are you sure to exit?
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  setForceFinalScreen(true); // Inventory screen ကို တန်းပြမယ်
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
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
