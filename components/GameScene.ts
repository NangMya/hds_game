import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private roomSizeInFeet = 20;
  
  // Latitude ၁ ဒီဂရီမှာရှိတဲ့ ပေပေါင်းကို Screen Pixel နဲ့ မြှောက်ပြီး တွက်ထားတာပါ
  // ဒီဂဏန်းက အပြင်က ၁ ပေ နဲ့ Screen ပေါ်က ၁ ပေ ကို ချိတ်ဆက်ပေးပါတယ်
  private REAL_WORLD_SCALE = 7280000; 

  // GPS လူးတာကို ကာကွယ်ဖို့ (အနည်းဆုံး ဝ.၅ ပေ ရွေ့မှ character ရွေ့မယ်)
  private MOVE_THRESHOLD = 0.0000014; // 0.5 foot approx

  private boxes: Phaser.Physics.Arcade.Group | any;
  private alertBorder!: Phaser.GameObjects.Graphics;
  
  // ပေ ၂၀ ကို Screen ရဲ့ width အပြည့်ထားဖို့ တွက်ချက်ခြင်း
  private pixelsPerFoot!: number;
  private SCALE = 2000000; // Lat/Lng to Pixel scale

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("roomMap", "/images/3.png");
    this.load.image("player", "/images/human.png");
    this.load.image("box", "/images/box.png");
  }

  create() {
  const { width, height } = this.scale;
  this.pixelsPerFoot = width / this.roomSizeInFeet;

  // Map ကို Screen ထက် အများကြီး ပိုကြီးအောင် လုပ်ထားပါ (ဥပမာ ၅ ဆ)
  const map = this.add.image(width / 2, height / 2, "roomMap");
  map.setDisplaySize(width * 5, width * 5); // ဧရိယာ ကျယ်ကျယ်ထားခြင်း

  this.player = this.physics.add.sprite(width / 2, height / 2, "player").setScale(0.3);

  // Box များကိုလည်း Player ရဲ့ ပတ်ပတ်လည် (World ထဲမှာ) ကြဲချထားပါ
  this.boxes = this.physics.add.group();
  for (let i = 0; i < 10; i++) {
    const rx = width/2 + Phaser.Math.Between(-1000, 1000);
    const ry = height/2 + Phaser.Math.Between(-1000, 1000);
    const box = this.boxes.create(rx, ry, "box").setScale(0.15).setInteractive();
    box.on('pointerdown', () => this.handleCollect(box));
  }
}

  // ၁ ပေ အတွင်းရှိမှ ကောက်လို့ရမယ့် Logic
  private handleCollect(box: Phaser.Physics.Arcade.Sprite) {
    const distancePx = Phaser.Math.Distance.Between(this.player.x, this.player.y, box.x, box.y);
    const distanceFeet = distancePx / this.pixelsPerFoot;

    if (distanceFeet <= 1.2) { // ၁ ပေ ဝန်းကျင်
      this.tweens.add({
        targets: box,
        scale: 0,
        duration: 200,
        onComplete: () => box.destroy()
      });
    } else {
      alert(`Too far! You are ${distanceFeet.toFixed(1)} feet away.`);
    }
  }
// GameScene.ts အတွင်းရှိ updatePlayerPosition ကို ပြင်ရန်
// GameScene.ts အတွင်း

// GameScene.ts အတွင်း

// GPS Jitter ကို ကာကွယ်ရန် သတ်မှတ်ချက် (ပေ အနည်းငယ်ထက် ပိုရွေ့မှ ရွေ့မယ်)
private MOVE_THRESHOLD_FEET = 1.5; // ၁ ပေခွဲ ကျော်မှ ရွေ့ပါမယ်
private lastLat: number = 0;
private lastLng: number = 0;

updatePlayerPosition(lat: number, lng: number, centerLat: number, centerLng: number) {
  if (!this.player) return;

  const { width, height } = this.scale;
  const latDegreeInPixels = this.pixelsPerFoot * 364000;

  // ၁။ အရင်နေရာနဲ့ အခုနေရာ ဘယ်လောက်ကွာလဲ တွက်မယ်
  const dx = (lng - this.lastLng) * latDegreeInPixels;
  const dy = (lat - this.lastLat) * latDegreeInPixels;
  const distanceMovedPx = Math.sqrt(dx * dx + dy * dy);
  const distanceMovedFeet = distanceMovedPx / this.pixelsPerFoot;

  // ၂။ ပထမဆုံးအကြိမ်ဆိုရင်တော့ နေရာချပေးမယ်
  if (this.lastLat === 0 && this.lastLng === 0) {
    this.lastLat = lat;
    this.lastLng = lng;
  }

  // ၃။ သတ်မှတ်ထားတဲ့ ပေ ထက် ပိုရွေ့မှသာ Position Update လုပ်မယ်
  if (distanceMovedFeet > this.MOVE_THRESHOLD_FEET) {
    const targetX = width / 2 + (lng - centerLng) * latDegreeInPixels;
    const targetY = height / 2 + (centerLat - lat) * latDegreeInPixels;

    // Tween duration ကို ၃၀၀ လောက်ထားပေးရင် ခုန်မသွားဘဲ ငြိမ်ငြိမ်လေး သွားပါလိမ့်မယ်
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 300,
      ease: 'Power1',
      onUpdate: () => {
        this.cameras.main.scrollX = this.player.x - width / 2;
        this.cameras.main.scrollY = this.player.y - height / 2;
      }
    });

    this.lastLat = lat;
    this.lastLng = lng;
  }
}
}