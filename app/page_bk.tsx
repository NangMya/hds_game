"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const FreeMap = dynamic(() => import("../components/FreeMap"), { ssr: false });

// 20ft x 20ft area အတွက် scale ညှိထားခြင်း
const LAT_PER_FOOT = 1 / 364000;
const LON_PER_FOOT = 1 / (364000 * Math.cos(16.8076918 * Math.PI / 180));
const AREA_SIZE = 40; // ပေ ၄၀ ပတ်လည် Area အဖြစ် သတ်မှတ်မယ်


export default function Home() {
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [initialPos, setInitialPos] = useState<[number, number] | null>(null);
  const [gameBoxes, setGameBoxes] = useState<any[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("game_user");
    setUser(savedUser ? JSON.parse(savedUser) : { id: 1, username: "Player 1" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setInitialPos([lat, lng]);

        // Box များကို Area အတွင်း ကျပန်းချထားခြင်း
        const boxes = [
          { id: 1, type: "Gold Chest" },
          { id: 2, type: "Silver Chest" },
          { id: 3, type: "Medicine Pack" },
          { id: 4, type: "Treasure Chest" },
        ].map(box => ({
          ...box,
          lat: lat + (Math.random() * AREA_SIZE - AREA_SIZE/2) * LAT_PER_FOOT,
          lng: lng + (Math.random() * AREA_SIZE - AREA_SIZE/2) * LON_PER_FOOT,
        }));
        setGameBoxes(boxes);
      },
      (err) => alert("GPS error! Please allow location access."),
      { enableHighAccuracy: true }
    );
  }, []);

  if (!user || !initialPos) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-slate-900 font-bold">
        {!user ? "Verifying Login..." : "Searching for GPS..."}
      </div>
    );
  }

  return (
    <main className="h-screen w-full overflow-hidden">
      <FreeMap
        userId={user.id}
        boxes={gameBoxes}
        centerLat={initialPos[0]}
        centerLng={initialPos[1]}
      />
    </main>
  );
}

// "use client";
// import { useState, useEffect } from "react";
// import dynamic from "next/dynamic";

// const PhaserGame = dynamic(() => import("../components/PhaserGame"), {
//   ssr: false,
// });

// export default function Home() {
//   const [initialPos, setInitialPos] = useState<[number, number] | null>(null);
//   const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
//   const [gameBoxes, setGameBoxes] = useState<any[]>([]);

//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition((pos) => {
//       const lat = pos.coords.latitude;
//       const lng = pos.coords.longitude;

//       console.log("lat", lat);
//       console.log("lng", lng);
//       setInitialPos([lat, lng]);
//       setCurrentPos([lat, lng]);

//       // Player ရဲ့ ပတ်ပတ်လည်မှာ Box ၅ ခု Random ချမယ်
//       const boxes = Array.from({ length: 5 }).map((_, i) => ({
//         id: i,
//         lat: lat + (Math.random() * 0.0002 - 0.0001),
//         lng: lng + (Math.random() * 0.0002 - 0.0001),
//         type: "Treasure",
//       }));
//       setGameBoxes(boxes);
//     });

//     const watchId = navigator.geolocation.watchPosition(
//       (pos) => {
//         // Accuracy 10-15 meter ထက် ပိုဆိုးရင် လက်မခံနဲ့
//         if (pos.coords.accuracy > 10) return;

//         setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
//       },
//       null,
//       {
//         enableHighAccuracy: true,
//         maximumAge: 0,
//         timeout: 1000, // ၅ စက္ကန့်အတွင်း data မရရင် error ပြခိုင်းမယ်
//       },
//     );

//     return () => navigator.geolocation.clearWatch(watchId);
//   }, []);

//   if (!initialPos || !currentPos)
//     return (
//       <div className="h-screen bg-black text-white flex items-center justify-center">
//         GPS Loading...
//       </div>
//     );

//   return (
//     <main className="h-screen w-full bg-black overflow-hidden relative">
//       <PhaserGame
//         centerLat={initialPos[0]}
//         centerLng={initialPos[1]}
//         currentLat={currentPos[0]}
//         currentLng={currentPos[1]}
//         boxes={gameBoxes}
//       />

//       <div className="absolute top-5 left-5 z-50 text-white bg-black/50 p-2 rounded">
//         GPS: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}
//       </div>
//     </main>
//   );
// }
