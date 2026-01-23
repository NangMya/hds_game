"use client";
import { MapContainer, ImageOverlay, useMap, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { AnimatePresence, motion } from "framer-motion";

// --- Constants ---
const MAP_PIXEL_WIDTH = 1000;
const MAP_PIXEL_HEIGHT = 1000;
const MAP_PHYSICAL_WIDTH_M = 10;
const MAP_PHYSICAL_HEIGHT_M = 10;
const MAP_BOUNDS: [[number, number], [number, number]] = [[0, 0], [MAP_PIXEL_WIDTH, MAP_PIXEL_HEIGHT]];
const MAP_CENTER: [number, number] = [MAP_PIXEL_WIDTH / 2, MAP_PIXEL_HEIGHT / 2];

const SCALE_X = MAP_PIXEL_WIDTH / MAP_PHYSICAL_WIDTH_M;
const SCALE_Y = MAP_PIXEL_HEIGHT / MAP_PHYSICAL_HEIGHT_M;

// ပေ ၃၀ သည် မီတာအားဖြင့် ၉.၁၄၄ မီတာခန့် ရှိသည်
const SPAWN_RADIUS_M = 9.144; 
const MAX_ALLOWED_RADIUS_M = 30; // Border နီသွားမယ့် အကွာအဝေး
const COLLECT_DISTANCE_M = 1.5; 

// Treasure Box အတွက် Leaflet Icon သတ်မှတ်ခြင်း
const treasureIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2906/2906231.png', // Treasure box icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// --- Helper Functions ---
function meters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6378137;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function randomPointInCircle(centerLat: number, centerLon: number, radiusM: number) {
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * radiusM; // uniform distribution
  const dx = r * Math.cos(angle);
  const dy = r * Math.sin(angle);
  // Lat/Lon conversion approximation for small distances
  return { 
    lat: centerLat + (dy / 111111), 
    lon: centerLon + (dx / (111111 * Math.cos(centerLat * Math.PI / 180))) 
  };
}

type Box = { id: number; lat: number; lon: number; collected: boolean };

function CameraFollow({ gps, heading, onExceedRadius }: { gps: GeolocationPosition | null; heading: number; onExceedRadius: () => void }) {
  const map = useMap();
  const origin = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!gps) return;
    if (!origin.current) { origin.current = gps; return; }

    const dist = meters(origin.current.coords.latitude, origin.current.coords.longitude, gps.coords.latitude, gps.coords.longitude);
    if (dist > MAX_ALLOWED_RADIUS_M) onExceedRadius();

    const dx_m = meters(origin.current.coords.latitude, origin.current.coords.longitude, origin.current.coords.latitude, gps.coords.longitude) * (gps.coords.longitude > origin.current.coords.longitude ? 1 : -1);
    const dy_m = meters(origin.current.coords.latitude, origin.current.coords.longitude, gps.coords.latitude, origin.current.coords.longitude) * (gps.coords.latitude > origin.current.coords.latitude ? -1 : 1);

    map.panTo([MAP_CENTER[0] + (dy_m * SCALE_Y), MAP_CENTER[1] + (dx_m * SCALE_X)], { animate: true });

    const mapPane = map.getPane("mapPane");
    if (mapPane) {
      mapPane.style.transformOrigin = "50% 50%";
      mapPane.style.transform = `${mapPane.style.transform} rotate(${-heading}deg)`;
    }
  }, [gps, heading]);

  return null;
}

export default function GameMap() {
  const [gps, setGps] = useState<GeolocationPosition | null>(null);
  const [heading, setHeading] = useState(0);
  const [borderRed, setBorderRed] = useState(false);
  const [originGPS, setOriginGPS] = useState<GeolocationPosition | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [collectedBoxMsg, setCollectedBoxMsg] = useState<string | null>(null);
  const [allCollected, setAllCollected] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { 
        setGps(pos); 
        if (!originGPS) setOriginGPS(pos); 
      },
      console.error, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [originGPS]);

  useEffect(() => {
    if (!originGPS) return;
    const newBoxes: Box[] = Array.from({ length: 5 }, (_, i) => {
      const point = randomPointInCircle(originGPS.coords.latitude, originGPS.coords.longitude, SPAWN_RADIUS_M);
      return { id: i, ...point, collected: false };
    });
    setBoxes(newBoxes);
  }, [originGPS]);

  const handleBoxClick = (box: Box) => {
    if (!gps) return;
    const dist = meters(gps.coords.latitude, gps.coords.longitude, box.lat, box.lon);
    
    if (dist <= COLLECT_DISTANCE_M) {
      setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, collected: true } : b));
      setCollectedBoxMsg("Chest Opened! 💰");
      setTimeout(() => setCollectedBoxMsg(null), 2000);
    } else {
      alert(`Too far! You are ${dist.toFixed(1)}m away. Move closer (within 1.5m).`);
    }
  };

  useEffect(() => {
    if (boxes.length > 0 && boxes.every(b => b.collected)) setAllCollected(true);
  }, [boxes]);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative", border: borderRed ? "8px solid red" : "none", overflow: "hidden" }}>
      <MapContainer crs={L.CRS.Simple} center={MAP_CENTER} zoom={0} zoomControl={false} style={{ height: "100%", width: "100%", background: "#1a1a1a" }}>
        <ImageOverlay url="/images/3.png" bounds={MAP_BOUNDS} />
        
        <CameraFollow gps={gps} heading={heading} onExceedRadius={() => setBorderRed(true)} />

        {/* Play Area Circle (30ft radius) */}
        {originGPS && (
          <Circle center={MAP_CENTER} radius={SPAWN_RADIUS_M * ((SCALE_X + SCALE_Y) / 2)} pathOptions={{ color: 'lime', fillOpacity: 0.1, dashArray: '5, 10' }} />
        )}

        {/* Treasure Boxes */}
        {boxes.map((box) => !box.collected && (
          <Marker 
            key={box.id} 
            position={[
              MAP_CENTER[0] + (box.lat - originGPS!.coords.latitude) * 111111 * SCALE_Y, 
              MAP_CENTER[1] + (box.lon - originGPS!.coords.longitude) * (111111 * Math.cos(box.lat * Math.PI / 180)) * SCALE_X
            ]}
            icon={treasureIcon}
            eventHandlers={{ click: () => handleBoxClick(box) }}
          />
        ))}
      </MapContainer>

      {/* UI Elements */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 50, height: 50, background: "url('https://cdn-icons-png.flaticon.com/512/1177/1177568.png') no-repeat center/contain", zIndex: 1000, pointerEvents: "none" }} />
      
      <div style={{ position: "absolute", top: 20, left: 20, color: "white", background: "rgba(0,0,0,0.6)", padding: "10px", borderRadius: "8px" }}>
        Chests: {boxes.filter(b => b.collected).length} / {boxes.length}
      </div>

      <AnimatePresence>
        {collectedBoxMsg && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ position: "absolute", bottom: 100, left: "35%", color: "gold", fontSize: "20px", fontWeight: "bold", textShadow: "2px 2px black" }}>
            {collectedBoxMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}