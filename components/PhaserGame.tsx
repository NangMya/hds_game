"use client";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import GameScene from "./GameScene";

export default function PhaserGame({ centerLat, centerLng, currentLat, currentLng }: any) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Game တစ်ခုပဲ ဆောက်တာ သေချာအောင် လုပ်ခြင်း
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      physics: {
        default: "arcade",
        arcade: { debug: false } // လမ်းကြောင်းတွေကို မြင်ချင်ရင် true ထားပါ
      },
      scene: [GameScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // GPS Update တက်လာရင် Phaser ဆီ ပို့ပေးခြင်း
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("GameScene") as GameScene;
      if (scene && typeof scene.updatePlayerPosition === 'function') {
        scene.updatePlayerPosition(currentLat, currentLng, centerLat, centerLng);
      }
    }
  }, [currentLat, currentLng]);

  return <div id="game-container" className="fixed inset-0 w-full h-full" />;
}