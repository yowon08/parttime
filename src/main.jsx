import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { INTRO_LINES } from "./introLines.js";
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
  noise: "/songs/noise.mp3",
};
const BGM_VOLUME = 0.28;
const VHS_VOLUME = 0.24;
const SIGNAL_NOISE_VOLUME = 0.08;
const CLEAR_TIME_SECONDS = 480;
const CLEAR_TIME_MINUTES = 360;
const LINGER_AMBUSH_DELAY = 8000;
const REBOOT_CHECK_INTERVAL = 8000;
const INTRO_LINE_DURATION = 3000;
const INTRO_DIALOGUE_DELAY = 3000;
const INTRO_SKIP_ARRIVAL_DELAY = 2000;
const REAR_PANEL_CLOSE_DURATION = 520;
const INTRO_PAUSE_TOKEN = "dlay";
const ELEVATOR_IMAGE = "/ev/ev.png";
const INTRO_VOICE_FILES = Array.from({ length: 17 }, (_, index) => `/voice/${index + 1}.mp3`);
const AMBIENT_SFX_FILES = Object.values(
  import.meta.glob("/public/sfx/*.{mp3,wav,ogg}", { eager: true, query: "?url", import: "default" })
);
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
  C: 4,
  D: 2,
  E: 3,
  F: 3,
  G: 5,
  H: 2,
  I: 4,
  J: 3,
  L: 3,
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
];

const PRELOAD_IMAGES = [
  ...CCTV_FRAMES,
  ELEVATOR_IMAGE,
  ...CAMERAS.flatMap((camera) => [
    camera.image,
    ...camera.anomalies.flatMap((anomaly) => [anomaly.image, anomaly.escalationImage, ...(anomaly.escalationFrames ?? [])]),
  ]),
].filter(Boolean);

const REPORT_TEXTS = ["수습 중...", "현장 확인 중...", "격리반 호출 중...", "인지재해 차단 중...", "보고서 대조 중...", "프로토콜 적용 중..."];
const WARNING_TEXTS = ["문제 보고 실패.", "관측 누락 기록됨.", "비인가 현상 확산 중.", "프로토콜 지연 감지.", "관측자 오류율 상승."];
const DEATH_TEXTS = ["관측자 정신 오염 확인.", "자동 격리 절차 개시.", "관측 프로토콜 종료."];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
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

function runTests() {
  const tests = [
    ["time starts at midnight", getTimeText(0) === "12:00 AM"],
    ["time reaches 1 AM at 80 seconds", getTimeText(80) === "1:00 AM"],
    ["time reaches 6 AM at 480 seconds", getTimeText(CLEAR_TIME_SECONDS) === "6:00 AM"],
    ["camera wraps left", getNextCamIndex(0, -1) === CAMERAS.length - 1],
    ["camera wraps right", getNextCamIndex(CAMERAS.length - 1, 1) === 0],
    ["frequency diff 2 succeeds", isTuned(50, 52) === true],
    ["frequency diff 3 fails", isTuned(50, 53) === false],
    ["twelve cameras exist", CAMERAS.length === 12],
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

function CameraVisual({ camera, anomaly, warnings, staticBurst, shaking }) {
  const src = anomaly ? anomaly.image : camera.image;

  return (
    <div className={`camera-frame${shaking ? " is-jumpscare" : ""}`}>
      {src ? (
        <img
          src={src}
          alt=""
          className="camera-image"
          draggable="false"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
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

function App() {
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
  const noiseRef = useRef(null);
  const gameStageRef = useRef(null);
  const fadeTimers = useRef(new Map());
  const ignoreClickUntil = useRef(0);
  const lastControlSoundAt = useRef(0);
  const cameraStressRef = useRef(0);
  const tests = useMemo(() => runTests(), []);
  const currentCam = CAMERAS[camIndex];
  const currentHasAnomaly = anomalyCam === camIndex;
  const baseCurrentAnomaly = currentHasAnomaly ? currentCam.anomalies[anomalyVariant] : null;
  const currentAnomaly = baseCurrentAnomaly && escalationFrameIndex !== null && baseCurrentAnomaly.escalationFrames
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.escalationFrames[escalationFrameIndex] }
    : baseCurrentAnomaly && anomalyEscalated && baseCurrentAnomaly.escalationImage
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.escalationImage }
    : baseCurrentAnomaly;
  const jumpscareActive = currentHasAnomaly && escalationFrameIndex !== null;
  const blurAmount = warnings * 1.6;
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
      image.onload = completeOne;
      image.onerror = completeOne;
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
    cameraStressRef.current = cameraStress;
  }, [cameraStress]);

  useEffect(() => {
    if (!gameStarted || seconds < CLEAR_TIME_SECONDS || dead || cleared) return;
    clearTimeout(overlayTimer.current);
    setCleared(true);
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
          setAnomalyVariant(Math.floor(Math.random() * CAMERAS[nextCam].anomalies.length));
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
    if (!gameStarted || dead || cleared || anomalyCam === null || overlay || !showCctvHud || rebootRequired || signalFailure || anomalyAge < 13) return;
    failReport();
  }, [gameStarted, anomalyAge, anomalyCam, overlay, dead, cleared, showCctvHud, rebootRequired, signalFailure]);

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
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [gameStarted, overlay, dead, cleared, monitorMotion, cctvOpen, turnedBack, rearPanelClosing, frequency, rebootRequired, signalFailure, currentHasAnomaly]);

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
      setAnomalyVariant(Math.floor(Math.random() * CAMERAS[targetCamIndex].anomalies.length));
      setAnomalyAge(0);
      setAnomalyEscalated(false);
      setEscalationFrameIndex(null);
    }, delay);
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

    if (currentHasAnomaly) {
      showOverlay("report", randomItem(REPORT_TEXTS), 1200, () => {
        setAnomalyCam(null);
        setAnomalyVariant(null);
        setAnomalyAge(0);
        setAnomalyEscalated(false);
        setEscalationFrameIndex(null);
        setCompletedReports((count) => count + 1);
      });
    } else {
      showOverlay("warning", "오보고 기록됨.", 1100, () => {
        setWarnings((w) => w + 1);
      });
    }
  }

  function failReport() {
    showOverlay("warning", randomItem(WARNING_TEXTS), 1300, () => {
      setWarnings((w) => w + 1);
      setAnomalyCam(null);
      setAnomalyVariant(null);
      setAnomalyAge(0);
      setAnomalyEscalated(false);
      setEscalationFrameIndex(null);
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
      <audio ref={noiseRef} src={AUDIO.noise} loop preload="auto" />

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
          <button type="button" onClick={() => window.location.reload()}>다시 시작</button>
        </div>
      ) : monitorMotion ? (
        <MonitorFrame frame={monitorFrame} staticBurst={staticBurst} />
      ) : cctvOpen && !turnedBack ? (
        <main className={`screen cctv-screen noise${signalFailure ? " signal-failing" : ""}`} style={{ filter: `blur(${blurAmount}px)` }}>
          <div className="cam-label">
            <strong>{currentCam.id}</strong>
            <span>{currentCam.name}</span>
          </div>

          <CameraVisual camera={currentCam} anomaly={currentAnomaly} warnings={warnings} staticBurst={staticBurst} shaking={jumpscareActive} />

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
          <button type="button" onClick={() => window.location.reload()}>다시 시작</button>
        </div>
      )}

      <div className="test-badge">TEST {tests.passed}/{tests.total}</div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
