/* =============================================
   比爸 BD — 導航列音樂播放器
   ============================================= */

const BD_PLAYLIST = [
  { title: "Orbital Login",         file: "music/01-orbital-login.mp3" },
  { title: "Systems Wake",          file: "music/02-systems-wake.mp3" },
  { title: "Docking Array",         file: "music/03-docking-array.mp3" },
  { title: "Telemetry Desk",        file: "music/04-telemetry-desk.mp3" },
  { title: "Quiet Control Room",    file: "music/05-quiet-control-room.mp3" },
  { title: "Station Window",        file: "music/06-station-window.mp3" },
  { title: "Low Orbit Compile",     file: "music/07-low-orbit-compile.mp3" },
  { title: "Service Ring Drift",    file: "music/08-service-ring-drift.mp3" },
  { title: "Maintenance Lights",    file: "music/09-maintenance-lights.mp3" },
  { title: "Dockyard Geometry",     file: "music/10-dockyard-geometry.mp3" },
  { title: "Earthshadow Loop",      file: "music/11-earthshadow-loop.mp3" },
  { title: "Module Pressure",       file: "music/12-module-pressure.mp3" },
  { title: "Cyan Instrument Glow",  file: "music/13-cyan-instrument-glow.mp3" },
  { title: "Long Range Build",      file: "music/14-long-range-build.mp3" }
];

(function () {
  let currentIndex = 0;
  let isPlaying = false;
  const audio = new Audio();
  audio.volume = 0.5;

  function loadTrack(index) {
    currentIndex = (index + BD_PLAYLIST.length) % BD_PLAYLIST.length;
    audio.src = BD_PLAYLIST[currentIndex].file;
    document.getElementById("bd-track-title").textContent = BD_PLAYLIST[currentIndex].title;
    document.getElementById("bd-track-num").textContent = (currentIndex + 1) + " / " + BD_PLAYLIST.length;
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      document.getElementById("bd-play-btn").innerHTML = "▶";
      document.getElementById("bd-play-btn").title = "播放";
    } else {
      audio.play().then(() => {
        isPlaying = true;
        document.getElementById("bd-play-btn").innerHTML = "⏸";
        document.getElementById("bd-play-btn").title = "暫停";
      }).catch(() => {});
    }
  }

  audio.addEventListener("ended", () => {
    loadTrack(currentIndex + 1);
    audio.play().then(() => {
      isPlaying = true;
      document.getElementById("bd-play-btn").innerHTML = "⏸";
    }).catch(() => {});
  });

  function injectPlayer() {
    const nav = document.getElementById("nav");
    if (!nav) return;

    // 注入樣式
    const style = document.createElement("style");
    style.textContent = `
      #bd-player {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 980px;
        padding: 5px 12px 5px 8px;
        transition: background .2s;
        flex-shrink: 0;
      }
      #bd-player:hover { background: rgba(255,255,255,0.09); }
      body.light #bd-player { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); }
      body.light #bd-player:hover { background: rgba(0,0,0,0.09); }
      .bd-pbtn {
        background: none; border: none; cursor: pointer;
        color: #a1a1a6; font-size: 11px; padding: 2px 4px;
        border-radius: 50%; transition: color .2s, transform .15s;
        line-height: 1; display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px;
      }
      .bd-pBtn:hover { color: #f5f5f7; }
      #bd-play-btn {
        background: rgba(41,151,255,0.15);
        border: 1px solid rgba(41,151,255,0.3);
        color: #2997ff !important;
        width: 26px; height: 26px;
        font-size: 10px;
        border-radius: 50%;
      }
      #bd-play-btn:hover { background: rgba(41,151,255,0.3) !important; transform: scale(1.1); }
      #bd-track-info {
        display: flex; flex-direction: column;
        max-width: 120px; overflow: hidden;
      }
      #bd-track-title {
        font-size: 11px; font-weight: 600;
        color: #f5f5f7; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
        line-height: 1.3;
      }
      body.light #bd-track-title { color: #1d1d1f; }
      #bd-track-num {
        font-size: 10px; color: #6e6e73; line-height: 1.2;
      }
      #bd-vol {
        -webkit-appearance: none; appearance: none;
        width: 52px; height: 3px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px; outline: none; cursor: pointer;
        accent-color: #2997ff;
      }
      body.light #bd-vol { background: rgba(0,0,0,0.15); }
      #bd-vol::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px; height: 10px;
        border-radius: 50%; background: #2997ff; cursor: pointer;
      }
      .bd-vis {
        display: flex; align-items: flex-end; gap: 2px;
        height: 14px; opacity: 0.6;
      }
      .bd-vis span {
        display: block; width: 2px;
        background: #2997ff; border-radius: 1px;
        animation: none;
      }
      .bd-vis.playing span:nth-child(1) { animation: bar1 .8s ease-in-out infinite alternate; }
      .bd-vis.playing span:nth-child(2) { animation: bar2 .6s ease-in-out infinite alternate; }
      .bd-vis.playing span:nth-child(3) { animation: bar3 .9s ease-in-out infinite alternate; }
      @keyframes bar1 { from { height: 3px; } to { height: 12px; } }
      @keyframes bar2 { from { height: 6px; } to { height: 10px; } }
      @keyframes bar3 { from { height: 2px; } to { height: 14px; } }
      @media (max-width: 900px) {
        #bd-track-info { display: none; }
        #bd-vol { display: none; }
        #bd-player { padding: 5px 8px; }
      }
      @media (max-width: 600px) {
        #bd-player {
          display: flex;
          padding: 4px 8px;
          gap: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 980px;
          flex-shrink: 0;
        }
        #bd-track-info { display: none; }
        #bd-vol { display: none; }
        .bd-vis { display: none; }
        .bd-pBtn {
          font-size: 13px;
          width: 28px;
          height: 28px;
        }
        #bd-play-btn {
          width: 30px;
          height: 30px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);

    // 建立播放器 HTML
    const player = document.createElement("div");
    player.id = "bd-player";
    player.innerHTML = `
      <div class="bd-vis" id="bd-vis">
        <span style="height:4px"></span>
        <span style="height:8px"></span>
        <span style="height:5px"></span>
      </div>
      <button class="bd-pBtn" id="bd-prev-btn" title="上一首">⏮</button>
      <button class="bd-pBtn" id="bd-play-btn" title="播放">▶</button>
      <button class="bd-pBtn" id="bd-next-btn" title="下一首">⏭</button>
      <div id="bd-track-info">
        <span id="bd-track-title">Orbital Login</span>
        <span id="bd-track-num">1 / 14</span>
      </div>
      <input type="range" id="bd-vol" min="0" max="1" step="0.01" value="0.5" title="音量">
    `;

    // 插入到 nav-right-mobile 容器內（漢堡選單前），若不存在則插到 nav-wrap 最後
    const navWrap = nav.querySelector(".nav-wrap");
    const mobileRight = nav.querySelector(".nav-right-mobile");
    if (mobileRight) {
      mobileRight.insertBefore(player, mobileRight.firstChild);
    } else if (navWrap) {
      navWrap.appendChild(player);
    }

    // 綁定事件
    document.getElementById("bd-play-btn").addEventListener("click", togglePlay);
    document.getElementById("bd-prev-btn").addEventListener("click", () => {
      loadTrack(currentIndex - 1);
      if (isPlaying) audio.play().catch(() => {});
    });
    document.getElementById("bd-next-btn").addEventListener("click", () => {
      loadTrack(currentIndex + 1);
      if (isPlaying) audio.play().catch(() => {});
    });
    document.getElementById("bd-vol").addEventListener("input", (e) => {
      audio.volume = parseFloat(e.target.value);
    });

    // 音量條視覺同步
    audio.addEventListener("play", () => {
      document.getElementById("bd-vis").classList.add("playing");
    });
    audio.addEventListener("pause", () => {
      document.getElementById("bd-vis").classList.remove("playing");
    });

    // 初始化第一首
    loadTrack(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectPlayer);
  } else {
    injectPlayer();
  }
})();
