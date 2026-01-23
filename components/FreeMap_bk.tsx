"use client";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, Marker, ImageOverlay, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const LAT_PER_FOOT = 1 / 364000;
const LON_PER_FOOT = 1 / (364000 * Math.cos(16.8076918 * Math.PI / 180));
const AREA_SIZE = 60; 

// Camera Follow Component
function MapCamera({ gpsPosition }: { gpsPosition: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    // လက်နဲ့ လုံးဝ ရွှေ့လို့ မရအောင် လုပ်ဆောင်ချက်အားလုံးကို ပိတ်ထားခြင်း
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if ((map as any).tap) (map as any).tap.disable();
    
    // GPS အတိုင်းသာ Camera ကို ရွှေ့ပေးခြင်း
    map.setView(gpsPosition, map.getZoom(), { animate: true, duration: 0.8 });
  }, [gpsPosition, map]);

  return null;
}

export default function FreeMap({ boxes: initialBoxes, centerLat, centerLng }: any) {
  const [gpsPosition, setGpsPosition] = useState<[number, number]>([centerLat, centerLng]);
  const [gameBoxes, setGameBoxes] = useState(initialBoxes);
  
  const imageBounds = useMemo(() => {
    const latOffset = (AREA_SIZE / 2) * LAT_PER_FOOT;
    const lngOffset = (AREA_SIZE / 2) * LON_PER_FOOT;
    return [
      [centerLat - latOffset, centerLng - lngOffset],
      [centerLat + latOffset, centerLng + lngOffset],
    ] as L.LatLngBoundsExpression;
  }, [centerLat, centerLng]);

  const charIcon = useMemo(() => L.icon({
    iconUrl: "/images/human.png",
    iconSize: [100, 100],
    iconAnchor: [50, 50], 
  }), []);

  const boxIcon = useMemo(() => L.icon({
    iconUrl: "/images/box.png",
    iconSize: [45, 45],
    iconAnchor: [22, 22],
  }), []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 30) return; 
        setGpsPosition([latitude, longitude]);
      },
      console.error,
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="h-screen w-full relative bg-[#0a0a0a] overflow-hidden touch-none">
      
      {/* UI layer */}
      <div className="absolute top-8 left-5 z-[1000] pointer-events-none">
        <div className="bg-black/70 p-3 rounded-2xl text-white font-bold border border-white/10 shadow-2xl">
          ⭐ Score: {gameBoxes.length} Remaining
        </div>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={22}
        dragging={false} 
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "transparent" }}
      >
        <ImageOverlay url="/images/3.png" bounds={imageBounds} />

        {/* GPS နှင့် Camera ကို ချိတ်ဆက်ပေးခြင်း */}
        <MapCamera gpsPosition={gpsPosition} />

        {/* Character ကို အမြဲတမ်း Camera အလယ်မှာ ပေါ်နေစေဖို့ GPS Position ပေးထားခြင်း */}
        <Marker position={gpsPosition} icon={charIcon} zIndexOffset={1000} />

        {/* Boxes တွေကတော့ Map ပေါ်မှာ Fixed နေရာနဲ့ ကျန်ခဲ့မယ် */}
        {gameBoxes.map((box: any) => (
          <Marker
            key={box.id}
            position={[box.lat, box.lng]}
            icon={boxIcon}
          />
        ))}
      </MapContainer>

      {/* လမ်းညွှန်ချက် အပို (Overlay) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] text-white/50 text-sm italic font-light pointer-events-none">
        Move in real life to explore the map
      </div>
    </div>
  );
}