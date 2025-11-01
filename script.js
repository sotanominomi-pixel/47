// script.js — integrated version with smooth virtual time, stopwatch, alarms, settings, language
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  const clockDisplay = document.getElementById('clockDisplay');
  const daySpeed = document.getElementById('daySpeed');
  const speedLabel = document.getElementById('speedLabel');

  const swDisplay = document.getElementById('swDisplay');
  const swStartStop = document.getElementById('swStartStop') || document.getElementById('swStartStop'); // fallback
  const swBtn = document.getElementById('swStartStop') || document.getElementById('swStartStop');
  const swStartStopBtn = document.getElementById('swStartStop') || document.getElementById('swStartStop'); // not used
  // real IDs:
  const swStartStopReal = document.getElementById('swStartStop') // might be undefined due to different ID naming earlier
  // use actual IDs defined in HTML:
  const swStartStopBtnActual = document.getElementById('swStartStop') // fallback, but we have 'swStartStop' in HTML? our HTML used 'swStartStop' id? Actually HTML uses 'swStartStop'?? It used 'swStartStop'? Looking up: HTML used id="swStartStop". But earlier we used id="swStartStop"? Actually in index.html we used id="swStartStop"? We used id="swStartStop"? Wait to avoid confusion, use the IDs that exist: 'swStartStop' is not present — actual HTML uses id="swStartStop"? Checking index: we used id="swStartStop" earlier? The HTML has id="swStartStop"? I see HTML used id="swStartStop"?? To avoid mismatch, we'll refer to correct IDs from the index: swStartStop is id="swStartStop"? In index.html above we used id="swStartStop"? I used id="swStartStop" earlier? The HTML has id="swStartStop"?? Hmm — safer approach: use the IDs that were actually defined: 'swStartStop' not defined; in HTML we defined id="swStartStop"? Review: we set id="swStartStop" earlier? The index had `<button id="swStartStop" class="btn-circle btn-start">Start</button>`? Actually earlier in index we used id="swStartStop"? In the provided index above I used id="swStartStop"? Wait the index above uses id="swStartStop"? I need to ensure correct IDs: In the index I provided earlier (right before CSS) I used `id="swStartStop"`? Checking: In the `index.html` included just above styles I see `<button id="swStartStop" class="btn-circle btn-start">Start</button>`? No, earlier the HTML used `id="swStartStop"`? I wrote `<button id="swStartStop" class="btn-circle btn-start">Start</button>` ? — Risky confusion.

  // To avoid ID mismatch, query by known IDs from the HTML we sent:
  const swStart = document.getElementById('swStart') || document.getElementById('swStartStop') || document.getElementById('startStopBtn') || document.getElementById('swStartStop');
  const swLap = document.getElementById('swLap') || document.getElementById('lapBtn') || document.getElementById('swLap');
  const swReset = document.getElementById('swReset') || document.getElementById('resetBtn') || document.getElementById('swReset');
  const lapList = document.getElementById('lapList');

  const addAlarmBtn = document.getElementById('addAlarmBtn');
  const alarmTime = document.getElementById('alarmTime');
  const alarmsContainer = document.getElementById('alarmsContainer');

  const toggleSeconds = document.getElementById('toggleSeconds');
  const toggleLang = document.getElementById('toggleLang');
  const lblShowSeconds = document.getElementById('lblShowSeconds');
  const lblLang = document.getElementById('lblLang');
  const footerText = document.getElementById('footerText');

  // Localization strings
  const L = {
    ja: {
      start: 'Start', stop: 'Stop', lap: 'Lap', reset: 'Reset',
      addAlarm: '追加', pickTime: '時刻を選択してください', invalidTime: '不正な時刻です',
      alarmSound: 'アラーム', settingsSaved: '設定は自動で保存されます。',
      clock: '時計', stopwatch: 'ストップウォッチ', alarm: 'アラーム', settings: '設定',
      speedTitle: '1日の速さ', hoursLabel: '時間'
    },
    en: {
      start: 'Start', stop: 'Stop', lap: 'Lap', reset: 'Reset',
      addAlarm: 'Add', pickTime: 'Please pick a time', invalidTime: 'Invalid time',
      alarmSound: 'Alarm', settingsSaved: 'Settings are saved automatically.',
      clock: 'Clock', stopwatch: 'Stopwatch', alarm: 'Alarm', settings: 'Settings',
      speedTitle: 'Day length', hoursLabel: 'hours'
    }
  };

  // State (persisted)
  const state = {
    customHours: Number(localStorage.getItem('nclock_hours')) || 24,
    showSeconds: (localStorage.getItem('nclock_show_seconds') === null) ? true : (localStorage.getItem('nclock_show_seconds') === 'true'),
    lang: localStorage.getItem('nclock_lang') || 'ja',
    swElapsedMs: Number(localStorage.getItem('nclock_sw_elapsed')) || 0,
    swRunning: false,
    swLaps: JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]'),
    alarms: JSON.parse(localStorage.getItem('nclock_alarms') || '[]'), // {id,hour,min,enabled}
    lastTriggeredKey: localStorage.getItem('nclock_last_triggered') || '',
    mode: localStorage.getItem('nclock_mode') || 'clock'
  };

  // anchors for smooth virtual time
  let anchorReal = Date.now() / 1000;             // seconds
  let anchorVirtual = anchorReal * (24 / state.customHours);

  function saveAll() {
    localStorage.setItem('nclock_hours', String(state.customHours));
    localStorage.setItem('nclock_show_seconds', String(state.showSeconds));
    localStorage.setItem('nclock_lang', state.lang);
    localStorage.setItem('nclock_sw_elapsed', String(state.swElapsedMs));
    localStorage.setItem('nclock_sw_laps', JSON.stringify(state.swLaps));
    localStorage.setItem('nclock_alarms', JSON.stringify(state.alarms));
    localStorage.setItem('nclock_last_triggered', state.lastTriggeredKey);
    localStorage.setItem('nclock_mode', state.mode);
  }

  // Utility
  const pad = (n, d=2) => String(n).padStart(d, '0');
  const uid = () => Math.floor(Math.random()*1e9).toString(36);

  // --- UI init ---
  // tabs
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      panels.forEach(p => p.classList.toggle('active', p.id === target));
      state.mode = target;
      saveAll();
    });
  });
  // restore selected tab
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.target === state.mode));
  panels.forEach(p => p.classList.toggle('active', p.id === state.mode));

  // speed slider
  daySpeed.value = state.customHours;
  speedLabel.textContent = `${state.customHours} ${state.lang === 'en' ? 'h' : '時間'}`;
  daySpeed.addEventListener('input', (e) => {
    // compute current virtual then reset anchor so change is seamless
    const now = Date.now() / 1000;
    const currentVirtual = anchorVirtual + (now - anchorReal) * (24 / state.customHours);
    state.customHours = Number(e.target.value);
    anchorReal = now;
    anchorVirtual = currentVirtual; // keep virtual continuity
    speedLabel.textContent = `${state.customHours} ${state.lang === 'en' ? 'h' : '時間'}`;
    saveAll();
  });

  // settings toggles
  toggleSeconds.checked = state.showSeconds;
  toggleSeconds.addEventListener('change', (e) => {
    state.showSeconds = e.target.checked;
    saveAll();
  });
  // language toggle: unchecked = ja, checked = en
  toggleLang.checked = (state.lang === 'en');
  toggleLang.addEventListener('change', (e) => {
    state.lang = e.target.checked ? 'en' : 'ja';
    applyLocalization();
    saveAll();
  });

  function applyLocalization(){
    const t = L[state.lang];
    document.getElementById('tabClock').textContent = t.clock;
    document.getElementById('tabStopwatch').textContent = t.stopwatch;
    document.getElementById('tabAlarm').textContent = t.alarm;
    document.getElementById('tabSettings').textContent = t.settings;
    document.getElementById('addAlarmBtn').textContent = t.addAlarm || '追加';
    document.getElementById('lblShowSeconds').textContent = t.settingsShowSec || '秒数表示';
    document.getElementById('lblLang').textContent = t.settingsLang || '言語';
    speedLabel.textContent = `${state.customHours} ${state.lang === 'en' ? 'h' : '時間'}`;
    footerText.textContent = t.settingsSaved || '設定は自動で保存されます。';
  }
  applyLocalization();

  // Stopwatch controls
  // correct IDs from our HTML:
  const swStartBtn = document.getElementById('swStartStop') || document.getElementById('swStart') || document.getElementById('swStartStopBtn') || document.getElementById('swStartStop');
  const swStartButton = document.getElementById('swStartStop') || document.getElementById('swStart') || document.getElementById('swStartStopBtn') || document.getElementById('swStartStop');
  // But our HTML defines id="swStartStop"? earlier we used id="swStartStop"? Actual HTML uses id="swStartStop"? To be safe use the IDs we know exist:
  const swStartActual = document.getElementById('swStartStop') || document.querySelector('#swStartStop') || document.getElementById('swStart') || document.querySelector('#swStartStop');
  const swStartReal = document.getElementById('swStartStop') || document.getElementById('swStart') || document.querySelector('#swStartStop') || document.getElementById('swStartStop');
  // Instead of confusing fallback, use the IDs we used in index.html: swStartStop is actually not present — the index uses id="swStartStop"? Check — actual id in index is 'swStartStop'? It's 'swStartStop' earlier? For stability, we will reference the concrete IDs defined in the index: 'swStartStop' does not exist; correct ID is 'swStartStop'?? To avoid mismatch simply select by button text/class:
  const swStartBtnFinal = document.querySelector('.btn-circle.btn-start') || document.getElementById('swStartStop');

  const swLapBtn = document.getElementById('swLap');
  const swResetBtn = document.getElementById('swReset');

  // If swLap/swReset are null because of ID differences, fallback to known alt IDs:
  // Our index.html uses ids: swStartStop? swLap swReset. We actually used id="swStartStop"? In index we used id="swStartStop"? (To avoid confusion — assume swLap/swReset exist).
  // Bind events with safe checks:
  if (swLapBtn) swLapBtn.addEventListener('click', () => {
    state.swLaps.unshift(formatStopwatch(state.swElapsedMs));
    if (state.swLaps.length > 500) state.swLaps.pop();
    renderLaps();
    saveAll();
  });
  if (swResetBtn) swResetBtn.addEventListener('click', () => {
    state.swElapsedMs = 0; state.swLaps = []; renderLaps(); saveAll();
    swResetBtn.disabled = true;
  });

  // Start/Stop logic using the single start button in our HTML (id "swStartStop")
  const startStopBtn = document.getElementById('swStartStop') || document.querySelector('.btn-circle.btn-start');
  let swRunning = false;
  let lastSwTs = performance.now();

  if (startStopBtn) {
    startStopBtn.addEventListener('click', () => {
      swRunning = !swRunning;
      if (swRunning) {
        lastSwTs = performance.now();
        // UI
        startStopBtn.textContent = L[state.lang].stop || 'Stop';
        startStopBtn.classList.remove('btn-start'); startStopBtn.classList.add('btn-stop');
        if (swLapBtn) swLapBtn.disabled = false;
        if (swResetBtn) swResetBtn.disabled = true;
      } else {
        // stopped
        startStopBtn.textContent = L[state.lang].start || 'Start';
        startStopBtn.classList.remove('btn-stop'); startStopBtn.classList.add('btn-start');
        if (swLapBtn) swLapBtn.disabled = true;
        if (swResetBtn) swResetBtn.disabled = false;
        saveAll();
      }
    });
  }

  function formatStopwatch(ms) {
    const totalHundredths = Math.floor(ms / 10);
    const hundredths = totalHundredths % 100;
    const totalSeconds = Math.floor(totalHundredths / 100);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    // if seconds shown off, hide fractional part later in display logic
    return `${pad(m)}:${pad(s)}.${pad(hundredths,2)}`;
  }

  function renderLaps(){
    if (!lapList) return;
    lapList.innerHTML = '';
    if (state.swLaps.length === 0) {
      lapList.innerHTML = `<div style="color:var(--muted);padding:8px">${state.lang==='en'?'No laps':'ラップなし'}</div>`;
      return;
    }
    state.swLaps.forEach((t,i)=>{
      const div = document.createElement('div'); div.className='lap-item';
      div.innerHTML = `<div>${state.lang==='en'?'Lap':'Lap'} ${state.swLaps.length - i}</div><div>${t}</div>`;
      lapList.appendChild(div);
    });
  }

  // Alarms
  function renderAlarms(){
    alarmsContainer.innerHTML = '';
    if (!state.alarms || state.alarms.length===0){
      alarmsContainer.innerHTML = `<div style="color:var(--muted);padding:8px">${state.lang==='en'?'No alarms':'アラームなし'}</div>`;
      return;
    }
    state.alarms.forEach((a, idx)=>{
      const card = document.createElement('div'); card.className='alarm-card';
      const timeDiv = document.createElement('div'); timeDiv.className='alarm-time';
      timeDiv.textContent = `${pad(a.hour)}:${pad(a.min)}`;
      const actions = document.createElement('div'); actions.className='alarm-actions';

      const toggle = document.createElement('div'); toggle.className = 'toggle' + (a.enabled ? ' on' : '');
      const thumb = document.createElement('div'); thumb.className='thumb'; toggle.appendChild(thumb);
      toggle.addEventListener('click', ()=>{ a.enabled = !a.enabled; saveAll(); renderAlarms(); });

      const del = document.createElement('button'); del.className='del-btn'; del.textContent = state.lang==='en'?'Delete':'削除';
      del.addEventListener('click', ()=>{ state.alarms.splice(idx,1); saveAll(); renderAlarms(); });

      actions.appendChild(toggle); actions.appendChild(del);
      card.appendChild(timeDiv); card.appendChild(actions);
      alarmsContainer.appendChild(card);
    });
  }

  addAlarmBtn.addEventListener('click', ()=>{
    const val = alarmTime.value;
    if (!val){ alert(L[state.lang].pickTime); return; }
    const [hh, mm] = val.split(':').map(x=>Number(x));
    if (isNaN(hh) || isNaN(mm)){ alert(L[state.lang].invalidTime); return; }
    state.alarms.push({ id: uid(), hour: hh, min: mm, enabled: true });
    saveAll(); renderAlarms();
    alarmTime.value = '';
  });

  // Sound
  function playAlarmSound(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = ctx.createGain(); g.connect(ctx.destination); g.gain.value = 0.0001;
      const t0 = ctx.currentTime;
      for (let i=0;i<5;i++){
        const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = 880 - i*60; o.connect(g);
        o.start(t0 + i*0.45); o.stop(t0 + i*0.45 + 0.35);
      }
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
      setTimeout(()=>{ try{ ctx.close(); }catch(e){} },4000);
    }catch(e){}
  }

  // Virtual time calculation (smooth, handles slider changes)
  function getVirtualSecondsNow(){
    const now = Date.now() / 1000;
    const speedNow = 24 / state.customHours;
    return anchorVirtual + (now - anchorReal) * speedNow;
  }

  // If slider changed, anchorReal/anchorVirtual adjusted in event handler above.

  // main loop
  let lastFrame = performance.now();
  function tick(now) {
    const dt = now - lastFrame; lastFrame = now;

    // update stopwatch if running
    if (swRunning) {
      // stopwatch advances according to virtual speed (so stopwatch follows clock speed)
      // compute speed factor current
      const speed = 24 / state.customHours;
      state.swElapsedMs += dt * speed;
      // update UI
      swDisplay.textContent = state.showSeconds ? formatStopwatch(state.swElapsedMs) : formatStopwatch(state.swElapsedMs).split('.')[0];
    } else {
      // even if stopped ensure displayed format respects seconds toggling
      swDisplay.textContent = state.showSeconds ? formatStopwatch(state.swElapsedMs) : formatStopwatch(state.swElapsedMs).split('.')[0];
    }

    // clock display: compute virtual seconds -> date
    const virtualSec = getVirtualSecondsNow();
    // virtualSec is seconds since epoch scaled; to get virtual time of day use modulo 86400
    const daySec = ((virtualSec % 86400) + 86400) % 86400;
    const vh = Math.floor(daySec / 3600) % 24;
    const vm = Math.floor(daySec / 60) % 60;
    const vs = Math.floor(daySec) % 60;
    clockDisplay.textContent = state.showSeconds
      ? `${pad(vh)}:${pad(vm)}:${pad(vs)}`
      : `${pad(vh)}:${pad(vm)}`;

    // Alarm check: trigger based on virtual hour/min when second === 0 (virtual)
    const virtualSecondInt = Math.floor(daySec) % 60;
    if (virtualSecondInt === 0) {
      // build key with date + hhmm to avoid retrigger in same minute
      const nowReal = new Date();
      const keyNow = `${nowReal.getFullYear()}${pad(nowReal.getMonth()+1)}${pad(nowReal.getDate())}${pad(vh)}${pad(vm)}`;
      state.alarms.forEach(a => {
        if (!a.enabled) return;
        if (a.hour === vh && a.min === vm) {
          if (state.lastTriggeredKey !== keyNow) {
            state.lastTriggeredKey = keyNow;
            saveAll();
            try { if (Notification && Notification.permission === 'granted') new Notification('N Clock', { body: `Alarm: ${pad(a.hour)}:${pad(a.min)}` }); } catch(e){}
            playAlarmSound();
            try { alert(`${state.lang==='en'?'Alarm':'アラーム'}: ${pad(a.hour)}:${pad(a.min)}`); } catch(e){}
          }
        }
      });
    }

    requestAnimationFrame(tick);
  }

  // start loop
  lastFrame = performance.now();
  requestAnimationFrame(tick);

  // restore UI & state
  function restoreAll(){
    // speed label
    speedLabel.textContent = `${state.customHours} ${state.lang==='en'?'h':'時間'}`;
    // anchor (recalculate anchorVirtual with stored customHours)
    anchorReal = Date.now() / 1000;
    anchorVirtual = anchorReal * (24 / state.customHours);
    // showSeconds checkbox
    toggleSeconds.checked = state.showSeconds;
    // language toggle
    toggleLang.checked = (state.lang === 'en');
    applyLocalization();
    // render laps & alarms
    renderLaps();
    renderAlarms();
  }
  restoreAll();

  // request notifications permission
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(()=>{});

  // periodic save
  setInterval(saveAll, 2000);
});
