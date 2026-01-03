/* LAUNCHER LOGIC */

// --- LOCALIZATION DATA ---
const LOCALE = {
    en: {
        l1: "Relax & Play", l2: "Brain Spark", l3: "Friendly World", l4: "Skill Master", l5: "Pro Zone",
        fav: "Favorites ❤️", recent: "Recently Played 🕒",
        search: "Find a game...", splash: "TAP TO START", loading: "LOADING...",
        who: "WHO ARE YOU?", ready: "READY!",
        daily: "DAILY GIFT!", daily_msg: "+10 STARS!", claim: "CLAIM!",
        welcome: "Welcome back!", toast_fav: "Added to Favorites!", toast_unfav: "Removed!", toast_set: "Saved!"
    },
    ms: {
        l1: "Zon Tenang", l2: "Minda Cerdas", l3: "Dunia Kita", l4: "Mahir Minda", l5: "Liga Pro",
        fav: "Kegemaran ❤️", recent: "Baru Dimain 🕒",
        search: "Cari game...", splash: "TEKAN MULA", loading: "MEMUATKAN...",
        who: "SIAPA AWAK?", ready: "SEDIA!",
        daily: "HADIAH HARIAN!", daily_msg: "+10 BINTANG!", claim: "TEBUS!",
        welcome: "Selamat Kembali!", toast_fav: "Ditambah ke Kegemaran!", toast_unfav: "Dibuang!", toast_set: "Disimpan!"
    }
};

const MASCOT_MSGS = {
    en: ["You're awesome!", "Let's play!", "Tap a game!", "Looking cool!", "Star Power!", "Zoom Zoom!", "Super Hero!"],
    ms: ["Awak hebat!", "Jom main!", "Tekan game!", "Nampak gempak!", "Kuasa Bintang!", "Laju laju!", "Wira Super!"]
};

// --- STATE MANAGEMENT ---
let CONFIG = {
    lang: localStorage.getItem('u_lang') || 'en',
    theme: localStorage.getItem('u_theme') || 'day',
    muted: localStorage.getItem('u_muted') === 'true',
    avatar: localStorage.getItem('u_av') || '😎'
};

let favorites = JSON.parse(localStorage.getItem('u_favs') || '[]');
let recents = JSON.parse(localStorage.getItem('u_recents') || '[]');
let currentGameCleanup = null; // Stores the stop function for current game

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- INITIALIZATION ---
function init() {
    applyTheme();
    renderGrid();
    updateHUD();
    updateStaticText();
    checkDailyReward();
    startClock();
    
    if(!localStorage.getItem('u_av')) setTimeout(openModal, 1500);
    if(CONFIG.muted) document.getElementById('bgm').pause();
}

// --- CORE RENDER LOGIC ---
function renderGrid(filterText = '') {
    const container = document.getElementById('app-content');
    container.innerHTML = '';
    const t = LOCALE[CONFIG.lang];
    
    // Helper to get localized title
    const getTitle = (g) => (g.title[CONFIG.lang] || g.title.en);

    // 1. RECENT SHELF
    if(!filterText && recents.length > 0) {
        const recentItems = recents.map(rid => availableGames.find(g=>g.id===rid)).filter(x=>x);
        if(recentItems.length > 0) renderShelf(t.recent, recentItems);
    }

    // 2. FAVORITES SHELF
    if(!filterText && favorites.length > 0) {
        const favItems = favorites.map(fid => availableGames.find(g=>g.id===fid)).filter(x=>x);
        if(favItems.length > 0) renderShelf(t.fav, favItems);
    }

    // 3. STANDARD SHELVES
    ['l1', 'l2', 'l3', 'l4', 'l5'].forEach(sid => {
        const items = availableGames.filter(g => g.shelf === sid);
        const visible = items.filter(g => getTitle(g).toLowerCase().includes(filterText.toLowerCase()));
        if(visible.length > 0) renderShelf(t[sid], visible);
    });
    
    addTiltEffect();
}

function renderShelf(title, items) {
    const container = document.getElementById('app-content');
    let html = `<div><div class="shelf-title">${title}</div><div class="game-grid">`;
    
    html += items.map(g => {
        const name = g.title[CONFIG.lang] || g.title.en;
        const isFav = favorites.includes(g.id);
        const hasStar = checkProgress(g.id);
        
        return `
        <div 
            onclick="launchGame('${g.id}')" 
            oncontextmenu="toggleFav(event, '${g.id}')"
            class="card ${g.bg}"
        >
            <div class="card-bg-fx"></div>
            <div class="card-emoji">${g.icon}</div>
            <div class="card-title">${name}</div>
            ${hasStar ? '<div class="card-badge">⭐️</div>' : ''}
            ${isFav ? '<div class="fav-badge">❤️</div>' : ''}
        </div>`;
    }).join('');
    
    html += `</div></div>`;
    container.innerHTML += html;
}

// --- GAME LAUNCHING SYSTEM (THE BIG FIX) ---
function launchGame(gameId) {
    const game = availableGames.find(g => g.id === gameId);
    if(!game) return;

    if(!game.init) {
        showToast("Coming Soon / Akan Datang");
        return;
    }

    // Update Recents
    recents = recents.filter(x => x !== gameId);
    recents.unshift(gameId);
    if(recents.length > 4) recents.pop();
    localStorage.setItem('u_recents', JSON.stringify(recents));

    sfx('click');
    
    // UI Transitions
    const gameView = document.getElementById('game-view');
    const stage = document.getElementById('game-stage');
    const header = document.getElementById('main-header');
    const content = document.getElementById('app-content');
    const mascot = document.getElementById('mascot-wrap');

    header.style.display = 'none';
    content.style.display = 'none';
    mascot.style.display = 'none'; // Hide mascot during gameplay
    
    gameView.classList.add('active');
    document.getElementById('active-game-title').innerText = game.title[CONFIG.lang] || game.title.en;

    // INJECT GAME
    stage.innerHTML = ""; // Clean slate
    
    // We pass a 'utils' object so the game can use launcher features
    const utils = {
        playSound: (type) => sfx(type),
        addStar: () => { /* Logic to add stars could go here */ }
    };

    currentGameCleanup = game.init(stage, utils);
}

function closeGame() {
    // 1. Run Cleanup
    if(typeof currentGameCleanup === "function") {
        currentGameCleanup();
        currentGameCleanup = null;
    }

    // 2. Restore UI
    document.getElementById('game-view').classList.remove('active');
    document.getElementById('game-stage').innerHTML = "";
    
    document.getElementById('main-header').style.display = 'flex';
    document.getElementById('app-content').style.display = 'flex'; // grid
    document.getElementById('mascot-wrap').style.display = 'flex';
    
    renderGrid(document.getElementById('search-input').value); // Refresh grid (stars/recents)
}

// --- UTILITIES (Preserving your existing features) ---
function toggleFav(e, id) {
    e.preventDefault(); e.stopPropagation();
    if(favorites.includes(id)) {
        favorites = favorites.filter(x => x !== id);
        showToast(LOCALE[CONFIG.lang].toast_unfav);
    } else {
        favorites.push(id);
        showToast(LOCALE[CONFIG.lang].toast_fav);
        sfx('success');
    }
    localStorage.setItem('u_favs', JSON.stringify(favorites));
    renderGrid(document.getElementById('search-input').value);
    return false;
}

function checkProgress(id) {
    // Simple check example
    if(id === 'clicker' && localStorage.getItem('clicker_master')) return true;
    if(localStorage.getItem(id + '_star')) return true;
    return false;
}

function updateHUD() {
    document.getElementById('hud-av').innerText = CONFIG.avatar;
    document.getElementById('btn-theme').innerText = CONFIG.theme === 'day' ? '🌙' : '☀️';
    document.getElementById('btn-lang').innerText = CONFIG.lang === 'en' ? '🇺🇸' : '🇲🇾';
    document.getElementById('btn-sound').innerText = CONFIG.muted ? '🔇' : '🔊';
    document.getElementById('search-input').placeholder = LOCALE[CONFIG.lang].search;
    
    // Recalculate stars
    let stars = 0;
    availableGames.forEach(g => { if(checkProgress(g.id)) stars++; });
    document.getElementById('hud-stars').innerText = stars;
}

function updateStaticText() {
    const t = LOCALE[CONFIG.lang];
    document.getElementById('splash-txt').innerText = t.splash;
    document.getElementById('lbl-who').innerText = t.who;
    document.getElementById('btn-ready').innerText = t.ready;
    document.getElementById('lbl-daily').innerText = t.daily;
    document.getElementById('lbl-reward-msg').innerText = t.daily_msg;
    document.getElementById('btn-claim').innerText = t.claim;
    document.getElementById('mascot-bubble').innerText = t.welcome;
}

// --- STANDARD EVENTS (Copying your previous logic) ---
function enterApp() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    if(!CONFIG.muted) {
        const bgm = document.getElementById('bgm');
        bgm.volume = 0.3;
        bgm.play().catch(e=>console.log("Audio requires touch"));
    }
    const s = document.getElementById('splash');
    s.style.opacity = '0'; s.style.transform = 'scale(1.5)';
    setTimeout(() => s.remove(), 800);
    sfx('intro');
}

function toggleLang() {
    CONFIG.lang = CONFIG.lang === 'en' ? 'ms' : 'en';
    localStorage.setItem('u_lang', CONFIG.lang);
    renderGrid(document.getElementById('search-input').value);
    updateHUD(); updateStaticText(); sfx('click');
}

function toggleTheme() {
    CONFIG.theme = CONFIG.theme === 'day' ? 'night' : 'day';
    localStorage.setItem('u_theme', CONFIG.theme);
    applyTheme(); sfx('click');
}
function applyTheme() { document.documentElement.setAttribute('data-theme', CONFIG.theme); }
function toggleMute() {
    CONFIG.muted = !CONFIG.muted;
    localStorage.setItem('u_muted', CONFIG.muted);
    updateHUD();
    const bgm = document.getElementById('bgm');
    if(CONFIG.muted) bgm.pause(); else { bgm.volume = 0.3; bgm.play(); }
}
function filterGames() { renderGrid(document.getElementById('search-input').value); }
function showToast(msg) {
    const t = document.getElementById('toast-msg');
    t.innerText = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// --- MASCOT & FX ---
function mascotTalk() {
    sfx('pop');
    const bubble = document.getElementById('mascot-bubble');
    const char = document.getElementById('mascot-char');
    const msgs = MASCOT_MSGS[CONFIG.lang];
    bubble.innerText = msgs[Math.floor(Math.random() * msgs.length)];
    bubble.classList.add('show');
    char.style.transform = "scale(1.2)";
    setTimeout(() => { bubble.classList.remove('show'); char.style.transform = "scale(1)"; }, 2000);
}

function sfx(type) {
    if(CONFIG.muted) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    
    if(type === 'click') {
        osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(300, now+0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.1);
        osc.start(now); osc.stop(now+0.1);
    } else if(type === 'success' || type === 'intro') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now+0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.3);
        osc.start(now); osc.stop(now+0.3);
    } else if(type === 'pop') {
        osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now+0.1);
        gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now+0.1);
        osc.start(now); osc.stop(now+0.1);
    }
}

// --- CLOCK & MODALS ---
function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = 
            `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }, 1000);
}
function checkDailyReward() {
    const lastLogin = localStorage.getItem('u_last_login');
    const today = new Date().toDateString();
    if(lastLogin !== today) {
        setTimeout(() => {
            const m = document.getElementById('daily-reward');
            m.style.display = 'flex'; setTimeout(()=> m.classList.add('active'), 10);
            sfx('success');
        }, 1000);
    }
}
function claimReward() {
    localStorage.setItem('u_last_login', new Date().toDateString());
    sfx('success'); spawnConfetti();
    const m = document.getElementById('daily-reward');
    m.classList.remove('active'); setTimeout(()=> m.style.display='none', 300);
}
function openModal() {
    const m = document.getElementById('av-modal');
    m.style.display = 'flex'; setTimeout(()=> m.classList.add('active'), 10); sfx('pop');
}
function selectAv(el) {
    document.querySelectorAll('.av-opt').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected'); tempAv = el.innerText; sfx('click');
}
function saveAv() {
    let tempAv = document.querySelector('.av-opt.selected')?.innerText;
    if(tempAv) {
        CONFIG.avatar = tempAv;
        localStorage.setItem('u_av', tempAv);
        updateHUD(); showToast(LOCALE[CONFIG.lang].toast_set);
    }
    const m = document.getElementById('av-modal');
    m.classList.remove('active'); setTimeout(()=> m.style.display='none', 300);
    sfx('success'); spawnConfetti();
}

// --- VISUAL FX ---
function addTiltEffect() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            const centerX = rect.width / 2; const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize; 

function spawnConfetti() {
    for(let i=0; i<50; i++) {
        particles.push({
            x: window.innerWidth/2, y: window.innerHeight/2,
            vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
            life: 1, color: `hsl(${Math.random()*360}, 100%, 50%)`, size: Math.random()*8+4
        });
    }
}
function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 0.02;
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        if(p.life<=0) particles.splice(i,1);
    });
    requestAnimationFrame(loop);
}

// Start
window.onload = () => { resize(); init(); loop(); };


