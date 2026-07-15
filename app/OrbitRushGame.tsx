"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 390;
const HEIGHT = 693.333;
const TAU = Math.PI * 2;
const PLAYER_RADIUS = 6.5;
const PROFILE_KEY = "orbitrush-player-profile-v1";
const SLOW_MOTION_COMBO = 10;

type PlanetKind = "normal" | "fast" | "reverse" | "unstable" | "fragile" | "moving";
type MovementAxis = "horizontal" | "vertical";
type SkinId =
  | "ion-core"
  | "solar-flare"
  | "void-bloom"
  | "prism-shift"
  | "event-horizon";

type PlayerSkin = {
  id: SkinId;
  name: string;
  description: string;
  price: number;
  primary: string;
  secondary: string;
  core: string;
};

type PlayerProfile = {
  version: 1;
  crystalBalance: number;
  ownedSkinIds: SkinId[];
  equippedSkinId: SkinId;
};

const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: "ion-core",
    name: "ION CORE",
    description: "Saf cyan enerji çekirdeği",
    price: 0,
    primary: "#56f3ff",
    secondary: "#a96cff",
    core: "#efffff",
  },
  {
    id: "solar-flare",
    name: "SOLAR FLARE",
    description: "Kor parçacıklı yıldız alevi",
    price: 35,
    primary: "#ffb13b",
    secondary: "#ff4f6d",
    core: "#fff5c7",
  },
  {
    id: "void-bloom",
    name: "VOID BLOOM",
    description: "Fuşya akresyon halkalı boşluk",
    price: 90,
    primary: "#ff4fc8",
    secondary: "#743cff",
    core: "#090314",
  },
  {
    id: "prism-shift",
    name: "PRISM SHIFT",
    description: "Renk değiştiren kuantum kristali",
    price: 220,
    primary: "#73f7ff",
    secondary: "#ff66db",
    core: "#ffffff",
  },
  {
    id: "event-horizon",
    name: "EVENT HORIZON",
    description: "Foton halkalı mikro kara delik",
    price: 500,
    primary: "#d9ffff",
    secondary: "#4d8dff",
    core: "#000107",
  },
];

const DEFAULT_PROFILE: PlayerProfile = {
  version: 1,
  crystalBalance: 0,
  ownedSkinIds: ["ion-core"],
  equippedSkinId: "ion-core",
};

type DevSettings = {
  comboDuration: number;
  baseSpeed: number;
  comboSpeedGain: number;
  lockTolerance: number;
  perfectLatchWindow: number;
  helpers: boolean;
};

const DEFAULT_DEV_SETTINGS: DevSettings = {
  comboDuration: 4.8,
  baseSpeed: 170,
  comboSpeedGain: 0.045,
  lockTolerance: 11,
  perfectLatchWindow: 0.25,
  helpers: false,
};

type Phase = "ready" | "playing" | "dead";
type DeathReason = "ÇARPIŞMA" | "ASTEROİDE ÇARPTIN" | "BOŞLUĞA SAVRULDUN";

type Crystal = {
  angle: number;
  collected: boolean;
};

type Planet = {
  id: number;
  kind: PlanetKind;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  orbit: number;
  orbitSpeedMultiplier: number;
  movementAxis: MovementAxis | null;
  movementAmplitude: number;
  movementSpeed: number;
  movementPhase: number;
  fragileRemaining: number;
  fractured: boolean;
  hue: number;
  risk: boolean;
  comboAvailable: boolean;
  crystals: Crystal[];
};

type Asteroid = {
  id: number;
  beltId: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  spin: number;
  vertices: number[];
};

type AsteroidBelt = {
  id: number;
  y: number;
  safeX: number;
  corridorRadius: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type TrailPoint = { x: number; y: number; life: number };

type Launcher = {
  x: number;
  y: number;
  angle: number;
};

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
  direction: 1 | -1;
  orbitPlanetId: number | null;
  releasedPlanetId: number | null;
};

type GameRuntime = {
  phase: Phase;
  planets: Planet[];
  asteroids: Asteroid[];
  asteroidBelts: AsteroidBelt[];
  player: Player;
  launcher: Launcher;
  cameraY: number;
  cameraTargetY: number;
  cameraZoom: number;
  generatedToY: number;
  nextPlanetId: number;
  nextAsteroidId: number;
  nextBeltId: number;
  nextBeltRow: number;
  row: number;
  visitedPlanets: number;
  score: number;
  best: number;
  combo: number;
  peakCombo: number;
  comboTimer: number;
  comboPop: number;
  runCrystals: number;
  walletCrystals: number;
  skinId: SkinId;
  particles: Particle[];
  trail: TrailPoint[];
  shake: number;
  flash: number;
  slowMotionTimer: number;
  slowMotionScale: number;
  overdrivePulse: number;
  milestoneLabel: string | null;
  milestoneTimer: number;
  elapsed: number;
  lastTime: number;
  tutorial: boolean;
  reason: DeathReason;
  settings: DevSettings;
  devPaused: boolean;
  holdInputActive: boolean;
  latchHoldTime: number;
  latchAttemptCount: number;
  latchFeedback: "perfect" | "safe" | "spent" | null;
  latchFeedbackTimer: number;
  lives: number;
  lastLatchedPlanetId: number | null;
  lastLatchedAngle: number;
  lastLatchedDirection: 1 | -1;
  extraLifeTimer: number;
  respawnTimer: number;
};

type AudioEngine = {
  ensure: () => void;
  setMuted: (value: boolean) => void;
  setIntensity: (combo: number) => void;
  setLatchState: (held: boolean, attached: boolean) => void;
  release: () => void;
  lock: (combo: number) => void;
  safeLock: () => void;
  comboFail: () => void;
  crystal: (combo: number) => void;
  overdrive: (combo: number, milestone: boolean) => void;
  fracture: () => void;
  breakCombo: () => void;
  extraLife: () => void;
  respawn: () => void;
  death: () => void;
  close: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const random = (min: number, max: number) => min + Math.random() * (max - min);

function safeStorageGet(key: string, fallback = "") {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // The game remains fully playable when storage is unavailable.
    return false;
  }
}

function isSkinId(value: unknown): value is SkinId {
  return PLAYER_SKINS.some((skin) => skin.id === value);
}

function loadPlayerProfile(): PlayerProfile {
  try {
    const parsed = JSON.parse(safeStorageGet(PROFILE_KEY, "{}")) as Partial<PlayerProfile>;
    const ownedSkinIds = Array.isArray(parsed.ownedSkinIds)
      ? parsed.ownedSkinIds.filter(isSkinId)
      : [];
    if (!ownedSkinIds.includes("ion-core")) ownedSkinIds.unshift("ion-core");
    const equippedSkinId =
      isSkinId(parsed.equippedSkinId) && ownedSkinIds.includes(parsed.equippedSkinId)
        ? parsed.equippedSkinId
        : "ion-core";
    const storedBalance = Number(parsed.crystalBalance);
    return {
      version: 1,
      crystalBalance: Number.isFinite(storedBalance)
        ? Math.max(0, Math.floor(storedBalance))
        : 0,
      ownedSkinIds: [...new Set(ownedSkinIds)],
      equippedSkinId,
    };
  } catch {
    return { ...DEFAULT_PROFILE, ownedSkinIds: [...DEFAULT_PROFILE.ownedSkinIds] };
  }
}

function savePlayerProfile(profile: PlayerProfile) {
  return safeStorageSet(PROFILE_KEY, JSON.stringify(profile));
}

function haptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Haptics are an optional enhancement and unsupported browsers simply skip them.
  }
}

function getComboTier(combo: number) {
  if (combo >= 15) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

function getComboTierLabel(combo: number) {
  if (combo >= 15) return "SUPERNOVA";
  if (combo >= 10) return "OVERDRIVE";
  if (combo >= 5) return "IGNITION";
  return null;
}

function skinById(id: SkinId) {
  return PLAYER_SKINS.find((skin) => skin.id === id) ?? PLAYER_SKINS[0];
}

function planetOrbitAt(planet: Planet, elapsed: number) {
  if (planet.kind !== "unstable") return planet.orbit;
  return planet.orbit + Math.sin(elapsed * 2.2 + planet.movementPhase) * 6;
}

function specialPlanetScoreMultiplier(kind: PlanetKind) {
  switch (kind) {
    case "fast":
      return 1.1;
    case "moving":
      return 1.15;
    case "reverse":
      return 1.2;
    case "unstable":
      return 1.25;
    case "fragile":
      return 1.35;
    default:
      return 1;
  }
}

function segmentHitsCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  circleX: number,
  circleY: number,
  radius: number,
) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const projection =
    lengthSquared === 0
      ? 0
      : clamp(
          ((circleX - startX) * deltaX + (circleY - startY) * deltaY) / lengthSquared,
          0,
          1,
        );
  const closestX = startX + deltaX * projection;
  const closestY = startY + deltaY * projection;
  return Math.hypot(closestX - circleX, closestY - circleY) <= radius;
}

function loadDevSettings(): DevSettings {
  try {
    const parsed = JSON.parse(safeStorageGet("orbitrush-dev-settings", "{}")) as unknown;
    const stored = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<DevSettings>;
    const comboDuration = Number(stored.comboDuration);
    const baseSpeed = Number(stored.baseSpeed);
    const comboSpeedGain = Number(stored.comboSpeedGain);
    const lockTolerance = Number(stored.lockTolerance);
    const perfectLatchWindow = Number(stored.perfectLatchWindow);
    return {
      comboDuration: clamp(
        Number.isFinite(comboDuration) ? comboDuration : DEFAULT_DEV_SETTINGS.comboDuration,
        2.5,
        8,
      ),
      baseSpeed: clamp(
        Number.isFinite(baseSpeed) ? baseSpeed : DEFAULT_DEV_SETTINGS.baseSpeed,
        110,
        240,
      ),
      comboSpeedGain: clamp(
        Number.isFinite(comboSpeedGain) ? comboSpeedGain : DEFAULT_DEV_SETTINGS.comboSpeedGain,
        0,
        0.12,
      ),
      lockTolerance: clamp(
        Number.isFinite(lockTolerance) ? lockTolerance : DEFAULT_DEV_SETTINGS.lockTolerance,
        3,
        24,
      ),
      perfectLatchWindow: clamp(
        Number.isFinite(perfectLatchWindow)
          ? perfectLatchWindow
          : DEFAULT_DEV_SETTINGS.perfectLatchWindow,
        0.08,
        0.5,
      ),
      helpers: Boolean(stored.helpers),
    };
  } catch {
    return { ...DEFAULT_DEV_SETTINGS };
  }
}

function makeAudioEngine(): AudioEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambient: GainNode | null = null;
  let latchOscillator: OscillatorNode | null = null;
  let latchGain: GainNode | null = null;
  let muted = false;

  const ensure = () => {
    if (context) {
      if (context.state === "suspended") void context.resume();
      return;
    }

    const AudioContextClass = window.AudioContext;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.68;
    master.connect(context.destination);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 230;
    filter.Q.value = 1.2;
    ambient = context.createGain();
    ambient.gain.value = 0.025;
    ambient.connect(filter);
    filter.connect(master);

    [43.65, 65.41].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -7 : 5;
      gain.gain.value = index === 0 ? 0.66 : 0.18;
      oscillator.connect(gain);
      gain.connect(ambient!);
      oscillator.start();
    });

    const latchTone = context.createOscillator();
    const latchLevel = context.createGain();
    latchTone.type = "sine";
    latchTone.frequency.value = 96;
    latchLevel.gain.value = 0;
    latchTone.connect(latchLevel);
    latchLevel.connect(master);
    latchTone.start();
    latchOscillator = latchTone;
    latchGain = latchLevel;
  };

  const tone = (
    frequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = "sine",
    endFrequency?: number,
    delay = 0,
  ) => {
    if (!context || !master || muted) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  };

  return {
    ensure,
    setMuted(value) {
      muted = value;
      if (master && context) {
        master.gain.setTargetAtTime(value ? 0 : 0.68, context.currentTime, 0.025);
      }
    },
    setIntensity(combo) {
      if (!ambient || !context) return;
      ambient.gain.setTargetAtTime(0.025 + Math.min(combo, 20) * 0.0017, context.currentTime, 0.3);
    },
    setLatchState(held, attached) {
      if (!context || !latchGain || !latchOscillator) return;
      const targetGain = held ? (attached ? 0.021 : 0.011) : 0;
      const targetFrequency = attached ? 132 : 96;
      latchGain.gain.setTargetAtTime(targetGain, context.currentTime, held ? 0.08 : 0.035);
      latchOscillator.frequency.setTargetAtTime(targetFrequency, context.currentTime, 0.09);
    },
    release() {
      tone(260, 0.2, 0.12, "sawtooth", 92);
      tone(520, 0.09, 0.055, "sine", 280, 0.01);
    },
    lock(combo) {
      const note = 260 * Math.pow(2, (combo % 12) / 12);
      tone(note, 0.22, 0.12, "triangle", note * 1.8);
      tone(note * 1.5, 0.28, 0.065, "sine", note * 2.1, 0.035);
      if (combo > 4) tone(note * 2, 0.16, 0.035, "sine", note * 2.5, 0.07);
    },
    safeLock() {
      tone(230, 0.2, 0.07, "triangle", 170);
      tone(345, 0.15, 0.035, "sine", 255, 0.025);
    },
    comboFail() {
      tone(185, 0.24, 0.034, "triangle", 105, 0.045);
      tone(116, 0.28, 0.022, "sine", 72, 0.09);
    },
    crystal(combo) {
      const note = 740 + Math.min(combo, 18) * 22;
      tone(note, 0.1, 0.07, "sine", note * 1.42);
      tone(note * 1.33, 0.13, 0.035, "triangle", note * 1.55, 0.025);
    },
    overdrive(combo, milestone) {
      const lift = 220 + Math.min(combo, 24) * 13;
      tone(lift, milestone ? 0.42 : 0.22, milestone ? 0.11 : 0.065, "sawtooth", lift * 3.2);
      tone(lift * 4.4, 0.18, milestone ? 0.07 : 0.035, "sine", lift * 1.2, 0.025);
      if (milestone) {
        tone(92, 0.55, 0.12, "triangle", 46);
        tone(lift * 2, 0.3, 0.055, "square", lift * 5, 0.08);
      }
    },
    fracture() {
      tone(520, 0.13, 0.07, "square", 110);
      tone(160, 0.38, 0.1, "sawtooth", 42, 0.045);
    },
    breakCombo() {
      tone(190, 0.22, 0.05, "triangle", 110);
    },
    extraLife() {
      tone(520, 0.18, 0.08, "sine", 780);
      tone(780, 0.24, 0.06, "triangle", 1040, 0.08);
    },
    respawn() {
      tone(120, 0.32, 0.07, "triangle", 240);
      tone(240, 0.28, 0.045, "sine", 420, 0.08);
    },
    death() {
      tone(180, 0.65, 0.18, "sawtooth", 34);
      tone(90, 0.8, 0.1, "square", 28, 0.03);
    },
    close() {
      if (context) void context.close();
      context = null;
      latchOscillator = null;
      latchGain = null;
    },
  };
}

function choosePlanetKind(row: number, tutorial: boolean): PlanetKind {
  if (tutorial || row < 8) return "normal";
  const specialChance = clamp(0.14 + (row - 8) * 0.018, 0.14, 0.46);
  if (Math.random() > specialChance) return "normal";

  const candidates: Array<{ kind: PlanetKind; unlock: number; weight: number }> = [
    { kind: "fast", unlock: 8, weight: 4 },
    { kind: "moving", unlock: 11, weight: 3 },
    { kind: "reverse", unlock: 14, weight: 2.5 },
    { kind: "unstable", unlock: 17, weight: 2 },
    { kind: "fragile", unlock: 20, weight: 1.5 },
  ];
  const unlocked = candidates.filter((candidate) => row >= candidate.unlock);
  const totalWeight = unlocked.reduce((total, candidate) => total + candidate.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of unlocked) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate.kind;
  }
  return unlocked[0]?.kind ?? "normal";
}

function planetHue(kind: PlanetKind, risk: boolean) {
  switch (kind) {
    case "fast":
      return random(184, 202);
    case "moving":
      return random(132, 154);
    case "reverse":
      return random(22, 42);
    case "unstable":
      return random(304, 326);
    case "fragile":
      return random(346, 360);
    default:
      return risk ? random(315, 336) : random(258, 286);
  }
}

function createPlanet(
  runtime: GameRuntime,
  x: number,
  y: number,
  risk: boolean,
  tutorial = false,
  kindOverride?: PlanetKind,
  paired = false,
): Planet {
  const difficulty = Math.min(runtime.row / 30, 1);
  const kind = kindOverride ?? choosePlanetKind(runtime.row, tutorial);
  const radius = tutorial
    ? 31
    : risk
      ? random(18, 25) - difficulty * 1.5
      : random(28, 39) - difficulty * 4;
  const orbitGap = risk ? random(26, 34) : random(32, 44);
  const orbit = radius + orbitGap;
  const count = tutorial ? 5 : risk ? Math.floor(random(7, 11)) : Math.floor(random(4, 7));
  const arcStart = tutorial ? 2.9 : random(0, TAU);
  const arcSpan = risk ? 1.65 : 1.25;
  const crystals = Array.from({ length: count }, (_, index) => ({
    angle: arcStart + (index / Math.max(count - 1, 1)) * arcSpan,
    collected: false,
  }));
  const movementAxis: MovementAxis | null =
    kind === "moving"
      ? paired
        ? "vertical"
        : Math.random() < 0.58
          ? "horizontal"
          : "vertical"
      : null;
  const movementAmplitude =
    movementAxis === "horizontal"
      ? random(26, 40)
      : movementAxis === "vertical"
        ? random(20, 32)
        : 0;
  const worldExpansion = clamp((runtime.row - 8) / 22, 0, 1) * 34;
  const horizontalMargin = orbit + 15 + (movementAxis === "horizontal" ? movementAmplitude : 0);
  const baseX = clamp(
    x,
    horizontalMargin - worldExpansion,
    WIDTH - horizontalMargin + worldExpansion,
  );

  return {
    id: runtime.nextPlanetId++,
    kind,
    x: baseX,
    y,
    baseX,
    baseY: y,
    velocityX: 0,
    velocityY: 0,
    radius,
    orbit,
    orbitSpeedMultiplier: kind === "fast" ? 1.35 : 1,
    movementAxis,
    movementAmplitude,
    movementSpeed: kind === "moving" ? random(0.7, 1) : 0,
    movementPhase: random(0, TAU),
    fragileRemaining: kind === "fragile" ? TAU * 0.75 : Number.POSITIVE_INFINITY,
    fractured: false,
    hue: planetHue(kind, risk),
    risk,
    comboAvailable: true,
    crystals,
  };
}

function createAsteroidBelt(runtime: GameRuntime, y: number, safeX: number) {
  const beltId = runtime.nextBeltId++;
  const late = runtime.row >= 25;
  const worldExpansion = clamp((runtime.row - 8) / 22, 0, 1) * 34;
  const corridorRadius = late ? 72 : 82;
  const desiredCount = late ? Math.floor(random(5, 8)) : Math.floor(random(4, 7));
  const asteroids: Asteroid[] = [];
  let attempts = 0;

  while (asteroids.length < desiredCount && attempts < 100) {
    attempts += 1;
    const radius = random(late ? 8 : 7, late ? 12.5 : 11.5);
    const x = random(24 + radius - worldExpansion, WIDTH - 24 - radius + worldExpansion);
    const asteroidY = y + random(-58, 58);
    if (Math.abs(x - safeX) < corridorRadius + radius) continue;
    if (
      runtime.planets.some(
        (planet) =>
          Math.hypot(x - planet.x, asteroidY - planet.y) <
          planet.orbit +
            radius +
            20 +
            (planet.kind === "unstable" ? 6 : 0) +
            planet.movementAmplitude,
      )
    ) {
      continue;
    }
    if (
      asteroids.some(
        (asteroid) =>
          Math.hypot(x - asteroid.x, asteroidY - asteroid.y) <
          radius + asteroid.radius + 20,
      )
    ) {
      continue;
    }
    asteroids.push({
      id: runtime.nextAsteroidId++,
      beltId,
      x,
      y: asteroidY,
      radius,
      rotation: random(0, TAU),
      spin: random(-0.8, 0.8),
      vertices: Array.from({ length: 9 }, () => random(0.72, 1.18)),
    });
  }

  runtime.asteroidBelts.push({ id: beltId, y, safeX, corridorRadius });
  runtime.asteroids.push(...asteroids);
}

function generateRows(runtime: GameRuntime, upToY: number) {
  while (runtime.generatedToY < upToY) {
    runtime.row += 1;
    const previousY = runtime.generatedToY;
    const previousRowPlanets = runtime.planets.filter(
      (planet) => !planet.fractured && Math.abs(planet.baseY - previousY) < 90,
    );
    const sourcePlanet =
      previousRowPlanets[Math.floor(Math.random() * previousRowPlanets.length)] ??
      runtime.planets.reduce<Planet | null>(
        (closest, planet) =>
          !planet.fractured && (!closest || planet.baseY > closest.baseY) ? planet : closest,
        null,
      );
    const pace = 1 + Math.min(runtime.peakCombo, 20) * runtime.settings.comboSpeedGain;
    const paceSpacing = 1 + Math.min(pace - 1, 0.9) * 0.42;
    const gap = random(238, 282) * paceSpacing + Math.min(runtime.row, 28) * 1.1;
    runtime.generatedToY += gap;
    const pair = Math.random() < 0.82;
    const horizontalSpread = clamp((runtime.row - 8) / 22, 0, 1) * 30;
    const newPlanets: Planet[] = [];

    if (pair) {
      const riskOnLeft = Math.random() < 0.5;
      const leftPlanet = createPlanet(
        runtime,
        random(72 - horizontalSpread, 132 - horizontalSpread * 0.3),
        runtime.generatedToY + random(-25, 23),
        riskOnLeft,
        false,
        undefined,
        true,
      );
      const rightPlanet = createPlanet(
        runtime,
        random(258 + horizontalSpread * 0.3, 318 + horizontalSpread),
        runtime.generatedToY + random(-23, 26),
        !riskOnLeft,
        false,
        leftPlanet.kind === "moving" ? "normal" : undefined,
        true,
      );
      const requiredSeparation = Math.max(
        leftPlanet.orbit +
          (leftPlanet.kind === "unstable" ? 6 : 0) +
          rightPlanet.radius +
          PLAYER_RADIUS +
          10,
        rightPlanet.orbit +
          (rightPlanet.kind === "unstable" ? 6 : 0) +
          leftPlanet.radius +
          PLAYER_RADIUS +
          10,
      );
      const currentSeparation = rightPlanet.baseX - leftPlanet.baseX;
      if (currentSeparation < requiredSeparation) {
        const adjustment = (requiredSeparation - currentSeparation) / 2;
        leftPlanet.baseX -= adjustment;
        leftPlanet.x = leftPlanet.baseX;
        rightPlanet.baseX += adjustment;
        rightPlanet.x = rightPlanet.baseX;
      }
      newPlanets.push(leftPlanet, rightPlanet);
    } else {
      newPlanets.push(
        createPlanet(
          runtime,
          random(96 - horizontalSpread, 294 + horizontalSpread),
          runtime.generatedToY,
          Math.random() < 0.42,
        ),
      );
    }
    runtime.planets.push(...newPlanets);

    if (runtime.row >= runtime.nextBeltRow) {
      const target = newPlanets[Math.floor(Math.random() * newPlanets.length)];
      const beltY = previousY + gap * 0.5;
      const routeProgress = sourcePlanet
        ? clamp((beltY - sourcePlanet.baseY) / (target.baseY - sourcePlanet.baseY), 0, 1)
        : 1;
      const routeX = sourcePlanet
        ? sourcePlanet.baseX + (target.baseX - sourcePlanet.baseX) * routeProgress
        : target.baseX;
      createAsteroidBelt(runtime, beltY, routeX);
      runtime.nextBeltRow += Math.floor(random(8, 12));
    }
  }
}

function createRuntime(
  best: number,
  tutorial: boolean,
  settings: DevSettings,
  profile: PlayerProfile,
): GameRuntime {
  const runtime: GameRuntime = {
    phase: "ready",
    planets: [],
    asteroids: [],
    asteroidBelts: [],
    player: {} as Player,
    launcher: { x: WIDTH * 0.5, y: 82, angle: Math.PI / 2 },
    cameraY: 0,
    cameraTargetY: 0,
    cameraZoom: 0.93,
    generatedToY: 345,
    nextPlanetId: 1,
    nextAsteroidId: 1,
    nextBeltId: 1,
    nextBeltRow: 14,
    row: 1,
    visitedPlanets: 0,
    score: 0,
    best,
    combo: 0,
    peakCombo: 0,
    comboTimer: 0,
    comboPop: 0,
    runCrystals: 0,
    walletCrystals: profile.crystalBalance,
    skinId: profile.equippedSkinId,
    particles: [],
    trail: [],
    shake: 0,
    flash: 0,
    slowMotionTimer: 0,
    slowMotionScale: 1,
    overdrivePulse: 0,
    milestoneLabel: null,
    milestoneTimer: 0,
    elapsed: 0,
    lastTime: performance.now(),
    tutorial,
    reason: "BOŞLUĞA SAVRULDUN",
    settings: { ...settings },
    devPaused: false,
    holdInputActive: false,
    latchHoldTime: 0,
    latchAttemptCount: 0,
    latchFeedback: null,
    latchFeedbackTimer: 0,
    lives: 1,
    lastLatchedPlanetId: null,
    lastLatchedAngle: 0,
    lastLatchedDirection: 1,
    extraLifeTimer: 0,
    respawnTimer: 0,
  };

  const tutorialTarget = createPlanet(runtime, 250, 340, false, true);
  const riskyTarget = createPlanet(runtime, 95, 382, true, true);
  runtime.planets.push(tutorialTarget, riskyTarget);
  const launchX = Math.cos(runtime.launcher.angle);
  const launchY = Math.sin(runtime.launcher.angle);
  runtime.player = {
    x: runtime.launcher.x + launchX * 32,
    y: runtime.launcher.y + launchY * 32,
    vx: launchX * settings.baseSpeed,
    vy: launchY * settings.baseSpeed,
    speed: settings.baseSpeed,
    angle: 0,
    direction: 1,
    orbitPlanetId: null,
    releasedPlanetId: null,
  };
  generateRows(runtime, HEIGHT * 2.35);
  return runtime;
}

function planetById(runtime: GameRuntime, id: number | null) {
  if (id === null) return null;
  return runtime.planets.find((planet) => planet.id === id) ?? null;
}

function emitBurst(
  runtime: GameRuntime,
  x: number,
  y: number,
  color: string,
  count: number,
  force: number,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = random(0, TAU);
    const velocity = random(force * 0.35, force);
    runtime.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: random(0.3, 0.7),
      maxLife: 0.7,
      size: random(1, 3.2),
      color,
    });
  }
}

function worldToScreenY(runtime: GameRuntime, worldY: number) {
  return HEIGHT - (worldY - runtime.cameraY);
}

function findLockCandidate(runtime: GameRuntime) {
  const { player } = runtime;
  let closest: Planet | null = null;
  let closestDelta = Number.POSITIVE_INFINITY;

  for (const planet of runtime.planets) {
    if (planet.fractured || planet.id === player.releasedPlanetId) continue;
    const activeOrbit = planetOrbitAt(planet, runtime.elapsed);
    const distance = Math.hypot(player.x - planet.x, player.y - planet.y);
    const delta = Math.abs(distance - activeOrbit);
    if (delta <= runtime.settings.lockTolerance && delta < closestDelta) {
      closest = planet;
      closestDelta = delta;
    }
  }
  return closest;
}

function drawDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.beginPath();
  context.moveTo(0, -size);
  context.lineTo(size * 0.72, 0);
  context.lineTo(0, size);
  context.lineTo(-size * 0.72, 0);
  context.closePath();
  context.fill();
  context.restore();
}

function drawAsteroid(
  context: CanvasRenderingContext2D,
  asteroid: Asteroid,
  screenY: number,
  elapsed: number,
) {
  context.save();
  context.translate(asteroid.x, screenY);
  context.rotate(asteroid.rotation + elapsed * asteroid.spin);
  const gradient = context.createRadialGradient(
    -asteroid.radius * 0.35,
    -asteroid.radius * 0.4,
    1,
    0,
    0,
    asteroid.radius * 1.2,
  );
  gradient.addColorStop(0, "#716c83");
  gradient.addColorStop(0.4, "#302d3d");
  gradient.addColorStop(1, "#0b0a12");
  context.fillStyle = gradient;
  context.strokeStyle = "rgba(255,122,170,0.42)";
  context.lineWidth = 1;
  context.shadowColor = "#ff4f8a";
  context.shadowBlur = 8;
  context.beginPath();
  asteroid.vertices.forEach((scale, index) => {
    const angle = (index / asteroid.vertices.length) * TAU;
    const x = Math.cos(angle) * asteroid.radius * scale;
    const y = Math.sin(angle) * asteroid.radius * scale;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(210,197,230,0.2)";
  context.beginPath();
  context.moveTo(-asteroid.radius * 0.35, -asteroid.radius * 0.22);
  context.lineTo(asteroid.radius * 0.06, asteroid.radius * 0.05);
  context.lineTo(asteroid.radius * 0.42, asteroid.radius * 0.34);
  context.stroke();
  context.restore();
}

function drawPlayerOrb(
  context: CanvasRenderingContext2D,
  runtime: GameRuntime,
  playerY: number,
) {
  const skin = skinById(runtime.skinId);
  const tier = getComboTier(runtime.combo);
  const pulse = 1 + Math.sin(runtime.elapsed * (tier >= 2 ? 13 : 7)) * 0.07;
  const prismHue = (runtime.elapsed * 95 + runtime.combo * 13) % 360;
  const primary = runtime.skinId === "prism-shift" ? `hsl(${prismHue} 100% 70%)` : skin.primary;
  const secondary =
    runtime.skinId === "prism-shift"
      ? `hsl(${(prismHue + 120) % 360} 100% 68%)`
      : skin.secondary;
  const x = runtime.player.x;

  context.save();
  context.translate(x, playerY);

  if (tier > 0) {
    context.save();
    context.globalAlpha = 0.3 + tier * 0.08 + runtime.overdrivePulse * 0.22;
    context.strokeStyle = tier >= 2 ? "#ffd66b" : secondary;
    context.shadowColor = tier >= 2 ? "#ff4fc8" : secondary;
    context.shadowBlur = 18 + tier * 7;
    context.lineWidth = 1.2 + tier * 0.45;
    context.beginPath();
    context.arc(0, 0, PLAYER_RADIUS * (2.2 + tier * 0.45) * pulse, 0, TAU);
    context.stroke();
    if (tier >= 3) {
      context.rotate(-runtime.elapsed * 2.7);
      context.setLineDash([5, 8]);
      context.beginPath();
      context.arc(0, 0, PLAYER_RADIUS * 3.8, 0, TAU);
      context.stroke();
      context.setLineDash([]);
    }
    context.restore();
  }

  const glow = context.createRadialGradient(-2, -2, 0, 0, 0, PLAYER_RADIUS * 2.8);
  glow.addColorStop(0, skin.core);
  glow.addColorStop(0.3, primary);
  glow.addColorStop(0.68, secondary);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.shadowColor = primary;
  context.shadowBlur = 18 + Math.min(runtime.combo, 18) * 1.25;
  context.beginPath();
  context.arc(0, 0, PLAYER_RADIUS * (2.15 + tier * 0.1) * pulse, 0, TAU);
  context.fill();

  context.fillStyle = skin.core;
  context.strokeStyle = primary;
  context.lineWidth = runtime.skinId === "event-horizon" ? 1.8 : 0.8;
  context.beginPath();
  if (runtime.skinId === "prism-shift") {
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index / 6) * TAU;
      const px = Math.cos(angle) * PLAYER_RADIUS;
      const py = Math.sin(angle) * PLAYER_RADIUS;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  } else {
    context.arc(0, 0, PLAYER_RADIUS, 0, TAU);
  }
  context.fill();
  context.stroke();

  if (runtime.skinId === "solar-flare") {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.rotate(runtime.elapsed * 1.7);
    context.fillStyle = secondary;
    context.shadowColor = primary;
    context.shadowBlur = 13;
    for (let index = 0; index < 10; index += 1) {
      context.rotate(TAU / 10);
      const length = PLAYER_RADIUS * (1.75 + Math.sin(runtime.elapsed * 9 + index) * 0.22);
      context.beginPath();
      context.moveTo(-1.6, -PLAYER_RADIUS * 0.7);
      context.lineTo(0, -length);
      context.lineTo(1.6, -PLAYER_RADIUS * 0.7);
      context.fill();
    }
    context.restore();
  }

  if (runtime.skinId === "void-bloom" || runtime.skinId === "event-horizon") {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.rotate(runtime.elapsed * (runtime.skinId === "event-horizon" ? 2.4 : 1.6));
    context.strokeStyle = primary;
    context.shadowColor = secondary;
    context.shadowBlur = 16 + tier * 4;
    context.lineWidth = runtime.skinId === "event-horizon" ? 2.4 : 1.7;
    context.scale(1.6, 0.64);
    context.beginPath();
    context.arc(0, 0, PLAYER_RADIUS * 1.18, 0, TAU);
    context.stroke();
    context.restore();
  }

  if (runtime.skinId === "ion-core") {
    context.strokeStyle = "rgba(255,255,255,0.72)";
    context.lineWidth = 0.9;
    context.beginPath();
    context.arc(-1.2, -1, PLAYER_RADIUS * 0.55, Math.PI * 1.05, Math.PI * 1.75);
    context.stroke();
  }

  if (runtime.skinId === "event-horizon") {
    context.strokeStyle = "rgba(220,255,255,0.84)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, PLAYER_RADIUS * 1.72, Math.PI * 0.12, Math.PI * 0.88);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, PLAYER_RADIUS * 1.72, Math.PI * 1.12, Math.PI * 1.88);
    context.stroke();
  }
  context.restore();
}

function drawGame(context: CanvasRenderingContext2D, runtime: GameRuntime) {
  const shakeX = runtime.shake > 0 ? random(-runtime.shake, runtime.shake) : 0;
  const shakeY = runtime.shake > 0 ? random(-runtime.shake, runtime.shake) : 0;
  context.save();
  context.translate(shakeX, shakeY);

  const backdrop = context.createLinearGradient(0, 0, 0, HEIGHT);
  backdrop.addColorStop(0, "#08081c");
  backdrop.addColorStop(0.52, "#040512");
  backdrop.addColorStop(1, "#02030a");
  context.fillStyle = backdrop;
  context.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);

  for (let index = 0; index < 64; index += 1) {
    const column = (index * 73.73) % WIDTH;
    const drift = (runtime.cameraY * (0.018 + (index % 5) * 0.009)) % (HEIGHT + 40);
    const row = ((index * 113.17 + drift) % (HEIGHT + 40)) - 20;
    const twinkle = 0.2 + Math.sin(runtime.elapsed * (0.5 + (index % 4) * 0.2) + index) * 0.12;
    context.fillStyle = `rgba(${index % 4 === 0 ? "139,211,255" : "255,255,255"},${twinkle})`;
    context.fillRect(column, row, index % 9 === 0 ? 1.35 : 0.75, index % 9 === 0 ? 1.35 : 0.75);
  }

  const comboTier = getComboTier(runtime.combo);
  if (comboTier >= 1) {
    context.save();
    context.strokeStyle = `rgba(143,248,255,${0.08 + comboTier * 0.035})`;
    context.lineWidth = 0.8;
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 97.31 + runtime.elapsed * (22 + comboTier * 8)) % (WIDTH + 30) - 15;
      const y = (index * 61.73 + runtime.elapsed * (80 + comboTier * 24)) % (HEIGHT + 60) - 30;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - comboTier * 1.8, y + 8 + comboTier * 5);
      context.stroke();
    }
    context.restore();
  }

  context.save();
  const zoomAnchorY = HEIGHT * 0.56;
  context.translate(WIDTH / 2, zoomAnchorY);
  context.scale(runtime.cameraZoom, runtime.cameraZoom);
  context.translate(-WIDTH / 2, -zoomAnchorY);

  const candidate = runtime.player.orbitPlanetId === null ? findLockCandidate(runtime) : null;

  for (const belt of runtime.asteroidBelts) {
    const sy = worldToScreenY(runtime, belt.y);
    if (sy < -120 || sy > HEIGHT + 120) continue;
    context.save();
    context.strokeStyle = "rgba(255,79,138,0.13)";
    context.lineWidth = 1;
    context.setLineDash([5, 9]);
    context.beginPath();
    context.moveTo(-30, sy);
    context.lineTo(belt.safeX - belt.corridorRadius, sy);
    context.moveTo(belt.safeX + belt.corridorRadius, sy);
    context.lineTo(WIDTH + 30, sy);
    context.stroke();
    context.setLineDash([]);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 10px monospace";
    context.letterSpacing = "1.4px";
    context.fillStyle = "rgba(255,130,172,0.78)";
    context.fillText("ASTEROİT KUŞAĞI", belt.safeX, sy - 11);
    context.fillStyle = "rgba(86,243,255,0.8)";
    context.fillText("▽ GÜVENLİ KORİDOR", belt.safeX, sy + 10);
    context.restore();
  }

  for (const asteroid of runtime.asteroids) {
    const sy = worldToScreenY(runtime, asteroid.y);
    if (sy < -asteroid.radius - 80 || sy > HEIGHT + asteroid.radius + 80) continue;
    drawAsteroid(context, asteroid, sy, runtime.elapsed);
  }

  for (const planet of runtime.planets) {
    if (planet.fractured) continue;
    const sy = worldToScreenY(runtime, planet.y);
    const activeOrbit = planetOrbitAt(planet, runtime.elapsed);
    if (sy < -activeOrbit - 80 || sy > HEIGHT + activeOrbit + 80) continue;
    const isCandidate = candidate?.id === planet.id;
    const hue = planet.hue;

    if (planet.kind === "moving") {
      context.save();
      context.strokeStyle = `hsla(${hue}, 100%, 70%, 0.2)`;
      context.lineWidth = 1;
      context.setLineDash([3, 6]);
      context.beginPath();
      if (planet.movementAxis === "horizontal") {
        context.moveTo(planet.baseX - planet.movementAmplitude, worldToScreenY(runtime, planet.baseY));
        context.lineTo(planet.baseX + planet.movementAmplitude, worldToScreenY(runtime, planet.baseY));
      } else {
        context.moveTo(planet.baseX, worldToScreenY(runtime, planet.baseY - planet.movementAmplitude));
        context.lineTo(planet.baseX, worldToScreenY(runtime, planet.baseY + planet.movementAmplitude));
      }
      context.stroke();
      context.restore();
    }

    if (runtime.settings.helpers) {
      const tolerance = runtime.settings.lockTolerance;
      context.save();
      context.globalAlpha = isCandidate ? 0.34 : 0.14;
      context.strokeStyle = isCandidate ? "#56f3ff" : `hsl(${hue} 100% 68%)`;
      context.lineWidth = tolerance * 2;
      context.beginPath();
      context.arc(planet.x, sy, activeOrbit, 0, TAU);
      context.stroke();

      context.globalAlpha = isCandidate ? 0.9 : 0.5;
      context.lineWidth = 0.85;
      context.setLineDash([3, 4]);
      context.beginPath();
      context.arc(planet.x, sy, Math.max(activeOrbit - tolerance, 1), 0, TAU);
      context.stroke();
      context.beginPath();
      context.arc(planet.x, sy, activeOrbit + tolerance, 0, TAU);
      context.stroke();
      context.restore();
    }

    context.save();
    context.strokeStyle = isCandidate
      ? "rgba(86,243,255,0.98)"
      : `hsla(${hue}, 100%, 72%, ${planet.risk ? 0.58 : 0.38})`;
    context.lineWidth = isCandidate ? 2.5 : 1.1;
    context.shadowColor = isCandidate ? "#56f3ff" : `hsl(${hue} 100% 65%)`;
    context.shadowBlur = isCandidate ? 19 : planet.risk ? 10 : 6;
    if (planet.kind === "unstable") context.setLineDash([5, 4]);
    context.beginPath();
    context.arc(planet.x, sy, activeOrbit, 0, TAU);
    context.stroke();
    if (planet.kind === "fast") {
      context.globalAlpha = 0.34;
      context.lineWidth = 0.8;
      context.beginPath();
      context.arc(planet.x, sy, activeOrbit + 5, runtime.elapsed * 3, runtime.elapsed * 3 + Math.PI * 1.35);
      context.stroke();
    }
    context.restore();

    for (const crystal of planet.crystals) {
      if (crystal.collected) continue;
      const cx = planet.x + Math.cos(crystal.angle) * activeOrbit;
      const cy = sy - Math.sin(crystal.angle) * activeOrbit;
      context.save();
      context.fillStyle = "#ffd66b";
      context.shadowColor = "#ffbd3d";
      context.shadowBlur = 11;
      drawDiamond(context, cx, cy, planet.risk ? 5.2 : 4.5, runtime.elapsed * 1.5 + crystal.angle);
      context.restore();
    }

    const glow = context.createRadialGradient(
      planet.x - planet.radius * 0.3,
      sy - planet.radius * 0.32,
      1,
      planet.x,
      sy,
      planet.radius * 1.2,
    );
    glow.addColorStop(0, `hsla(${hue + 18}, 80%, 42%, 0.55)`);
    glow.addColorStop(0.48, `hsla(${hue}, 60%, 17%, 0.96)`);
    glow.addColorStop(1, "rgba(2,3,12,1)");
    context.save();
    context.fillStyle = glow;
    context.strokeStyle = `hsla(${hue}, 100%, 70%, ${planet.risk ? 0.72 : 0.42})`;
    context.lineWidth = planet.risk ? 1.6 : 1;
    context.shadowColor = `hsl(${hue} 100% 60%)`;
    context.shadowBlur = planet.risk ? 22 : 11;
    context.beginPath();
    context.arc(planet.x, sy, planet.radius, 0, TAU);
    context.fill();
    context.stroke();
    context.globalAlpha = 0.22;
    context.beginPath();
    context.arc(planet.x, sy, planet.radius * 0.72, Math.PI * 1.08, Math.PI * 1.75);
    context.stroke();

    if (planet.comboAvailable) {
      const chargeRadius = Math.max(7, planet.radius * 0.43);
      const chargePulse = 0.72 + Math.sin(runtime.elapsed * 4.2 + planet.id) * 0.18;
      context.save();
      context.globalAlpha = chargePulse;
      context.strokeStyle = "#8ff8ff";
      context.fillStyle = "#dfffff";
      context.lineWidth = 1.25;
      context.shadowColor = "#56f3ff";
      context.shadowBlur = 10;
      context.setLineDash([chargeRadius * 0.72, chargeRadius * 0.48]);
      context.beginPath();
      context.arc(planet.x, sy, chargeRadius, runtime.elapsed * 0.7, runtime.elapsed * 0.7 + TAU);
      context.stroke();
      context.setLineDash([]);
      drawDiamond(
        context,
        planet.x,
        sy,
        Math.max(2.2, planet.radius * 0.1),
        runtime.elapsed * 1.4,
      );
      context.restore();
    }

    if (planet.kind === "fragile") {
      const integrity = clamp(planet.fragileRemaining / (TAU * 0.75), 0, 1);
      context.globalAlpha = 0.4 + (1 - integrity) * 0.55;
      context.strokeStyle = "#ffd1e0";
      context.lineWidth = 1.1;
      context.beginPath();
      context.moveTo(planet.x - planet.radius * 0.52, sy - planet.radius * 0.5);
      context.lineTo(planet.x - planet.radius * 0.08, sy - planet.radius * 0.08);
      context.lineTo(planet.x - planet.radius * 0.3, sy + planet.radius * 0.42);
      context.moveTo(planet.x + planet.radius * 0.42, sy - planet.radius * 0.22);
      context.lineTo(planet.x + planet.radius * 0.05, sy + planet.radius * 0.13);
      context.stroke();
    }
    context.restore();

    if (planet.kind !== "normal") {
      const symbol =
        planet.kind === "fast"
          ? "»"
          : planet.kind === "reverse"
            ? "↺"
            : planet.kind === "unstable"
              ? "≈"
              : planet.kind === "fragile"
                ? "!"
                : planet.movementAxis === "horizontal"
                  ? "↔"
                  : "↕";
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `800 ${planet.kind === "fragile" ? 15 : 14}px monospace`;
      context.fillStyle = `hsla(${hue}, 100%, 82%, 0.84)`;
      context.shadowColor = `hsl(${hue} 100% 60%)`;
      context.shadowBlur = 8;
      context.fillText(symbol, planet.x, sy + 1);
      context.restore();
    }
  }

  if (runtime.phase === "ready") {
    const launcherY = worldToScreenY(runtime, runtime.launcher.y);
    const directionX = Math.cos(runtime.launcher.angle);
    const directionY = -Math.sin(runtime.launcher.angle);
    context.save();
    context.translate(runtime.launcher.x, launcherY);
    context.strokeStyle = "rgba(169,108,255,0.72)";
    context.fillStyle = "rgba(10,10,32,0.96)";
    context.lineWidth = 2;
    context.shadowColor = "#a96cff";
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(0, 0, 19, Math.PI * 0.12, Math.PI * 0.88, true);
    context.stroke();
    context.beginPath();
    context.moveTo(directionX * 6 + directionY * 7, directionY * 6 - directionX * 7);
    context.lineTo(directionX * 32 + directionY * 7, directionY * 32 - directionX * 7);
    context.lineTo(directionX * 32 - directionY * 7, directionY * 32 + directionX * 7);
    context.lineTo(directionX * 6 - directionY * 7, directionY * 6 + directionX * 7);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#56f3ff";
    context.shadowColor = "#56f3ff";
    context.beginPath();
    context.arc(0, 0, 3.2, 0, TAU);
    context.fill();
    context.restore();
  }

  if (runtime.phase !== "dead") {
    const { player } = runtime;
    const latchArmed = runtime.holdInputActive && player.orbitPlanetId === null;
    let directionX = player.vx;
    let directionY = player.vy;
    if (player.orbitPlanetId !== null) {
      directionX = -Math.sin(player.angle) * player.direction;
      directionY = Math.cos(player.angle) * player.direction;
    } else {
      const magnitude = Math.hypot(directionX, directionY) || 1;
      directionX /= magnitude;
      directionY /= magnitude;
    }

    context.save();
    context.fillStyle = latchArmed ? "#ffd66b" : "#8ff8ff";
    context.shadowColor = latchArmed ? "#ffbd3d" : "#56f3ff";
    context.shadowBlur = 9;
    [18, 32, 46, 60].forEach((distance, index) => {
      const x = player.x + directionX * distance;
      const y = worldToScreenY(runtime, player.y + directionY * distance);
      context.globalAlpha = 0.92 - index * 0.17;
      context.beginPath();
      context.arc(x, y, 2.4 - index * 0.18, 0, TAU);
      context.fill();
    });
    context.restore();
  }

  const activeSkin = skinById(runtime.skinId);
  const trailPrimary =
    runtime.skinId === "prism-shift"
      ? `hsl(${(runtime.elapsed * 95) % 360} 100% 70%)`
      : activeSkin.primary;
  const trailSecondary =
    runtime.skinId === "prism-shift"
      ? `hsl(${(runtime.elapsed * 95 + 130) % 360} 100% 68%)`
      : activeSkin.secondary;
  for (const [index, point] of runtime.trail.entries()) {
    const sy = worldToScreenY(runtime, point.y);
    context.save();
    context.globalAlpha = point.life * (0.24 + comboTier * 0.09);
    context.fillStyle = comboTier >= 2 && index % 2 === 0 ? trailSecondary : trailPrimary;
    context.shadowColor = comboTier >= 2 ? trailSecondary : trailPrimary;
    context.shadowBlur = 7 + comboTier * 5;
    context.beginPath();
    context.arc(
      point.x,
      sy,
      PLAYER_RADIUS * point.life * (0.64 + comboTier * 0.16),
      0,
      TAU,
    );
    context.fill();
    if (comboTier >= 2) {
      const split = Math.sin(index * 0.9 + runtime.elapsed * 8) * (2 + comboTier);
      context.globalAlpha *= 0.58;
      context.fillStyle = comboTier >= 3 ? "#ffd66b" : trailSecondary;
      context.beginPath();
      context.arc(point.x + split, sy, PLAYER_RADIUS * point.life * 0.34, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  for (const particle of runtime.particles) {
    const sy = worldToScreenY(runtime, particle.y);
    context.save();
    context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(particle.x, sy, particle.size, 0, TAU);
    context.fill();
    context.restore();
  }

  const attachedPlanet = planetById(runtime, runtime.player.orbitPlanetId);
  if (runtime.phase === "playing" && attachedPlanet) {
    const planetY = worldToScreenY(runtime, attachedPlanet.y);
    const playerY = worldToScreenY(runtime, runtime.player.y);
    context.save();
    context.strokeStyle = "rgba(86,243,255,0.32)";
    context.lineWidth = 1.1;
    context.setLineDash([2, 4]);
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 7;
    context.beginPath();
    context.moveTo(attachedPlanet.x, planetY);
    context.lineTo(runtime.player.x, playerY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(220,255,255,0.8)";
    context.beginPath();
    context.arc(attachedPlanet.x, planetY, 1.8, 0, TAU);
    context.fill();
    context.restore();
  }

  if (runtime.phase !== "dead") {
    const playerY = worldToScreenY(runtime, runtime.player.y);
    drawPlayerOrb(context, runtime, playerY);
  }

  context.restore();
  context.restore();

  if (runtime.phase !== "ready") {
    context.save();
    context.textBaseline = "top";
    context.font = "600 10px monospace";
    context.letterSpacing = "1.5px";
    context.fillStyle = "rgba(224,238,255,0.72)";
    context.fillText("EN İYİ", 15, 17);
    context.font = "700 15px monospace";
    context.fillStyle = "rgba(241,248,255,0.82)";
    context.fillText(String(runtime.best).padStart(6, "0"), 15, 29);

    context.textAlign = "center";
    context.font = "600 10px monospace";
    context.fillStyle = "rgba(224,238,255,0.72)";
    context.fillText("SKOR", WIDTH / 2, 17);
    context.font = "800 18px monospace";
    context.fillStyle = "#ffffff";
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 8;
    context.fillText(String(runtime.score).padStart(6, "0"), WIDTH / 2, 28);

    context.textAlign = "right";
    context.shadowBlur = 0;
    context.font = "800 14px monospace";
    context.fillStyle = "#ff8cdb";
    context.fillText(`♥ ${runtime.lives}`, WIDTH - 15, 18);
    context.font = "700 14px monospace";
    context.fillStyle = "#ffd66b";
    context.fillText(`◆ ${runtime.walletCrystals}`, WIDTH - 15, 34);
    context.restore();
  }

  if (runtime.settings.helpers && runtime.phase === "playing") {
    const motionState = runtime.player.orbitPlanetId === null ? "UÇUŞ · COMBO" : "YÖRÜNGE";
    const latchState =
      runtime.holdInputActive && runtime.player.orbitPlanetId === null
        ? ` · LATCH ${runtime.latchHoldTime.toFixed(2)}s`
        : "";
    context.save();
    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = "700 10px monospace";
    context.letterSpacing = "0.9px";
    context.fillStyle = "rgba(143,248,255,0.8)";
    context.fillText(
      `HIZ ${runtime.player.speed.toFixed(1)} · ${motionState}${latchState}`,
      WIDTH / 2,
      53,
    );
    context.restore();
  }

  if (runtime.phase === "playing" && runtime.latchFeedbackTimer > 0 && runtime.latchFeedback) {
    const perfect = runtime.latchFeedback === "perfect";
    const spent = runtime.latchFeedback === "spent";
    const duration = perfect ? 0.85 : spent ? 0.58 : 0.7;
    const progress = 1 - clamp(runtime.latchFeedbackTimer / duration, 0, 1);
    const alpha = clamp(runtime.latchFeedbackTimer / 0.2, 0, 1);
    const scale = 0.88 + Math.sin(Math.min(progress * Math.PI, Math.PI)) * 0.16;
    context.save();
    context.translate(WIDTH / 2, 163 - progress * 10);
    context.scale(scale, scale);
    context.globalAlpha = alpha;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `850 ${perfect ? 18 : spent ? 14 : 15}px Arial`;
    context.letterSpacing = perfect ? "1.4px" : "1px";
    context.fillStyle = perfect ? "#ffd66b" : spent ? "#b9bdd8" : "#8ff8ff";
    context.shadowColor = perfect ? "#ff4fc8" : spent ? "#73799b" : "#56f3ff";
    context.shadowBlur = perfect ? 20 : 10;
    context.fillText(perfect ? "PERFECT LATCH" : spent ? "ENERJİ TÜKENDİ" : "SAFE LATCH", 0, 0);
    context.font = "700 11px monospace";
    context.letterSpacing = "1.5px";
    context.fillStyle = perfect
      ? "rgba(255,240,190,0.88)"
      : spent
        ? "rgba(215,219,238,0.78)"
        : "rgba(190,245,255,0.8)";
    context.shadowBlur = 0;
    context.fillText(perfect ? `COMBO x${runtime.combo}` : spent ? "COMBO YOK" : "COMBO RESET", 0, 18);
    context.restore();
  }

  if (runtime.phase === "playing" && (runtime.extraLifeTimer > 0 || runtime.respawnTimer > 0)) {
    const extraLife = runtime.extraLifeTimer > 0;
    const timer = extraLife ? runtime.extraLifeTimer : runtime.respawnTimer;
    context.save();
    context.globalAlpha = clamp(timer / 0.24, 0, 1);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "850 16px Arial";
    context.letterSpacing = "1.2px";
    context.fillStyle = extraLife ? "#ff9be4" : "#8ff8ff";
    context.shadowColor = extraLife ? "#ff4fc8" : "#56f3ff";
    context.shadowBlur = 18;
    context.fillText(extraLife ? "EXTRA LIFE +1" : "ORBIT RECOVERED", WIDTH / 2, 207);
    context.restore();
  }

  if (runtime.phase === "playing" && runtime.combo > 0) {
    const ratio = clamp(runtime.comboTimer / runtime.settings.comboDuration, 0, 1);
    const centerX = WIDTH / 2;
    const centerY = 105;
    const tierLabel = getComboTierLabel(runtime.combo);
    const popScale = 1 + Math.sin(clamp(runtime.comboPop / 0.45, 0, 1) * Math.PI) * 0.17;
    context.save();
    context.translate(centerX, centerY);
    context.scale(popScale, popScale);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 10px monospace";
    context.letterSpacing = "2px";
    context.fillStyle = comboTier >= 2 ? "rgba(255,214,107,0.92)" : "rgba(226,240,255,0.78)";
    context.fillText(tierLabel ?? "COMBO", 0, -12);
    context.font = `850 ${runtime.combo >= 15 ? 30 : runtime.combo >= 10 ? 27 : 24}px Arial`;
    context.fillStyle = comboTier >= 3 ? "#fff0a8" : comboTier >= 2 ? "#ff9be4" : "#ffffff";
    context.shadowColor = comboTier >= 2 ? "#ff4fc8" : "#a96cff";
    context.shadowBlur = 14 + Math.min(runtime.combo, 24) * 1.2;
    context.fillText(`x${runtime.combo}`, 0, 11);
    context.restore();

    context.save();
    context.strokeStyle = "rgba(255,255,255,0.1)";
    context.lineWidth = 2.2;
    context.beginPath();
    context.arc(centerX, centerY, 38, 0, TAU);
    context.stroke();
    context.strokeStyle = ratio < 0.28 ? "#ff4f8a" : "#56f3ff";
    context.shadowColor = ratio < 0.28 ? "#ff4f8a" : "#56f3ff";
    context.shadowBlur = 10;
    context.lineCap = "round";
    context.beginPath();
    context.arc(centerX, centerY, 38, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
    context.stroke();
    context.restore();
  }

  if (runtime.phase === "playing" && runtime.milestoneTimer > 0 && runtime.milestoneLabel) {
    const progress = 1 - clamp(runtime.milestoneTimer / 1.05, 0, 1);
    const alpha = clamp(runtime.milestoneTimer / 0.22, 0, 1);
    context.save();
    context.translate(WIDTH / 2, HEIGHT * 0.43);
    context.scale(0.78 + Math.sin(Math.min(progress * Math.PI, Math.PI)) * 0.24, 1);
    context.globalAlpha = alpha;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 25px Arial";
    context.letterSpacing = "3px";
    context.fillStyle = runtime.milestoneLabel === "SUPERNOVA" ? "#fff0a8" : "#ff9be4";
    context.shadowColor = runtime.milestoneLabel === "SUPERNOVA" ? "#ffd66b" : "#ff4fc8";
    context.shadowBlur = 30;
    context.fillText(runtime.milestoneLabel, 0, 0);
    context.font = "700 10px monospace";
    context.letterSpacing = "2px";
    context.fillStyle = "rgba(225,252,255,0.86)";
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 12;
    context.fillText(
      runtime.milestoneLabel === "IGNITION"
        ? "İYON ATEŞLEMESİ · İZ GÜÇLENDİ"
        : "AKIŞ KIRILDI · ZAMAN YAVAŞLADI",
      0,
      23,
    );
    context.restore();
  }

  if (runtime.flash > 0) {
    context.fillStyle = `rgba(117,245,255,${runtime.flash * 0.12})`;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (runtime.slowMotionTimer > 0) {
    context.save();
    const slowPulse = clamp(runtime.slowMotionTimer / 0.28, 0, 1);
    const slowGradient = context.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      HEIGHT * 0.18,
      WIDTH / 2,
      HEIGHT / 2,
      HEIGHT * 0.65,
    );
    slowGradient.addColorStop(0, "rgba(86,243,255,0)");
    slowGradient.addColorStop(0.72, `rgba(169,108,255,${slowPulse * 0.035})`);
    slowGradient.addColorStop(1, `rgba(255,79,200,${slowPulse * 0.16})`);
    context.fillStyle = slowGradient;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.restore();
  }
}

export function OrbitRushGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const inputDownRef = useRef<() => void>(() => undefined);
  const inputUpRef = useRef<() => void>(() => undefined);
  const inputCancelRef = useRef<() => void>(() => undefined);
  const activeInputSourceRef = useRef<"pointer" | "keyboard" | null>(null);
  const activeGamePointerRef = useRef<number | null>(null);
  const shopRef = useRef<HTMLElement>(null);
  const shopTriggerRef = useRef<HTMLButtonElement>(null);
  const tutorialCompletedRef = useRef(false);
  const tutorialIntroAcknowledgedRef = useRef(false);
  const tutorialIntroOpenRef = useRef(false);
  const settingsRef = useRef<DevSettings>({ ...DEFAULT_DEV_SETTINGS });
  const profileRef = useRef<PlayerProfile>({
    ...DEFAULT_PROFILE,
    ownedSkinIds: [...DEFAULT_PROFILE.ownedSkinIds],
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const [muted, setMuted] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [devSettings, setDevSettings] = useState<DevSettings>({ ...DEFAULT_DEV_SETTINGS });
  const [profile, setProfile] = useState<PlayerProfile>({
    ...DEFAULT_PROFILE,
    ownedSkinIds: [...DEFAULT_PROFILE.ownedSkinIds],
  });
  const [profilePersistent, setProfilePersistent] = useState(true);
  const [showLaunchTutorial, setShowLaunchTutorial] = useState(false);
  const [showTutorialIntro, setShowTutorialIntro] = useState(false);
  const [summary, setSummary] = useState({ score: 0, best: 0, crystals: 0, reason: "" });

  const closeShop = useCallback(() => {
    setShopOpen(false);
    window.requestAnimationFrame(() => shopTriggerRef.current?.focus());
  }, []);

  const restart = useCallback(() => {
    const old = runtimeRef.current;
    const best = old?.best ?? Number(safeStorageGet("orbitrush-best", "0"));
    const tutorial =
      !tutorialCompletedRef.current && safeStorageGet("orbitrush-tutorial", "") !== "done";
    audioRef.current?.setIntensity(0);
    audioRef.current?.setLatchState(false, false);
    const runtime = createRuntime(best, tutorial, settingsRef.current, profileRef.current);
    runtimeRef.current = runtime;
    setShopOpen(false);
    setShowLaunchTutorial(tutorial);
    const showIntro = tutorial && !tutorialIntroAcknowledgedRef.current;
    tutorialIntroOpenRef.current = showIntro;
    setShowTutorialIntro(showIntro);
    setPhase("ready");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const best = Number(safeStorageGet("orbitrush-best", "0"));
    const tutorial = safeStorageGet("orbitrush-tutorial", "") !== "done";
    tutorialCompletedRef.current = !tutorial;
    const storedSettings = loadDevSettings();
    const storedProfile = loadPlayerProfile();
    settingsRef.current = storedSettings;
    profileRef.current = storedProfile;
    setDevSettings(storedSettings);
    setProfile(storedProfile);
    setShowLaunchTutorial(tutorial);
    tutorialIntroAcknowledgedRef.current = !tutorial;
    tutorialIntroOpenRef.current = tutorial;
    setShowTutorialIntro(tutorial);
    const runtime = createRuntime(best, tutorial, storedSettings, storedProfile);
    runtimeRef.current = runtime;
    audioRef.current = makeAudioEngine();
    setSummary({ score: 0, best, crystals: 0, reason: "" });

    const die = (reason: DeathReason) => {
      const current = runtimeRef.current;
      if (!current || current.phase !== "playing") return;
      const respawnPlanet = planetById(current, current.lastLatchedPlanetId);
      if (current.lives > 1 && respawnPlanet) {
        emitBurst(current, current.player.x, current.player.y, "#ff4fc8", 24, 150);
        current.lives -= 1;
        current.combo = 0;
        current.comboTimer = 0;
        current.comboPop = 0;
        current.slowMotionTimer = 0;
        current.slowMotionScale = 1;
        if (respawnPlanet.fractured) {
          respawnPlanet.fractured = false;
          respawnPlanet.fragileRemaining = TAU * 0.75;
        }
        const activeOrbit = planetOrbitAt(respawnPlanet, current.elapsed);
        current.player.angle = current.lastLatchedAngle;
        current.player.direction = current.lastLatchedDirection;
        current.player.speed = current.settings.baseSpeed;
        current.player.x =
          respawnPlanet.x + Math.cos(current.player.angle) * activeOrbit;
        current.player.y =
          respawnPlanet.y + Math.sin(current.player.angle) * activeOrbit;
        current.player.vx =
          -Math.sin(current.player.angle) * current.player.direction * current.player.speed;
        current.player.vy =
          Math.cos(current.player.angle) * current.player.direction * current.player.speed;
        current.player.orbitPlanetId = respawnPlanet.id;
        current.player.releasedPlanetId = null;
        current.cameraY = respawnPlanet.y - HEIGHT * 0.33;
        current.cameraTargetY = current.cameraY;
        current.holdInputActive = false;
        current.latchHoldTime = 0;
        current.latchAttemptCount = 0;
        current.latchFeedback = null;
        current.latchFeedbackTimer = 0;
        current.extraLifeTimer = 0;
        current.respawnTimer = 1.15;
        current.trail = [];
        current.shake = 5;
        current.flash = 1;
        audioRef.current?.setLatchState(false, false);
        audioRef.current?.setIntensity(0);
        audioRef.current?.respawn();
        haptic([28, 24, 45]);
        return;
      }
      current.phase = "dead";
      current.reason = reason;
      current.holdInputActive = false;
      current.shake = 7;
      current.flash = 1;
      emitBurst(current, current.player.x, current.player.y, "#ff4fc8", 34, 190);
      emitBurst(current, current.player.x, current.player.y, "#56f3ff", 22, 130);
      current.best = Math.max(current.best, current.score);
      safeStorageSet("orbitrush-best", String(current.best));
      audioRef.current?.setLatchState(false, false);
      audioRef.current?.setIntensity(0);
      audioRef.current?.death();
      haptic([45, 35, 90]);
      setSummary({
        score: current.score,
        best: current.best,
        crystals: current.runCrystals,
        reason,
      });
      setPhase("dead");
    };

    const releaseFromOrbit = (current: GameRuntime) => {
      const { player } = current;
      if (player.orbitPlanetId === null) return;
      const planet = planetById(current, player.orbitPlanetId);
      if (!planet) return;
      const tangentX = -Math.sin(player.angle) * player.direction;
      const tangentY = Math.cos(player.angle) * player.direction;
      player.vx = tangentX * player.speed + clamp(planet.velocityX, -24, 24);
      player.vy = tangentY * player.speed + clamp(planet.velocityY, -24, 24);
      player.speed = Math.hypot(player.vx, player.vy);
      current.lastLatchedAngle = player.angle;
      current.lastLatchedDirection = player.direction;
      player.releasedPlanetId = planet.id;
      player.orbitPlanetId = null;
      current.latchHoldTime = 0;
      current.latchAttemptCount = 0;
      const skin = skinById(current.skinId);
      emitBurst(current, player.x, player.y, skin.primary, 10 + getComboTier(current.combo) * 3, 60);
      audioRef.current?.setLatchState(false, false);
      audioRef.current?.release();
      haptic(7);
    };

    const lockToPlanet = (current: GameRuntime, target: Planet) => {
      const { player } = current;
      const brokenCombo = current.combo;
      const awardsCombo = target.comboAvailable;
      target.comboAvailable = false;
      const perfect =
        current.latchAttemptCount === 1 &&
        current.latchHoldTime <= current.settings.perfectLatchWindow;
      const angle = Math.atan2(player.y - target.y, player.x - target.x);
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      const incomingDirection: 1 | -1 =
        (player.vx - target.velocityX) * tangentX +
          (player.vy - target.velocityY) * tangentY >=
        0
          ? 1
          : -1;
      const direction: 1 | -1 =
        target.kind === "reverse" ? (incomingDirection === 1 ? -1 : 1) : incomingDirection;
      const activeOrbit = planetOrbitAt(target, current.elapsed);
      player.angle = angle;
      player.direction = direction;
      player.x = target.x + Math.cos(angle) * activeOrbit;
      player.y = target.y + Math.sin(angle) * activeOrbit;
      player.speed = Math.hypot(player.vx, player.vy);
      player.orbitPlanetId = target.id;
      player.releasedPlanetId = null;
      current.lastLatchedPlanetId = target.id;
      current.lastLatchedAngle = angle;
      current.lastLatchedDirection = direction;
      current.latchHoldTime = 0;
      if (awardsCombo) current.visitedPlanets += 1;
      audioRef.current?.setLatchState(current.holdInputActive, true);

      if (!awardsCombo) {
        current.latchFeedback = "spent";
        current.latchFeedbackTimer = 0.58;
        current.flash = Math.max(current.flash, 0.18);
        current.shake = Math.max(current.shake, 0.35);
        audioRef.current?.safeLock();
        haptic(5);
      } else if (perfect) {
        current.combo += 1;
        current.peakCombo = Math.max(current.peakCombo, current.combo);
        current.comboTimer = current.settings.comboDuration;
        current.comboPop = 0.45;
        const lockPoints = Math.round(
          (target.risk ? 105 : 75) *
            specialPlanetScoreMultiplier(target.kind) *
            Math.pow(current.combo, 1.34),
        );
        current.score += lockPoints;
        current.latchFeedback = "perfect";
        current.latchFeedbackTimer = 0.85;
        current.flash = 1;
        current.shake = Math.min(1.5 + current.combo * 0.13, 4.5);
        audioRef.current?.lock(current.combo);
        audioRef.current?.setIntensity(current.combo);
        if (current.combo % 10 === 0) {
          current.lives += 1;
          current.extraLifeTimer = 1.25;
          audioRef.current?.extraLife();
        }
        const milestone = current.combo === 5 || current.combo === 10 || current.combo === 15;
        if (milestone) {
          current.milestoneLabel = getComboTierLabel(current.combo);
          current.milestoneTimer = 1.05;
          current.overdrivePulse = 1;
        }
        if (current.combo >= SLOW_MOTION_COMBO) {
          current.slowMotionTimer = milestone ? 0.28 : 0.11;
          current.slowMotionScale = milestone ? 0.3 : 0.58;
          current.overdrivePulse = 1;
          audioRef.current?.overdrive(current.combo, milestone);
        } else if (milestone) {
          audioRef.current?.overdrive(current.combo, true);
        }
        haptic(
          milestone
            ? current.combo >= SLOW_MOTION_COMBO
              ? [18, 20, 38]
              : [14, 22, 20]
            : 12,
        );
      } else {
        current.combo = 0;
        current.comboTimer = 0;
        current.comboPop = 0;
        current.score += Math.round(
          (target.risk ? 55 : 35) * specialPlanetScoreMultiplier(target.kind),
        );
        current.latchFeedback = "safe";
        current.latchFeedbackTimer = 0.7;
        current.flash = 0.45;
        current.shake = 1.2;
        audioRef.current?.safeLock();
        if (brokenCombo > 5) audioRef.current?.comboFail();
        audioRef.current?.setIntensity(0);
        haptic(10);
      }
      current.best = Math.max(current.best, current.score);
      current.cameraTargetY = Math.max(current.cameraTargetY, target.y - HEIGHT * 0.33);
      emitBurst(
        current,
        player.x,
        player.y,
        awardsCombo ? `hsl(${target.hue} 100% 68%)` : "#777d9e",
        awardsCombo ? 18 + getComboTier(current.combo) * 4 : 8,
        awardsCombo ? 86 : 42,
      );
      generateRows(current, current.cameraTargetY + HEIGHT * 2.55);

      if (current.tutorial) {
        current.tutorial = false;
        tutorialCompletedRef.current = true;
        setShowLaunchTutorial(false);
        tutorialIntroOpenRef.current = false;
        setShowTutorialIntro(false);
        safeStorageSet("orbitrush-tutorial", "done");
      }
    };

    const startRun = (current: GameRuntime) => {
      current.phase = "playing";
      current.lastTime = performance.now();
      audioRef.current?.setIntensity(0);
      setPhase("playing");
    };

    const launchFromLauncher = (current: GameRuntime) => {
      const directionX = Math.cos(current.launcher.angle);
      const directionY = Math.sin(current.launcher.angle);
      current.player.x = current.launcher.x + directionX * 32;
      current.player.y = current.launcher.y + directionY * 32;
      current.player.speed = current.settings.baseSpeed;
      current.player.vx = directionX * current.player.speed;
      current.player.vy = directionY * current.player.speed;
      current.player.orbitPlanetId = null;
      current.player.releasedPlanetId = null;
      current.holdInputActive = true;
      current.latchAttemptCount = 0;
      current.latchHoldTime = 0;
      emitBurst(current, current.player.x, current.player.y, "#56f3ff", 14, 72);
      audioRef.current?.release();
      audioRef.current?.setLatchState(true, false);
    };

    inputDownRef.current = () => {
      let current = runtimeRef.current;
      if (!current) return;
      audioRef.current?.ensure();
      if (current.devPaused) return;

      if (current.phase === "ready") {
        startRun(current);
        launchFromLauncher(current);
        return;
      }
      if (current.phase === "dead") {
        restart();
        current = runtimeRef.current;
        if (current) {
          startRun(current);
          launchFromLauncher(current);
        }
        return;
      }

      const { player } = current;
      if (current.holdInputActive) return;
      current.holdInputActive = true;
      audioRef.current?.setLatchState(true, player.orbitPlanetId !== null);
      if (player.orbitPlanetId === null) {
        current.latchAttemptCount += 1;
        current.latchHoldTime = 0;
        const target = findLockCandidate(current);
        if (target) lockToPlanet(current, target);
      }
    };

    inputUpRef.current = () => {
      const current = runtimeRef.current;
      if (!current) return;
      const wasHolding = current.holdInputActive;
      current.holdInputActive = false;
      audioRef.current?.setLatchState(false, false);
      if (current.phase !== "playing") return;
      if (wasHolding && current.player.orbitPlanetId !== null) releaseFromOrbit(current);
    };

    inputCancelRef.current = () => {
      const current = runtimeRef.current;
      if (!current) return;
      current.holdInputActive = false;
      audioRef.current?.setLatchState(false, false);
    };

    const update = (realDt: number) => {
      const runtime = runtimeRef.current;
      if (!runtime || runtime.devPaused) return;

      const slowMotionActive = runtime.slowMotionTimer > 0;
      const gameDt = realDt * (slowMotionActive ? runtime.slowMotionScale : 1);
      runtime.slowMotionTimer = Math.max(0, runtime.slowMotionTimer - realDt);
      runtime.elapsed += gameDt;
      runtime.cameraY +=
        (runtime.cameraTargetY - runtime.cameraY) * (1 - Math.exp(-gameDt * 4.2));
      const zoomProgress = clamp(runtime.visitedPlanets / 30, 0, 1);
      const paceZoom = clamp((runtime.peakCombo - 4) / 20, 0, 1);
      const targetZoom = clamp(0.93 - zoomProgress * 0.07 - paceZoom * 0.035, 0.82, 0.93);
      runtime.cameraZoom += (targetZoom - runtime.cameraZoom) * (1 - Math.exp(-gameDt * 2.1));
      runtime.shake = Math.max(0, runtime.shake - realDt * 18);
      runtime.flash = Math.max(0, runtime.flash - realDt * 3.6);
      runtime.comboPop = Math.max(0, runtime.comboPop - realDt);
      runtime.overdrivePulse = Math.max(0, runtime.overdrivePulse - realDt * 1.7);
      runtime.milestoneTimer = Math.max(0, runtime.milestoneTimer - realDt);
      if (runtime.milestoneTimer === 0) runtime.milestoneLabel = null;
      runtime.latchFeedbackTimer = Math.max(0, runtime.latchFeedbackTimer - realDt);
      runtime.extraLifeTimer = Math.max(0, runtime.extraLifeTimer - realDt);
      runtime.respawnTimer = Math.max(0, runtime.respawnTimer - realDt);
      if (runtime.latchFeedbackTimer === 0) runtime.latchFeedback = null;

      for (const body of runtime.planets) {
        if (body.fractured || body.kind !== "moving") {
          body.velocityX = 0;
          body.velocityY = 0;
          continue;
        }
        const previousX = body.x;
        const previousY = body.y;
        const offset =
          Math.sin(runtime.elapsed * body.movementSpeed + body.movementPhase) *
          body.movementAmplitude;
        body.x = body.baseX + (body.movementAxis === "horizontal" ? offset : 0);
        body.y = body.baseY + (body.movementAxis === "vertical" ? offset : 0);
        if (gameDt > 0) {
          body.velocityX = (body.x - previousX) / gameDt;
          body.velocityY = (body.y - previousY) / gameDt;
        }
      }

      if (runtime.phase === "ready") {
        runtime.launcher.angle = Math.PI / 2 + Math.sin(runtime.elapsed * 1.28) * 0.5;
        const directionX = Math.cos(runtime.launcher.angle);
        const directionY = Math.sin(runtime.launcher.angle);
        runtime.player.x = runtime.launcher.x + directionX * 32;
        runtime.player.y = runtime.launcher.y + directionY * 32;
        runtime.player.speed = runtime.settings.baseSpeed;
        runtime.player.vx = directionX * runtime.player.speed;
        runtime.player.vy = directionY * runtime.player.speed;
      }

      if (runtime.phase === "playing") {
        const previousPlayerX = runtime.player.x;
        const previousPlayerY = runtime.player.y;

        if (runtime.combo > 0) {
          runtime.comboTimer -= realDt;
          if (runtime.comboTimer <= 0) {
            runtime.combo = 0;
            runtime.comboTimer = 0;
            audioRef.current?.breakCombo();
            audioRef.current?.setIntensity(0);
          }
        }

        const targetSpeed =
          runtime.settings.baseSpeed *
          (1 + Math.min(runtime.combo, 24) * runtime.settings.comboSpeedGain);
        runtime.player.speed +=
          (targetSpeed - runtime.player.speed) * (1 - Math.exp(-gameDt * 2.7));

        const planet = planetById(runtime, runtime.player.orbitPlanetId);
        if (planet) {
          const activeOrbit = planetOrbitAt(planet, runtime.elapsed);
          const angularDelta =
            (runtime.player.speed / activeOrbit) *
            runtime.player.direction *
            planet.orbitSpeedMultiplier *
            gameDt;
          runtime.player.angle += angularDelta;
          runtime.player.x = planet.x + Math.cos(runtime.player.angle) * activeOrbit;
          runtime.player.y = planet.y + Math.sin(runtime.player.angle) * activeOrbit;

          if (planet.kind === "fragile") {
            planet.fragileRemaining -= Math.abs(angularDelta);
            if (planet.fragileRemaining <= 0) {
              releaseFromOrbit(runtime);
              planet.fractured = true;
              runtime.holdInputActive = false;
              audioRef.current?.setLatchState(false, false);
              runtime.flash = 0.9;
              runtime.shake = 4;
              emitBurst(runtime, planet.x, planet.y, "#ff6f9f", 30, 135);
              audioRef.current?.fracture();
              haptic([24, 18, 28]);
            }
          }
        } else {
          const magnitude = Math.hypot(runtime.player.vx, runtime.player.vy) || 1;
          runtime.player.vx = (runtime.player.vx / magnitude) * runtime.player.speed;
          runtime.player.vy = (runtime.player.vy / magnitude) * runtime.player.speed;
          runtime.player.x += runtime.player.vx * gameDt;
          runtime.player.y += runtime.player.vy * gameDt;

          if (runtime.holdInputActive) {
            runtime.latchHoldTime += realDt;
            const target = findLockCandidate(runtime);
            if (target) lockToPlanet(runtime, target);
          }
        }

        if (runtime.phase === "playing") {
          for (const body of runtime.planets) {
            if (body.fractured || body.id === runtime.player.orbitPlanetId) continue;
            if (
              segmentHitsCircle(
                previousPlayerX,
                previousPlayerY,
                runtime.player.x,
                runtime.player.y,
                body.x,
                body.y,
                body.radius + PLAYER_RADIUS * 0.5,
              )
            ) {
              die("ÇARPIŞMA");
              break;
            }
          }
        }

        if (runtime.phase === "playing" && runtime.player.orbitPlanetId === null) {
          for (const asteroid of runtime.asteroids) {
            if (
              segmentHitsCircle(
                previousPlayerX,
                previousPlayerY,
                runtime.player.x,
                runtime.player.y,
                asteroid.x,
                asteroid.y,
                asteroid.radius + PLAYER_RADIUS * 0.45,
              )
            ) {
              die("ASTEROİDE ÇARPTIN");
              break;
            }
          }
        }

        if (runtime.phase === "playing" && runtime.player.orbitPlanetId === null) {
          const screenY = worldToScreenY(runtime, runtime.player.y);
          const zoomAnchorY = HEIGHT * 0.56;
          const visibleLeft = WIDTH / 2 - WIDTH / (2 * runtime.cameraZoom);
          const visibleRight = WIDTH / 2 + WIDTH / (2 * runtime.cameraZoom);
          const visibleTop = zoomAnchorY - zoomAnchorY / runtime.cameraZoom;
          const visibleBottom =
            zoomAnchorY + (HEIGHT - zoomAnchorY) / runtime.cameraZoom;
          const margin = 26 / runtime.cameraZoom;
          if (
            runtime.player.x < visibleLeft - margin ||
            runtime.player.x > visibleRight + margin ||
            screenY < visibleTop - margin ||
            screenY > visibleBottom + margin
          ) {
            die("BOŞLUĞA SAVRULDUN");
          }
        }

        if (runtime.phase === "playing") {
          for (const body of runtime.planets) {
            if (body.fractured) continue;
            const activeOrbit = planetOrbitAt(body, runtime.elapsed);
            for (const crystal of body.crystals) {
              if (crystal.collected) continue;
              const cx = body.x + Math.cos(crystal.angle) * activeOrbit;
              const cy = body.y + Math.sin(crystal.angle) * activeOrbit;
              if (Math.hypot(runtime.player.x - cx, runtime.player.y - cy) < PLAYER_RADIUS + 7) {
                crystal.collected = true;
                runtime.runCrystals += 1;
                runtime.walletCrystals += 1;
                runtime.score += Math.round(22 * Math.pow(Math.max(runtime.combo, 1), 1.22));
                runtime.best = Math.max(runtime.best, runtime.score);
                runtime.flash = Math.max(runtime.flash, 0.35);
                const nextProfile: PlayerProfile = {
                  ...profileRef.current,
                  crystalBalance: profileRef.current.crystalBalance + 1,
                  ownedSkinIds: [...profileRef.current.ownedSkinIds],
                };
                profileRef.current = nextProfile;
                if (!savePlayerProfile(nextProfile)) setProfilePersistent(false);
                setProfile(nextProfile);
                emitBurst(runtime, cx, cy, "#ffd66b", 8, 54);
                audioRef.current?.crystal(runtime.combo);
                haptic(5);
              }
            }
          }
        }

        const tier = getComboTier(runtime.combo);
        runtime.trail.push({ x: runtime.player.x, y: runtime.player.y, life: 1 });
        const trailLimit = 32 + tier * 18 + Math.min(runtime.combo, 18);
        while (runtime.trail.length > trailLimit) runtime.trail.shift();
        if (tier > 0 && Math.random() < gameDt * (5 + tier * 5)) {
          const skin = skinById(runtime.skinId);
          emitBurst(runtime, runtime.player.x, runtime.player.y, skin.secondary, 1, 24 + tier * 7);
        }
      }

      const trailDecay = 2.7 - getComboTier(runtime.combo) * 0.38;
      for (const trail of runtime.trail) trail.life -= gameDt * trailDecay;
      runtime.trail = runtime.trail.filter((trail) => trail.life > 0);
      for (const particle of runtime.particles) {
        particle.x += particle.vx * gameDt;
        particle.y += particle.vy * gameDt;
        particle.vx *= Math.pow(0.94, gameDt * 60);
        particle.vy *= Math.pow(0.94, gameDt * 60);
        particle.life -= gameDt;
      }
      runtime.particles = runtime.particles.filter((particle) => particle.life > 0);
      runtime.planets = runtime.planets.filter(
        (body) =>
          (!body.fractured && body.baseY > runtime.cameraY - 260) ||
          body.id === runtime.player.orbitPlanetId ||
          body.id === runtime.lastLatchedPlanetId,
      );
      runtime.asteroids = runtime.asteroids.filter(
        (asteroid) => asteroid.y > runtime.cameraY - 280,
      );
      runtime.asteroidBelts = runtime.asteroidBelts.filter(
        (belt) => belt.y > runtime.cameraY - 300,
      );
    };

    let frameId = 0;
    const frame = (time: number) => {
      const active = runtimeRef.current;
      if (!active) return;
      const dt = Math.min((time - active.lastTime) / 1000, 0.033);
      active.lastTime = time;
      update(dt);
      drawGame(context, active);
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, input, aside")) {
        return;
      }
      if (tutorialIntroOpenRef.current) {
        event.preventDefault();
        return;
      }
      if (activeInputSourceRef.current !== null) return;
      event.preventDefault();
      activeInputSourceRef.current = "keyboard";
      inputDownRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || activeInputSourceRef.current !== "keyboard") return;
      event.preventDefault();
      activeInputSourceRef.current = null;
      inputUpRef.current();
    };
    const cancelHeldInput = () => {
      activeInputSourceRef.current = null;
      activeGamePointerRef.current = null;
      inputCancelRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") cancelHeldInput();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    window.addEventListener("blur", cancelHeldInput);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", cancelHeldInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      audioRef.current?.close();
      audioRef.current = null;
      runtimeRef.current = null;
      activeInputSourceRef.current = null;
      activeGamePointerRef.current = null;
    };
  }, [restart]);

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.devPaused = devOpen || shopOpen;
  }, [devOpen, shopOpen]);

  useEffect(() => {
    if (!shopOpen) return;
    const dialog = shopRef.current;
    dialog?.focus();

    const handleShopKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeShop();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleShopKeyDown);
    return () => document.removeEventListener("keydown", handleShopKeyDown);
  }, [closeShop, shopOpen]);

  const updateDevSetting = useCallback(
    (key: keyof DevSettings, value: number | boolean) => {
      const previous = settingsRef.current;
      const next = { ...previous, [key]: value } as DevSettings;
      settingsRef.current = next;
      setDevSettings(next);
      safeStorageSet("orbitrush-dev-settings", JSON.stringify(next));
      const runtime = runtimeRef.current;
      if (runtime) {
        const remainingComboRatio =
          runtime.combo > 0 ? clamp(runtime.comboTimer / previous.comboDuration, 0, 1) : 0;
        runtime.settings = { ...next };
        if (key === "comboDuration" && runtime.combo > 0) {
          runtime.comboTimer = next.comboDuration * remainingComboRatio;
        }
        if (key === "baseSpeed" && runtime.phase === "ready") {
          runtime.player.speed = next.baseSpeed;
        }
      }
    },
    [],
  );

  const resetDevSettings = useCallback(() => {
    const previous = settingsRef.current;
    const defaults = { ...DEFAULT_DEV_SETTINGS };
    settingsRef.current = defaults;
    setDevSettings(defaults);
    safeStorageSet("orbitrush-dev-settings", JSON.stringify(defaults));
    const runtime = runtimeRef.current;
    if (runtime) {
      const remainingComboRatio =
        runtime.combo > 0 ? clamp(runtime.comboTimer / previous.comboDuration, 0, 1) : 0;
      runtime.settings = { ...defaults };
      if (runtime.combo > 0) runtime.comboTimer = defaults.comboDuration * remainingComboRatio;
      if (runtime.phase === "ready") runtime.player.speed = defaults.baseSpeed;
    }
  }, []);

  const toggleDevPanel = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShopOpen(false);
    setDevOpen((value) => !value);
  }, []);

  const openShop = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (phase === "playing") return;
      setDevOpen(false);
      setShopOpen(true);
      haptic(7);
    },
    [phase],
  );

  const chooseSkin = useCallback((skinId: SkinId) => {
    const skin = skinById(skinId);
    const current = profileRef.current;
    const owned = current.ownedSkinIds.includes(skinId);
    if (!owned && current.crystalBalance < skin.price) {
      haptic([10, 30, 10]);
      return;
    }

    const next: PlayerProfile = {
      version: 1,
      crystalBalance: owned ? current.crystalBalance : current.crystalBalance - skin.price,
      ownedSkinIds: owned ? [...current.ownedSkinIds] : [...current.ownedSkinIds, skinId],
      equippedSkinId: skinId,
    };
    profileRef.current = next;
    if (!savePlayerProfile(next)) setProfilePersistent(false);
    setProfile(next);
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.skinId = skinId;
      runtime.walletCrystals = next.crystalBalance;
      runtime.flash = 0.7;
    }
    haptic(owned ? 10 : [15, 20, 32]);
  }, []);

  const acknowledgeTutorialIntro = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    tutorialIntroAcknowledgedRef.current = true;
    tutorialIntroOpenRef.current = false;
    setShowTutorialIntro(false);
    haptic(8);
  }, []);

  const onInputDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, input, aside")) return;
    if (tutorialIntroOpenRef.current) {
      event.preventDefault();
      return;
    }
    if (activeInputSourceRef.current !== null) return;
    event.preventDefault();
    activeInputSourceRef.current = "pointer";
    activeGamePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    inputDownRef.current();
  }, []);

  const onInputUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (
      activeInputSourceRef.current !== "pointer" ||
      activeGamePointerRef.current !== event.pointerId
    ) {
      return;
    }
    event.preventDefault();
    activeInputSourceRef.current = null;
    activeGamePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    inputUpRef.current();
  }, []);

  const onInputCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (
      activeInputSourceRef.current !== "pointer" ||
      activeGamePointerRef.current !== event.pointerId
    ) {
      return;
    }
    activeInputSourceRef.current = null;
    activeGamePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    inputCancelRef.current();
  }, []);

  const toggleSound = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMuted((value) => {
      audioRef.current?.ensure();
      audioRef.current?.setMuted(!value);
      return !value;
    });
  }, []);

  return (
    <main className="orbitrush-shell" aria-label="Orbitrush oyunu">
      <div
        className="game-frame"
        onPointerDown={onInputDown}
        onPointerUp={onInputUp}
        onPointerCancel={onInputCancel}
      >
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Orbitrush oyun alanı. İlk basış launcher'dan fırlatır; basılı tutarak kilitlen, bırakarak yörüngeden çık."
        />

        <button
          type="button"
          className="sound-toggle"
          aria-label={muted ? "Sesi aç" : "Sesi kapat"}
          onClick={toggleSound}
        >
          {muted ? "×" : "♪"}
        </button>

        <button
          type="button"
          className={`dev-toggle ${devSettings.helpers ? "is-active" : ""}`}
          aria-label="Developer Helper UI"
          aria-expanded={devOpen}
          onClick={toggleDevPanel}
        >
          DEV
        </button>

        {phase !== "playing" && !shopOpen && (
          <button
            ref={shopTriggerRef}
            type="button"
            className="shop-toggle"
            aria-label="Küre görünümlerini aç"
            onClick={openShop}
          >
            <span>◆ {profile.crystalBalance}</span>
            GÖRÜNÜMLER
          </button>
        )}

        {devOpen && (
          <aside
            className="dev-panel"
            aria-label="Developer Helper UI ayarları"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="dev-panel-heading">
              <div>
                <span>ORBITRUSH LAB</span>
                <h2>Developer Helper UI</h2>
              </div>
              <button type="button" aria-label="Developer menüsünü kapat" onClick={() => setDevOpen(false)}>
                ×
              </button>
            </div>

            <button
              type="button"
              className={`helper-switch ${devSettings.helpers ? "is-on" : ""}`}
              onClick={() => updateDevSetting("helpers", !devSettings.helpers)}
            >
              <span>
                <b>Helper overlay</b>
                Hitbox bandı + hız verisi
              </span>
              <i>{devSettings.helpers ? "ON" : "OFF"}</i>
            </button>

            <label className="dev-control">
              <span>
                <b>Perfect Latch penceresi</b>
                <output>{devSettings.perfectLatchWindow.toFixed(2)} sn</output>
              </span>
              <input
                type="range"
                min="0.08"
                max="0.5"
                step="0.01"
                value={devSettings.perfectLatchWindow}
                onChange={(event) =>
                  updateDevSetting("perfectLatchWindow", Number(event.target.value))
                }
              />
            </label>

            <label className="dev-control">
              <span>
                <b>Kombo süresi</b>
                <output>{devSettings.comboDuration.toFixed(1)} sn</output>
              </span>
              <input
                type="range"
                min="2.5"
                max="8"
                step="0.1"
                value={devSettings.comboDuration}
                onChange={(event) => updateDevSetting("comboDuration", Number(event.target.value))}
              />
            </label>

            <label className="dev-control">
              <span>
                <b>Başlangıç hızı</b>
                <output>{Math.round(devSettings.baseSpeed)}</output>
              </span>
              <input
                type="range"
                min="110"
                max="240"
                step="5"
                value={devSettings.baseSpeed}
                onChange={(event) => updateDevSetting("baseSpeed", Number(event.target.value))}
              />
            </label>

            <label className="dev-control">
              <span>
                <b>Kombo hız artışı</b>
                <output>%{(devSettings.comboSpeedGain * 100).toFixed(1)} / kombo</output>
              </span>
              <input
                type="range"
                min="0"
                max="0.12"
                step="0.005"
                value={devSettings.comboSpeedGain}
                onChange={(event) => updateDevSetting("comboSpeedGain", Number(event.target.value))}
              />
            </label>

            <label className="dev-control">
              <span>
                <b>Hit range</b>
                <output>±{Math.round(devSettings.lockTolerance)} px</output>
              </span>
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                value={devSettings.lockTolerance}
                onChange={(event) => updateDevSetting("lockTolerance", Number(event.target.value))}
              />
            </label>

            <div className="dev-panel-footer">
              <span>Menü açıkken oyun duraklar.</span>
              <button type="button" onClick={resetDevSettings}>Reset to default</button>
            </div>
          </aside>
        )}

        {shopOpen && (
          <div
            className="shop-backdrop"
            role="presentation"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <aside
              ref={shopRef}
              className="skin-shop"
              role="dialog"
              aria-modal="true"
              aria-label="Küre görünümleri mağazası"
              tabIndex={-1}
            >
              <div className="shop-heading">
                <div>
                  <span>ORBITRUSH VAULT</span>
                  <h2>KÜRE GÖRÜNÜMLERİ</h2>
                  <p>
                    {profilePersistent
                      ? "Yalnızca kozmetik · hitbox değişmez"
                      : "Depolama kapalı · seçimler bu oturum için"}
                  </p>
                </div>
                <div className="shop-balance" aria-label={`${profile.crystalBalance} kristal`}>
                  ◆ {profile.crystalBalance}
                </div>
                <button
                  type="button"
                  className="shop-close"
                  aria-label="Görünüm mağazasını kapat"
                  onClick={closeShop}
                >
                  ×
                </button>
              </div>

              <div className="skin-list">
                {PLAYER_SKINS.map((skin) => {
                  const owned = profile.ownedSkinIds.includes(skin.id);
                  const equipped = profile.equippedSkinId === skin.id;
                  const affordable = profile.crystalBalance >= skin.price;
                  return (
                    <article
                      key={skin.id}
                      className={`skin-card ${equipped ? "is-equipped" : ""}`}
                    >
                      <div
                        className={`skin-preview skin-preview--${skin.id}`}
                        aria-hidden="true"
                      />
                      <div className="skin-copy">
                        <h3>{skin.name}</h3>
                        <p>{skin.description}</p>
                        {!owned && <span>◆ {skin.price}</span>}
                      </div>
                      <button
                        type="button"
                        disabled={equipped || (!owned && !affordable)}
                        onClick={() => chooseSkin(skin.id)}
                      >
                        {equipped
                          ? "KUŞANILDI"
                          : owned
                            ? "KUŞAN"
                            : affordable
                              ? `SATIN AL · ◆${skin.price}`
                              : `◆${skin.price} GEREKLİ`}
                      </button>
                    </article>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {showLaunchTutorial && showTutorialIntro && phase !== "dead" && !shopOpen && !devOpen && (
          <section
            className="latch-tutorial is-intro"
            role="dialog"
            aria-labelledby="latch-tutorial-title"
            aria-describedby="latch-tutorial-description"
          >
            <div className="latch-demo" aria-hidden="true">
              <span className="latch-demo-orbit" />
              <span className="latch-demo-planet" />
              <span className="latch-demo-tangent" />
              <span className="latch-demo-orb" />
              <span className="latch-demo-touch" />
            </div>
            <div className="latch-tutorial-copy">
              <span>TEK KONTROL</span>
              <strong id="latch-tutorial-title">BAS · FIRLAT · BASILI TUT</strong>
              <p id="latch-tutorial-description">Yaklaşırken tut; yörüngedeyken bırak.</p>
              <button type="button" onClick={acknowledgeTutorialIntro}>
                ANLADIM
              </button>
            </div>
          </section>
        )}

        {showLaunchTutorial &&
          !showTutorialIntro &&
          phase === "ready" &&
          !shopOpen &&
          !devOpen && (
            <section className="launch-tutorial" role="note" aria-live="polite">
              <span>HAZIRSAN</span>
              <strong>FIRLATMAK İÇİN DOKUN</strong>
              <p>Açıyı launcher belirler.</p>
            </section>
          )}

        {showLaunchTutorial &&
          !showTutorialIntro &&
          phase === "playing" &&
          !shopOpen &&
          !devOpen && (
            <section
              className="latch-tutorial is-live"
              role="note"
              aria-labelledby="latch-tutorial-title"
            >
              <div className="latch-demo" aria-hidden="true">
                <span className="latch-demo-orbit" />
                <span className="latch-demo-planet" />
                <span className="latch-demo-tangent" />
                <span className="latch-demo-orb" />
                <span className="latch-demo-touch" />
              </div>
              <div className="latch-tutorial-copy">
                <span>SIRADAKİ HAMLE</span>
                <strong id="latch-tutorial-title">YAKLAŞIRKEN BASILI TUT</strong>
                <p>Yörüngeye kilitlenince bırak.</p>
              </div>
            </section>
          )}

        {phase === "ready" && (!showLaunchTutorial || showTutorialIntro) && (
          <div className="game-overlay">
            <div className={`overlay-content ${showTutorialIntro ? "has-latch-tutorial" : ""}`}>
              <p className="eyebrow">Açıyı seç · Fırlat · Sonsuz koşu</p>
              <h1 className="game-title">
                ORBIT<span>RUSH</span>
              </h1>
              <p className="tagline">Yörüngeyi kır. Boşluğu yakala.</p>
              <div className="input-prompt">
                Basılı tut / Space · Fırlat
              </div>
            </div>
          </div>
        )}

        {phase === "dead" && (
          <div className="game-overlay">
            <div className="overlay-content">
              <p className="eyebrow">{summary.reason}</p>
              <h2 className="death-title">KOŞU BİTTİ</h2>
              <p className="death-score">{String(summary.score).padStart(6, "0")}</p>
              <p className="death-label">Skor</p>
              <p className="best-label">En iyi · {String(summary.best).padStart(6, "0")}</p>
              <p className="run-crystals">Bu koşu +◆{summary.crystals}</p>
              <div className="input-prompt">Tekrar dene</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
