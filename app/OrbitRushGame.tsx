"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 390;
const HEIGHT = 693.333;
const TAU = Math.PI * 2;
const PLAYER_RADIUS = 6.5;

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
type TutorialStage = "release" | "lock" | "done";
type DeathReason = "ÇARPIŞMA" | "BOŞLUĞA SAVRULDUN";

type Crystal = {
  angle: number;
  collected: boolean;
};

type Planet = {
  id: number;
  x: number;
  y: number;
  radius: number;
  orbit: number;
  hue: number;
  risk: boolean;
  crystals: Crystal[];
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
  player: Player;
  launcher: Launcher;
  cameraY: number;
  cameraTargetY: number;
  generatedToY: number;
  nextPlanetId: number;
  row: number;
  score: number;
  best: number;
  combo: number;
  comboTimer: number;
  comboPop: number;
  crystals: number;
  particles: Particle[];
  trail: TrailPoint[];
  shake: number;
  flash: number;
  elapsed: number;
  lastTime: number;
  tutorial: boolean;
  tutorialStage: TutorialStage;
  reason: DeathReason;
  settings: DevSettings;
  devPaused: boolean;
  holdInputActive: boolean;
  latchHoldTime: number;
  latchAttemptCount: number;
  latchFeedback: "perfect" | "safe" | null;
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
  crystal: (combo: number) => void;
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
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
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
    crystal(combo) {
      const note = 740 + Math.min(combo, 18) * 22;
      tone(note, 0.1, 0.07, "sine", note * 1.42);
      tone(note * 1.33, 0.13, 0.035, "triangle", note * 1.55, 0.025);
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

function createPlanet(
  runtime: GameRuntime,
  x: number,
  y: number,
  risk: boolean,
  tutorial = false,
): Planet {
  const difficulty = Math.min(runtime.row / 30, 1);
  const radius = tutorial
    ? 27
    : risk
      ? random(15, 22) - difficulty
      : random(24, 34) - difficulty * 3;
  const orbitGap = risk ? random(31, 40) : random(38, 49);
  const orbit = radius + orbitGap;
  const count = tutorial ? 5 : risk ? Math.floor(random(7, 11)) : Math.floor(random(4, 7));
  const arcStart = tutorial ? 2.9 : random(0, TAU);
  const arcSpan = risk ? 1.65 : 1.25;
  const crystals = Array.from({ length: count }, (_, index) => ({
    angle: arcStart + (index / Math.max(count - 1, 1)) * arcSpan,
    collected: false,
  }));

  return {
    id: runtime.nextPlanetId++,
    x: clamp(x, orbit + 15, WIDTH - orbit - 15),
    y,
    radius,
    orbit,
    hue: risk ? random(315, 336) : random(258, 286),
    risk,
    crystals,
  };
}

function generateRows(runtime: GameRuntime, upToY: number) {
  while (runtime.generatedToY < upToY) {
    runtime.row += 1;
    const difficulty = Math.min(runtime.row / 28, 1);
    const gap = random(205, 255) + difficulty * 28;
    runtime.generatedToY += gap;
    const pair = Math.random() < 0.82;

    if (pair) {
      const riskOnLeft = Math.random() < 0.5;
      runtime.planets.push(
        createPlanet(
          runtime,
          random(82, 136),
          runtime.generatedToY + random(-24, 22),
          riskOnLeft,
        ),
        createPlanet(
          runtime,
          random(254, 308),
          runtime.generatedToY + random(-22, 25),
          !riskOnLeft,
        ),
      );
    } else {
      runtime.planets.push(
        createPlanet(
          runtime,
          random(105, 285),
          runtime.generatedToY,
          Math.random() < 0.42,
        ),
      );
    }
  }
}

function createRuntime(best: number, tutorial: boolean, settings: DevSettings): GameRuntime {
  const runtime = {
    phase: "ready" as Phase,
    planets: [] as Planet[],
    player: {} as Player,
    launcher: { x: WIDTH * 0.5, y: 82, angle: Math.PI / 2 },
    cameraY: 0,
    cameraTargetY: 0,
    generatedToY: 345,
    nextPlanetId: 1,
    row: 1,
    score: 0,
    best,
    combo: 0,
    comboTimer: 0,
    comboPop: 0,
    crystals: 0,
    particles: [] as Particle[],
    trail: [] as TrailPoint[],
    shake: 0,
    flash: 0,
    elapsed: 0,
    lastTime: performance.now(),
    tutorial,
    tutorialStage: tutorial ? ("lock" as TutorialStage) : ("done" as TutorialStage),
    reason: "BOŞLUĞA SAVRULDUN" as DeathReason,
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
    lastLatchedDirection: 1 as 1 | -1,
    extraLifeTimer: 0,
    respawnTimer: 0,
  };

  const tutorialTarget = createPlanet(runtime, 250, 340, false, true);
  const riskyTarget = createPlanet(runtime, 95, 382, true);
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
  generateRows(runtime, HEIGHT * 2.2);
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
    if (planet.id === player.releasedPlanetId) continue;
    const distance = Math.hypot(player.x - planet.x, player.y - planet.y);
    const delta = Math.abs(distance - planet.orbit);
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

  const candidate = runtime.player.orbitPlanetId === null ? findLockCandidate(runtime) : null;

  for (const planet of runtime.planets) {
    const sy = worldToScreenY(runtime, planet.y);
    if (sy < -planet.orbit - 60 || sy > HEIGHT + planet.orbit + 60) continue;
    const isCandidate = candidate?.id === planet.id;
    const hue = planet.hue;

    if (runtime.settings.helpers) {
      const tolerance = runtime.settings.lockTolerance;
      context.save();
      context.globalAlpha = isCandidate ? 0.34 : 0.14;
      context.strokeStyle = isCandidate ? "#56f3ff" : `hsl(${hue} 100% 68%)`;
      context.lineWidth = tolerance * 2;
      context.beginPath();
      context.arc(planet.x, sy, planet.orbit, 0, TAU);
      context.stroke();

      context.globalAlpha = isCandidate ? 0.9 : 0.5;
      context.lineWidth = 0.85;
      context.setLineDash([3, 4]);
      context.beginPath();
      context.arc(planet.x, sy, Math.max(planet.orbit - tolerance, 1), 0, TAU);
      context.stroke();
      context.beginPath();
      context.arc(planet.x, sy, planet.orbit + tolerance, 0, TAU);
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
    context.beginPath();
    context.arc(planet.x, sy, planet.orbit, 0, TAU);
    context.stroke();
    context.restore();

    for (const crystal of planet.crystals) {
      if (crystal.collected) continue;
      const cx = planet.x + Math.cos(crystal.angle) * planet.orbit;
      const cy = sy - Math.sin(crystal.angle) * planet.orbit;
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
    context.restore();
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

  for (const point of runtime.trail) {
    const sy = worldToScreenY(runtime, point.y);
    context.save();
    context.globalAlpha = point.life * 0.28;
    context.fillStyle = "#56f3ff";
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(point.x, sy, PLAYER_RADIUS * point.life * 0.72, 0, TAU);
    context.fill();
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
    const playerGlow = context.createRadialGradient(
      runtime.player.x - 2,
      playerY - 2,
      0,
      runtime.player.x,
      playerY,
      PLAYER_RADIUS * 2.4,
    );
    playerGlow.addColorStop(0, "#ffffff");
    playerGlow.addColorStop(0.28, "#bfffff");
    playerGlow.addColorStop(0.62, "#56f3ff");
    playerGlow.addColorStop(1, "rgba(86,243,255,0)");
    context.save();
    context.fillStyle = playerGlow;
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 18 + Math.min(runtime.combo, 16);
    context.beginPath();
    context.arc(runtime.player.x, playerY, PLAYER_RADIUS * 2.1, 0, TAU);
    context.fill();
    context.fillStyle = "#efffff";
    context.beginPath();
    context.arc(runtime.player.x, playerY, PLAYER_RADIUS, 0, TAU);
    context.fill();
    context.restore();
  }

  context.restore();

  if (runtime.phase !== "ready") {
    context.save();
    context.textBaseline = "top";
    context.font = "600 8px monospace";
    context.letterSpacing = "1.5px";
    context.fillStyle = "rgba(224,238,255,0.42)";
    context.fillText("EN İYİ", 15, 17);
    context.font = "700 13px monospace";
    context.fillStyle = "rgba(241,248,255,0.82)";
    context.fillText(String(runtime.best).padStart(6, "0"), 15, 29);

    context.textAlign = "center";
    context.font = "600 8px monospace";
    context.fillStyle = "rgba(224,238,255,0.42)";
    context.fillText("SKOR", WIDTH / 2, 17);
    context.font = "800 18px monospace";
    context.fillStyle = "#ffffff";
    context.shadowColor = "#56f3ff";
    context.shadowBlur = 8;
    context.fillText(String(runtime.score).padStart(6, "0"), WIDTH / 2, 28);

    context.textAlign = "right";
    context.shadowBlur = 0;
    context.font = "800 11px monospace";
    context.fillStyle = "#ff8cdb";
    context.fillText(`♥ ${runtime.lives}`, WIDTH - 15, 18);
    context.font = "700 11px monospace";
    context.fillStyle = "#ffd66b";
    context.fillText(`◆ ${runtime.crystals}`, WIDTH - 15, 34);
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
    context.font = "700 7px monospace";
    context.letterSpacing = "0.9px";
    context.fillStyle = "rgba(143,248,255,0.62)";
    context.fillText(
      `HIZ ${runtime.player.speed.toFixed(1)} · ${motionState}${latchState}`,
      WIDTH / 2,
      53,
    );
    context.restore();
  }

  if (runtime.phase === "playing" && runtime.latchFeedbackTimer > 0 && runtime.latchFeedback) {
    const perfect = runtime.latchFeedback === "perfect";
    const duration = perfect ? 0.85 : 0.7;
    const progress = 1 - clamp(runtime.latchFeedbackTimer / duration, 0, 1);
    const alpha = clamp(runtime.latchFeedbackTimer / 0.2, 0, 1);
    const scale = 0.88 + Math.sin(Math.min(progress * Math.PI, Math.PI)) * 0.16;
    context.save();
    context.translate(WIDTH / 2, 163 - progress * 10);
    context.scale(scale, scale);
    context.globalAlpha = alpha;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `850 ${perfect ? 18 : 15}px Arial`;
    context.letterSpacing = perfect ? "1.4px" : "1px";
    context.fillStyle = perfect ? "#ffd66b" : "#8ff8ff";
    context.shadowColor = perfect ? "#ff4fc8" : "#56f3ff";
    context.shadowBlur = perfect ? 20 : 10;
    context.fillText(perfect ? "PERFECT LATCH" : "SAFE LATCH", 0, 0);
    context.font = "700 8px monospace";
    context.letterSpacing = "1.5px";
    context.fillStyle = perfect ? "rgba(255,240,190,0.8)" : "rgba(190,245,255,0.58)";
    context.shadowBlur = 0;
    context.fillText(perfect ? `COMBO x${runtime.combo}` : "COMBO RESET", 0, 18);
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
    context.font = "700 8px monospace";
    context.letterSpacing = "1.4px";
    context.shadowBlur = 0;
    context.fillText(`♥ ${runtime.lives} CAN KALDI`, WIDTH / 2, 225);
    context.restore();
  }

  if (runtime.phase === "playing" && runtime.combo > 0) {
    const ratio = clamp(runtime.comboTimer / runtime.settings.comboDuration, 0, 1);
    const centerX = WIDTH / 2;
    const centerY = 105;
    const popScale = 1 + Math.sin(clamp(runtime.comboPop / 0.45, 0, 1) * Math.PI) * 0.17;
    context.save();
    context.translate(centerX, centerY);
    context.scale(popScale, popScale);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 8px monospace";
    context.letterSpacing = "2px";
    context.fillStyle = "rgba(226,240,255,0.56)";
    context.fillText("COMBO", 0, -10);
    context.font = `850 ${runtime.combo >= 10 ? 27 : 24}px Arial`;
    context.fillStyle = runtime.combo >= 8 ? "#ff9be4" : "#ffffff";
    context.shadowColor = runtime.combo >= 8 ? "#ff4fc8" : "#a96cff";
    context.shadowBlur = 14 + runtime.combo;
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

  if (runtime.phase === "playing" && runtime.tutorial && runtime.tutorialStage !== "done") {
    const lockMode = runtime.tutorialStage === "lock";
    const tutorialTitle = lockMode ? "BASILI TUT · KİLİTLEN" : "BIRAK · KİLİDİ AÇ";
    const tutorialDetail = lockMode
      ? "PERFECT İÇİN BIRAKIP SON ANDA BAS"
      : "TEĞET YÖNDE FIRLAYACAKSIN";
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 10px monospace";
    context.letterSpacing = "1.6px";
    context.fillStyle = "rgba(239,250,255,0.92)";
    context.shadowColor = lockMode ? "#a96cff" : "#56f3ff";
    context.shadowBlur = 12;
    context.fillText(tutorialTitle, WIDTH / 2, HEIGHT - 60);
    context.font = "500 8px monospace";
    context.fillStyle = "rgba(214,232,255,0.48)";
    context.shadowBlur = 0;
    context.fillText(tutorialDetail, WIDTH / 2, HEIGHT - 43);
    context.restore();
  }

  if (runtime.flash > 0) {
    context.fillStyle = `rgba(117,245,255,${runtime.flash * 0.12})`;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

export function OrbitRushGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const inputDownRef = useRef<() => void>(() => undefined);
  const inputUpRef = useRef<() => void>(() => undefined);
  const activeGamePointerRef = useRef<number | null>(null);
  const settingsRef = useRef<DevSettings>({ ...DEFAULT_DEV_SETTINGS });
  const [phase, setPhase] = useState<Phase>("ready");
  const [muted, setMuted] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devSettings, setDevSettings] = useState<DevSettings>({ ...DEFAULT_DEV_SETTINGS });
  const [summary, setSummary] = useState({ score: 0, best: 0, reason: "" });

  const restart = useCallback(() => {
    const old = runtimeRef.current;
    const best = old?.best ?? Number(safeStorageGet("orbitrush-best", "0"));
    const tutorial = safeStorageGet("orbitrush-tutorial", "") !== "done";
    const runtime = createRuntime(best, tutorial, settingsRef.current);
    runtimeRef.current = runtime;
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
    const storedSettings = loadDevSettings();
    settingsRef.current = storedSettings;
    setDevSettings(storedSettings);
    const runtime = createRuntime(best, tutorial, storedSettings);
    runtimeRef.current = runtime;
    audioRef.current = makeAudioEngine();
    setSummary({ score: 0, best, reason: "" });

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
        current.player.angle = current.lastLatchedAngle;
        current.player.direction = current.lastLatchedDirection;
        current.player.speed = current.settings.baseSpeed;
        current.player.x =
          respawnPlanet.x + Math.cos(current.player.angle) * respawnPlanet.orbit;
        current.player.y =
          respawnPlanet.y + Math.sin(current.player.angle) * respawnPlanet.orbit;
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
      setSummary({ score: current.score, best: current.best, reason });
      setPhase("dead");
    };

    const releaseFromOrbit = (current: GameRuntime) => {
      const { player } = current;
      if (player.orbitPlanetId === null) return;
      const planet = planetById(current, player.orbitPlanetId);
      if (!planet) return;
      const tangentX = -Math.sin(player.angle) * player.direction;
      const tangentY = Math.cos(player.angle) * player.direction;
      player.vx = tangentX * player.speed;
      player.vy = tangentY * player.speed;
      current.lastLatchedAngle = player.angle;
      current.lastLatchedDirection = player.direction;
      player.releasedPlanetId = planet.id;
      player.orbitPlanetId = null;
      current.latchHoldTime = 0;
      current.latchAttemptCount = 0;
      current.tutorialStage = current.tutorial ? "lock" : "done";
      emitBurst(current, player.x, player.y, "#56f3ff", 10, 60);
      audioRef.current?.release();
    };

    const lockToPlanet = (current: GameRuntime, target: Planet) => {
      const { player } = current;
      const perfect =
        current.latchAttemptCount === 1 &&
        current.latchHoldTime <= current.settings.perfectLatchWindow;
      const angle = Math.atan2(player.y - target.y, player.x - target.x);
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      const direction: 1 | -1 = player.vx * tangentX + player.vy * tangentY >= 0 ? 1 : -1;
      player.angle = angle;
      player.direction = direction;
      player.x = target.x + Math.cos(angle) * target.orbit;
      player.y = target.y + Math.sin(angle) * target.orbit;
      player.speed = Math.hypot(player.vx, player.vy);
      player.orbitPlanetId = target.id;
      player.releasedPlanetId = null;
      current.lastLatchedPlanetId = target.id;
      current.lastLatchedAngle = angle;
      current.lastLatchedDirection = direction;
      current.latchHoldTime = 0;
      audioRef.current?.setLatchState(current.holdInputActive, true);

      if (perfect) {
        current.combo += 1;
        current.comboTimer = current.settings.comboDuration;
        current.comboPop = 0.45;
        const lockPoints = Math.round((target.risk ? 105 : 75) * Math.pow(current.combo, 1.34));
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
      } else {
        current.combo = 0;
        current.comboTimer = 0;
        current.comboPop = 0;
        current.score += target.risk ? 55 : 35;
        current.latchFeedback = "safe";
        current.latchFeedbackTimer = 0.7;
        current.flash = 0.45;
        current.shake = 1.2;
        audioRef.current?.safeLock();
        audioRef.current?.setIntensity(0);
      }
      current.best = Math.max(current.best, current.score);
      current.cameraTargetY = Math.max(current.cameraTargetY, target.y - HEIGHT * 0.33);
      emitBurst(current, player.x, player.y, target.risk ? "#ff4fc8" : "#a96cff", 18, 86);
      generateRows(current, current.cameraTargetY + HEIGHT * 2.1);

      if (current.tutorial) {
        current.tutorial = false;
        current.tutorialStage = "done";
        safeStorageSet("orbitrush-tutorial", "done");
      }
    };

    const startRun = (current: GameRuntime) => {
      current.phase = "playing";
      current.lastTime = performance.now();
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
      current.tutorialStage = current.tutorial ? "lock" : "done";
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

    const update = (dt: number) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      if (runtime.devPaused) return;
      runtime.elapsed += dt;
      runtime.cameraY += (runtime.cameraTargetY - runtime.cameraY) * (1 - Math.exp(-dt * 4.8));
      runtime.shake = Math.max(0, runtime.shake - dt * 18);
      runtime.flash = Math.max(0, runtime.flash - dt * 3.6);
      runtime.comboPop = Math.max(0, runtime.comboPop - dt);
      runtime.latchFeedbackTimer = Math.max(0, runtime.latchFeedbackTimer - dt);
      runtime.extraLifeTimer = Math.max(0, runtime.extraLifeTimer - dt);
      runtime.respawnTimer = Math.max(0, runtime.respawnTimer - dt);
      if (runtime.latchFeedbackTimer === 0) runtime.latchFeedback = null;

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
        if (runtime.combo > 0) {
          runtime.comboTimer -= dt;
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
          (targetSpeed - runtime.player.speed) * (1 - Math.exp(-dt * 2.7));

        const planet = planetById(runtime, runtime.player.orbitPlanetId);
        if (planet) {
          runtime.player.angle +=
            (runtime.player.speed / planet.orbit) * runtime.player.direction * dt;
          runtime.player.x = planet.x + Math.cos(runtime.player.angle) * planet.orbit;
          runtime.player.y = planet.y + Math.sin(runtime.player.angle) * planet.orbit;
        } else {
          const magnitude = Math.hypot(runtime.player.vx, runtime.player.vy) || 1;
          runtime.player.vx = (runtime.player.vx / magnitude) * runtime.player.speed;
          runtime.player.vy = (runtime.player.vy / magnitude) * runtime.player.speed;
          runtime.player.x += runtime.player.vx * dt;
          runtime.player.y += runtime.player.vy * dt;

          if (runtime.holdInputActive) {
            runtime.latchHoldTime += dt;
            const target = findLockCandidate(runtime);
            if (target) lockToPlanet(runtime, target);
          }

          if (runtime.player.orbitPlanetId === null) {
            for (const body of runtime.planets) {
              const distance = Math.hypot(runtime.player.x - body.x, runtime.player.y - body.y);
              if (distance <= body.radius + PLAYER_RADIUS * 0.35) {
                die("ÇARPIŞMA");
                break;
              }
            }

            if (runtime.player.orbitPlanetId === null) {
              const screenY = worldToScreenY(runtime, runtime.player.y);
              if (
                runtime.phase === "playing" &&
                (runtime.player.x < -22 ||
                  runtime.player.x > WIDTH + 22 ||
                  screenY < -25 ||
                  screenY > HEIGHT + 25)
              ) {
                die("BOŞLUĞA SAVRULDUN");
              }
            }
          }
        }

        if (runtime.phase === "playing") {
          for (const body of runtime.planets) {
            for (const crystal of body.crystals) {
              if (crystal.collected) continue;
              const cx = body.x + Math.cos(crystal.angle) * body.orbit;
              const cy = body.y + Math.sin(crystal.angle) * body.orbit;
              if (Math.hypot(runtime.player.x - cx, runtime.player.y - cy) < PLAYER_RADIUS + 7) {
                crystal.collected = true;
                runtime.crystals += 1;
                runtime.score += Math.round(22 * Math.pow(Math.max(runtime.combo, 1), 1.22));
                runtime.best = Math.max(runtime.best, runtime.score);
                runtime.flash = Math.max(runtime.flash, 0.35);
                emitBurst(runtime, cx, cy, "#ffd66b", 8, 54);
                audioRef.current?.crystal(runtime.combo);
              }
            }
          }
        }

        runtime.trail.push({ x: runtime.player.x, y: runtime.player.y, life: 1 });
        if (runtime.trail.length > 30 + Math.min(runtime.combo, 16)) runtime.trail.shift();
      }

      for (const trail of runtime.trail) trail.life -= dt * 2.7;
      runtime.trail = runtime.trail.filter((trail) => trail.life > 0);
      for (const particle of runtime.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.94, dt * 60);
        particle.vy *= Math.pow(0.94, dt * 60);
        particle.life -= dt;
      }
      runtime.particles = runtime.particles.filter((particle) => particle.life > 0);
      runtime.planets = runtime.planets.filter(
        (planet) =>
          planet.y > runtime.cameraY - 220 ||
          planet.id === runtime.player.orbitPlanetId ||
          planet.id === runtime.lastLatchedPlanetId,
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
      event.preventDefault();
      inputDownRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      inputUpRef.current();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      audioRef.current?.close();
      audioRef.current = null;
      runtimeRef.current = null;
    };
  }, [restart]);

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.devPaused = devOpen;
  }, [devOpen]);

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

  const toggleDevPanel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDevOpen((value) => !value);
  }, []);

  const onInputDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, input, aside")) return;
    event.preventDefault();
    activeGamePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    inputDownRef.current();
  }, []);

  const onInputUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeGamePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    activeGamePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    inputUpRef.current();
  }, []);

  const toggleSound = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
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
        onPointerCancel={onInputUp}
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
          onPointerDown={toggleSound}
        >
          {muted ? "×" : "♪"}
        </button>

        <button
          type="button"
          className={`dev-toggle ${devSettings.helpers ? "is-active" : ""}`}
          aria-label="Developer Helper UI"
          aria-expanded={devOpen}
          onPointerDown={toggleDevPanel}
        >
          DEV
        </button>

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

        {phase === "ready" && (
          <div className="game-overlay">
            <div className="overlay-content">
              <p className="eyebrow">Açıyı seç · Fırlat · Sonsuz koşu</p>
              <h1 className="game-title">
                ORBIT<span>RUSH</span>
              </h1>
              <p className="tagline">Yörüngeyi kır. Boşluğu yakala.</p>
              <div className="input-prompt">Basılı tut / Space · Fırlat</div>
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
              <div className="input-prompt">Tekrar dene</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
