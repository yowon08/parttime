import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const CCTV_FRAMES = Array.from({ length: 12 }, (_, index) => `/cctv/frame_${String(index + 1).padStart(2, "0")}.png`);
const AUDIO = {
  bgm: "/songs/bgm.mp3",
  on: "/songs/on.mp3",
  vhs: "/songs/vhs.mp3",
};
const BGM_VOLUME = 0.28;
const VHS_VOLUME = 0.24;
const CLEAR_TIME_SECONDS = 240;

const CAMERA_FILE_COUNTS = {
  A: 4,
  B: 2,
  C: 3,
  D: 2,
  E: 3,
  F: 3,
  G: 2,
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
    forceAmbushDisabled: true,
    anomalies: [
      {
        image: "/cameras/Cameras/K-1.png",
        escalationImage: "/cameras/Cameras/K-2.png",
        text: "꺼져 있어야 할 채널에 영상 신호가 들어와 있다.",
      },
    ],
  },
  makeCamera("L", 12),
];

const REPORT_TEXTS = ["수습 중...", "현장 확인 중...", "격리반 호출 중...", "인지재해 차단 중...", "보고서 대조 중...", "프로토콜 적용 중..."];
const WARNING_TEXTS = ["문제 보고 실패.", "관측 누락 기록됨.", "비인가 현상 확산 중.", "프로토콜 지연 감지.", "관측자 오류율 상승."];
const DEATH_TEXTS = ["관측자 정신 오염 확인.", "자동 격리 절차 개시.", "관측 프로토콜 종료."];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getTimeText(seconds) {
  const totalMinutes = Math.floor(seconds);
  const hour = Math.min(4, Math.floor(totalMinutes / 60));
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
    ["time reaches 1 AM at 60 seconds", getTimeText(60) === "1:00 AM"],
    ["time reaches 4 AM at 240 seconds", getTimeText(CLEAR_TIME_SECONDS) === "4:00 AM"],
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
    <main className="screen monitor-screen noise">
      <img src={CCTV_FRAMES[frame - 1]} alt="" className="monitor-image" draggable="false" />
      {staticBurst && <div className="static-burst" />}
      {children}
    </main>
  );
}

function CameraVisual({ camera, anomaly, warnings, staticBurst }) {
  const src = anomaly ? anomaly.image : camera.image;

  return (
    <div className="camera-frame">
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
      <div className="warning-wash" style={{ opacity: warnings * 0.045 }} />
      {staticBurst && <div className="static-burst" />}
    </div>
  );
}

function App() {
  const [camIndex, setCamIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [cctvOpen, setCctvOpen] = useState(false);
  const [turnedBack, setTurnedBack] = useState(false);
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

  const overlayTimer = useRef(null);
  const staticTimer = useRef(null);
  const raiseTimer = useRef(null);
  const ambushTimer = useRef(null);
  const lingerTimer = useRef(null);
  const escalationTimer = useRef(null);
  const bgmRef = useRef(null);
  const onRef = useRef(null);
  const vhsRef = useRef(null);
  const fadeTimers = useRef(new Map());
  const ignoreClickUntil = useRef(0);
  const tests = useMemo(() => runTests(), []);
  const currentCam = CAMERAS[camIndex];
  const currentHasAnomaly = anomalyCam === camIndex;
  const baseCurrentAnomaly = currentHasAnomaly ? currentCam.anomalies[anomalyVariant] : null;
  const currentAnomaly = baseCurrentAnomaly && anomalyEscalated && baseCurrentAnomaly.escalationImage
    ? { ...baseCurrentAnomaly, image: baseCurrentAnomaly.escalationImage }
    : baseCurrentAnomaly;
  const blurAmount = warnings * 1.6;
  const timeText = getTimeText(seconds);
  const showCctvHud = cctvOpen && !turnedBack && !monitorMotion;

  useEffect(() => {
    return () => {
      clearTimeout(overlayTimer.current);
      clearTimeout(staticTimer.current);
      clearTimeout(raiseTimer.current);
      clearTimeout(ambushTimer.current);
      clearTimeout(lingerTimer.current);
      clearTimeout(escalationTimer.current);
      fadeTimers.current.forEach((timer) => clearInterval(timer));
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = BGM_VOLUME;
    if (vhsRef.current) vhsRef.current.volume = 0;
    primeAudio();
  }, []);

  useEffect(() => {
    if (dead || cleared || !showCctvHud) return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [dead, cleared, showCctvHud]);

  useEffect(() => {
    if (seconds < CLEAR_TIME_SECONDS || dead || cleared) return;
    clearTimeout(overlayTimer.current);
    setCleared(true);
    setCctvOpen(false);
    setTurnedBack(false);
    setMonitorMotion(null);
    setOverlay(null);
    fadeAudio(vhsRef.current, 0, 500, { pauseAfter: true });
    fadeAudio(bgmRef.current, BGM_VOLUME, 900, { playBefore: true });
  }, [seconds, dead, cleared]);

  useEffect(() => {
    if (dead || cleared || rebootRequired || signalFailure || ambushPending || overlay || monitorMotion || !cctvOpen) return undefined;
    const timer = setInterval(() => {
      setAnomalyCam((prev) => {
        if (prev !== null) return prev;
        if (Math.random() < 0.42) {
          const nextCam = Math.floor(Math.random() * CAMERAS.length);
          setAnomalyAge(0);
          setAnomalyEscalated(false);
          setAnomalyVariant(Math.floor(Math.random() * CAMERAS[nextCam].anomalies.length));
          return nextCam;
        }
        return prev;
      });
    }, 5200);
    return () => clearInterval(timer);
  }, [dead, cleared, rebootRequired, signalFailure, ambushPending, overlay, monitorMotion, cctvOpen]);

  useEffect(() => {
    if (dead || cleared || anomalyCam === null || overlay) return undefined;
    const timer = setInterval(() => setAnomalyAge((age) => age + 1), 1000);
    return () => clearInterval(timer);
  }, [dead, cleared, anomalyCam, overlay]);

  useEffect(() => {
    if (dead || cleared || anomalyCam === null || overlay || anomalyAge < 13) return;
    failReport();
  }, [anomalyAge, anomalyCam, overlay, dead, cleared]);

  useEffect(() => {
    if (dead || cleared || rebootRequired || signalFailure || overlay || monitorMotion || !cctvOpen) return undefined;
    const timer = setInterval(() => {
      const failureChance = Math.min(0.82, 0.2 + cameraStress * 0.09);
      if (Math.random() < failureChance) triggerRebootFailure();
      setCameraStress((stress) => Math.max(0, stress - 1));
    }, 10000);
    return () => clearInterval(timer);
  }, [dead, cleared, rebootRequired, signalFailure, ambushPending, overlay, monitorMotion, cctvOpen, cameraStress]);

  useEffect(() => {
    if (warnings >= 3 && !dead) {
      setDead(true);
      showOverlay("death", randomItem(DEATH_TEXTS), 1500);
    }
  }, [warnings, dead]);

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
    }, 12000);

    return () => clearTimeout(lingerTimer.current);
  }, [showCctvHud, camIndex, currentCam.forceAmbushDisabled, dead, cleared, rebootRequired, signalFailure, overlay, anomalyCam]);

  useEffect(() => {
    clearTimeout(escalationTimer.current);

    if (
      !showCctvHud ||
      !currentHasAnomaly ||
      !baseCurrentAnomaly?.escalationImage ||
      anomalyEscalated ||
      dead ||
      cleared ||
      rebootRequired ||
      signalFailure ||
      overlay
    ) return undefined;

    escalationTimer.current = setTimeout(() => {
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
    pulseStatic(240);
    setCameraStress((stress) => Math.min(7, stress + 1));
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
    showOverlay("report", "신호 재동기화 중...", 1200, () => {
      setRebootRequired(false);
      setSignalFailure(false);
      setTurnedBack(false);
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

  return (
    <div className={`game warning-${warnings}`}>
      <audio ref={bgmRef} src={AUDIO.bgm} loop preload="auto" />
      <audio ref={vhsRef} src={AUDIO.vhs} loop preload="auto" />
      <audio ref={onRef} src={AUDIO.on} preload="auto" />

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
          <span>04:00 AM</span>
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

          <CameraVisual camera={currentCam} anomaly={currentAnomaly} warnings={warnings} staticBurst={staticBurst} />

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
                ‹
              </button>
              <button type="button" onPointerDown={press(() => changeCam(1))} onClick={click(() => changeCam(1))} className="side-button side-right" aria-label="다음 카메라">
                ›
              </button>
            </>
          )}

          <button type="button" onPointerDown={press(lowerMonitor)} onClick={click(lowerMonitor)} className="control-button lower-button" aria-label="CCTV 내리기">
            ⌄
          </button>
          {!rebootRequired && !signalFailure && (
            <button type="button" onPointerDown={press(reportProblem)} onClick={click(reportProblem)} className="control-button report-button">
              문제 보고
            </button>
          )}
        </main>
      ) : turnedBack ? (
        <main className="screen rear-screen noise">
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
              onInput={(event) => setFrequency(Number(event.target.value))}
              onChange={(event) => setFrequency(Number(event.target.value))}
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
              재부팅
            </button>
            <button type="button" onPointerDown={press(forceRebootFail)} onClick={click(forceRebootFail)} className="delay-button">
              너무 오래 걸렸다면 강제 실패 처리
            </button>
          </section>
          <button type="button" onPointerDown={press(() => setTurnedBack(false))} onClick={click(() => setTurnedBack(false))} className="control-button report-button">
            앞 보기
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
            ⌃
          </button>
          <button type="button" onPointerDown={press(() => setTurnedBack(true))} onClick={click(() => setTurnedBack(true))} className="control-button report-button">
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
  );
}

createRoot(document.getElementById("root")).render(<App />);
