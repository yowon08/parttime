import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { INTRO_LINES } from "./introLines.js";
import { DAY2_INTRO_LINES } from "./day2IntroLines.js";
import { DAY3_TEXT } from "./day3Text.js";
import { DAY_CLEAR_LINES } from "./dayClearLines.js";
import "./styles.css";

const CCTV_FRAMES = Array.from({ length: 12 }, (_, index) => `/cctv/frame_${String(index + 1).padStart(2, "0")}.png`);
const AUDIO = {
  bgm: "/songs/bgm.mp3",
  on: "/songs/on.mp3",
  vhs: "/songs/vhs.mp3",
  evOn: "/songs/ev-on.mp3",
  evRide: "/songs/ev-ride.mp3",
  evOff: "/songs/ev-off.mp3",
  cctvChange: "/songs/cctv-ch.mp3",
  clear: "/songs/clear.mp3",
  control: "/songs/control.mp3",
  fix: "/songs/fix.mp3",
  jumpscare: "/songs/jumpscare.mp3",
  monster: "/songs/monster.mp3",
  noise: "/songs/noise.mp3",
  run: "/songs/run.mp3",
  dayClear: "/songs/dayclear.mp3",
  dayClear2: "/songs/dayclear2.mp3",
};
const CONFIG = {
  BGM_VOLUME: 0.28,
  VHS_VOLUME: 0.24,
  SIGNAL_NOISE_VOLUME: 0.08,
  CLEAR_TIME_SECONDS: 480,
  CLEAR_TIME_MINUTES: 360,
  DAY_ONE_REPORT_TIME_BONUS_SECONDS: 20,
  LINGER_AMBUSH_DELAY: 8000,
  REBOOT_CHECK_INTERVAL: 8000,
  INTRO_LINE_DURATION: 3000,
  INTRO_DIALOGUE_DELAY: 3000,
  INTRO_SKIP_ARRIVAL_DELAY: 2000,
  REAR_PANEL_CLOSE_DURATION: 520,
  G_RUN_CLEAR_DELAY: 3000,
  G_RUN_FINAL_GRACE: 450,
  G_RUN_FRAME_DURATION: 145,
  FADE_DURATION_DEFAULT: 500,
};
const BGM_VOLUME = CONFIG.BGM_VOLUME;
const VHS_VOLUME = CONFIG.VHS_VOLUME;
const SIGNAL_NOISE_VOLUME = CONFIG.SIGNAL_NOISE_VOLUME;
const CLEAR_TIME_SECONDS = CONFIG.CLEAR_TIME_SECONDS;
const CLEAR_TIME_MINUTES = CONFIG.CLEAR_TIME_MINUTES;
const DAY_ONE_REPORT_TIME_BONUS_SECONDS = CONFIG.DAY_ONE_REPORT_TIME_BONUS_SECONDS;
const LINGER_AMBUSH_DELAY = CONFIG.LINGER_AMBUSH_DELAY;
const REBOOT_CHECK_INTERVAL = CONFIG.REBOOT_CHECK_INTERVAL;
const INTRO_LINE_DURATION = CONFIG.INTRO_LINE_DURATION;
const INTRO_DIALOGUE_DELAY = CONFIG.INTRO_DIALOGUE_DELAY;
const INTRO_SKIP_ARRIVAL_DELAY = CONFIG.INTRO_SKIP_ARRIVAL_DELAY;
const REAR_PANEL_CLOSE_DURATION = CONFIG.REAR_PANEL_CLOSE_DURATION;
const G_RUN_CLEAR_DELAY = CONFIG.G_RUN_CLEAR_DELAY;
const G_RUN_FINAL_GRACE = CONFIG.G_RUN_FINAL_GRACE;
const G_RUN_FRAME_DURATION = CONFIG.G_RUN_FRAME_DURATION;
const INTRO_PAUSE_TOKEN = "dlay";
const ELEVATOR_IMAGE = "/ev/ev.png";
const DAY_ENDING_LINE_DURATION = 3300;
const DAY_ENDING_FADE_DURATION = 3000;
const DAY_CLEAR_LINE_DURATION = 3200;
const DAY_CLEAR_FADE_DURATION = 3000;
const DAY_CLEAR_TITLE_DURATION = 12000;
const DAY1_ENDING_LINES = [
  "수고하셨습니다.",
  "관측 기록이 정상 제출되었습니다.",
  "퇴실 전 소독 절차를 잊지 마십시오.",
];
const DAY2_ENDING_LINES = [
  "수고하셨습니다.",
  "실험체 대응 절차가 종료되었습니다.",
  "퇴실 전 소독 절차를 잊지 마십시오.",
];
const DAY3_ENDING_IMAGES = [ELEVATOR_IMAGE, "/ev/ev2.png", "/ev/ev3.png", "/ev/ev4.png", "/ev/ev5.png"];
const INTRO_VOICE_FILES = Array.from({ length: 17 }, (_, index) => `/voice/${index + 1}.mp3`);
const AMBIENT_SFX_FILES = Object.values(
  import.meta.glob("/public/sfx/*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" })
);
const DAY3_INF_SOUNDS = Object.values(
  import.meta.glob("/public/songs/inf-*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" })
);
const DAY3_LONG_SOUNDS = Object.values(
  import.meta.glob("/public/songs/long-*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" })
);
const DAY3_JUMP_FRAMES = Object.values(
  import.meta.glob("/public/repair/jump/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" })
).sort((a, b) => {
  const aNumber = Number(String(a).match(/\/(\d+)\.[^/.]+(?:\?|$)/)?.[1] ?? 0);
  const bNumber = Number(String(b).match(/\/(\d+)\.[^/.]+(?:\?|$)/)?.[1] ?? 0);
  return aNumber - bNumber;
});
const DAY3_AD_IMAGES = Array.from({ length: 4 }, (_, index) => `/ad/${index + 1}.png`);
const DAY3_ENDING_SCRIPTS = {
  ending1: [
    "수고하셨습니다.",
    "당신의 헌신 덕분에 우리는 다시 통제와 안정을 되찾을 수 있게 되었습니다.",
    "귀하의 생존과 복귀를 진심으로 환영합니다.",
  ],
  ending2: [
    "해당 개체는 적색지대에서 처음 관측되었습니다.",
    "다른 것들을 흉내내고 모방하며, 인간의 정신을 침식할 수 있습니다.",
    "그것은 지성을 지니고 있으며—",
    "때론 아주 교활하게 인간을 덫으로 몰아넣기도 하죠.",
    "우리는 그것을 변이체-C311이라고 명명했습니다.",
  ],
  ending3: [
    "귀하의 생존과 복귀를 진심으로 환영합니다.",
  ],
};
const DAY3_ENDING_ONE_END = DAY3_ENDING_SCRIPTS.ending1.length;
const DAY3_ENDING_TWO_START = DAY3_ENDING_ONE_END;
const DAY3_ENDING_TWO_END = DAY3_ENDING_ONE_END + DAY3_ENDING_SCRIPTS.ending2.length;
const DAY3_ENDING_SCRIPTED_SEQUENCE = [
  ...DAY3_ENDING_SCRIPTS.ending1,
  ...DAY3_ENDING_SCRIPTS.ending2,
  "",
  ...DAY3_ENDING_SCRIPTS.ending3,
];
const DAY_COUNT = 3;
const IMPLEMENTED_DAYS = 3;
const DEFAULT_UNLOCKED_DAY = 3;
const SAVE_KEY = "analog-observation-unlocked-day";
const DAY2_IMAGES = {
  1: "/sal/1.png",
  2: "/sal/2.png",
  3: "/sal/3.png",
  4: "/sal/4.png",
  5: "/sal/5.png",
  6: "/sal/6.png",
};
const DAY2_JUMP_FRAMES = Array.from({ length: 6 }, (_, index) => `/sal/jump/${index + 1}.png`);
const DAY2_SOUND_TESTS = ["/sal/songs/1.mp3", "/sal/songs/2.mp3", "/sal/songs/3.mp3"];
const DAY2_TASKS = ["혈액 채취", "조직 채취", "호흡 확인", "반응 검사"];
let introVoiceIndex = 0;
const INTRO_DIALOGUE = INTRO_LINES.map((line) => {
  if (line.trim().toLowerCase() === INTRO_PAUSE_TOKEN) return { line, voice: null, pause: true };
  const voice = INTRO_VOICE_FILES[introVoiceIndex] ?? null;
  introVoiceIndex += 1;
  return { line, voice, pause: false };
});

const CAMERA_FILE_COUNTS = {
  A: 4,
  B: 2,
  C: 5,
  D: 2,
  E: 3,
  F: 3,
  G: 6,
  H: 2,
  I: 4,
  J: 3,
  L: 3,
  M: 3,
};

const CAMERA_NAMES = {
  A: "격리 복도",
  B: "자료 보관 통로",
  C: "청색 복도",
  D: "지하 하역장",
  E: "균열 복도",
  F: "처치 준비실",
  G: "관제실 외곽",
  H: "폐쇄 격납실",
  I: "비상 계단",
  J: "격리 병동",
  L: "보조 구역",
  M: "보관 구역",
};

function makeCamera(letter, index) {
  return {
    id: `CAM ${String(index).padStart(2, "0")}`,
    name: CAMERA_NAMES[letter] ?? `구역 ${letter}`,
    image: `/cameras/Cameras/${letter}-1.png`,
    normal: `${letter} 구역 정상 화면.`,
    anomalies: Array.from({ length: CAMERA_FILE_COUNTS[letter] - 1 }, (_, anomalyIndex) => {
      const frame = anomalyIndex + 2;
      return {
        image: `/cameras/Cameras/${letter}-${frame}.png`,
        text: `${letter} 구역 이상현상 ${frame}.`,
      };
    }),
  };
}

const CAMERAS = [
  ...["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((letter, index) => makeCamera(letter, index + 1)),
  {
    id: "CAM 11",
    name: "폐쇄 채널",
    offline: true,
    normal: "비활성화된 채널이다.",
    anomalies: [
      {
        image: "/cameras/Cameras/K-1.png",
        escalationFrames: Array.from({ length: 7 }, (_, index) => `/cameras/Cameras/K-${index + 2}.png`),
        text: "꺼져 있어야 할 채널에 영상 신호가 들어와 있다.",
      },
    ],
  },
  makeCamera("L", 12),
  makeCamera("M", 13),
];

const gCamera = CAMERAS.find((camera) => camera.letter === "G" || camera.id === "CAM 07");
if (gCamera) {
  gCamera.anomalies.push({
    image: "/cameras/Cameras/G-7.png",
    gRunFrames: Array.from({ length: 6 }, (_, index) => `/cameras/Cameras/G-${index + 8}.png`),
    text: "G 구역의 움직임이 비정상적으로 가속되고 있다.",
    special: "gRun",
  });
}

const PRELOAD_IMAGES = [
  ...CCTV_FRAMES,
  ELEVATOR_IMAGE,
  ...CAMERAS.flatMap((camera) => [
    camera.image,
    ...camera.anomalies.flatMap((anomaly) => [
      anomaly.image,
      anomaly.escalationImage,
      ...(anomaly.escalationFrames ?? []),
      ...(anomaly.gRunFrames ?? []),
    ]),
  ]),
].filter(Boolean);

const REPORT_TEXTS = ["수습 중...", "현장 확인 중...", "격리반 호출 중...", "인지재해 차단 중...", "보고서 대조 중...", "프로토콜 적용 중..."];
const WARNING_TEXTS = ["문제 보고 실패.", "관측 누락 기록됨.", "비인가 현상 확산 중.", "프로토콜 지연 감지.", "관측자 오류율 상승."];
const DEATH_TEXTS = ["관측자 정신 오염 확인.", "자동 격리 절차 개시.", "관측 프로토콜 종료."];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const PRELOADED_IMAGE_CACHE = new Map();

function preloadImage(src) {
  if (!src) return Promise.resolve();
  const cached = PRELOADED_IMAGE_CACHE.get(src);
  if (cached?.ready) return Promise.resolve(cached.image);
  if (cached?.promise) return cached.promise;

  const image = new Image();
  const promise = new Promise((resolve) => {
    const finish = () => {
      PRELOADED_IMAGE_CACHE.set(src, { image, ready: true, promise: Promise.resolve(image) });
      resolve(image);
    };

    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers reject decode() even when the image is usable.
      }
      finish();
    };
    image.onerror = finish;
    image.src = src;
  });

  PRELOADED_IMAGE_CACHE.set(src, { image, ready: false, promise });
  return promise;
}

function getTimeText(seconds) {
  const totalMinutes = Math.floor((seconds / CLEAR_TIME_SECONDS) * CLEAR_TIME_MINUTES);
  const hour = Math.min(6, Math.floor(totalMinutes / 60));
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${hour === 0 ? 12 : hour}:${minute} AM`;
}

function getNextCamIndex(index, step) {
  return (index + step + CAMERAS.length) % CAMERAS.length;
}

function isTuned(current, target) {
  return Math.abs(current - target) <= 2;
}

function getRandomAnomalyVariant(camera) {
  const gRunIndex = camera.anomalies.findIndex((anomaly) => anomaly.special === "gRun");
  if (gRunIndex >= 0 && Math.random() < 0.68) return gRunIndex;
  return Math.floor(Math.random() * camera.anomalies.length);
}

function getDay2StageFromDanger(value) {
  if (value >= 68) return 3;
  if (value >= 34) return 2;
  return 1;
}

function runTests() {
  const tests = [
    ["time starts at midnight", getTimeText(0) === "12:00 AM"],
    ["time reaches 1 AM at 80 seconds", getTimeText(80) === "1:00 AM"],
    ["time reaches 6 AM at 480 seconds", getTimeText(CLEAR_TIME_SECONDS) === "6:00 AM"],
    ["camera wraps left", getNextCamIndex(0, -1) === CAMERAS.length - 1],
    ["camera wraps right", getNextCamIndex(CAMERAS.length - 1, 1) === 0],
    ["frequency diff 2 succeeds", isTuned(50, 52) === true],
    ["frequency diff 3 fails", isTuned(50, 53) === false],
    ["thirteen cameras exist", CAMERAS.length === 13],
    ["all cameras have anomalies", CAMERAS.every((camera) => camera.anomalies.length > 0)],
    ["twelve monitor frames exist", CCTV_FRAMES.length === 12],
  ];

  const failed = tests.filter(([, pass]) => !pass);
  if (failed.length) console.warn("Self tests failed", failed.map(([name]) => name));
  return { total: tests.length, passed: tests.length - failed.length };
}

function MonitorFrame({ frame, staticBurst, children }) {
  return (
    <main className="screen monitor-screen">
      <img src={CCTV_FRAMES[frame - 1]} alt="" className="monitor-image" draggable="false" />
      {staticBurst && <div className="static-burst" />}
      {children}
    </main>
  );
}

function CameraVisual({
  camera,
  anomaly,
  warnings,
  staticBurst,
  shaking,
  bright = false,
  heavyThump = false,
  gRunFrames = null,
  gRunFrameIndex = null,
}) {
  const src = anomaly?.image || camera.image;
  const useGRunStack = Array.isArray(gRunFrames) && gRunFrames.length > 0 && gRunFrameIndex !== null;

  return (
    <div className={`camera-frame${shaking ? " is-jumpscare" : ""}${bright ? " is-bright-event" : ""}${heavyThump ? " is-heavy-thump" : ""}`}>
      {useGRunStack ? (
        <div className="camera-image g-run-frame-stack" aria-hidden="true" style={{ position: "relative", overflow: "hidden" }}>
          {gRunFrames.map((frameSrc, index) => (
            <img
              key={frameSrc}
              src={frameSrc}
              alt=""
              draggable="false"
              className="g-run-frame-image"
              decoding="sync"
              loading="eager"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: index === gRunFrameIndex ? 1 : 0,
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
      ) : src ? (
        <img
          key={src}
          src={src}
          alt=""
          className="camera-image"
          draggable="false"
          decoding="async"
          loading="eager"
        />
      ) : (
        <div className="offline-feed">
          <strong>-OFFLINE-</strong>
        </div>
      )}
      {!camera.offline && (
        <div className="fallback-scene" aria-hidden="true">
          <div className="fallback-rail fallback-rail-top" />
          <div className="fallback-rail fallback-rail-mid" />
          <div className="fallback-rail fallback-rail-bottom" />
          <div className="fallback-door" />
          <div className="fallback-light" />
          {anomaly && <div className="fallback-anomaly" />}
        </div>
      )}
      <div className="warning-wash" />
      {staticBurst && <div className="static-burst" />}
    </div>
  );
}

function ElevatorIntro({ ready, progress, line, onEnter, onSkip, exiting }) {
  const percent = Math.round(progress * 100);
  const subtitle = line?.trim().toLowerCase() === INTRO_PAUSE_TOKEN ? "" : line;

  return (
    <main className={`screen elevator-intro${ready ? " is-arrived" : ""}${exiting ? " is-exiting" : ""}`}>
      <img src={ELEVATOR_IMAGE} alt="" className="elevator-image is-active" draggable="false" />
      <div className="elevator-vibration" />
      <div className="elevator-shadow-pass" />
      {!ready && !line && (
        <section className="elevator-panel">
          <span>FACILITY DESCENT</span>
          <strong>{`LOADING ${percent}%`}</strong>
          <p>하층 연구시설 접근 중 / 안전 안내를 확인하십시오</p>
        </section>
      )}
      {!ready && subtitle && <div key={line} className="intro-subtitle">{subtitle}</div>}
      {!ready && line && (
        <button type="button" className="intro-skip-button" onClick={onSkip}>
          SKIP
        </button>
      )}
      {ready && (
        <button type="button" className="enter-button" onClick={onEnter}>
          진입
        </button>
      )}
    </main>
  );
}

function ElevatorReturn({ line, fading = false, menuFading = false, image = ELEVATOR_IMAGE }) {
  return (
    <main className={`screen elevator-intro elevator-return${fading ? " is-exiting" : ""}${menuFading ? " is-menu-fading" : ""}`}>
      <img src={image} alt="" className="elevator-image is-active" draggable="false" />
      <div className="elevator-vibration" />
      <div className="elevator-shadow-pass" />
      {line && <div key={line} className="intro-subtitle">{line}</div>}
    </main>
  );
}

function DayClearBridge({ day, lines, onDone }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState("scene");

  useEffect(() => {
    if (day !== 3) return undefined;
    const audio = new Audio(AUDIO.on);
    audio.volume = 0.62;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [day]);

  useEffect(() => {
    if (phase !== "scene") return undefined;
    if (lineIndex >= lines.length) {
      const timer = setTimeout(() => setPhase("clear"), DAY_CLEAR_FADE_DURATION);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setLineIndex((index) => index + 1);
    }, DAY_CLEAR_LINE_DURATION);
    return () => clearTimeout(timer);
  }, [lineIndex, lines.length, phase]);

  useEffect(() => {
    if (phase !== "clear") return undefined;
    const audioA = new Audio(AUDIO.dayClear);
    const audioB = new Audio(AUDIO.dayClear2);
    audioA.volume = 0.82;
    audioB.volume = 0.72;
    audioA.play().catch(() => {});
    audioB.play().catch(() => {});

    const fadeStart = Date.now() + DAY_CLEAR_TITLE_DURATION - 1700;
    const fadeTimer = setInterval(() => {
      const progress = clamp((Date.now() - fadeStart) / 1500, 0, 1);
      const level = 1 - progress;
      audioA.volume = 0.82 * level;
      audioB.volume = 0.72 * level;
    }, 50);
    const doneTimer = setTimeout(() => {
      clearInterval(fadeTimer);
      audioA.pause();
      audioB.pause();
      onDone();
    }, DAY_CLEAR_TITLE_DURATION);

    return () => {
      clearInterval(fadeTimer);
      clearTimeout(doneTimer);
      audioA.pause();
      audioB.pause();
    };
  }, [onDone, phase]);

  const currentLine = phase === "scene" ? lines[lineIndex] ?? "" : "";

  return (
    <main className={`screen day-clear-bridge day-clear-day-${day} is-${phase}`}>
      <div className="day-clear-scene">
        {day === 3 && <img src={DAY3_ASSETS.mainImage} alt="" className="day-clear-repair-image" draggable="false" />}
        <div className="day-clear-office" />
        <div className="day-clear-file" />
      </div>
      {phase === "scene" && lineIndex >= lines.length && <div className="day-clear-blackout" />}
      {currentLine && <div key={currentLine} className="intro-subtitle day-clear-subtitle">{currentLine}</div>}
      {phase === "clear" && (
        <div className="day-clear-title">
          <i className="clear-particle p1" />
          <i className="clear-particle p2" />
          <i className="clear-particle p3" />
          <i className="clear-particle p4" />
          <i className="clear-particle p5" />
          <i className="clear-particle p6" />
          <i className="clear-particle p7" />
          <i className="clear-particle p8" />
          <i className="clear-particle p9" />
          <i className="clear-particle p10" />
          <i className="clear-particle p11" />
          <i className="clear-particle p12" />
          <span>CLEAR</span>
        </div>
      )}
    </main>
  );
}

function useGameAudio() {
  const introAudioContextRef = useRef(null);
  const introVoiceNodesRef = useRef(null);
  const fadeTimers = useRef(new Map());

  const fadeAudio = useCallback((audio, targetVolume, duration = CONFIG.FADE_DURATION_DEFAULT, options = {}) => {
    if (!audio) return;

    clearInterval(fadeTimers.current.get(audio));
    if (options.playBefore) audio.play().catch(() => {});

    const startVolume = audio.volume;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) return;

      clearInterval(timer);
      fadeTimers.current.delete(audio);
      audio.volume = targetVolume;
      if (options.pauseAfter) audio.pause();
    }, 30);

    fadeTimers.current.set(audio, timer);
  }, []);

  const disconnectIntroVoiceEffect = useCallback(() => {
    const nodes = introVoiceNodesRef.current;
    if (!nodes) return;

    nodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    });
    introVoiceNodesRef.current = null;
  }, []);

  const applyIntroVoiceEffect = useCallback((audio) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = introAudioContextRef.current ?? new AudioContext();
    introAudioContextRef.current = context;
    context.resume().catch(() => {});

    disconnectIntroVoiceEffect();

    const source = context.createMediaElementSource(audio);
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const dry = context.createGain();
    const wet = context.createGain();
    const delay = context.createDelay(0.35);
    const feedback = context.createGain();

    highpass.type = "highpass";
    highpass.frequency.value = 180;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3600;
    dry.gain.value = 0.86;
    wet.gain.value = 0.12;
    delay.delayTime.value = 0.115;
    feedback.gain.value = 0.18;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(dry);
    dry.connect(context.destination);
    lowpass.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(context.destination);

    introVoiceNodesRef.current = [source, highpass, lowpass, dry, wet, delay, feedback];
  }, [disconnectIntroVoiceEffect]);

  return { fadeTimers, fadeAudio, applyIntroVoiceEffect, disconnectIntroVoiceEffect };
}

function DayOneGame({ onReturnToMenu, onCompleteDay }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [introLineIndex, setIntroLineIndex] = useState(0);
  const [introAssetsLoaded, setIntroAssetsLoaded] = useState(false);
  const [introDialogueStarted, setIntroDialogueStarted] = useState(false);
  const [introLinesDone, setIntroLinesDone] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [introExiting, setIntroExiting] = useState(false);
  const [gameFadingIn, setGameFadingIn] = useState(false);
  const [camIndex, setCamIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cctvOpen, setCctvOpen] = useState(false);
  const [turnedBack, setTurnedBack] = useState(false);
  const [rearPanelClosing, setRearPanelClosing] = useState(false);
  const [monitorMotion, setMonitorMotion] = useState(null);
  const [monitorFrame, setMonitorFrame] = useState(1);
  const [anomalyCam, setAnomalyCam] = useState(null);
  const [anomalyVariant, setAnomalyVariant] = useState(null);
  const [anomalyAge, setAnomalyAge] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [overlay, setOverlay] = useState(null);
  const [dead, setDead] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [clearBridgeDone, setClearBridgeDone] = useState(false);
  const [endingLineIndex, setEndingLineIndex] = useState(0);
  const [endingFading, setEndingFading] = useState(false);
  const [menuFading, setMenuFading] = useState(false);
  const [rebootRequired, setRebootRequired] = useState(false);
  const [signalFailure, setSignalFailure] = useState(false);
  const [frequency, setFrequency] = useState(22);
  const [targetFrequency, setTargetFrequency] = useState(72);
  const [staticBurst, setStaticBurst] = useState(false);
  const [completedReports, setCompletedReports] = useState(0);
  const [cameraStress, setCameraStress] = useState(0);
  const [ambushPending, setAmbushPending] = useState(false);
  const [anomalyEscalated, setAnomalyEscalated] = useState(false);
  const [escalationFrameIndex, setEscalationFrameIndex] = useState(null);
  const [gRunFrameIndex, setGRunFrameIndex] = useState(null);
  const [gRunRedout, setGRunRedout] = useState(false);
  const [gRunThump, setGRunThump] = useState(false);

  const overlayTimer = useRef(null);
  const staticTimer = useRef(null);
  const raiseTimer = useRef(null);
  const rearPanelTimer = useRef(null);
  const introDialogueTimer = useRef(null);
  const introVoiceRef = useRef(null);
  const ambientSfxTimer = useRef(null);
  const ambientSfxAudio = useRef(null);
  const lastAmbientSfx = useRef(null);
  const ambushTimer = useRef(null);
  const lingerTimer = useRef(null);
  const escalationTimer = useRef(null);
  const gRunTimer = useRef(null);
  const gRunFailTimer = useRef(null);
  const gRunClearTimer = useRef(null);
  const endingTimer = useRef(null);
  const bgmRef = useRef(null);
  const onRef = useRef(null);
  const vhsRef = useRef(null);
  const evOnRef = useRef(null);
  const evRideRef = useRef(null);
  const evOffRef = useRef(null);
  const cctvChangeRef = useRef(null);
  const clearRef = useRef(null);
  const controlRef = useRef(null);
  const fixRef = useRef(null);
  const jumpscareRef = useRef(null);
  const monsterRef = useRef(null);
  const noiseRef = useRef(null);
  const runRef = useRef(null);
  const gRunThumpTimer = useRef(null);
  const gameStageRef = useRef(null);
  const ignoreClickUntil = useRef(0);
  const lastControlSoundAt = useRef(0);
  const cameraStressRef = useRef(0);
  const { fadeTimers, fadeAudio, applyIntroVoiceEffect, disconnectIntroVoiceEffect } = useGameAudio();
  const tests = useMemo(() => runTests(), []);
  const currentCam = CAMERAS[camIndex];
  const currentHasAnomaly = anomalyCam === camIndex;
  const baseCurrentAnomaly = currentHasAnomaly ? currentCam.anomalies[anomalyVariant] : null;
  const currentAnomaly = baseCurrentAnomaly && gRunFrameIndex !== null && baseCurrentAnomaly.gRunFrames
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.gRunFrames[gRunFrameIndex] }
    : baseCurrentAnomaly && escalationFrameIndex !== null && baseCurrentAnomaly.escalationFrames
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.escalationFrames[escalationFrameIndex] }
    : baseCurrentAnomaly && anomalyEscalated && baseCurrentAnomaly.escalationImage
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.escalationImage }
    : baseCurrentAnomaly;
  const jumpscareActive = currentHasAnomaly && escalationFrameIndex !== null;
  const gRunActive = currentHasAnomaly && baseCurrentAnomaly?.special === "gRun";
  const timeText = getTimeText(seconds);
  const showCctvHud = cctvOpen && !turnedBack && !monitorMotion;
  const cam11JumpscareLoopActive = anomalyCam !== null && CAMERAS[anomalyCam]?.offline && anomalyEscalated;

  useEffect(() => {
    return () => {
      clearTimeout(overlayTimer.current);
      clearTimeout(staticTimer.current);
      clearTimeout(raiseTimer.current);
      clearTimeout(rearPanelTimer.current);
      clearTimeout(introDialogueTimer.current);
      introVoiceRef.current?.pause();
      disconnectIntroVoiceEffect();
      clearTimeout(ambientSfxTimer.current);
      ambientSfxAudio.current?.pause();
      jumpscareRef.current?.pause();
      clearTimeout(ambushTimer.current);
      clearTimeout(lingerTimer.current);
      clearTimeout(escalationTimer.current);
      clearTimeout(gRunTimer.current);
      clearTimeout(gRunFailTimer.current);
      clearTimeout(gRunClearTimer.current);
      clearTimeout(endingTimer.current);
      clearTimeout(gRunThumpTimer.current);
      fadeTimers.current.forEach((timer) => clearInterval(timer));
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = 0;
    if (vhsRef.current) vhsRef.current.volume = 0;
    if (noiseRef.current) noiseRef.current.volume = 0;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    evOnRef.current && (evOnRef.current.volume = 0.55);
    evRideRef.current && (evRideRef.current.volume = 0.32);
    evOffRef.current && (evOffRef.current.volume = 0.58);
    evOnRef.current?.play().catch(() => {});
    evRideRef.current?.play().catch(() => {});

    const completeOne = () => {
      if (cancelled) return;
      loaded += 1;
      const loadProgress = loaded / PRELOAD_IMAGES.length;
      setIntroProgress(Math.min(0.98, loadProgress));

      if (loaded < PRELOAD_IMAGES.length) return;
      setIntroProgress(1);
      setIntroAssetsLoaded(true);
    };

    PRELOAD_IMAGES.forEach((src) => {
      const image = new Image();
      let completed = false;

      const finish = () => {
        if (completed) return;
        completed = true;
        completeOne();
      };

      image.onload = async () => {
        try {
          if (image.decode) await image.decode();
        } catch {
          // decode() can reject on some browsers even when the image is usable.
        }
        finish();
      };
      image.onerror = finish;
      image.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!introAssetsLoaded) return undefined;

    const timer = setTimeout(() => {
      setIntroDialogueStarted(true);
    }, INTRO_DIALOGUE_DELAY);

    return () => clearTimeout(timer);
  }, [introAssetsLoaded]);

  useEffect(() => {
    if (!introDialogueStarted || introSkipped) return undefined;

    const dialogue = INTRO_DIALOGUE[introLineIndex];
    if (!dialogue) {
      setIntroLinesDone(true);
      return undefined;
    }

    const advanceDialogue = () => {
      setIntroLineIndex((line) => {
        const nextLine = line + 1;
        if (nextLine >= INTRO_DIALOGUE.length) {
          setIntroLinesDone(true);
          return line;
        }
        return nextLine;
      });
    };

    if (dialogue.pause || !dialogue.voice) {
      disconnectIntroVoiceEffect();
      introDialogueTimer.current = setTimeout(advanceDialogue, INTRO_LINE_DURATION);
      return () => clearTimeout(introDialogueTimer.current);
    }

    const audio = new Audio(dialogue.voice);
    introVoiceRef.current?.pause();
    disconnectIntroVoiceEffect();
    introVoiceRef.current = audio;
    audio.preload = "auto";
    audio.volume = 0.92;
    applyIntroVoiceEffect(audio);
    let done = false;
    let fallbackQueued = false;

    const handleDone = () => {
      if (done) return;
      done = true;
      if (introVoiceRef.current === audio) introVoiceRef.current = null;
      disconnectIntroVoiceEffect();
      advanceDialogue();
    };
    const handleError = () => {
      if (fallbackQueued || done) return;
      fallbackQueued = true;
      const queueFallback = () => {
        clearTimeout(introDialogueTimer.current);
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : INTRO_LINE_DURATION;
        introDialogueTimer.current = setTimeout(handleDone, Math.max(INTRO_LINE_DURATION, duration));
      };

      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        queueFallback();
        return;
      }

      audio.addEventListener("loadedmetadata", queueFallback, { once: true });
      audio.load();
      introDialogueTimer.current = setTimeout(handleDone, INTRO_LINE_DURATION * 2);
    };

    audio.addEventListener("ended", handleDone, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    audio.play().catch(handleError);

    return () => {
      clearTimeout(introDialogueTimer.current);
      audio.removeEventListener("ended", handleDone);
      audio.removeEventListener("error", handleError);
      audio.pause();
      if (introVoiceRef.current === audio) introVoiceRef.current = null;
      disconnectIntroVoiceEffect();
    };
  }, [introDialogueStarted, introSkipped, introLineIndex]);

  useEffect(() => {
    if (!introAssetsLoaded || !introLinesDone || introReady) return;
    setIntroReady(true);
    evRideRef.current?.pause();
    evOffRef.current?.play().catch(() => {});
  }, [introAssetsLoaded, introLinesDone, introReady]);

  useEffect(() => {
    if (!introSkipped || introReady) return undefined;

    const timer = setTimeout(() => {
      setIntroLinesDone(true);
    }, INTRO_SKIP_ARRIVAL_DELAY);

    return () => clearTimeout(timer);
  }, [introSkipped, introReady]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || !showCctvHud) return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted, dead, cleared, showCctvHud]);

  useEffect(() => {
    if (!gameStarted || dead || cleared) return undefined;

    const scheduleNextSfx = (delay = 22000 + Math.random() * 26000) => {
      if (!AMBIENT_SFX_FILES.length) return;
      clearTimeout(ambientSfxTimer.current);
      ambientSfxTimer.current = setTimeout(() => {
        const candidates = AMBIENT_SFX_FILES.length > 1
          ? AMBIENT_SFX_FILES.filter((file) => file !== lastAmbientSfx.current)
          : AMBIENT_SFX_FILES;
        const selected = randomItem(candidates);
        lastAmbientSfx.current = selected;
        const audio = new Audio(selected);
        ambientSfxAudio.current?.pause();
        ambientSfxAudio.current = audio;
        audio.volume = 0.42;
        audio.play().catch(() => {});
        audio.addEventListener("ended", () => scheduleNextSfx(), { once: true });
        audio.addEventListener("error", () => scheduleNextSfx(), { once: true });
      }, delay);
    };

    scheduleNextSfx();

    return () => {
      clearTimeout(ambientSfxTimer.current);
      ambientSfxAudio.current?.pause();
      ambientSfxAudio.current = null;
    };
  }, [gameStarted, dead, cleared]);

  useEffect(() => {
    if (signalFailure && showCctvHud && !dead && !cleared) {
      fadeAudio(noiseRef.current, SIGNAL_NOISE_VOLUME, 260, { playBefore: true });
      return undefined;
    }

    fadeAudio(noiseRef.current, 0, 220, { pauseAfter: true });
    return undefined;
  }, [signalFailure, showCctvHud, dead, cleared]);

  useEffect(() => {
    const audio = jumpscareRef.current;
    if (!audio) return undefined;

    if (cam11JumpscareLoopActive && !dead && !cleared) {
      audio.volume = 0.7;
      audio.play().catch(() => {});
      return undefined;
    }

    audio.pause();
    audio.currentTime = 0;
    return undefined;
  }, [cam11JumpscareLoopActive, dead, cleared]);

  useEffect(() => {
    if (!gRunActive || !baseCurrentAnomaly?.gRunFrames?.length) return;

    [baseCurrentAnomaly.image, ...baseCurrentAnomaly.gRunFrames].filter(Boolean).forEach((src) => {
      preloadImage(src);
    });
  }, [gRunActive, baseCurrentAnomaly]);

  useEffect(() => {
    clearTimeout(gRunTimer.current);

    if (
      !gRunActive ||
      !showCctvHud ||
      dead ||
      cleared ||
      rebootRequired ||
      signalFailure ||
      overlay ||
      gRunRedout
    ) return undefined;

    const frames = baseCurrentAnomaly?.gRunFrames ?? [];
    if (!frames.length) return undefined;

    if (gRunFrameIndex === null) {
      requestAnimationFrame(() => {
        playRunStepSound();
        pulseGRunThump();
        setGRunFrameIndex(0);
      });
      return undefined;
    }

    if (gRunFrameIndex >= frames.length - 1) {
      clearTimeout(gRunFailTimer.current);
      gRunFailTimer.current = setTimeout(() => {
        playEffect(monsterRef.current, 0.72);
        failReport();
      }, G_RUN_FINAL_GRACE);
      return () => {
        clearTimeout(gRunFailTimer.current);
      };
    }

    gRunTimer.current = setTimeout(() => {
      requestAnimationFrame(() => {
        playRunStepSound();
        pulseGRunThump();
        setGRunFrameIndex((index) => Math.min(frames.length - 1, (index ?? 0) + 1));
      });
    }, G_RUN_FRAME_DURATION);

    return () => clearTimeout(gRunTimer.current);
  }, [
    gRunActive,
    showCctvHud,
    dead,
    cleared,
    rebootRequired,
    signalFailure,
    overlay,
    gRunRedout,
    gRunFrameIndex,
    baseCurrentAnomaly,
  ]);

  useEffect(() => {
    cameraStressRef.current = cameraStress;
  }, [cameraStress]);

  useEffect(() => {
    if (!gameStarted || seconds < CLEAR_TIME_SECONDS || dead || cleared) return;
    clearTimeout(overlayTimer.current);
    setCleared(true);
    setClearBridgeDone(false);
    setEndingLineIndex(0);
    setEndingFading(false);
    setMenuFading(false);
    onCompleteDay?.();
    setCctvOpen(false);
    setTurnedBack(false);
    setMonitorMotion(null);
    setOverlay(null);
    fadeAudio(vhsRef.current, 0, 500, { pauseAfter: true });
    fadeAudio(bgmRef.current, BGM_VOLUME, 900, { playBefore: true });
  }, [gameStarted, seconds, dead, cleared]);

  useEffect(() => {
    if (!cleared || !clearBridgeDone || dead) return undefined;
    evOnRef.current.currentTime = 0;
    evRideRef.current.currentTime = 0;
    evOffRef.current.currentTime = 0;
    evOnRef.current.play().catch(() => {});
    evRideRef.current.play().catch(() => {});
    return () => {
      evRideRef.current?.pause();
    };
  }, [cleared, clearBridgeDone, dead]);

  useEffect(() => {
    if (!cleared || !clearBridgeDone || dead) return undefined;
    clearTimeout(endingTimer.current);

    if (endingLineIndex >= DAY1_ENDING_LINES.length) {
      setEndingFading(true);
      endingTimer.current = setTimeout(() => {
        evRideRef.current?.pause();
        evOffRef.current.currentTime = 0;
        evOffRef.current.play().catch(() => {});
        setMenuFading(true);
        endingTimer.current = setTimeout(onReturnToMenu, DAY_ENDING_FADE_DURATION);
      }, DAY_ENDING_FADE_DURATION);
      return () => clearTimeout(endingTimer.current);
    }

    endingTimer.current = setTimeout(() => {
      setEndingLineIndex((index) => index + 1);
    }, DAY_ENDING_LINE_DURATION);
    return () => clearTimeout(endingTimer.current);
  }, [cleared, clearBridgeDone, dead, endingLineIndex, onReturnToMenu]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || signalFailure || ambushPending || overlay || monitorMotion) return undefined;
    const timer = setInterval(() => {
      setAnomalyCam((prev) => {
        if (prev !== null) return prev;
        if (Math.random() < 0.42) {
          const nextCam = Math.floor(Math.random() * CAMERAS.length);
          setAnomalyAge(0);
          setAnomalyEscalated(false);
          setEscalationFrameIndex(null);
          setGRunFrameIndex(null);
          setGRunRedout(false);
          setGRunThump(false);
          setAnomalyVariant(getRandomAnomalyVariant(CAMERAS[nextCam]));
          return nextCam;
        }
        return prev;
      });
    }, 5200);
    return () => clearInterval(timer);
  }, [gameStarted, dead, cleared, signalFailure, ambushPending, overlay, monitorMotion]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || anomalyCam === null || overlay || !showCctvHud || rebootRequired || signalFailure) return undefined;
    const timer = setInterval(() => setAnomalyAge((age) => age + 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted, dead, cleared, anomalyCam, overlay, showCctvHud, rebootRequired, signalFailure]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || anomalyCam === null || overlay || !showCctvHud || rebootRequired || signalFailure || gRunRedout || anomalyAge < 13) return;
    failReport();
  }, [gameStarted, anomalyAge, anomalyCam, overlay, dead, cleared, showCctvHud, rebootRequired, signalFailure, gRunRedout]);

  useEffect(() => {
    if (
      !gameStarted ||
      dead ||
      cleared ||
      rebootRequired ||
      signalFailure ||
      ambushPending ||
      anomalyCam !== null ||
      overlay ||
      monitorMotion ||
      !cctvOpen
    ) return undefined;
    const timer = setInterval(() => {
      const failureChance = Math.min(0.88, 0.26 + cameraStressRef.current * 0.1);
      if (Math.random() < failureChance) triggerRebootFailure();
      setCameraStress((stress) => {
        const nextStress = Math.max(0, stress - 1);
        cameraStressRef.current = nextStress;
        return nextStress;
      });
    }, REBOOT_CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, [gameStarted, dead, cleared, rebootRequired, signalFailure, ambushPending, anomalyCam, overlay, monitorMotion, cctvOpen]);

  useEffect(() => {
    if (warnings >= 3 && !dead) {
      setDead(true);
      showOverlay("death", randomItem(DEATH_TEXTS), 1500);
    }
  }, [warnings, dead]);

  // DayOneGame 내부에 최신 상태를 담아두는 ref 추가
  const gameStateRef = useRef({
    turnedBack, rearPanelClosing, cctvOpen, frequency, camIndex
  });
  const dayOneActionsRef = useRef({});

  // 렌더링될 때마다 최신 상태를 ref에 동기화
  useEffect(() => {
    gameStateRef.current = { turnedBack, rearPanelClosing, cctvOpen, frequency, camIndex };
  }, [turnedBack, rearPanelClosing, cctvOpen, frequency, camIndex]);

  useEffect(() => {
    dayOneActionsRef.current = {
      adjustFrequency,
      changeCam,
      closeRearPanel,
      lowerMonitor,
      openRearPanel,
      primeAudio,
      raiseMonitor,
      reportProblem,
      triggerCurrentCameraSpecialEvent,
      tryReboot,
    };
  });

  // 키보드 이벤트 최적화
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameStarted || overlay || dead || cleared || monitorMotion) return;

      const state = gameStateRef.current; // 항상 최신 상태를 참조
      const key = event.key.toLowerCase();

      if (key === "i") {
        event.preventDefault();
        setCctvOpen(true);
        setTurnedBack(false);
        setRebootRequired(false);
        setSignalFailure(false);
        setSeconds(CLEAR_TIME_SECONDS - 1);
        return;
      }

      // 반복 입력 무시 (뒤돌아 있는 상태에서의 A/D 키 제외)
      if (event.repeat && !(state.turnedBack && !state.rearPanelClosing && (key === "a" || key === "d"))) return;

      if (key === " " || key === "spacebar") {
        event.preventDefault();
        dayOneActionsRef.current.primeAudio?.();
        if (state.cctvOpen && !state.turnedBack) dayOneActionsRef.current.lowerMonitor?.();
        else if (!state.cctvOpen && !state.turnedBack) dayOneActionsRef.current.raiseMonitor?.();
        return;
      }

      if (key === "enter") {
        event.preventDefault();
        dayOneActionsRef.current.primeAudio?.();
        if (state.turnedBack && !state.rearPanelClosing) dayOneActionsRef.current.tryReboot?.();
        else dayOneActionsRef.current.reportProblem?.();
        return;
      }

      if (key === "shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
        event.preventDefault();
        if (!state.cctvOpen && !state.turnedBack) dayOneActionsRef.current.openRearPanel?.();
        else if (state.turnedBack && !state.rearPanelClosing) dayOneActionsRef.current.closeRearPanel?.();
        return;
      }

      if (key === "a") {
        event.preventDefault();
        if (state.turnedBack && !state.rearPanelClosing) dayOneActionsRef.current.adjustFrequency?.(-1);
        else dayOneActionsRef.current.changeCam?.(-1);
        return;
      }

      if (key === "d") {
        event.preventDefault();
        if (state.turnedBack && !state.rearPanelClosing) dayOneActionsRef.current.adjustFrequency?.(1);
        else dayOneActionsRef.current.changeCam?.(1);
        return;
      }

      if (key === "l" || key === "ㅣ" || event.code === "KeyL") {
        event.preventDefault();
        dayOneActionsRef.current.triggerCurrentCameraSpecialEvent?.();
      }
    };

    // 의존성 배열을 대폭 줄여 불필요한 이벤트 재등록 방지
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [gameStarted, overlay, dead, cleared, monitorMotion]);

  useEffect(() => {
    if (!gameStarted) return;
    requestAnimationFrame(() => {
      gameStageRef.current?.focus();
    });
  }, [gameStarted]);

  useEffect(() => {
    if (gameStarted) return undefined;

    const handleIntroKeyDown = (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();

      if (introReady) {
        enterFacility();
        return;
      }

      if (introDialogueStarted && !introSkipped) {
        skipIntroDialogue();
      }
    };

    document.addEventListener("keydown", handleIntroKeyDown, true);
    return () => document.removeEventListener("keydown", handleIntroKeyDown, true);
  }, [gameStarted, introReady, introDialogueStarted, introSkipped]);

  useEffect(() => {
    clearTimeout(lingerTimer.current);
    if (
      !showCctvHud ||
      currentCam.forceAmbushDisabled ||
      dead ||
      cleared ||
      rebootRequired ||
      signalFailure ||
      overlay ||
      anomalyCam !== null
    ) return undefined;

    lingerTimer.current = setTimeout(() => {
      scheduleAmbush(camIndex, 0);
    }, LINGER_AMBUSH_DELAY);

    return () => clearTimeout(lingerTimer.current);
  }, [showCctvHud, camIndex, currentCam.forceAmbushDisabled, dead, cleared, rebootRequired, signalFailure, overlay, anomalyCam]);

  useEffect(() => {
    clearTimeout(escalationTimer.current);

    if (
      !showCctvHud ||
      !currentHasAnomaly ||
      !(baseCurrentAnomaly?.escalationImage || baseCurrentAnomaly?.escalationFrames) ||
      anomalyEscalated ||
      dead ||
      cleared ||
      rebootRequired ||
      signalFailure ||
      overlay
    ) return undefined;

    escalationTimer.current = setTimeout(() => {
      if (baseCurrentAnomaly?.escalationFrames?.length) {
        setAnomalyEscalated(true);
        setEscalationFrameIndex(0);
        return;
      }
      setAnomalyEscalated(true);
    }, 500);

    return () => clearTimeout(escalationTimer.current);
  }, [
    showCctvHud,
    currentHasAnomaly,
    baseCurrentAnomaly,
    anomalyEscalated,
    dead,
    cleared,
    rebootRequired,
    signalFailure,
    overlay,
  ]);

  useEffect(() => {
    if (escalationFrameIndex === null || !baseCurrentAnomaly?.escalationFrames) return undefined;
    if (escalationFrameIndex >= baseCurrentAnomaly.escalationFrames.length - 1) return undefined;

    const timer = setTimeout(() => {
      setEscalationFrameIndex((index) => index + 1);
    }, 95);

    return () => clearTimeout(timer);
  }, [escalationFrameIndex, baseCurrentAnomaly]);

  function showOverlay(kind, text, duration = 1300, callback) {
    clearTimeout(overlayTimer.current);
    setOverlay({ kind, text });
    overlayTimer.current = setTimeout(() => {
      setOverlay(null);
      if (callback) callback();
    }, duration);
  }

  function pulseStatic(duration = 160) {
    clearTimeout(staticTimer.current);
    setStaticBurst(true);
    staticTimer.current = setTimeout(() => setStaticBurst(false), duration);
  }

  function primeAudio() {
    const bgm = bgmRef.current;
    if (!bgm) return;

    bgm.play().catch(() => {});
  }

  function playOnSound() {
    const audio = onRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = 0.62;
    audio.play().catch(() => {});
  }

  function playEffect(audio, volume = 0.55) {
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  function playRunStepSound() {
    const audio = new Audio(AUDIO.run);
    audio.volume = 0.58;
    audio.play().catch(() => {});
  }

  function pulseGRunThump() {
    clearTimeout(gRunThumpTimer.current);
    setGRunThump(false);
    requestAnimationFrame(() => {
      setGRunThump(true);
      gRunThumpTimer.current = setTimeout(() => setGRunThump(false), 130);
    });
  }

  function playControlSound() {
    const now = Date.now();
    if (now - lastControlSoundAt.current < 48) return;
    lastControlSoundAt.current = now;
    playEffect(controlRef.current, 0.42);
  }

  function adjustFrequency(step) {
    setFrequency((value) => {
      const next = Math.min(100, Math.max(0, value + step));
      if (next !== value) playControlSound();
      return next;
    });
  }

  function setFrequencyFromInput(value) {
    setFrequency((current) => {
      if (current !== value) playControlSound();
      return value;
    });
  }

  function openRearPanel() {
    if (turnedBack) return;
    clearTimeout(rearPanelTimer.current);
    setRearPanelClosing(false);
    playEffect(fixRef.current, 0.5);
    setTurnedBack(true);
  }

  function closeRearPanel() {
    if (!turnedBack || rearPanelClosing) return;
    clearTimeout(rearPanelTimer.current);
    playEffect(fixRef.current, 0.5);
    setRearPanelClosing(true);
    rearPanelTimer.current = setTimeout(() => {
      setTurnedBack(false);
      setRearPanelClosing(false);
    }, REAR_PANEL_CLOSE_DURATION);
  }

  function scheduleAmbush(targetCamIndex, delay = 1000) {
    clearTimeout(ambushTimer.current);
    setAmbushPending(true);
    ambushTimer.current = setTimeout(() => {
      setAmbushPending(false);
      if (dead || cleared || rebootRequired || signalFailure || overlay || monitorMotion || !cctvOpen || turnedBack || anomalyCam !== null) return;
      setAnomalyCam(targetCamIndex);
      setAnomalyVariant(getRandomAnomalyVariant(CAMERAS[targetCamIndex]));
      setAnomalyAge(0);
      setAnomalyEscalated(false);
      setEscalationFrameIndex(null);
      setGRunFrameIndex(null);
      setGRunRedout(false);
    }, delay);
  }

  function clearGRunEvent() {
    clearTimeout(gRunTimer.current);
    clearTimeout(gRunFailTimer.current);
    clearTimeout(gRunClearTimer.current);
    clearTimeout(gRunThumpTimer.current);
    setAnomalyCam(null);
    setAnomalyVariant(null);
    setAnomalyAge(0);
    setAnomalyEscalated(false);
    setEscalationFrameIndex(null);
    setGRunFrameIndex(null);
    setGRunRedout(false);
    setGRunThump(false);
  }

  function triggerCurrentCameraSpecialEvent() {
    if (!cctvOpen || turnedBack || monitorMotion || overlay || dead || cleared || rebootRequired || signalFailure) return;

    const specialIndex = currentCam.anomalies.findIndex((anomaly) => anomaly.special === "gRun" || anomaly.special || anomaly.escalationFrames?.length);
    if (specialIndex < 0) return;

    clearTimeout(ambushTimer.current);
    clearTimeout(lingerTimer.current);
    clearTimeout(escalationTimer.current);
    clearTimeout(gRunTimer.current);
    clearTimeout(gRunFailTimer.current);
    clearTimeout(gRunClearTimer.current);
    setAmbushPending(false);
    setAnomalyCam(camIndex);
    setAnomalyVariant(specialIndex);
    setAnomalyAge(0);
    setAnomalyEscalated(false);
    setEscalationFrameIndex(null);
    setGRunFrameIndex(null);
    setGRunRedout(false);
    setGRunThump(false);
  }

  function cancelAmbush() {
    clearTimeout(ambushTimer.current);
    setAmbushPending(false);
  }

  function raiseMonitor() {
    if (overlay || dead || cleared || monitorMotion) return;
    clearTimeout(raiseTimer.current);
    setTurnedBack(false);
    setMonitorMotion("raising");
    setMonitorFrame(1);

    let frame = 1;
    const advance = () => {
      frame += 1;
      setMonitorFrame(frame);
      if (frame === 7) {
        fadeAudio(bgmRef.current, 0, 180);
        playOnSound();
        setTimeout(() => fadeAudio(vhsRef.current, VHS_VOLUME, 420, { playBefore: true }), 130);
      }
      if (frame < CCTV_FRAMES.length) {
        raiseTimer.current = setTimeout(advance, frame === 7 ? 200 : 48);
        return;
      }

      pulseStatic(360);
      raiseTimer.current = setTimeout(() => {
        setMonitorMotion(null);
        setCctvOpen(true);
      }, 360);
    };

    raiseTimer.current = setTimeout(advance, 70);
  }

  function lowerMonitor() {
    if (overlay || dead || cleared || monitorMotion) return;
    cancelAmbush();
    clearTimeout(raiseTimer.current);
    if (gRunRedout) clearGRunEvent();
    setMonitorMotion("lowering");
    setMonitorFrame(CCTV_FRAMES.length);
    setCctvOpen(false);
    if (!rebootRequired) setSignalFailure(false);
    pulseStatic(180);

    let frame = CCTV_FRAMES.length;
    const retreat = () => {
      frame -= 1;
      setMonitorFrame(frame);
      if (frame === 7) {
        fadeAudio(vhsRef.current, 0, 180, { pauseAfter: true });
        playOnSound();
        setTimeout(() => fadeAudio(bgmRef.current, BGM_VOLUME, 520, { playBefore: true }), 130);
      }
      if (frame > 1) {
        raiseTimer.current = setTimeout(retreat, frame === 7 ? 200 : 48);
        return;
      }

      raiseTimer.current = setTimeout(() => {
        setMonitorMotion(null);
        setMonitorFrame(1);
      }, 80);
    };

    raiseTimer.current = setTimeout(retreat, 220);
  }

  function changeCam(step) {
    if (!cctvOpen || rebootRequired || signalFailure || overlay || dead || cleared || monitorMotion) return;
    cancelAmbush();
    playEffect(cctvChangeRef.current, 0.48);
    pulseStatic(240);
    setCameraStress((stress) => {
      const nextStress = Math.min(7, stress + 1);
      cameraStressRef.current = nextStress;
      return nextStress;
    });
    setCamIndex((idx) => {
      const nextIndex = getNextCamIndex(idx, step);

      if (anomalyCam === null && Math.random() < 0.08) {
        scheduleAmbush(nextIndex, 1000);
      }

      return nextIndex;
    });
  }

  function reportProblem() {
    if (!cctvOpen || rebootRequired || signalFailure || overlay || dead || cleared || monitorMotion) return;
    if (gRunRedout) return;

    if (currentHasAnomaly) {
      showOverlay("report", randomItem(REPORT_TEXTS), 1200, () => {
        clearTimeout(gRunTimer.current);
        clearTimeout(gRunFailTimer.current);
        clearTimeout(gRunClearTimer.current);
        setAnomalyCam(null);
        setAnomalyVariant(null);
        setAnomalyAge(0);
        setAnomalyEscalated(false);
        setEscalationFrameIndex(null);
        setGRunFrameIndex(null);
        setGRunRedout(false);
        setGRunThump(false);
        setCompletedReports((count) => count + 1);
        setSeconds((time) => Math.min(CLEAR_TIME_SECONDS, time + DAY_ONE_REPORT_TIME_BONUS_SECONDS));
      });
    } else {
      showOverlay("warning", "오보고 기록됨.", 1100, () => {
        setWarnings((w) => w + 1);
      });
    }
  }

  function failReport() {
    showOverlay("warning", randomItem(WARNING_TEXTS), 1300, () => {
      clearTimeout(gRunTimer.current);
      clearTimeout(gRunFailTimer.current);
      clearTimeout(gRunClearTimer.current);
      setWarnings((w) => w + 1);
      setAnomalyCam(null);
      setAnomalyVariant(null);
      setAnomalyAge(0);
      setAnomalyEscalated(false);
      setEscalationFrameIndex(null);
      setGRunFrameIndex(null);
      setGRunRedout(false);
      setGRunThump(false);
    });
  }

  function triggerRebootFailure() {
    if (signalFailure) return;
    cancelAmbush();
    setSignalFailure(true);
    setRebootRequired(true);
    setTargetFrequency(Math.floor(25 + Math.random() * 55));
    setFrequency(Math.floor(Math.random() * 100));
    pulseStatic(2300);
  }

  function tryReboot() {
    if (!isTuned(frequency, targetFrequency)) return;
    playEffect(clearRef.current, 0.58);
    showOverlay("report", "신호 재동기화 중...", 1200, () => {
      setRebootRequired(false);
      setSignalFailure(false);
      setCctvOpen(false);
      setMonitorFrame(1);
    });
  }

  function forceRebootFail() {
    showOverlay("warning", "재동기화 지연.", 1100, () => {
      setWarnings((w) => w + 1);
    });
  }

  function press(action) {
    return (event) => {
      ignoreClickUntil.current = Date.now() + 450;
      event.preventDefault();
      primeAudio();
      action();
    };
  }

  function click(action) {
    return () => {
      if (Date.now() < ignoreClickUntil.current) return;
      primeAudio();
      action();
    };
  }

  function enterFacility() {
    setIntroExiting(true);
    evRideRef.current?.pause();
    evOffRef.current?.pause();
    setTimeout(() => {
      setGameStarted(true);
      setGameFadingIn(true);
      fadeAudio(bgmRef.current, BGM_VOLUME, 900, { playBefore: true });
      setTimeout(() => setGameFadingIn(false), 900);
    }, 700);
  }

  function skipIntroDialogue() {
    if (introReady || introSkipped) return;
    clearTimeout(introDialogueTimer.current);
    introVoiceRef.current?.pause();
    introVoiceRef.current = null;
    disconnectIntroVoiceEffect();
    setIntroLineIndex(INTRO_DIALOGUE.length - 1);
    setIntroDialogueStarted(true);
    setIntroSkipped(true);
  }

  return (
    <div className={`game warning-${warnings}`}>
      <audio ref={bgmRef} src={AUDIO.bgm} loop preload="auto" />
      <audio ref={vhsRef} src={AUDIO.vhs} loop preload="auto" />
      <audio ref={onRef} src={AUDIO.on} preload="auto" />
      <audio ref={evOnRef} src={AUDIO.evOn} preload="auto" />
      <audio ref={evRideRef} src={AUDIO.evRide} loop preload="auto" />
      <audio ref={evOffRef} src={AUDIO.evOff} preload="auto" />
      <audio ref={cctvChangeRef} src={AUDIO.cctvChange} preload="auto" />
      <audio ref={clearRef} src={AUDIO.clear} preload="auto" />
      <audio ref={controlRef} src={AUDIO.control} preload="auto" />
      <audio ref={fixRef} src={AUDIO.fix} preload="auto" />
      <audio ref={jumpscareRef} src={AUDIO.jumpscare} loop preload="auto" />
      <audio ref={monsterRef} src={AUDIO.monster} preload="auto" />
      <audio ref={noiseRef} src={AUDIO.noise} loop preload="auto" />
      <audio ref={runRef} src={AUDIO.run} preload="auto" />

      {!gameStarted && (
        <ElevatorIntro
          ready={introReady}
          progress={introProgress}
          line={introDialogueStarted && !introSkipped ? INTRO_DIALOGUE[introLineIndex]?.line ?? "" : ""}
          onEnter={enterFacility}
          onSkip={skipIntroDialogue}
          exiting={introExiting}
        />
      )}

      {gameStarted && (
        <div ref={gameStageRef} className={`game-stage${gameFadingIn ? " is-fading-in" : ""}`} tabIndex={-1}>

      {showCctvHud && (
        <div className="hud-clock">
          <strong>{timeText}</strong>
          <span>WARNINGS {warnings}/3</span>
          <span>REPORTS {completedReports}</span>
        </div>
      )}

      {cleared ? (
        clearBridgeDone ? (
          <ElevatorReturn line={DAY1_ENDING_LINES[endingLineIndex] ?? ""} fading={endingFading} menuFading={menuFading} />
        ) : (
          <DayClearBridge day={1} lines={DAY_CLEAR_LINES[1]} onDone={() => setClearBridgeDone(true)} />
        )
      ) : monitorMotion ? (
        <MonitorFrame frame={monitorFrame} staticBurst={staticBurst} />
      ) : cctvOpen && !turnedBack ? (
        <main className={`screen cctv-screen noise${signalFailure ? " signal-failing" : ""}`}>
          <div className="cam-label">
            <strong>{currentCam.id}</strong>
            <span>{currentCam.name}</span>
          </div>

          <CameraVisual
            camera={currentCam}
            anomaly={currentAnomaly}
            warnings={warnings}
            staticBurst={staticBurst}
            shaking={jumpscareActive}
            bright={gRunActive}
            heavyThump={gRunThump}
            gRunFrames={gRunActive ? baseCurrentAnomaly?.gRunFrames : null}
            gRunFrameIndex={gRunFrameIndex}
          />
          {signalFailure && (
            <div className="signal-warning">
              <span>SYSTEM NOTICE</span>
              <strong>REBOOT REQUIRED</strong>
              <p>VIDEO SIGNAL UNSTABLE / REAR PANEL SYNC REQUIRED</p>
            </div>
          )}

          {!signalFailure && (
            <>
              <button type="button" onPointerDown={press(() => changeCam(-1))} onClick={click(() => changeCam(-1))} className="side-button side-left" aria-label="이전 카메라">
                <span>A</span>
                ‹
              </button>
              <button type="button" onPointerDown={press(() => changeCam(1))} onClick={click(() => changeCam(1))} className="side-button side-right" aria-label="다음 카메라">
                <span>D</span>
                ›
              </button>
            </>
          )}

          <button type="button" onPointerDown={press(lowerMonitor)} onClick={click(lowerMonitor)} className="control-button lower-button" aria-label="CCTV 내리기">
            <span>SPACE</span>
            ⌄
          </button>
          {!rebootRequired && !signalFailure && (
            <button type="button" onPointerDown={press(reportProblem)} onClick={click(reportProblem)} className="control-button report-button">
              <span>ENTER</span>
              문제 보고
            </button>
          )}
        </main>
      ) : turnedBack ? (
        <>
          <MonitorFrame frame={1} staticBurst={false} />
          <main className={`screen rear-screen noise${rearPanelClosing ? " is-closing" : ""}`}>
            <div className="panel-label">REAR PANEL<br />FREQUENCY SYNC</div>
            <section className="sync-panel">
              <h1>주파수 재동기화</h1>
              <p>목표 주파수와 현재 주파수를 맞추면 CCTV가 재부팅됩니다.</p>
              <div className="range-labels"><span>0.00 MHz</span><span>100.00 MHz</span></div>
              <input
                type="range"
                min="0"
                max="100"
                value={frequency}
                onInput={(event) => setFrequencyFromInput(Number(event.target.value))}
                onChange={(event) => setFrequencyFromInput(Number(event.target.value))}
                className="frequency-range"
              />
              <div className="frequency-grid">
                <span>현재: {frequency.toFixed(0)} MHz</span>
                <span>목표: {targetFrequency.toFixed(0)} MHz</span>
              </div>
              <div className="scope">
                <i className="scope-current" style={{ left: `${frequency}%` }} />
                <i className="scope-target" style={{ left: `${targetFrequency}%` }} />
              </div>
              <button type="button" onPointerDown={press(tryReboot)} onClick={click(tryReboot)} className={`reboot-button ${isTuned(frequency, targetFrequency) ? "ready" : ""}`}>
                <span>ENTER</span>
                재부팅
              </button>
              <button type="button" onPointerDown={press(forceRebootFail)} onClick={click(forceRebootFail)} className="delay-button">
                너무 오래 걸렸다면 강제 실패 처리
              </button>
            </section>
            <button type="button" onPointerDown={press(closeRearPanel)} onClick={click(closeRearPanel)} className="control-button report-button">
              <span>SHIFT</span>
              돌아가기
            </button>
          </main>
        </>
      ) : (
        <MonitorFrame frame={1} staticBurst={staticBurst}>
          <button
            type="button"
            onPointerDown={press(raiseMonitor)}
            onClick={click(raiseMonitor)}
            className="control-button lower-button"
            aria-label="CCTV 올리기"
          >
            <span>SPACE</span>
            ⌃
          </button>
          <button type="button" onPointerDown={press(openRearPanel)} onClick={click(openRearPanel)} className="control-button report-button">
            <span>SHIFT</span>
            재부팅
          </button>
        </MonitorFrame>
      )}

      {overlay && (
        <div className={`overlay overlay-${overlay.kind}`}>
          <strong className={overlay.kind === "warning" || overlay.kind === "death" ? "danger" : ""}>{overlay.text}</strong>
          <span>{overlay.kind.toUpperCase()}</span>
        </div>
      )}

      {dead && !overlay && !cleared && (
        <div className="death-screen">
          <strong>관측 종료</strong>
          <button type="button" onClick={onReturnToMenu}>일차 선택</button>
        </div>
      )}

      <div className="test-badge">TEST {tests.passed}/{tests.total}</div>
        </div>
      )}
    </div>
  );
}

function DayTwoGame({ onReturnToMenu, onCompleteDay }) {
  const [introReady, setIntroReady] = useState(false);
  const [introLineIndex, setIntroLineIndex] = useState(0);
  const [introExiting, setIntroExiting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [fadingIn, setFadingIn] = useState(false);
  const [clearFading, setClearFading] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [clearBridgeDone, setClearBridgeDone] = useState(false);
  const [endingLineIndex, setEndingLineIndex] = useState(0);
  const [endingFading, setEndingFading] = useState(false);
  const [dead, setDead] = useState(false);
  const [jumpIndex, setJumpIndex] = useState(null);
  const [stage, setStage] = useState(1);
  const [visibleStage, setVisibleStage] = useState(1);
  const [danger, setDanger] = useState(0);
  const [deathArmed, setDeathArmed] = useState(false);
  const [forceDeath, setForceDeath] = useState(false);
  const [sedatives, setSedatives] = useState(8);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskPanelClosing, setTaskPanelClosing] = useState(false);
  const [taskProgress, setTaskProgress] = useState([0, 0, 0, 0]);
  const [holdTask, setHoldTask] = useState(null);
  const [phase, setPhase] = useState("tasks");
  const [audioStep, setAudioStep] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [reportPanelOpen, setReportPanelOpen] = useState(false);
  const [reportPanelClosing, setReportPanelClosing] = useState(false);
  const [specialArmed, setSpecialArmed] = useState(false);
  const [specialPending, setSpecialPending] = useState(false);
  const [specialView, setSpecialView] = useState(false);
  const [specialTooLate, setSpecialTooLate] = useState(false);
  const [specialDeath, setSpecialDeath] = useState(false);
  const [specialButtonExpired, setSpecialButtonExpired] = useState(false);
  const [rearView, setRearView] = useState(false);
  const [turning, setTurning] = useState(false);
  const [sedativeEffect, setSedativeEffect] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  const panelTimer = useRef(null);
  const holdTimer = useRef(null);
  const dangerTimer = useRef(null);
  const deathTimer = useRef(null);
  const forceDeathTimer = useRef(null);
  const suddenStageTimer = useRef(null);
  const specialTimer = useRef(null);
  const specialLateTimer = useRef(null);
  const specialTurnDeadlineTimer = useRef(null);
  const specialButtonTimer = useRef(null);
  const specialViewDeathTimer = useRef(null);
  const sedativeEffectTimer = useRef(null);
  const sedativeResetTimer = useRef(null);
  const clearTimer = useRef(null);
  const endingTimer = useRef(null);
  const jumpTimer = useRef(null);
  const panelExposureRef = useRef(0);
  const bgmRef = useRef(null);
  const soundRef = useRef(null);
  const jumpAudioRef = useRef(null);
  const controlAudioRef = useRef(null);
  const fixAudioRef = useRef(null);
  const taskControlSoundAt = useRef(0);
  const evOnRef = useRef(null);
  const evRideRef = useRef(null);
  const evOffRef = useRef(null);
  const introTimer = useRef(null);

  const panelVisible = taskPanelOpen || reportPanelOpen;
  const stageImage = specialTooLate ? 6 : specialView || rearView ? 5 : specialPending ? 4 : visibleStage;
  const activeTaskIndex = taskProgress.findIndex((value) => value < 100);
  const allTasksDone = taskProgress.every((value) => value >= 100);

  useEffect(() => {
    return () => {
      clearTimeout(panelTimer.current);
      clearInterval(holdTimer.current);
      clearInterval(dangerTimer.current);
      clearTimeout(deathTimer.current);
      clearTimeout(forceDeathTimer.current);
      clearInterval(suddenStageTimer.current);
      clearTimeout(specialTimer.current);
      clearTimeout(specialLateTimer.current);
      clearTimeout(specialTurnDeadlineTimer.current);
      clearTimeout(specialButtonTimer.current);
      clearTimeout(specialViewDeathTimer.current);
      clearTimeout(sedativeEffectTimer.current);
      clearTimeout(sedativeResetTimer.current);
      clearTimeout(clearTimer.current);
      clearTimeout(endingTimer.current);
      clearTimeout(jumpTimer.current);
      clearInterval(introTimer.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIntroLineIndex((index) => {
        if (index >= DAY2_INTRO_LINES.length - 1) {
          clearInterval(timer);
          setIntroReady(true);
          return index;
        }
        return index + 1;
      });
    }, INTRO_LINE_DURATION);
    introTimer.current = timer;
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    evOnRef.current && (evOnRef.current.volume = 0.55);
    evRideRef.current && (evRideRef.current.volume = 0.32);
    evOffRef.current && (evOffRef.current.volume = 0.58);
    evOnRef.current?.play().catch(() => {});
    evRideRef.current?.play().catch(() => {});

    return () => {
      evOnRef.current?.pause();
      evRideRef.current?.pause();
      evOffRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!introReady) return;
    evRideRef.current?.pause();
    evOffRef.current?.play().catch(() => {});
  }, [introReady]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || phase === "clear") return undefined;
    bgmRef.current.volume = 0.36;
    bgmRef.current.play().catch(() => {});
    return () => bgmRef.current?.pause();
  }, [gameStarted, dead, cleared, phase]);

  useEffect(() => {
    if (!gameStarted || dead || cleared) return;
    if (phase === "clear") {
      bgmRef.current?.pause();
      return;
    }
    bgmRef.current.volume = audioPlaying ? 0 : 0.36;
    if (!audioPlaying) bgmRef.current.play().catch(() => {});
  }, [gameStarted, dead, cleared, audioPlaying, phase]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || phase === "clear") return undefined;
    const panelActive = taskPanelOpen || reportPanelOpen;
    const timer = setInterval(() => {
      panelExposureRef.current = panelActive ? panelExposureRef.current + 1 : Math.max(0, panelExposureRef.current - 1.5);
      const exposureMax = panelActive ? Math.min(30, 4 + 2.3 * Math.pow(1.18, panelExposureRef.current / 2.6)) : 0;
      const minIncrease = audioPlaying ? 1.2 : 0.4;
      const maxIncrease = panelActive ? exposureMax + (audioPlaying ? 4 : 0) : audioPlaying ? 7 : holdTask !== null ? 4.5 : 2.4;
      const increase = randomBetween(minIncrease, maxIncrease);
      setDanger((value) => {
        const nextDanger = Math.min(100, value + increase);
        const currentStage = getDay2StageFromDanger(value);
        const nextStage = getDay2StageFromDanger(nextDanger);
        if (
          currentStage === 1 &&
          nextStage === 2 &&
          !specialArmed &&
          !specialPending &&
          !specialView &&
          !specialTooLate &&
          Math.random() < 0.1
        ) {
          setSpecialArmed(true);
        }
        if (
          panelActive &&
          (currentStage !== nextStage || visibleStage !== nextStage) &&
          !rearView &&
          !specialArmed &&
          !specialPending &&
          !specialView &&
          !specialTooLate
        ) {
          setVisibleStage(nextStage);
        }
        return nextDanger;
      });
    }, 1000);
    dangerTimer.current = timer;
    return () => clearInterval(timer);
  }, [
    gameStarted,
    dead,
    cleared,
    holdTask,
    audioPlaying,
    phase,
    taskPanelOpen,
    reportPanelOpen,
    specialArmed,
    specialPending,
    specialView,
    specialTooLate,
    rearView,
    visibleStage,
  ]);

  useEffect(() => {
    const nextStage = getDay2StageFromDanger(danger);
    if (nextStage !== stage) setStage(nextStage);
  }, [danger, stage]);

  useEffect(() => {
    if (stage < 3 || deathArmed || dead || cleared) return undefined;
    const timer = setTimeout(() => setDeathArmed(true), 9000);
    deathTimer.current = timer;
    return () => clearTimeout(timer);
  }, [stage, deathArmed, dead, cleared]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || phase === "clear" || deathArmed || rearView || specialPending || specialView || specialTooLate) return undefined;

    const timer = setInterval(() => {
      if (Math.random() > 0.24) return;
      setDanger(100);
      setStage(3);
      if (panelVisible && !specialArmed) setVisibleStage(3);
    }, 20000);

    suddenStageTimer.current = timer;
    return () => clearInterval(timer);
  }, [gameStarted, dead, cleared, phase, deathArmed, specialArmed, rearView, specialPending, specialView, specialTooLate, panelVisible]);

  useEffect(() => {
    if (!deathArmed || dead || cleared) return undefined;
    const timer = setTimeout(() => setForceDeath(true), 10000);
    forceDeathTimer.current = timer;
    return () => clearTimeout(timer);
  }, [deathArmed, dead, cleared]);

  useEffect(() => {
    if (!forceDeath || dead || cleared) return;
    if (taskPanelOpen || reportPanelOpen) {
      closeAnyPanel();
      return;
    }
    if (specialPending || specialView || specialTooLate) {
      turnBack();
      return;
    }
    triggerDay2Death();
  }, [forceDeath, taskPanelOpen, reportPanelOpen, specialPending, specialView, specialTooLate, dead, cleared]);

  useEffect(() => {
    if (!gameStarted || dead || cleared || phase === "clear" || specialArmed || specialPending || specialView || specialTooLate) return undefined;
    const timer = setTimeout(() => setSpecialArmed(true), 16000 + Math.random() * 12000);
    specialTimer.current = timer;
    return () => clearTimeout(timer);
  }, [gameStarted, dead, cleared, phase, specialArmed, specialPending, specialView, specialTooLate]);

  useEffect(() => {
    if (!specialTooLate || dead || cleared) return undefined;
    const timer = setTimeout(() => triggerDay2Death(), 5000);
    return () => clearTimeout(timer);
  }, [specialTooLate, dead, cleared]);

  useEffect(() => {
    if (holdTask === null) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - taskControlSoundAt.current >= 1000) {
        taskControlSoundAt.current = now;
        playDay2Control();
      }
      advanceTaskProgress(holdTask, 0.72);
    }, 100);
    holdTimer.current = timer;
    return () => clearInterval(timer);
  }, [holdTask]);

  useEffect(() => {
    if (holdTask !== null && taskProgress[holdTask] >= 100) {
      setHoldTask(null);
    }
  }, [holdTask, taskProgress]);

  useEffect(() => {
    if (phase !== "tasks" || allTasksDone || activeTaskIndex < 0) return undefined;
    if (holdTask !== null && taskPanelOpen && !taskPanelClosing) return undefined;

    const timer = setInterval(() => {
      setTaskProgress((items) =>
        items.map((value, index) => (index === activeTaskIndex ? Math.max(0, value - 0.9) : value))
      );
    }, 200);

    return () => clearInterval(timer);
  }, [phase, allTasksDone, activeTaskIndex, holdTask, taskPanelOpen, taskPanelClosing]);

  useEffect(() => {
    if (phase === "tasks" && allTasksDone) {
      setHoldTask(null);
      revealSpecialEvent();
    }
  }, [allTasksDone, phase]);

  useEffect(() => {
    if (phase === "sound" && audioStep >= DAY2_SOUND_TESTS.length) {
      setPhase("clear");
      setHoldTask(null);
      stopSoundTest();
      bgmRef.current?.pause();
      const closingPanel = taskPanelOpen || reportPanelOpen;
      if (taskPanelOpen) closeTaskPanel();
      if (reportPanelOpen) closeReportPanel();
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        setClearFading(true);
        clearTimer.current = setTimeout(() => {
          setCleared(true);
          setClearBridgeDone(false);
          setEndingLineIndex(0);
          setEndingFading(false);
          setMenuFading(false);
          onCompleteDay?.();
        }, 2100);
      }, (closingPanel ? REAR_PANEL_CLOSE_DURATION : 0) + 2000);
    }
  }, [audioStep, phase, onCompleteDay, taskPanelOpen, reportPanelOpen]);

  useEffect(() => {
    if (!cleared || !clearBridgeDone || dead) return undefined;
    evOnRef.current.currentTime = 0;
    evRideRef.current.currentTime = 0;
    evOffRef.current.currentTime = 0;
    evOnRef.current.play().catch(() => {});
    evRideRef.current.play().catch(() => {});
    return () => {
      evRideRef.current?.pause();
    };
  }, [cleared, clearBridgeDone, dead]);

  useEffect(() => {
    if (!cleared || !clearBridgeDone || dead) return undefined;
    clearTimeout(endingTimer.current);

    if (endingLineIndex >= DAY2_ENDING_LINES.length) {
      setEndingFading(true);
      endingTimer.current = setTimeout(() => {
        evRideRef.current?.pause();
        evOffRef.current.currentTime = 0;
        evOffRef.current.play().catch(() => {});
        setMenuFading(true);
        endingTimer.current = setTimeout(onReturnToMenu, DAY_ENDING_FADE_DURATION);
      }, DAY_ENDING_FADE_DURATION);
      return () => clearTimeout(endingTimer.current);
    }

    endingTimer.current = setTimeout(() => {
      setEndingLineIndex((index) => index + 1);
    }, DAY_ENDING_LINE_DURATION);
    return () => clearTimeout(endingTimer.current);
  }, [cleared, clearBridgeDone, dead, endingLineIndex, onReturnToMenu]);

  useEffect(() => {
    if (jumpIndex === null) return undefined;
    jumpAudioRef.current.currentTime = 0;
    jumpAudioRef.current.volume = 0.74;
    jumpAudioRef.current.play().catch(() => {});
    if (jumpIndex >= DAY2_JUMP_FRAMES.length - 1) {
      jumpTimer.current = setTimeout(() => setDead(true), 650);
      return () => clearTimeout(jumpTimer.current);
    }
    jumpTimer.current = setTimeout(() => setJumpIndex((index) => index + 1), 95);
    return () => clearTimeout(jumpTimer.current);
  }, [jumpIndex]);

  function enterDay2() {
    setIntroExiting(true);
    evOnRef.current?.pause();
    evRideRef.current?.pause();
    evOffRef.current?.pause();
    setTimeout(() => {
      setGameStarted(true);
      setFadingIn(true);
      setTimeout(() => setFadingIn(false), 900);
    }, 700);
  }

  function applyPanelReveal() {
    if (deathArmed) {
      triggerDay2Death();
      return;
    }
    if (specialArmed) {
      revealSpecialEvent();
      return;
    }
  }

  function revealSpecialEvent() {
    setSpecialArmed(false);
    setSpecialPending(true);
    setSpecialView(false);
    setSpecialTooLate(false);
    setSpecialDeath(false);
    setSpecialButtonExpired(false);
    setRearView(false);
    setVisibleStage(1);
    clearTimeout(specialTimer.current);
    clearTimeout(specialLateTimer.current);
    clearTimeout(specialTurnDeadlineTimer.current);
    clearTimeout(specialButtonTimer.current);
    clearTimeout(specialViewDeathTimer.current);
    specialLateTimer.current = setTimeout(() => {
      setSpecialDeath(true);
    }, 3000);
    specialTurnDeadlineTimer.current = setTimeout(() => {
      setSpecialDeath(true);
    }, 7000);
  }

  function playFix() {
    fixAudioRef.current.currentTime = 0;
    fixAudioRef.current.volume = 0.48;
    fixAudioRef.current.play().catch(() => {});
  }

  function playDay2Control() {
    controlAudioRef.current.currentTime = 0;
    controlAudioRef.current.volume = 0.45;
    controlAudioRef.current.play().catch(() => {});
  }

  function addDay2Danger(amount) {
    setDanger((value) => Math.min(100, value + amount));
  }

  function advanceTaskProgress(index, amount = 14) {
    setTaskProgress((items) => items.map((value, itemIndex) => (itemIndex === index ? Math.min(100, value + amount) : value)));
  }

  function startTaskProgress(index, event) {
    event.preventDefault();
    if (index !== activeTaskIndex || taskProgress[index] >= 100) return;
    playDay2Control();
    taskControlSoundAt.current = Date.now();
    setHoldTask(index);
  }

  function openTaskPanel() {
    if (phase !== "tasks" || taskPanelOpen || taskPanelClosing || dead || cleared) return;
    playFix();
    addDay2Danger(2);
    setTaskPanelOpen(true);
  }

  function closeTaskPanel() {
    if (!taskPanelOpen || taskPanelClosing) return;
    playFix();
    addDay2Danger(2);
    applyPanelReveal();
    setTaskPanelClosing(true);
    setHoldTask(null);
    panelTimer.current = setTimeout(() => {
      setTaskPanelOpen(false);
      setTaskPanelClosing(false);
      if (allTasksDone) setPhase("sound");
    }, REAR_PANEL_CLOSE_DURATION);
  }

  function closeAnyPanel() {
    if (taskPanelOpen) closeTaskPanel();
    else if (reportPanelOpen) closeReportPanel();
    else triggerDay2Death();
  }

  function useSedative() {
    if (sedatives <= 0 || dead || cleared || sedativeEffect) return;
    const keepRearAfterReset = specialView || rearView;
    setSedatives((count) => count - 1);
    soundRef.current?.pause();
    setAudioPlaying(false);
    clearTimeout(sedativeEffectTimer.current);
    clearTimeout(sedativeResetTimer.current);
    setSedativeEffect(false);
    requestAnimationFrame(() => {
      setSedativeEffect(true);
      sedativeEffectTimer.current = setTimeout(() => setSedativeEffect(false), 2700);
    });
    sedativeResetTimer.current = setTimeout(() => {
      setDanger(0);
      setStage(1);
      setVisibleStage(1);
      setRearView(keepRearAfterReset);
      setDeathArmed(false);
      setForceDeath(false);
      setSpecialArmed(false);
      setSpecialPending(false);
      setSpecialView(false);
      setSpecialTooLate(false);
      setSpecialDeath(false);
      setSpecialButtonExpired(false);
      clearTimeout(specialTimer.current);
      clearTimeout(specialLateTimer.current);
      clearTimeout(specialTurnDeadlineTimer.current);
      clearTimeout(specialButtonTimer.current);
      clearTimeout(specialViewDeathTimer.current);
    }, 850);
  }

  function playSoundTest() {
    if (phase !== "sound" || audioPlaying || audioEnded || reportPanelOpen || audioStep >= DAY2_SOUND_TESTS.length) return;
    const audio = soundRef.current;
    const nextSrc = DAY2_SOUND_TESTS[audioStep];
    if (!audio.src.endsWith(nextSrc)) {
      audio.src = nextSrc;
      audio.currentTime = 0;
    }
    audio.volume = 0.82;
    setAudioPlaying(true);
    setAudioEnded(false);
    audio.play().catch(() => {
      setAudioPlaying(false);
      setAudioEnded(true);
    });
  }

  function stopSoundTest() {
    soundRef.current.pause();
    setAudioPlaying(false);
  }

  function openReportPanel() {
    if (phase !== "sound" || reportPanelOpen || reportPanelClosing || audioStep >= DAY2_SOUND_TESTS.length) return;
    playFix();
    addDay2Danger(2);
    setReportPanelOpen(true);
  }

  function closeReportPanel() {
    if (!reportPanelOpen || reportPanelClosing) return;
    playFix();
    addDay2Danger(2);
    applyPanelReveal();
    setReportPanelClosing(true);
    panelTimer.current = setTimeout(() => {
      setReportPanelOpen(false);
      setReportPanelClosing(false);
    }, REAR_PANEL_CLOSE_DURATION);
  }

  function chooseSoundType(index) {
    if (index !== audioStep) return;
    setAudioEnded(false);
    setAudioStep((step) => step + 1);
    closeReportPanel();
  }

  function turnBack() {
    if (turning || dead || cleared) return;
    if (rearView) {
      setTurning(true);
      setTimeout(() => {
        setRearView(false);
        setTurning(false);
      }, 220);
      return;
    }
    if (specialTooLate) {
      triggerDay2Death();
      return;
    }
    if (specialView) {
      setTurning(true);
      setTimeout(() => {
        if (specialButtonExpired || specialDeath || deathArmed || forceDeath) {
          triggerDay2Death();
        } else {
          setSpecialView(false);
          setSpecialPending(true);
        }
        setTurning(false);
      }, 220);
      return;
    }
    if (!(specialPending || specialView || specialTooLate)) {
      setTurning(true);
      setTimeout(() => {
        setRearView(true);
        setTurning(false);
      }, 220);
      return;
    }
    setTurning(true);
    setTimeout(() => {
      clearTimeout(specialLateTimer.current);
      clearTimeout(specialTurnDeadlineTimer.current);
      if (specialDeath || deathArmed || forceDeath) {
        setSpecialTooLate(true);
        setSpecialPending(false);
        setSpecialView(false);
      } else {
        setSpecialPending(false);
        setSpecialView(true);
        setSpecialDeath(false);
        setSpecialButtonExpired(false);
        clearTimeout(specialTimer.current);
        clearTimeout(specialButtonTimer.current);
        clearTimeout(specialViewDeathTimer.current);
        specialButtonTimer.current = setTimeout(() => {
          setSpecialButtonExpired(true);
          specialViewDeathTimer.current = setTimeout(() => triggerDay2Death(), 3000);
        }, 3000);
      }
      setTurning(false);
    }, 360);
  }

  function pressRedButton() {
    if (!specialView || specialButtonExpired || deathArmed || forceDeath) return;
    clearTimeout(specialButtonTimer.current);
    clearTimeout(specialViewDeathTimer.current);
    useSedative();
  }

  function triggerDay2Death() {
    if (jumpIndex !== null || dead) return;
    setTaskPanelOpen(false);
    setReportPanelOpen(false);
    setJumpIndex(0);
  }

  useEffect(() => {
    const handleKey = (event) => {
      if (!gameStarted || dead || cleared) return;
      if (event.key.toLowerCase() === "i" || event.code === "KeyI") {
        event.preventDefault();
        stopSoundTest();
        setTaskPanelOpen(false);
        setReportPanelOpen(false);
        setHoldTask(null);
        setTaskProgress([100, 100, 100, 100]);
        setPhase("sound");
        setAudioPlaying(false);
        setAudioEnded(true);
        setAudioStep(DAY2_SOUND_TESTS.length);
        setClearFading(false);
        setClearBridgeDone(false);
        setEndingLineIndex(0);
        setEndingFading(false);
        setMenuFading(false);
        bgmRef.current?.pause();
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        if (phase === "tasks") {
          if (taskPanelOpen) closeTaskPanel();
          else openTaskPanel();
        }
        return;
      }

      if (event.key.toLowerCase() === "p" || event.code === "KeyP") {
        event.preventDefault();
        setDeveloperMode((enabled) => !enabled);
        return;
      }

      if (event.key.toLowerCase() === "l" || event.key === "ㅣ" || event.code === "KeyL") {
        event.preventDefault();
        revealSpecialEvent();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [gameStarted, dead, cleared, phase, taskPanelOpen, taskPanelClosing, onCompleteDay]);

  return (
    <div className="game day2-game">
      <audio ref={bgmRef} src="/sal/songs/bgm.mp3" loop preload="auto" />
      <audio ref={soundRef} onEnded={() => { setAudioPlaying(false); setAudioEnded(true); }} preload="auto" />
      <audio ref={jumpAudioRef} src="/sal/songs/jump2.mp3" preload="auto" />
      <audio ref={controlAudioRef} src={AUDIO.control} preload="auto" />
      <audio ref={fixAudioRef} src={AUDIO.fix} preload="auto" />
      <audio ref={evOnRef} src={AUDIO.evOn} preload="auto" />
      <audio ref={evRideRef} src={AUDIO.evRide} loop preload="auto" />
      <audio ref={evOffRef} src={AUDIO.evOff} preload="auto" />

      {!gameStarted && (
        <ElevatorIntro
          ready={introReady}
          progress={1}
          line={!introReady ? DAY2_INTRO_LINES[introLineIndex] : ""}
          onEnter={enterDay2}
          onSkip={() => setIntroReady(true)}
          exiting={introExiting}
        />
      )}

      {gameStarted && (
        <main className={`screen day2-screen${fadingIn ? " is-fading-in" : ""}${turning ? " is-turning" : ""}`}>
          <img src={DAY2_IMAGES[stageImage]} alt="" className="day2-creature" draggable="false" />
          <div className="day2-hud">
            <strong>DAY 02</strong>
            <span>진정제 {sedatives}</span>
            {developerMode && <span>DEV 이상행동 {stage}단계 / 게이지 {danger.toFixed(1)}</span>}
          </div>

          {phase === "tasks" && (
            <button type="button" className="day2-corner-button day2-panel-toggle" onClick={taskPanelOpen ? closeTaskPanel : openTaskPanel}>
              <span>SHIFT</span>
              임무 패널
            </button>
          )}

          <button type="button" className="day2-corner-button day2-sedative" onClick={useSedative} disabled={sedatives <= 0}>
            진정제
          </button>

          <button type="button" className="day2-corner-button day2-turn" onClick={turnBack}>
            뒤돌아보기
          </button>

          {specialView && (
            <button type="button" className="day2-red-button" onClick={pressRedButton}>
              RED
            </button>
          )}

          <div className="day2-light-flicker" />
          <div className="day2-dust" />

          {sedativeEffect && <div className="day2-sedative-effect" />}

          {taskPanelOpen && (
            <section className={`day2-panel task-panel${taskPanelClosing ? " is-closing" : ""}`}>
              <h1>실험체 처리 임무</h1>
              {DAY2_TASKS.map((task, index) => (
                <div key={task} className={`day2-task-row${index === activeTaskIndex ? " active" : ""}`}>
                  <span>{task}</span>
                  <meter min="0" max="100" value={taskProgress[index]} />
                  <button
                    type="button"
                    disabled={index !== activeTaskIndex || taskProgress[index] >= 100}
                    onPointerDown={(event) => startTaskProgress(index, event)}
                    onPointerUp={() => setHoldTask(null)}
                    onPointerLeave={() => setHoldTask(null)}
                    onPointerCancel={() => setHoldTask(null)}
                  >
                    진행
                  </button>
                </div>
              ))}
            </section>
          )}

          {phase === "sound" && !cleared && (
            <>
              <button type="button" className="day2-corner-button day2-audio" onClick={audioPlaying ? stopSoundTest : playSoundTest}>
                {audioPlaying ? "정지" : "음성 재생"}
              </button>
              <button type="button" className="day2-corner-button day2-report" onClick={openReportPanel}>
                보고
              </button>
            </>
          )}

          {reportPanelOpen && (
            <section className={`day2-panel report-panel${reportPanelClosing ? " is-closing" : ""}`}>
              <h1>소리 반응 테스트</h1>
              {[0, 1, 2].map((index) => (
                <label key={index} className="sound-option">
                  <span>{index + 1}번 유형</span>
                  <input type="checkbox" checked={audioStep > index} onChange={() => chooseSoundType(index)} disabled={!audioEnded || index !== audioStep} />
                </label>
              ))}
              <button type="button" onClick={closeReportPanel}>닫기</button>
            </section>
          )}

          {jumpIndex !== null && (
            <div className="day2-jump">
              <img src={DAY2_JUMP_FRAMES[jumpIndex]} alt="" />
            </div>
          )}

          {dead && (
            <div className="death-screen">
              <strong>사망</strong>
              <button type="button" onClick={onReturnToMenu}>일차 선택</button>
            </div>
          )}

          {clearFading && !cleared && !dead && <div className="day2-clear-fade" />}

          {cleared && !dead && (
            clearBridgeDone ? (
              <ElevatorReturn line={DAY2_ENDING_LINES[endingLineIndex] ?? ""} fading={endingFading} menuFading={menuFading} />
            ) : (
              <DayClearBridge day={2} lines={DAY_CLEAR_LINES[2]} onDone={() => setClearBridgeDone(true)} />
            )
          )}
        </main>
      )}
    </div>
  );
}

const DAY3_ASSETS = {
  mainImage: "/repair/main.png",
  bgm: "/songs/day3bgm.mp3",
  repairLoop: "/songs/repair.mp3",
  light: "/songs/light.mp3",
  ad: "/songs/ad.mp3",
  jump: "/songs/day3jump.mp3",
  panic: "/songs/panic.mp3",
  turnoff: "/songs/turnoff.mp3",
  panel: AUDIO.fix,
};

const DAY3_AUDIO_VOLUME = {
  bgm: 0.055,
  repair: 0.34,
  ad: 0.34,
  light: 0.38,
  closeLoop: 0.16,
  monsterMoveBase: 0.025,
  monsterMoveStep: 0.055,
  monsterRetreatBase: 0.08,
  jump: 0.72,
  panicMax: 0.58,
};

const DAY3_STAGE_NAMES = [
  "보조 전원 연결",
  "차단기 안정화",
  "보조 회로 확인",
  "전력 동기화",
  "격리벽 잠금 장치 재가동",
  "인지 차폐 장치 복구",
  "폐쇄 신호 검증",
  "비상 재동기화",
];

const DAY3_INTRO_LINES = [
  "제3격리벽 하부 정비구역으로 이동합니다.",
  "정비 담당자님께 사전 안전 절차를 안내드립니다.",
  "해당 구역은 청각 반응성 개체 및 인지 간섭 개체의 영향권에 포함되어 있습니다.",
  "비상 상황 발생 시, 불필요한 음성 응답 및 소음 발생을 삼가십시오.",
  "구조반은 정비 담당자의 위치 정보를 사전에 공유받고 있으며, 음성 신호를 통해 생존자를 탐색하지 않습니다.",
  "시설 방송이 본 안내와 상충되는 지시를 내릴 경우, 본 안내를 우선하십시오.",
  "반복합니다.",
  "비상 상황 발생 시, 소리를 내지 마십시오.",
  "그들이 먼저 듣습니다.",
];

const DAY3_TUTORIAL_LINES = [
  "정비 담당자님, 중앙 제어 패널에 도착하셨습니다.",
  "금일 작업은 제3격리벽 전력 공급 장치의 수동 점검입니다.",
  "작업은 총 8단계로 구성되어 있으며, 각 단계 완료 후 다음 절차가 자동으로 개방됩니다.",
  "완료된 절차는 안전 기록에 저장되며, 이전 단계로 되돌아가지 않습니다.",
  "안내드립니다.",
  "당사는 협력 기업들과의 원만한 관계 유지 및 시설 운영 비용 절감을 위해 정비 인터페이스 내 사내 광고 송출 제도를 도입하였습니다.",
];

const DAY3_RADIO_LINES = [
  "정비 담당자님, 1단계 절차가 정상적으로 완료되었습니다.",
  "이제 좌우 보조 통로의 전력 흐름을 확인하겠습니다.",
  "현장 감독관 연결 중...",
  "감독관님, 응답 바랍니다.",
  "감독관님?",
  "현재 위치를 확인해 주십시오.",
  "잠시만요.",
  "그쪽 출입문은 폐쇄되어 있어야—",
];

const DAY3_BLACKOUT_LINES = [
  "경고.",
  "주 전력 상실.",
  "비상 조명 전환 실패.",
  "제3격리벽 잠금 상태 확인 불가.",
  "마물 격리벽 해제됨.",
  "정비 담당자는 현재 위치를 이탈하지 마십시오.",
  "수동 복구 절차를 계속 진행하십시오.",
];

const DAY3_AD_LINES = [
  [
    "TTF 산업은 격리시설 정비 인력의 안전한 근무 환경을 위해 최신 인지 안정 기술과 현장 지원 체계를 제공합니다.",
    "통제는 안전을 낳고, 안전은 내일을 지킵니다.",
  ],
  [
    "TTF-115.",
    "현장 인력의 인지 안정성을 위한 검증된 선택.",
    "호흡 곤란, 방향감 상실, 확인되지 않은 음성 인식이 발생할 경우 관리자의 지시에 따라 투여하십시오.",
    "들리는 모든 것이 진실은 아닙니다.",
  ],
  [
    "퇴실 전 소독 절차는 선택이 아닙니다.",
    "당신의 피부, 호흡, 기억에 남은 잔여 오염을 표준 절차로 관리하십시오.",
    "깨끗한 복귀가 완전한 복귀입니다.",
  ],
  [
    "TTF 산업은 귀하의 생존과 복귀를 진심으로 환영합니다.",
    "정비 담당자의 헌신은 시설의 안정에 기여합니다.",
    "시설의 안정은 복귀를 가능하게 합니다.",
    "복귀는 새로운 통제를 가능하게 합니다.",
    "귀하의 생존과 복귀를 진심으로 환영합니다.",
  ],
];

const DAY3_ENDING_LINES = [
  "수고하셨습니다.",
  "당신의 헌신 덕분에 우리는 다시 통제와 안정을 되찾을 수 있게 되었습니다.",
  "귀하의 생존과 복귀를 진심으로 환영합니다.",
  "해당 개체는 적색지대에서 처음 관측되었습니다.",
  "다른 것들을 흉내내고 모방하며, 인간의 정신을 침식할 수 있습니다.",
  "그것은 지성을 지니고 있으며—",
  "때론 아주 교활하게 인간을 덫으로 몰아넣기도 하죠.",
  "우리는 그것을 변이체-C311이라고 명명했습니다.",
  "귀하의 생존과 복귀를 진심으로 환영합니다.",
];

const DAY3_BALANCE = {
  repairPerSecond: 9,
  finalRepairPerSecond: 6.5,
  repairGrace: 4,
  finalRepairGrace: 2,
  decayPerSecond: 2,
  finalDecayPerSecond: 3,
  repairContaminationChange: -3,
  flashlightDrainPerSecond: 10,
  flashlightRecoverPerSecond: 10,
  flashlightRepelSeconds: 0.65,
  monsterStepSeconds: 5.4,
  repairMonsterBonus: 2,
  attackTimerMin: 10,
  attackTimerMax: 15,
  attackWaitSeconds: 20,
  attackPressureMultiplier: 2,
  attackRollSeconds: 1,
  attackRollChance: 0.2,
  flashlightPanicDashChance: 0.4,
  viewTransitionMs: 1150,
  adReturnChanceMin: 0.02,
  adReturnChanceMax: 0.3,
  adReturnRampMs: 30000,
};

const DAY3_MONSTER_GRAPH = {
  M: ["a1", "b1"],
  a1: ["M", "a2"],
  a2: ["a1", "a3"],
  a3: ["a2"],
  b1: ["M", "b2"],
  b2: ["b1", "b3"],
  b3: ["b2"],
};

function getDay3MonsterSide(position) {
  if (position.startsWith("a")) return "left";
  if (position.startsWith("b")) return "right";
  return "center";
}

function getDay3MonsterLevel(position) {
  if (position === "a1" || position === "b1") return 1;
  if (position === "a2" || position === "b2") return 2;
  if (position === "a3" || position === "b3") return 4;
  return 0;
}

function getDay3MonsterLevels(position) {
  const side = getDay3MonsterSide(position);
  const level = getDay3MonsterLevel(position);
  return {
    left: side === "left" ? level : 0,
    right: side === "right" ? level : 0,
  };
}

function getDay3OppositeDashPath(position) {
  if (position === "a3") return ["a2", "a1", "M", "b1", "b2", "b3"];
  if (position === "b3") return ["b2", "b1", "M", "a1", "a2", "a3"];
  return null;
}

function getDay3FlashlightPanicDashPath(position) {
  if (position === "a1") return ["M", "b1", "b2", "b3"];
  if (position === "a2") return ["a1", "M", "b1", "b2", "b3"];
  if (position === "b1") return ["M", "a1", "a2", "a3"];
  if (position === "b2") return ["b1", "M", "a1", "a2", "a3"];
  return null;
}

function getDay3NaturalMoveOptions(position) {
  if (position === "a3" || position === "b3") return [];
  return DAY3_MONSTER_GRAPH[position] ?? ["M"];
}

  function DayThreeGame({ onReturnToMenu, onCompleteDay }) {
  // 기존 상태들 (예: gameStarted, seconds 등) 유지...
  
  // [수정 1] 플레이어 시야 상태 (-1: 좌, 0: 중앙, 1: 우)
  const [panX, setPanX] = useState(0); 
  
  // [수정 2] 괴물 위치 단계 (예: 0: 초기, 1: a1, 2: a2, 3: 근접)
  const [monsterStage, setMonsterStage] = useState(0); 

  // 오디오 및 타이머 Ref
  const monsterAudioRef = useRef(null);
  const { fadeAudio } = useGameAudio(); // 만들어두신 오디오 훅 사용

  // 컴포넌트 마운트 시 괴물 소리 객체 할당
  useEffect(() => {
    monsterAudioRef.current = new Audio("/songs/monster.mp3"); // 3일차 괴물 소리 파일 경로
    return () => {
      monsterAudioRef.current?.pause();
    };
  }, []);
  const [resetSeed, setResetSeed] = useState(0);
  const [phase, setPhase] = useState("introElevator");
  const [scriptIndex, setScriptIndex] = useState(0);
  const [day3IntroReady, setDay3IntroReady] = useState(false);
  const [day3IntroExiting, setDay3IntroExiting] = useState(false);
  const [day3GameFadingIn, setDay3GameFadingIn] = useState(false);
  const [view, setView] = useState("center");
  const [stageIndex, setStageIndex] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [completedStages, setCompletedStages] = useState(() => Array(8).fill(false));
  const [contamination, setContamination] = useState(8);
  const [flashlightStability, setFlashlightStability] = useState(100);
  const [monsterPosition, setMonsterPosition] = useState("M");
  const [monsters, setMonsters] = useState({ left: 0, right: 0 });
  const [attackTimers, setAttackTimers] = useState({ left: null, right: null });
  const [isRepairing, setIsRepairing] = useState(false);
  const [isFlashlightHeld, setIsFlashlightHeld] = useState(false);
  const [flashPulse, setFlashPulse] = useState(null);
  const [ad, setAd] = useState(null);
  const [adCanSkip, setAdCanSkip] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [message, setMessage] = useState("안내를 확인하십시오.");
  const [gameover, setGameover] = useState(null);
  const [endingStarted, setEndingStarted] = useState(false);
  const [endingFading, setEndingFading] = useState(false);
  const [endingComplete, setEndingComplete] = useState(false);
  const [endingImageIndex, setEndingImageIndex] = useState(0);
  const [jumpIndex, setJumpIndex] = useState(null);
  const repairIdleRef = useRef(0);
  const monsterClockRef = useRef(0);
  const finishingRef = useRef(false);
  const adShownRef = useRef(new Set());
  const usedAdImagesRef = useRef(new Set());
  const bgmRef = useRef(null);
  const repairAudioRef = useRef(null);
  const closeLoopRef = useRef(null);
  const adAudioRef = useRef(null);
  const panicAudioRef = useRef(null);
  const jumpAudioRef = useRef(null);
  const evOnRef = useRef(null);
  const evRideRef = useRef(null);
  const evOffRef = useRef(null);
  const day3AudioContextRef = useRef(null);
  const flashlightRepelClockRef = useRef(0);
  const monsterMovingRef = useRef(false);
  const attackRollClockRef = useRef({ left: 0, right: 0 });
  const returnAdTimerRef = useRef(null);
  const endingTimerRef = useRef(null);
  const lastAdAtRef = useRef(Date.now());

  function restartDay3() {
    [bgmRef.current, repairAudioRef.current, closeLoopRef.current, adAudioRef.current, panicAudioRef.current, jumpAudioRef.current, evOnRef.current, evRideRef.current, evOffRef.current].forEach(stopDay3Audio);
    bgmRef.current = null;
    repairAudioRef.current = null;
    closeLoopRef.current = null;
    adAudioRef.current = null;
    panicAudioRef.current = null;
    jumpAudioRef.current = null;
    evOnRef.current = null;
    evRideRef.current = null;
    evOffRef.current = null;
    repairIdleRef.current = 0;
    monsterClockRef.current = 0;
    attackRollClockRef.current = { left: 0, right: 0 };
    clearTimeout(returnAdTimerRef.current);
    returnAdTimerRef.current = null;
    clearTimeout(endingTimerRef.current);
    endingTimerRef.current = null;
    lastAdAtRef.current = Date.now();
    finishingRef.current = false;
    adShownRef.current = new Set();
    usedAdImagesRef.current = new Set();
    flashlightRepelClockRef.current = 0;
    monsterMovingRef.current = false;
    setPhase("introElevator");
    setScriptIndex(0);
    setDay3IntroReady(false);
    setDay3IntroExiting(false);
    setDay3GameFadingIn(false);
    setView("center");
    setStageIndex(0);
    setStageProgress(0);
    setCompletedStages(Array(8).fill(false));
    setContamination(8);
    setFlashlightStability(100);
    setMonsterPosition("M");
    setMonsters({ left: 0, right: 0 });
    setAttackTimers({ left: null, right: null });
    setIsRepairing(false);
    setIsFlashlightHeld(false);
    setFlashPulse(null);
    setAd(null);
    setAdCanSkip(false);
    setHudVisible(true);
    setMessage("안내를 확인하십시오.");
    setGameover(null);
    setEndingStarted(false);
    setEndingFading(false);
    setEndingComplete(false);
    setEndingImageIndex(0);
    setJumpIndex(null);
    setResetSeed((seed) => seed + 1);
  }

  const scriptLines = useMemo(() => {
    if (phase === "introElevator") return DAY3_TEXT.intro;
    if (phase === "tutorial") return DAY3_TEXT.tutorial.slice(0, 4);
    if (phase === "adInfo") return DAY3_TEXT.tutorial.slice(4);
    if (phase === "radioAttack") return DAY3_TEXT.radioAttack;
    if (phase === "blackout") return DAY3_TEXT.blackout;
    if (phase === "ending") return DAY3_TEXT.ending;
    return [];
  }, [phase]);

  const darkMode = ["blackout", "playing", "clearBridge", "ending", "gameover"].includes(phase);
  const controlsLocked = Boolean(ad) || phase === "introElevator" || phase === "adInfo" || phase === "radioAttack" || phase === "blackout" || phase === "clearBridge" || phase === "ending" || Boolean(gameover);
  const canRepair = !controlsLocked && (phase === "tutorialRepair" || phase === "playing") && view === "center";
  const canFlashlight = !controlsLocked && ["tutorial", "tutorialRepair", "playing"].includes(phase) && view !== "center" && flashlightStability > 0;

  useEffect(() => {
    return () => clearTimeout(returnAdTimerRef.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(endingTimerRef.current);
  }, []);

  function playDay3Effect(src, volume = 0.45) {
    if (!src) return null;
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
    return audio;
  }

  function stopDay3Audio(audio) {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  function ensureDay3ElevatorAudio() {
    if (!evOnRef.current) evOnRef.current = new Audio(AUDIO.evOn);
    if (!evRideRef.current) {
      evRideRef.current = new Audio(AUDIO.evRide);
      evRideRef.current.loop = true;
    }
    if (!evOffRef.current) evOffRef.current = new Audio(AUDIO.evOff);
    evOnRef.current.volume = 0.55;
    evRideRef.current.volume = 0.32;
    evOffRef.current.volume = 0.58;
  }

  function playDay3PositionedEffect(src, volume, side) {
    if (!src) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return playDay3Effect(src, volume);

    const context = day3AudioContextRef.current ?? new AudioContext();
    day3AudioContextRef.current = context;
    context.resume().catch(() => {});

    const audio = new Audio(src);
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    const pan = context.createStereoPanner ? context.createStereoPanner() : null;
    gain.gain.value = volume;
    audio.volume = 1;
    source.connect(gain);
    if (pan) {
      pan.pan.value = side === "left" ? -0.72 : 0.72;
      gain.connect(pan);
      pan.connect(context.destination);
    } else {
      gain.connect(context.destination);
    }
    audio.addEventListener("ended", () => {
      [source, gain, pan].filter(Boolean).forEach((node) => {
        try {
          node.disconnect();
        } catch {
          // Already disconnected.
        }
      });
    }, { once: true });
    audio.play().catch(() => {});
    return audio;
  }

  function playMonsterMove(side, level, retreat = false) {
    const src = randomItem(DAY3_LONG_SOUNDS);
    const distanceVolume = retreat
      ? DAY3_AUDIO_VOLUME.monsterRetreatBase + Math.max(0, level) * 0.035
      : DAY3_AUDIO_VOLUME.monsterMoveBase + Math.max(0, level) * DAY3_AUDIO_VOLUME.monsterMoveStep;
    playDay3PositionedEffect(src, clamp(distanceVolume, 0.04, 0.48), side);
    setMessage(
      side === "left"
        ? retreat
          ? "왼쪽의 젖은 발소리가 뒤로 밀려난다."
          : "왼쪽 어둠 속에서 물이 눌리는 소리가 들린다."
        : retreat
          ? "오른쪽 금속 울림이 멀어진다."
          : "오른쪽 벽 너머로 금속이 긁히는 소리가 들린다."
    );
  }

  function applyMonsterPosition(position) {
    setMonsterPosition(position);
    setMonsters(getDay3MonsterLevels(position));
  }

  function moveMonsterAlong(path, interval = 170) {
    if (!path?.length || monsterMovingRef.current) return;
    monsterMovingRef.current = true;
    path.forEach((position, index) => {
      setTimeout(() => {
        applyMonsterPosition(position);
        const side = getDay3MonsterSide(position);
        if (side !== "center") playMonsterMove(side, getDay3MonsterLevel(position), false);
        if (index === path.length - 1) monsterMovingRef.current = false;
      }, index * interval);
    });
  }

  function moveMonsterRandomly() {
    if (monsterMovingRef.current) return;
    const path = [];
    let cursor = monsterPosition;
    const steps = Math.random() < 0.22 ? 2 : 1;
    for (let index = 0; index < steps; index += 1) {
      const options = getDay3NaturalMoveOptions(cursor);
      if (!options.length) break;
      const next = randomItem(options);
      path.push(next);
      cursor = next;
    }
    moveMonsterAlong(path, 185);
  }

  function repelMonsterWithFlashlight(side) {
    const currentSide = getDay3MonsterSide(monsterPosition);
    const level = getDay3MonsterLevel(monsterPosition);
    if (currentSide !== side || level < 1 || monsterMovingRef.current) return;

    const panicDashPath = level < 4 && Math.random() < DAY3_BALANCE.flashlightPanicDashChance
      ? getDay3FlashlightPanicDashPath(monsterPosition)
      : null;
    if (panicDashPath) {
      setAttackTimers({ left: null, right: null });
      attackRollClockRef.current = { left: 0, right: 0 };
      moveMonsterAlong(panicDashPath, 65);
      return;
    }

    const dashPath = level >= 4 && Math.random() < 0.28 ? getDay3OppositeDashPath(monsterPosition) : null;
    if (dashPath) {
      setAttackTimers({ left: null, right: null });
      attackRollClockRef.current = { left: 0, right: 0 };
      moveMonsterAlong(dashPath, 70);
      return;
    }

    const retreatPath = {
      a3: ["a2"],
      a2: ["a1"],
      a1: ["M"],
      b3: ["b2"],
      b2: ["b1"],
      b1: ["M"],
    }[monsterPosition];
    if (!retreatPath) return;
    setAttackTimers((timers) => ({ ...timers, [side]: null }));
    attackRollClockRef.current = { ...attackRollClockRef.current, [side]: 0 };
    moveMonsterAlong(retreatPath, 150);
  }

  function stopCloseLoop() {
    stopDay3Audio(closeLoopRef.current);
    closeLoopRef.current = null;
  }

  function syncCloseLoop() {
    const activeSide = view === "left" || view === "right" ? view : null;
    if (!activeSide || monsters[activeSide] < 4 || isFlashlightHeld || phase !== "playing" || gameover) {
      stopCloseLoop();
      return;
    }
    if (closeLoopRef.current) return;
    if (!DAY3_INF_SOUNDS.length) return;
    const audio = new Audio(randomItem(DAY3_INF_SOUNDS));
    audio.loop = true;
    audio.volume = DAY3_AUDIO_VOLUME.closeLoop;
    closeLoopRef.current = audio;
    audio.play().catch(() => {});
  }

  function startAd(index, nextPhase = "playing") {
    adShownRef.current.add(index);
    lastAdAtRef.current = Date.now();
    const remainingAds = DAY3_AD_IMAGES.filter((image) => !usedAdImagesRef.current.has(image));
    if (!remainingAds.length) {
      setPhase(nextPhase);
      setMessage("광고 송출 가능 항목 없음. 절차를 계속합니다.");
      return;
    }
    const selectedAdImage = randomItem(remainingAds);
    usedAdImagesRef.current.add(selectedAdImage);
    setIsRepairing(false);
    setIsFlashlightHeld(false);
    setAdCanSkip(false);
    setAd({ index, line: 0, nextPhase, image: selectedAdImage });
    setMessage("사내 광고 송출 중. 입력이 제한됩니다.");
  }

  function finishCurrentStage() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const finished = stageIndex;
    setCompletedStages((items) => items.map((done, index) => (index === finished ? true : done)));
    setStageProgress(0);
    setIsRepairing(false);
    repairIdleRef.current = 0;

    setTimeout(() => {
      finishingRef.current = false;
      if (finished === 0 && phase === "tutorialRepair") {
        setPhase("radioAttack");
        setScriptIndex(0);
        setMessage("현장 감독관 연결 중...");
        return;
      }

      if (finished >= 7) {
        setPhase("clearBridge");
        setScriptIndex(0);
        onCompleteDay();
        return;
      }

      const nextStage = finished + 1;
      setStageIndex(nextStage);
      setMessage(`${nextStage + 1}단계 절차가 개방되었습니다.`);

      if (nextStage === 7) {
        setMessage("8단계 절차 변경. 비상 재동기화 모드로 전환합니다.");
      }
    }, 80);
  }

  function enterFacility() {
    if (!day3IntroReady || day3IntroExiting) return;
    setDay3IntroExiting(true);
    evRideRef.current?.pause();
    evOffRef.current?.pause();
    setTimeout(() => {
      setPhase("tutorial");
      setScriptIndex(0);
      setDay3GameFadingIn(true);
      setMessage("중앙 제어 패널에 접근하십시오.");
      setTimeout(() => setDay3GameFadingIn(false), 900);
    }, 700);
  }

  function skipDay3Intro() {
    setScriptIndex(DAY3_TEXT.intro.length - 1);
    setDay3IntroReady(true);
  }

  function triggerDay3Blackout() {
    playDay3Effect(DAY3_ASSETS.turnoff, 0.62);
    setPhase("blackout");
    setScriptIndex(0);
    setMessage("주 전력 상실.");
  }

  function skipDay3Dialogue() {
    if (phase === "introElevator") {
      skipDay3Intro();
      return;
    }
    if (phase === "tutorial") {
      setPhase("tutorialRepair");
      setScriptIndex(0);
      setMessage("수리 절차를 시작하십시오.");
      return;
    }
    if (phase === "adInfo") {
      setPhase("tutorialRepair");
      setScriptIndex(0);
      setMessage("수리 절차를 계속 진행하십시오.");
      return;
    }
    if (phase === "radioAttack") {
      triggerDay3Blackout();
      return;
      setPhase("blackout");
      setScriptIndex(0);
      setMessage("주 전력 상실.");
      return;
    }
    if (phase === "blackout") {
      setPhase("playing");
      setStageIndex(1);
      setScriptIndex(0);
      setMessage("수동 복구 절차를 계속 진행하십시오.");
      return;
    }
    if (phase === "ending") {
      setScriptIndex(DAY3_ENDING_SCRIPTED_SEQUENCE.length - 1);
      setEndingFading(true);
    }
  }

  function beginTutorialRepair() {
    setPhase("tutorialRepair");
    setScriptIndex(0);
  }

  function closeDay3Ad() {
    if (!ad || !adCanSkip) return;
    const nextPhase = ad.nextPhase;
    setAd(null);
    setAdCanSkip(false);
    setPhase(nextPhase);
    setMessage("광고 송출 종료. 조작 권한이 복구되었습니다.");
  }

  function skipToDay3Ending() {
    if (phase === "introElevator" || phase === "ending" || gameover) return;
    clearTimeout(returnAdTimerRef.current);
    clearTimeout(endingTimerRef.current);
    stopCloseLoop();
    stopDay3Audio(repairAudioRef.current);
    stopDay3Audio(adAudioRef.current);
    stopDay3Audio(panicAudioRef.current);
    repairAudioRef.current = null;
    adAudioRef.current = null;
    panicAudioRef.current = null;
    setAd(null);
    setAdCanSkip(false);
    setIsRepairing(false);
    setIsFlashlightHeld(false);
    setFlashPulse(null);
    setCompletedStages(Array(8).fill(true));
    setStageIndex(7);
    setStageProgress(100);
    setPhase("ending");
    setScriptIndex(0);
    setEndingStarted(true);
    setEndingFading(false);
    setEndingComplete(false);
    setEndingImageIndex(0);
    onCompleteDay?.();
  }

  function completeDay3RepairsForTest() {
    if (phase === "introElevator" || phase === "clearBridge" || phase === "ending" || gameover || finishingRef.current) return;
    clearTimeout(returnAdTimerRef.current);
    clearTimeout(endingTimerRef.current);
    stopCloseLoop();
    stopDay3Audio(repairAudioRef.current);
    stopDay3Audio(adAudioRef.current);
    stopDay3Audio(panicAudioRef.current);
    repairAudioRef.current = null;
    adAudioRef.current = null;
    panicAudioRef.current = null;
    setAd(null);
    setAdCanSkip(false);
    setIsRepairing(false);
    setIsFlashlightHeld(false);
    setFlashPulse(null);
    setCompletedStages([true, true, true, true, true, true, true, false]);
    setStageIndex(7);
    setStageProgress(100);
    setPhase("playing");
    setMessage("8단계 수리 완료 확인 중...");
    setTimeout(() => {
      setCompletedStages(Array(8).fill(true));
      setStageProgress(0);
      setPhase("clearBridge");
      setScriptIndex(0);
      onCompleteDay?.();
    }, 900);
  }

  function startDay3EndingFromBridge() {
    setPhase("ending");
    setScriptIndex(0);
    setEndingStarted(true);
    setEndingFading(false);
    setEndingComplete(false);
    setEndingImageIndex(0);
  }

  function skipDay3Ending() {
    if (phase !== "ending") return;
    clearTimeout(endingTimerRef.current);
    setScriptIndex(DAY3_ENDING_SCRIPTED_SEQUENCE.length - 1);
    setEndingFading(true);
    setTimeout(() => setEndingComplete(true), 900);
  }

  function tryRandomReturnAd(previousView, nextView) {
    if (phase !== "playing" || previousView === "center" || nextView !== "center" || ad || gameover) return;
    const candidates = [1, 2, 3].filter((index) => !adShownRef.current.has(index));
    if (!candidates.length) return;

    const ramp = clamp((Date.now() - lastAdAtRef.current) / DAY3_BALANCE.adReturnRampMs, 0, 1);
    const adChance = DAY3_BALANCE.adReturnChanceMin + (DAY3_BALANCE.adReturnChanceMax - DAY3_BALANCE.adReturnChanceMin) * ramp;
    if (Math.random() < adChance) {
      startAd(randomItem(candidates), "playing");
    }
  }

  function moveView(nextView) {
    if (controlsLocked) return;
    const previousView = view;
    if (nextView !== "center") setIsRepairing(false);
    setView(nextView);
    clearTimeout(returnAdTimerRef.current);
    if (previousView !== "center" && nextView === "center") {
      returnAdTimerRef.current = setTimeout(() => {
        tryRandomReturnAd(previousView, nextView);
        returnAdTimerRef.current = null;
      }, DAY3_BALANCE.viewTransitionMs);
    }
  }

  function toggleRepair() {
    if (!canRepair) {
      setIsRepairing(false);
      return;
    }
    setIsRepairing((value) => !value);
  }

  function startFlashlight() {
    if (!canFlashlight) {
      if (phase === "playing" && view === "center") setMessage("손전등은 좌우 복도에서만 사용할 수 있습니다.");
      return;
    }
    if (isFlashlightHeld) return;
    playDay3Effect(DAY3_ASSETS.light, DAY3_AUDIO_VOLUME.light);
    setIsFlashlightHeld(true);
    setFlashPulse(view);
  }

  function stopFlashlight() {
    if (!isFlashlightHeld) return;
    playDay3Effect(DAY3_ASSETS.light, DAY3_AUDIO_VOLUME.light * 0.72);
    setIsFlashlightHeld(false);
    setFlashPulse(null);
  }

  function toggleFlashlight() {
    if (isFlashlightHeld) {
      stopFlashlight();
      return;
    }
    startFlashlight();
  }

  function useFlashlight() {
    if (!canFlashlight) {
      if (phase === "playing" && view === "center") setMessage("손전등은 좌우 복도에서만 사용할 수 있습니다.");
      return;
    }
    const side = view;
    setFlashlightStability((value) => clamp(value - DAY3_BALANCE.flashlightCost, 0, 100));
    setFlashPulse(side);
    setTimeout(() => setFlashPulse(null), 260);

    setMonsters((current) => {
      const level = current[side];
      if (level >= 2) {
        setMessage(side === "left" ? "젖은 발소리가 멀어진다." : "금속 긁힘이 복도 끝으로 물러난다.");
        setAttackTimers((timers) => ({ ...timers, [side]: null }));
        return { ...current, [side]: level >= 4 ? 1 : 0 };
      }
      setMessage("빛이 빈 복도에 흩어진다.");
      return current;
    });
  }

  function triggerGameover(kind) {
    setIsRepairing(false);
    setIsFlashlightHeld(false);
    stopCloseLoop();
    stopDay3Audio(repairAudioRef.current);
    stopDay3Audio(bgmRef.current);
    stopDay3Audio(adAudioRef.current);
    stopDay3Audio(panicAudioRef.current);
    repairAudioRef.current = null;
    bgmRef.current = null;
    adAudioRef.current = null;
    panicAudioRef.current = null;
    setGameover(kind);
    setPhase("gameover");
    setJumpIndex(0);
    jumpAudioRef.current = playDay3Effect(DAY3_ASSETS.jump, DAY3_AUDIO_VOLUME.jump);
  }

  function handleMouseMove(event) {
    if (controlsLocked) return;
    const ratio = event.clientX / window.innerWidth;
    if (ratio < 0.18) moveView("left");
    else if (ratio > 0.82) moveView("right");
    else if (ratio > 0.38 && ratio < 0.62) moveView("center");
  }

  function isSceneFlashlightTarget(event) {
    if (event.target.closest("button, .day3-panel, .day3-ad, .day3-left-hud, .day3-right-hud, .day3-message")) return;
    return view === "left" || view === "right";
  }

  function handleScenePointerDown(event) {
    if (!isSceneFlashlightTarget(event)) return;
    startFlashlight();
  }

  function handleScenePointerUp(event) {
    if (!isFlashlightHeld) return;
    stopFlashlight();
  }

  useEffect(() => {
    if (phase !== "introElevator") return undefined;
    ensureDay3ElevatorAudio();
    evOnRef.current.currentTime = 0;
    evRideRef.current.currentTime = 0;
    evOnRef.current.play().catch(() => {});
    evRideRef.current.play().catch(() => {});

    return () => {
      stopDay3Audio(evOnRef.current);
      stopDay3Audio(evRideRef.current);
      stopDay3Audio(evOffRef.current);
    };
  }, [resetSeed]);

  useEffect(() => {
    if (!day3IntroReady) return;
    ensureDay3ElevatorAudio();
    evRideRef.current?.pause();
    evOffRef.current.currentTime = 0;
    evOffRef.current.play().catch(() => {});
  }, [day3IntroReady]);

  useEffect(() => {
    const shouldPlay = !["introElevator", "clearBridge", "ending", "gameover"].includes(phase) && !gameover;
    if (shouldPlay && !bgmRef.current) {
      const audio = new Audio(DAY3_ASSETS.bgm);
      audio.loop = true;
      audio.volume = DAY3_AUDIO_VOLUME.bgm;
      bgmRef.current = audio;
      audio.play().catch(() => {});
    }
    if (!shouldPlay && bgmRef.current) {
      stopDay3Audio(bgmRef.current);
      bgmRef.current = null;
    }
    return () => {
      stopDay3Audio(bgmRef.current);
      bgmRef.current = null;
    };
  }, [phase, gameover]);

  useEffect(() => {
    return () => {
      [bgmRef.current, repairAudioRef.current, closeLoopRef.current, adAudioRef.current, jumpAudioRef.current, evOnRef.current, evRideRef.current, evOffRef.current].forEach(stopDay3Audio);
    };
  }, []);

  useEffect(() => {
    const shouldRepair = isRepairing && canRepair && !ad && !gameover;
    if (shouldRepair && !repairAudioRef.current) {
      const audio = new Audio(DAY3_ASSETS.repairLoop);
      audio.loop = true;
      audio.volume = DAY3_AUDIO_VOLUME.repair;
      repairAudioRef.current = audio;
      audio.play().catch(() => {});
    }
    if (!shouldRepair && repairAudioRef.current) {
      stopDay3Audio(repairAudioRef.current);
      repairAudioRef.current = null;
    }
    return () => {
      stopDay3Audio(repairAudioRef.current);
      repairAudioRef.current = null;
    };
  }, [ad, canRepair, gameover, isRepairing]);

  useEffect(() => {
    if (isRepairing && !canRepair) setIsRepairing(false);
  }, [canRepair, isRepairing]);

  useEffect(() => {
    if (isFlashlightHeld && !canFlashlight) setIsFlashlightHeld(false);
  }, [canFlashlight, isFlashlightHeld]);

  useEffect(() => {
    syncCloseLoop();
    return () => stopCloseLoop();
  }, [gameover, isFlashlightHeld, monsters, phase, view]);

  useEffect(() => {
    if (!ad) {
      stopDay3Audio(adAudioRef.current);
      adAudioRef.current = null;
    }
  }, [ad]);

  useEffect(() => {
    const shouldPulse = phase === "playing" && !gameover && contamination > 18;
    if (!shouldPulse) {
      stopDay3Audio(panicAudioRef.current);
      panicAudioRef.current = null;
      return undefined;
    }

    if (!panicAudioRef.current) {
      const audio = new Audio(DAY3_ASSETS.panic);
      audio.loop = true;
      audio.volume = 0;
      panicAudioRef.current = audio;
      audio.play().catch(() => {});
    }

    const intensity = clamp((contamination - 18) / 72, 0, 1);
    panicAudioRef.current.volume = intensity * DAY3_AUDIO_VOLUME.panicMax;
    panicAudioRef.current.playbackRate = 0.9 + intensity * 0.22;

    return undefined;
  }, [contamination, gameover, phase]);

  useEffect(() => {
    if (!ad) {
      setAdCanSkip(false);
      stopDay3Audio(adAudioRef.current);
      adAudioRef.current = null;
      return undefined;
    }

    stopDay3Audio(adAudioRef.current);
    adAudioRef.current = playDay3Effect(DAY3_ASSETS.ad, DAY3_AUDIO_VOLUME.ad);
    setAdCanSkip(false);
    const timer = setTimeout(() => setAdCanSkip(true), 5000);
    return () => {
      clearTimeout(timer);
      stopDay3Audio(adAudioRef.current);
      adAudioRef.current = null;
    };
  }, [ad]);

  useEffect(() => {
    if (jumpIndex === null) return undefined;
    if (jumpIndex >= DAY3_JUMP_FRAMES.length - 1) {
      const timer = setTimeout(() => setJumpIndex(null), 520);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setJumpIndex((index) => index + 1), 95);
    return () => clearTimeout(timer);
  }, [jumpIndex]);

  useEffect(() => {
    if (!scriptLines.length || phase === "ending") return undefined;
    const timer = setInterval(() => {
      setScriptIndex((index) => {
        if (index < scriptLines.length - 1) return index + 1;
        if (phase === "tutorial" || phase === "adInfo") {
          clearInterval(timer);
          setTimeout(() => {
            setPhase("tutorialRepair");
            setScriptIndex(0);
            setMessage(phase === "tutorial" ? "수리 절차를 시작하십시오." : "수리 절차를 계속 진행하십시오.");
          }, 500);
          return index;
        }
        if (phase === "radioAttack") {
          clearInterval(timer);
          return index;
        }
        if (phase === "radioAttack") {
          clearInterval(timer);
          setTimeout(() => {
            triggerDay3Blackout();
            return;
            setPhase("blackout");
            setScriptIndex(0);
            setMessage("주 전력 상실.");
          }, 3000);
        }
        if (phase === "blackout") {
          clearInterval(timer);
          setTimeout(() => {
            setPhase("playing");
            setStageIndex(1);
            setScriptIndex(0);
            setMessage("수동 복구 절차를 계속 진행하십시오.");
          }, 900);
        }
        return index;
      });
    }, 2600);
    return () => clearInterval(timer);
  }, [phase, scriptLines.length]);

  useEffect(() => {
    if (phase !== "ending" || endingComplete) return undefined;

    if (scriptIndex >= DAY3_ENDING_SCRIPTED_SEQUENCE.length - 1) {
      const fadeTimer = setTimeout(() => {
        setEndingFading(true);
        const completeTimer = setTimeout(() => setEndingComplete(true), 3000);
        endingTimerRef.current = completeTimer;
      }, 3000);
      endingTimerRef.current = fadeTimer;
      return () => clearTimeout(fadeTimer);
    }

    const currentLine = DAY3_ENDING_SCRIPTED_SEQUENCE[scriptIndex];
    const delay = currentLine ? 3300 : 1800;
    const timer = setTimeout(() => {
      setScriptIndex((index) => Math.min(index + 1, DAY3_ENDING_SCRIPTED_SEQUENCE.length - 1));
    }, delay);
    endingTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [endingComplete, phase, scriptIndex]);

  useEffect(() => {
    if (phase !== "ending") {
      setEndingImageIndex(0);
      return undefined;
    }

    const nextImageIndex = scriptIndex < DAY3_ENDING_ONE_END
      ? 0
      : clamp(1 + scriptIndex - DAY3_ENDING_ONE_END, 1, DAY3_ENDING_IMAGES.length - 1);
    if (nextImageIndex === endingImageIndex) return undefined;

    const timer = setTimeout(() => {
      setEndingImageIndex(nextImageIndex);
    }, 1250);
    return () => clearTimeout(timer);
  }, [endingImageIndex, phase, scriptIndex]);

  useEffect(() => {
    if (phase !== "ending") return undefined;
    ensureDay3ElevatorAudio();
    evOnRef.current.currentTime = 0;
    evRideRef.current.currentTime = 0;
    evOnRef.current.play().catch(() => {});
    evRideRef.current.play().catch(() => {});
    return () => {
      evRideRef.current?.pause();
    };
  }, [phase]);

  useEffect(() => {
    if (!endingComplete) return;
    evRideRef.current?.pause();
    if (!evOffRef.current) return;
    evOffRef.current.currentTime = 0;
    evOffRef.current.play().catch(() => {});
  }, [endingComplete]);

  useEffect(() => {
    if (phase !== "introElevator" || day3IntroReady || scriptIndex < DAY3_TEXT.intro.length - 1) return undefined;
    const timer = setTimeout(() => setDay3IntroReady(true), 2600);
    return () => clearTimeout(timer);
  }, [day3IntroReady, phase, scriptIndex]);

  useEffect(() => {
    if (phase !== "radioAttack" || scriptIndex < DAY3_TEXT.radioAttack.length - 1) return undefined;
    const timer = setTimeout(() => {
      triggerDay3Blackout();
    }, 5600);
    return () => clearTimeout(timer);
  }, [phase, scriptIndex]);

  useEffect(() => {
    if (!ad) return undefined;
    if (ad.image) {
      if (ad.image) return undefined;
      /*
      const timer = setTimeout(() => {
        setAd(null);
        setPhase(ad.nextPhase);
        setMessage("광고 송출 종료. 조작 권한이 복구되었습니다.");
      }, 6500);
      return () => clearTimeout(timer);
      */
    }
    const timer = setInterval(() => {
      setAd((current) => {
        if (!current) return current;
        const lines = DAY3_TEXT.ads[current.index] ?? [];
        if (current.line < lines.length - 1) return { ...current, line: current.line + 1 };
        /*
        setTimeout(() => {
          setAd(null);
          setPhase(current.nextPhase);
          setMessage("광고 송출 종료. 조작 권한이 복구되었습니다.");
        }, 120);
        */
        return current;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [ad]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restartDay3();
        return;
      }
      if (key === "p") {
        event.preventDefault();
        skipDay3Dialogue();
        return;
      }
      if (key === "i") {
        event.preventDefault();
        if (phase === "ending") skipDay3Ending();
        else if (!event.repeat) completeDay3RepairsForTest();
        return;
      }
      if (key === "o") {
        event.preventDefault();
        if (!event.repeat) setHudVisible((visible) => !visible);
        return;
      }
      if (phase === "introElevator" && key === "enter") {
        event.preventDefault();
        enterFacility();
        return;
      }
      if (controlsLocked) return;
      if (key === "a") {
        event.preventDefault();
        moveView("left");
      } else if (key === "d") {
        event.preventDefault();
        moveView("right");
      } else if (key === "s" || key === "w") {
        event.preventDefault();
        moveView("center");
      } else if (key === "f") {
        event.preventDefault();
        startFlashlight();
      } else if (key === "e") {
        event.preventDefault();
        if (!event.repeat) toggleRepair();
      }
    };
    const handleKeyUp = (event) => {
      if (event.key.toLowerCase() === "f") stopFlashlight();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [canRepair, controlsLocked, phase, view, flashlightStability, canFlashlight, isFlashlightHeld]);

  useEffect(() => {
    if (gameover || phase === "introElevator" || phase === "ending") return undefined;
    const timer = setInterval(() => {
      const dt = 0.2;

      setFlashlightStability((value) => {
        const next = isFlashlightHeld
          ? value - DAY3_BALANCE.flashlightDrainPerSecond * dt
          : value + DAY3_BALANCE.flashlightRecoverPerSecond * dt;
        if (next <= 0) setIsFlashlightHeld(false);
        return clamp(next, 0, 100);
      });

      if (phase === "playing") {
        const closeThreat = monsters.left >= 3 || monsters.right >= 3 ? 0.8 : 0;
        const base = isRepairing ? DAY3_BALANCE.repairContaminationChange : isFlashlightHeld ? 0 : view === "center" ? 0.4 : 1.2;
        setContamination((value) => {
          const next = clamp(value + (base + closeThreat + (stageIndex === 7 ? 0.35 : 0)) * dt, 0, 100);
          if (next >= 100) triggerGameover("pollution");
          return next;
        });

        monsterClockRef.current += dt;
        const stepTime = Math.max(1.7, DAY3_BALANCE.monsterStepSeconds - (isRepairing ? DAY3_BALANCE.repairMonsterBonus : 0) - stageIndex * 0.22);
        if (monsterClockRef.current >= stepTime) {
          monsterClockRef.current = 0;
          moveMonsterRandomly();
          /*
          const side = Math.random() < 0.5 ? "left" : "right";
          setMonsters((current) => {
            const next = { ...current, [side]: clamp(current[side] + 1, 0, 4) };
            setMessage(side === "left" ? "왼쪽 어둠 속에서 물이 눌리는 소리가 들린다." : "오른쪽 벽 너머로 금속이 긁히는 소리가 들린다.");
            return next;
          });
          playMonsterMove(side, clamp(monsters[side] + 1, 0, 4), false);
          */
        }

        if (isFlashlightHeld && (view === "left" || view === "right")) {
          flashlightRepelClockRef.current += dt;
          if (flashlightRepelClockRef.current >= DAY3_BALANCE.flashlightRepelSeconds) {
            flashlightRepelClockRef.current = 0;
            repelMonsterWithFlashlight(view);
            /*
            const side = view;
            setMonsters((current) => {
              if (current[side] < 2) return current;
              const nextLevel = clamp(current[side] - 1, 0, 4);
              playMonsterMove(side, nextLevel, true);
              setAttackTimers((timers) => ({ ...timers, [side]: null }));
              return { ...current, [side]: nextLevel };
            });
            */
          }
        } else {
          flashlightRepelClockRef.current = 0;
        }

        setAttackTimers((timers) => {
          const next = { ...timers };
          ["left", "right"].forEach((side) => {
            if (monsters[side] >= 4) {
              if (next[side] === null) next[side] = DAY3_BALANCE.attackWaitSeconds;
              const pressured = isRepairing || view !== side;
              if (!ad && next[side] > 0) {
                next[side] -= dt * (pressured ? DAY3_BALANCE.attackPressureMultiplier : 1);
              }
              if (!ad && next[side] <= 0) {
                next[side] = 0;
                attackRollClockRef.current[side] += dt;
                if (attackRollClockRef.current[side] >= DAY3_BALANCE.attackRollSeconds) {
                  attackRollClockRef.current[side] = 0;
                  if (Math.random() < DAY3_BALANCE.attackRollChance) triggerGameover("monster");
                }
              }
            } else {
              next[side] = null;
              attackRollClockRef.current[side] = 0;
            }
          });
          return next;
        });
      }

      if (isRepairing && canRepair) {
        repairIdleRef.current = 0;
        const speed = stageIndex === 7 ? DAY3_BALANCE.finalRepairPerSecond : DAY3_BALANCE.repairPerSecond;
        setStageProgress((value) => {
          const next = clamp(value + speed * dt, 0, 100);
          if (phase === "tutorialRepair" && !adShownRef.current.has(0) && next >= 30) {
            startAd(0, "adInfo");
            return 30;
          }
          if (next >= 100) finishCurrentStage();
          return next;
        });
      } else if ((phase === "tutorialRepair" || phase === "playing") && !ad) {
        repairIdleRef.current += dt;
        const grace = stageIndex === 7 ? DAY3_BALANCE.finalRepairGrace : DAY3_BALANCE.repairGrace;
        if (repairIdleRef.current > grace) {
          const decay = stageIndex === 7 ? DAY3_BALANCE.finalDecayPerSecond : DAY3_BALANCE.decayPerSecond;
          setStageProgress((value) => clamp(value - decay * dt, 0, 100));
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [phase, isRepairing, isFlashlightHeld, canRepair, stageIndex, view, monsters, monsterPosition, ad, gameover]);

  const activeScriptText = scriptLines[scriptIndex] ?? message;
  const adText = ad ? DAY3_TEXT.ads[ad.index]?.[ad.line] : null;
  const contaminationLabel = contamination < 25 ? "안정" : contamination < 50 ? "불안정" : contamination < 75 ? "침식 진행" : "붕괴 임박";
  const leftCue = monsters.left === 0 ? "정적" : monsters.left < 3 ? "젖은 발소리" : "질척임 근접";
  const rightCue = monsters.right === 0 ? "정적" : monsters.right < 3 ? "금속 긁힘" : "철판 울림 근접";

  const activeMonsterSide = getDay3MonsterSide(monsterPosition);
  const activeKillTimer = activeMonsterSide === "left" || activeMonsterSide === "right" ? attackTimers[activeMonsterSide] : null;
  const killTimerLabel = activeKillTimer === null
    ? "대기 없음"
    : activeKillTimer > 0
      ? `${activeMonsterSide.toUpperCase()} ${activeKillTimer.toFixed(1)}s`
      : `${activeMonsterSide.toUpperCase()} 공격 판정 중`;
  const monsterPositionLabel = `${monsterPosition.toUpperCase()} / KILL ${killTimerLabel}`;
  const corruptionLevel = clamp(contamination / 95, 0, 1);
  const showDay3Message = phase !== "playing" && phase !== "ending" && !ad;
  const endingText = DAY3_ENDING_SCRIPTED_SEQUENCE[scriptIndex] ?? "";
  const endingImage = DAY3_ENDING_IMAGES[endingImageIndex] ?? ELEVATOR_IMAGE;

  return (
    <div
      key={resetSeed}
      className={`day3-game${darkMode ? " is-dark" : ""}${isFlashlightHeld ? " has-flashlight" : ""}${!hudVisible ? " is-hud-hidden" : ""}${day3GameFadingIn ? " is-fading-in" : ""}`}
      style={{
        "--day3-corruption": corruptionLevel,
        "--day3-corruption-edge": `${18 + corruptionLevel * 42}%`,
      }}
      onMouseMove={handleMouseMove}
      onPointerDown={handleScenePointerDown}
      onPointerUp={handleScenePointerUp}
      onPointerCancel={handleScenePointerUp}
      onPointerLeave={handleScenePointerUp}
    >
      {phase !== "introElevator" && (
        <div className={`day3-panorama-layer view-${view}`}>
          <img className={`day3-panorama view-${view}`} src={DAY3_ASSETS.mainImage} alt="" />
          <div className="day3-industrial-fallback" />
          <section className={`day3-panel${view !== "center" ? " is-hidden" : ""}`}>
            <div className="day3-panel-screen">
              <span>현재 단계 {stageIndex + 1} / 8</span>
              <h1>{DAY3_STAGE_NAMES[stageIndex]}</h1>
              <div className="day3-progress">
                <i style={{ width: `${stageProgress}%` }} />
              </div>
              <em>{Math.round(stageProgress)}%</em>
              <button
                type="button"
                disabled={!canRepair}
                onClick={toggleRepair}
              >
                {isRepairing ? "E / 수리 정지" : "E / 수리 시작"}
              </button>
            </div>
          </section>
        </div>
      )}

      {phase !== "introElevator" && (
        <>
          <div className="day3-light-flicker" />
          <div className="day3-dust" />
          <div className="day3-vignette" />
          <div className="day3-corruption" />
          {flashPulse && <div className={`day3-flash day3-flash-${flashPulse}${isFlashlightHeld ? " is-held" : ""}`} />}
        </>
      )}

      {phase === "introElevator" ? (
        <ElevatorIntro
          ready={day3IntroReady}
          progress={day3IntroReady ? 1 : scriptIndex / Math.max(1, DAY3_TEXT.intro.length - 1)}
          line={!day3IntroReady ? activeScriptText : ""}
          onEnter={enterFacility}
          onSkip={skipDay3Intro}
          exiting={day3IntroExiting}
        />
      ) : (
        <>
          <header className="day3-topbar">
            <span>제3격리벽 하부 정비구역</span>
            <span>{phase === "playing" ? "정전 / 수동 복구" : "정비 절차 대기"}</span>
          </header>

          <aside className="day3-left-hud">
            <strong>목표</strong>
            {DAY3_STAGE_NAMES.map((name, index) => (
              <span key={name} className={completedStages[index] ? "is-done" : index === stageIndex ? "is-active" : ""}>
                {completedStages[index] ? "✓" : String(index + 1).padStart(2, "0")} {name}
              </span>
            ))}
          </aside>

          <aside className="day3-right-hud">
            <strong>상태</strong>
            <span>정신오염도 {Math.round(contamination)} / 100</span>
            <span>{contaminationLabel}</span>
            <span>손전등 안정도 {Math.round(flashlightStability)}%</span>
            <span>DEV 괴물 위치: {monsterPositionLabel}</span>
            <span>좌측: {leftCue}</span>
            <span>우측: {rightCue}</span>
          </aside>

          <nav className="day3-nav">
            <button type="button" onClick={() => moveView("left")} disabled={controlsLocked}>A 좌측</button>
            <button type="button" onClick={() => moveView("center")} disabled={controlsLocked}>W/S 중앙</button>
            <button type="button" onClick={() => moveView("right")} disabled={controlsLocked}>D 우측</button>
            <button
              type="button"
              onClick={toggleFlashlight}
              disabled={!canFlashlight}
            >
              F 손전등
            </button>
          </nav>

          {phase === "tutorial" && scriptIndex >= DAY3_TEXT.tutorial.length - 1 && (
            <button type="button" className="day3-start-repair" onClick={beginTutorialRepair} hidden>1단계 수리 시작</button>
          )}

          {showDay3Message && <div className="day3-message">{adText ?? activeScriptText ?? message}</div>}
        </>
      )}

      {ad && (
        <div className={`day3-ad${ad.image ? " has-image" : ""}`}>
          {ad.image ? (
            <img src={ad.image} alt="" />
          ) : (
            <>
              <span>TTF INTERNAL BROADCAST</span>
              <p>{adText}</p>
            </>
          )}
          <button type="button" className="day3-ad-skip" onClick={closeDay3Ad} disabled={!adCanSkip}>
            {adCanSkip ? "SKIP" : "WAIT"}
          </button>
        </div>
      )}

      {phase === "clearBridge" && (
        <DayClearBridge day={3} lines={DAY_CLEAR_LINES[3]} onDone={startDay3EndingFromBridge} />
      )}

      {phase === "ending" && (
        <section className={`day3-ending${endingStarted ? " is-riding" : ""}${endingFading ? " is-fading-out" : ""}${endingComplete ? " is-complete" : ""}`}>
          <img src={endingImage} alt="" className="elevator-image is-active day3-ending-image" draggable="false" />
          <div className="elevator-vibration day3-ending-vibration" />
          <div className="elevator-shadow-pass" />
          <div className="day3-ending-lines" />
          {!endingComplete && (
            <div className={`intro-subtitle day3-ending-caption${!endingText ? " is-silent" : ""}`}>
              <span>시설 안내 음성</span>
              <p>{endingText || " "}</p>
            </div>
          )}
          {!endingComplete && (
            <button type="button" className="intro-skip-button day3-ending-skip" onClick={skipDay3Ending}>
              I SKIP
            </button>
          )}
          {endingComplete && (
            <div className="day3-ending-restart">
              <span className="day3-credits-title">CREDITS</span>
              <strong>복귀 절차 종료</strong>
              <button type="button" onClick={restartDay3}>다시 시작</button>
            </div>
          )}
          <button type="button" onClick={onReturnToMenu}>일차 선택</button>
        </section>
      )}

      {jumpIndex !== null && DAY3_JUMP_FRAMES[jumpIndex] && (
        <div className="day3-jump">
          <img src={DAY3_JUMP_FRAMES[jumpIndex]} alt="" />
        </div>
      )}

      {gameover && (jumpIndex === null || jumpIndex >= DAY3_JUMP_FRAMES.length - 1) && (
        <section className="day3-gameover">
          <strong>사망</strong>
          <p>{gameover === "pollution" ? "오염 한계 초과. 정비 담당자 의식 응답 없음." : "접근음이 멈췄다. 바로 옆에서 숨소리가 들린다."}</p>
          <div className="day3-gameover-actions">
            <button type="button" onClick={restartDay3}>다시 플레이</button>
            <button type="button" onClick={onReturnToMenu}>첫 화면으로</button>
          </div>
        </section>
      )}

      {false && gameover && (jumpIndex === null || jumpIndex >= DAY3_JUMP_FRAMES.length - 1) && (
        <section className="day3-gameover">
          <strong>{gameover === "pollution" ? "오염 한계 초과." : "신호 손실."}</strong>
          <p>{gameover === "pollution" ? "정비 담당자 의식 응답 없음. 복구 작업을 계속합니다." : "접근음이 멈췄다. 바로 옆에서 숨소리가 들린다."}</p>
          <button type="button" onClick={onReturnToMenu}>일차 선택</button>
        </section>
      )}
    </div>
  );
}

function DaySelect({ unlockedDay, onSelect }) {
  return (
    <main className="day-select">
      <section>
        <span>ANALOG OBSERVATION</span>
        <h1>근무 일차 선택</h1>
        <div className="day-buttons">
          {Array.from({ length: DAY_COUNT }, (_, index) => {
            const day = index + 1;
            const implemented = day <= IMPLEMENTED_DAYS;
            const unlocked = implemented && day <= unlockedDay;
            return (
              <button key={day} type="button" disabled={!unlocked} onClick={() => onSelect(day)}>
                <strong>{day}일차</strong>
                <small>{!implemented ? "업데이트 예정" : unlocked ? "진입 가능" : "잠김"}</small>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function App() {
  const [selectedDay, setSelectedDay] = useState(null);
  const [unlockedDay, setUnlockedDay] = useState(() => {
    const saved = Number(localStorage.getItem(SAVE_KEY));
    return Math.max(DEFAULT_UNLOCKED_DAY, Number.isFinite(saved) ? saved : 1);
  });

  function completeDay(day) {
    const next = Math.min(IMPLEMENTED_DAYS, day + 1);
    const updated = Math.max(unlockedDay, next);
    setUnlockedDay(updated);
    localStorage.setItem(SAVE_KEY, String(updated));
  }

  if (selectedDay === 1) {
    return <DayOneGame onReturnToMenu={() => setSelectedDay(null)} onCompleteDay={() => completeDay(1)} />;
  }

  if (selectedDay === 2) {
    return <DayTwoGame onReturnToMenu={() => setSelectedDay(null)} onCompleteDay={() => completeDay(2)} />;
  }

  if (selectedDay === 3) {
    return <DayThreeGame onReturnToMenu={() => setSelectedDay(null)} onCompleteDay={() => completeDay(3)} />;
  }

  return <DaySelect unlockedDay={unlockedDay} onSelect={setSelectedDay} />;
}

createRoot(document.getElementById("root")).render(<App />);
