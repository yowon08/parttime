import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { INTRO_LINES } from "./introLines.js";
import { DAY2_INTRO_LINES } from "./day2IntroLines.js";
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
};
const BGM_VOLUME = 0.28;
const VHS_VOLUME = 0.24;
const SIGNAL_NOISE_VOLUME = 0.08;
const CLEAR_TIME_SECONDS = 480;
const CLEAR_TIME_MINUTES = 360;
const DAY_ONE_REPORT_TIME_BONUS_SECONDS = 20;
const LINGER_AMBUSH_DELAY = 8000;
const REBOOT_CHECK_INTERVAL = 8000;
const INTRO_LINE_DURATION = 3000;
const INTRO_DIALOGUE_DELAY = 3000;
const INTRO_SKIP_ARRIVAL_DELAY = 2000;
const REAR_PANEL_CLOSE_DURATION = 520;
const G_RUN_CLEAR_DELAY = 3000;
const G_RUN_FINAL_GRACE = 450;
const G_RUN_FRAME_DURATION = 145;
const INTRO_PAUSE_TOKEN = "dlay";
const ELEVATOR_IMAGE = "/ev/ev.png";
const INTRO_VOICE_FILES = Array.from({ length: 17 }, (_, index) => `/voice/${index + 1}.mp3`);
const AMBIENT_SFX_FILES = Object.values(
  import.meta.glob("/public/sfx/*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" })
);
const DAY_COUNT = 2;
const IMPLEMENTED_DAYS = 2;
const DEFAULT_UNLOCKED_DAY = 2;
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
  const introAudioContextRef = useRef(null);
  const introVoiceNodesRef = useRef(null);
  const ambientSfxTimer = useRef(null);
  const ambientSfxAudio = useRef(null);
  const lastAmbientSfx = useRef(null);
  const ambushTimer = useRef(null);
  const lingerTimer = useRef(null);
  const escalationTimer = useRef(null);
  const gRunTimer = useRef(null);
  const gRunFailTimer = useRef(null);
  const gRunClearTimer = useRef(null);
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
  const fadeTimers = useRef(new Map());
  const ignoreClickUntil = useRef(0);
  const lastControlSoundAt = useRef(0);
  const cameraStressRef = useRef(0);
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
    onCompleteDay?.();
    setCctvOpen(false);
    setTurnedBack(false);
    setMonitorMotion(null);
    setOverlay(null);
    fadeAudio(vhsRef.current, 0, 500, { pauseAfter: true });
    fadeAudio(bgmRef.current, BGM_VOLUME, 900, { playBefore: true });
  }, [gameStarted, seconds, dead, cleared]);

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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameStarted || overlay || dead || cleared || monitorMotion) return;

      const key = event.key.toLowerCase();

      if (event.repeat && !(turnedBack && !rearPanelClosing && (key === "a" || key === "d"))) return;

      if (key === " " || key === "spacebar") {
        event.preventDefault();
        primeAudio();
        if (cctvOpen && !turnedBack) {
          lowerMonitor();
        } else if (!cctvOpen && !turnedBack) {
          raiseMonitor();
        }
        return;
      }

      if (key === "enter") {
        event.preventDefault();
        primeAudio();
        if (turnedBack && !rearPanelClosing) {
          tryReboot();
        } else {
          reportProblem();
        }
        return;
      }

      if (key === "shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
        event.preventDefault();
        if (!cctvOpen && !turnedBack) openRearPanel();
        else if (turnedBack && !rearPanelClosing) closeRearPanel();
        return;
      }

      if (key === "a") {
        event.preventDefault();
        if (turnedBack && !rearPanelClosing) {
          adjustFrequency(-1);
        } else {
          changeCam(-1);
        }
        return;
      }

      if (key === "d") {
        event.preventDefault();
        if (turnedBack && !rearPanelClosing) {
          adjustFrequency(1);
        } else {
          changeCam(1);
        }
        return;
      }

      if (key === "l" || key === "ㅣ" || event.code === "KeyL") {
        event.preventDefault();
        triggerCurrentCameraSpecialEvent();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [
    gameStarted,
    overlay,
    dead,
    cleared,
    monitorMotion,
    cctvOpen,
    turnedBack,
    rearPanelClosing,
    frequency,
    rebootRequired,
    signalFailure,
    currentHasAnomaly,
    camIndex,
    currentCam,
    anomalyCam,
    anomalyVariant,
  ]);

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

  function fadeAudio(audio, targetVolume, duration = 500, options = {}) {
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

  function disconnectIntroVoiceEffect() {
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
  }

  function applyIntroVoiceEffect(audio) {
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
        <div className="clear-screen">
          <strong>관측 완료</strong>
          <span>06:00 AM</span>
          <button type="button" onClick={onReturnToMenu}>일차 선택</button>
        </div>
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
          onCompleteDay?.();
        }, 2100);
      }, (closingPanel ? REAR_PANEL_CLOSE_DURATION : 0) + 2000);
    }
  }, [audioStep, phase, onCompleteDay, taskPanelOpen, reportPanelOpen]);

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
    advanceTaskProgress(index, 10);
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
  }, [gameStarted, dead, cleared, phase, taskPanelOpen, taskPanelClosing]);

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
            <div className="clear-screen">
              <strong>2일차 완료</strong>
              <button type="button" onClick={onReturnToMenu}>일차 선택</button>
            </div>
          )}
        </main>
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

  return <DaySelect unlockedDay={unlockedDay} onSelect={setSelectedDay} />;
}

createRoot(document.getElementById("root")).render(<App />);
