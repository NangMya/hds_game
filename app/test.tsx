// // working for acceleration & pedometer

// "use client";
// import { useState, useEffect, useRef } from "react";

// const ROOM_SIZE_FT = 20;
// const PICKUP_RANGE_FT = 1;
// const STEP_LENGTH = 0.7; // ft per step approx

// export default function RealWalkingRoom() {
//   const [playerPosition, setPlayerPosition] = useState({ x: 10, y: 10 });
//   const [boxes, setBoxes] = useState<{ id: number; x: number; y: number; collected: boolean }[]>([]);
//   const [nearestInfo, setNearestInfo] = useState({ distance: 0, angle: 0, id: -1 });
//   const [message, setMessage] = useState("");
//   const [msg,setMsg] = useState(0);

//   const pos = useRef({ x: 10, y: 10 });
//   const lastAccel = useRef({ x: 0, y: 0, z: 0 });
//   const stepCooldown = useRef(0); // ms

//   // Initialize boxes
//   useEffect(() => {
//     const newBoxes = Array.from({ length: 5 }).map((_, i) => ({
//       id: i,
//       x: Math.random() * (ROOM_SIZE_FT - 4) + 2,
//       y: Math.random() * (ROOM_SIZE_FT - 4) + 2,
//       collected: false,
//     }));
//     setBoxes(newBoxes);
//   }, []);

//   // Update nearest box every 50ms
//   useEffect(() => {
//     const updateNearest = () => {
//       const active = boxes.filter((b) => !b.collected);
//       if (active.length === 0) {
//         setNearestInfo({ distance: 0, angle: 0, id: -1 });
//         return;
//       }
//       let minD = Infinity;
//       let target = active[0];
//       active.forEach((b) => {
//         const dx = pos.current.x - b.x;
//         const dy = pos.current.y - b.y;
//         const d = Math.sqrt(dx * dx + dy * dy);
//         if (d < minD) {
//           minD = d;
//           target = b;
//         }
//       });
//       const angle = Math.atan2(target.y - pos.current.y, target.x - pos.current.x) * (180 / Math.PI);
//       setNearestInfo({ distance: minD, angle, id: target.id });
//     };
//     const id = setInterval(updateNearest, 50);
//     return () => clearInterval(id);
//   }, [boxes]);

//  /* ... အပေါ်က အပိုင်းများ အတူတူပင် ... */

//   // Step detection from accelerometer
//   const handleMotion = (event: DeviceMotionEvent) => {
//     // accelerationIncludingGravity က ဖုန်းစောင်းတာကိုပါ ဖမ်းမိတတ်လို့ 
//     // တကယ့် ရွေ့လျားမှုကိုပဲ လိုချင်ရင် acceleration ကို သုံးတာ ပိုငြိမ်ပါတယ်
//     const acc = event.acceleration || event.accelerationIncludingGravity;
//     if (!acc) return;

//     const now = Date.now();
//     if (stepCooldown.current > now) return;

//     // Movement magnitude တွက်ချက်ခြင်း
//     const dx = acc.x! - lastAccel.current.x;
//     const dy = acc.y! - lastAccel.current.y;
//     const dz = acc.z! - lastAccel.current.z;
//     const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
// setMsg(mag);
//     if (mag > 0.4 && mag < 0.6) {// Sensitivity ကို နည်းနည်း ထပ်မြှင့်ထားပါတယ်
//       stepCooldown.current = now + 500; 
      
//       const alpha = deviceOrientation.current; 
      
//       // X = Sin, Y = Cos (North Heading Logic)
//       const moveX = Math.sin(alpha) * STEP_LENGTH;
//       const moveY = Math.cos(alpha) * STEP_LENGTH;

//       pos.current.x += moveX;
//       pos.current.y -= moveY; 

//       pos.current.x = Math.max(0, Math.min(ROOM_SIZE_FT, pos.current.x));
//       pos.current.y = Math.max(0, Math.min(ROOM_SIZE_FT, pos.current.y));

//       setPlayerPosition({ ...pos.current });
//     }
//     lastAccel.current = { x: acc.x!, y: acc.y!, z: acc.z! };
//   };


//   useEffect(() => {
//     const handleOrientation = (event: DeviceOrientationEvent) => {
//       let alpha = 0;
//       if ((event as any).webkitCompassHeading) {
//         alpha = (event as any).webkitCompassHeading;
//       } else {
//         alpha = event.alpha || 0;
//         // Android မှာ အရှေ့တည့်တည့်က 0 ဖြစ်ဖို့ ညှိရန်လိုအပ်နိုင်သည်
//       }
//       deviceOrientation.current = (alpha * Math.PI) / 180;
//     };
    
//     window.addEventListener("deviceorientation", handleOrientation);
//     return () => window.removeEventListener("deviceorientation", handleOrientation);
//   }, []);


//   const handleCollect = (id: number, bx: number, by: number) => {
//     const dx = pos.current.x - bx;
//     const dy = pos.current.y - by;
//     const dist = Math.sqrt(dx * dx + dy * dy);
//     if (dist <= PICKUP_RANGE_FT) {
//       setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, collected: true } : b)));
//       showMessage("Item Collected! 🎉");
//     } else {
//       showMessage(`Too far! Move ${(dist - PICKUP_RANGE_FT).toFixed(1)}ft closer.`);
//     }
//   };

//   const showMessage = (msg: string) => {
//     setMessage(msg);
//     setTimeout(() => setMessage(""), 2000);
//   };

//   // Device orientation for walking direction
//   const deviceOrientation = useRef(0);
  

//   // Request permission and start sensors
//   const startTracking = async () => {
//     if ((DeviceMotionEvent as any).requestPermission) {
//       const res = await (DeviceMotionEvent as any).requestPermission();
//       if (res === "granted") window.addEventListener("devicemotion", handleMotion);
//     } else {
//       window.addEventListener("devicemotion", handleMotion);
//     }
//   };

//   return (
//     <main className="flex flex-col items-center justify-center h-screen bg-slate-950">
//       <div className="text-white text-center mb-4">
//         <h2 className="text-xl font-bold tracking-wider">REAL WALK ROOM</h2>
//         <div className="flex gap-4 justify-center mt-2">
//           <p>mag - {msg.toFixed(3)}</p>
//           <div className="bg-black/40 px-3 py-1 rounded border border-white/10">
//             <span className="text-gray-400 text-xs block">DISTANCE</span>
//             <span className="text-yellow-400 font-mono font-bold">{nearestInfo.distance.toFixed(1)} ft</span>
//           </div>
//           <div className="bg-black/40 px-3 py-1 rounded border border-white/10 flex items-center gap-2">
//             <span className="text-gray-400 text-xs">DIR</span>
//             <div
//               className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px]"
//               style={{ transform: `rotate(${nearestInfo.angle}deg)` }}
//             >
//               ➔
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="relative w-full max-w-[90vh] aspect-square border-2 border-blue-500/30 bg-slate-900 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
//         {message && (
//           <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black px-4 py-1 rounded-full font-bold text-sm shadow-lg animate-bounce">
//             {message}
//           </div>
//         )}

//         {/* Player */}
//         <div
//           className="absolute z-10 pointer-events-none transition-all duration-100"
//           style={{
//             left: `${(playerPosition.x / ROOM_SIZE_FT) * 100}%`,
//             top: `${(playerPosition.y / ROOM_SIZE_FT) * 100}%`,
//             transform: "translate(-50%, -50%)",
//           }}
//         >
//           <div className="absolute inset-0 w-[10vh] h-[10vh] border border-blue-400/30 rounded-full -translate-x-1/2 -translate-y-1/2 bg-blue-400/5" />
//           <div className="w-6 h-6 bg-yellow-400 rounded-full shadow-[0_0_20px_#fbbf24] border-2 border-white" />
//         </div>

//         {/* Boxes */}
//         {boxes.map(
//           (box) =>
//             !box.collected && (
//               <button
//                 key={box.id}
//                 onClick={() => handleCollect(box.id, box.x, box.y)}
//                 className={`absolute z-20 text-3xl transition-all duration-300 hover:scale-125 ${
//                   nearestInfo.id === box.id
//                     ? "opacity-100 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"
//                     : "opacity-40"
//                 }`}
//                 style={{
//                   left: `${(box.x / ROOM_SIZE_FT) * 100}%`,
//                   top: `${(box.y / ROOM_SIZE_FT) * 100}%`,
//                   transform: "translate(-50%, -50%)",
//                 }}
//               >
//                 📦
//               </button>
//             )
//         )}
//       </div>

//       <button
//         className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-full font-bold"
//         onClick={startTracking}
//       >
//         START WALKING
//       </button>
//     </main>
//   );
// }
