// Deklarasi Elemen UI
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('name-input');
const spinBtn = document.getElementById('center-spin-button');
const resetBtn = document.getElementById('reset-btn');
const centerSpinBtn = document.getElementById('center-spin-button');
const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const winnerDisplay = document.getElementById('winner-name');
const closeModal = document.getElementById('close-modal');
const popupToggle = document.getElementById('popup-toggle');
const statusMsg = document.getElementById('status-msg');

// Audio / Sound
const soundEnable = document.getElementById('sound-enable');
const soundFile = document.getElementById('sound-file');
const soundVolume = document.getElementById('sound-volume');
const soundLoop = document.getElementById('sound-loop');
const spinAudio = document.getElementById('spin-audio');

// History & Tabs
const resultsListEl = document.getElementById('results-list');
const resultsCountEl = document.getElementById('results-count');
const entriesCountEl = document.getElementById('entries-count');

let names = [];
let results = [];
let currentRotation = 0;
let isSpinning = false;
let audioEnabled = false;

const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1', '#33FFF6', '#FFC300', '#581845', '#28B463', '#AF7AC5', '#F4D03F', '#E67E22'];

// --- FUNGSI UTAMA ---

function init() {
    updateNames();
    loadResults();
    
    // Listeners
    nameInput.addEventListener('input', updateNames);
    spinBtn.addEventListener('click', spin);
    if (closeModal) closeModal.addEventListener('click', hideWinner);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) hideWinner(); });

    // Shortcut Ctrl + Enter untuk Spin
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && !isSpinning) spin();
    });

    // Fitur Cheat (Double Click Judul)
    const title = document.querySelector('h1');
    if (title) {
        title.addEventListener('dblclick', () => {
            const currentCheat = localStorage.getItem('cheatWinner');
            const cheatName = prompt("Masukkan nama yang ingin selalu menang:", currentCheat || "");
            if (cheatName === null || cheatName.trim() === "") {
                localStorage.removeItem('cheatWinner');
            } else {
                localStorage.setItem('cheatWinner', cheatName.trim());
            }
        });
    }

    
}

function updateNames() {
    names = nameInput.value.split('\n').filter(n => n.trim() !== "");
    if (entriesCountEl) entriesCountEl.innerText = names.length;
    drawWheel();
    spinBtn.disabled = names.length === 0;
}

 function drawWheel() {
        const size = canvas.width;
        const center = size / 2;
        const radius = size / 2 - 10;
        
        ctx.clearRect(0, 0, size, size);

        if (names.length === 0) {
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ddd';
            ctx.fill();
            return;
        }

        const arcSize = (Math.PI * 2) / names.length;

        names.forEach((name, i) => {
            const angle = currentRotation + (i * arcSize);
            
            // Draw Segment
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + arcSize);
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.stroke();

            // Draw Text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "white";
            ctx.font = "bold 24px Sans-Serif";
            // Ensure text fits
            const displayText = name.length > 15 ? name.substring(0, 12) + "..." : name;
            ctx.fillText(displayText, radius - 30, 10);
            ctx.restore();
        });

        // Center circle decoration (theme-aware)
        // White center disk and subtle ring to match the reference design
        ctx.beginPath();
        ctx.arc(center, center, 44, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 6;
        ctx.stroke();
        // Update pointer color so it follows the segment under the right-side pointer
        updatePointerColor();
    }

    // Update pointer color to match the segment currently under the right-side pointer.
    function updatePointerColor() {
        const pointer = document.getElementById('wheel-pointer');
        if (!pointer) return;
        if (!names || names.length === 0) {
            pointer.style.color = getComputedStyle(document.body).getPropertyValue('--pointer-color') || '#fff';
            return;
        }
        const arcSize = (Math.PI * 2) / names.length;
        let normalizedRotation = currentRotation % (Math.PI * 2);
        if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;
        // Pointer is at angle 0 (pointing to the right); compute which segment covers this angle
        let index = Math.floor((0 - normalizedRotation) / arcSize) % names.length;
        if (index < 0) index += names.length;
        pointer.style.color = colors[index % colors.length] || '#fff';
    }

function spin() {
    if (isSpinning || names.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;

    const savedCheatName = localStorage.getItem('cheatWinner');
    let forcedIndex = names.findIndex(n => n.toLowerCase() === (savedCheatName || "").toLowerCase());

    const arcSize = (Math.PI * 2) / names.length;
    const extraSpins = 5 * Math.PI * 2; // 5 Putaran penuh
    let targetRotation;

    if (forcedIndex !== -1) {
        // Logika Matematika agar berhenti di Nama Cheat (Pointer di sisi kanan/0 Radian)
        const stopAngle = (Math.PI * 2) - (forcedIndex * arcSize) - (arcSize / 2);
        targetRotation = currentRotation + extraSpins + (stopAngle - (currentRotation % (Math.PI * 2)));
    } else {
        targetRotation = currentRotation + extraSpins + (Math.random() * Math.PI * 2);
    }

    const duration = 4000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3); // Slow down effect

        currentRotation = currentRotation + (targetRotation - currentRotation) * (easeOut * 0.05);
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin();
        }
    }
    requestAnimationFrame(animate);
}

// Tambahkan variabel global ini di bagian atas (jika belum ada)
let lastWinnerIndex = null;

function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;

    const arcSize = (Math.PI * 2) / names.length;
    // Normalisasi rotasi agar selalu di antara 0 sampai 2*PI
    let normalizedRotation = currentRotation % (Math.PI * 2);
    if (normalizedRotation < 0) normalizedRotation += Math.PI * 2;
    
    // Hitung indeks pemenang (karena putaran berlawanan arah jarum jam secara matematis)
    let winnerIndex = Math.floor(((Math.PI * 2) - normalizedRotation) / arcSize) % names.length;
    
    const winner = names[winnerIndex];
    lastWinnerIndex = winnerIndex; // Simpan index untuk fungsi Remove

    // Simpan ke history
    addResult(winner);
    
    // Tampilkan Modal
    winnerDisplay.innerText = winner;
    modalOverlay.style.display = 'flex';
    document.body.classList.add('modal-open'); // Tambahkan class agar background tetap bagus
    
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modal.classList.add('show');
    }, 50);
}

// FUNGSI REMOVE: Tambahkan ini agar tombol Remove di modal berfungsi
const removeBtn = document.getElementById('remove-btn');
if (removeBtn) {
    removeBtn.onclick = () => {
        if (lastWinnerIndex !== null) {
            names.splice(lastWinnerIndex, 1); // Hapus nama dari array
            nameInput.value = names.join('\n'); // Update textarea
            updateNames(); // Gambar ulang wheel
            lastWinnerIndex = null;
            hideWinner(); // Tutup modal
        }
    };
}

function hideWinner() {
    modalOverlay.style.opacity = '0';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 300);
}

// Jalankan aplikasi


// Tambahkan pemanggilan init di akhir file


    function removeName(index) {
        names.splice(index, 1);
        nameInput.value = names.join('\n');
        updateNames();
        
        if (names.length === 0) {
            statusMsg.innerText = "All names have been selected!";
            spinBtn.disabled = true;
        }
    }

   function showWinner(name) {
    // Mainkan suara jika ada
    if (typeof winSound !== 'undefined') {
        winSound.currentTime = 0;
        winSound.play().catch(() => {});
    }

    winnerDisplay.innerText = name;
    modalOverlay.style.display = 'flex';
    // Add class to body so we can hide the page-level vignette while the modal is visible
    document.body.classList.add('modal-open');
    
    // Mulai animasi confetti
    startCelebration();

    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modal.classList.add('show');
    }, 10);
}

    function hideWinner() {
    modalOverlay.style.opacity = '0';
    modal.classList.remove('show');
    // Remove class so background vignette comes back when modal is closed
    document.body.classList.remove('modal-open');
    
    // Matikan animasi confetti
    stopCelebration();

    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 300);
}

    // --- Spin sound helpers ---
    function startSpinSound() {
        if (spinAudio && spinAudio.src && spinAudio.src.length) {
            spinAudio.loop = !!soundLoop.checked;
            spinAudio.currentTime = 0;
            spinAudio.volume = parseFloat(soundVolume.value) || 0.8;
            spinAudio.play().catch(() => {});
            return;
        }

        // WebAudio fallback (simple whoosh)
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            spinOsc = audioContext.createOscillator();
            spinGain = audioContext.createGain();
            spinOsc.type = 'sawtooth';
            spinOsc.frequency.value = 80;
            spinGain.gain.value = parseFloat(soundVolume.value) ? (parseFloat(soundVolume.value) * 0.08) : 0.06;
            spinOsc.connect(spinGain); spinGain.connect(audioContext.destination);
            spinOsc.start();
        } catch (err) {
            console.warn('WebAudio start failed', err);
        }
    }

    function updateSpinSound(easeFactor) {
        // easeFactor ranges 0..1, we use it to modulate playbackRate/frequency
        if (spinAudio && spinAudio.src && spinAudio.src.length) {
            const rate = 0.5 + (1.5 * easeFactor);
            try { spinAudio.playbackRate = Math.max(0.3, rate); } catch (e) {}
        } else if (spinOsc) {
            try {
                spinOsc.frequency.setValueAtTime(80 + (easeFactor * 600), audioContext.currentTime);
                spinGain.gain.setValueAtTime((parseFloat(soundVolume.value) || 0.8) * 0.06 * (0.5 + easeFactor), audioContext.currentTime);
            } catch (e) {}
        }
    }

    function stopSpinSound() {
        if (spinAudio && spinAudio.src && spinAudio.src.length) {
            try { spinAudio.pause(); spinAudio.currentTime = 0; } catch (e) {}
        }
        if (spinOsc) {
            try { spinOsc.stop(); } catch (e) {}
            try { spinOsc.disconnect(); spinGain.disconnect(); audioContext.close(); } catch (e) {}
            spinOsc = null; spinGain = null; audioContext = null;
        }
    }

    // --- Confetti helpers ---
    let _confettiContainer = null;
    let _confettiTimeout = null;

    function startConfetti(amount = 80) {
        stopConfetti(); // ensure none are already running
        _confettiContainer = document.createElement('div');
        _confettiContainer.className = 'confetti-container';
        // Append to modal overlay so confetti shows over the dark overlay background but behind the modal
        try {
            (modalOverlay || document.body).appendChild(_confettiContainer);
            // Ensure container is positioned relative to overlay
            _confettiContainer.style.position = 'absolute';
            _confettiContainer.style.top = '0';
            _confettiContainer.style.left = '0';
            _confettiContainer.style.width = '100%';
            _confettiContainer.style.height = '100%';
        } catch (e) {
            document.body.appendChild(_confettiContainer);
        }

        const colors = ['#e74c3c','#f39c12','#f6e05e','#2ecc71','#3498db','#9b59b6','#ff6b6b','#ffd166','#60a5fa'];
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

        // Create a dense curtain across the top (gate-like)
        const rows = 2; // two layers to give depth
        for (let r = 0; r < rows; r++) {
            for (let i = 0; i < amount / rows; i++) {
                const conf = document.createElement('div');
                conf.className = 'confetti';

                // Shape: mostly rectangles/squares
                const shapeRoll = Math.random();
                if (shapeRoll < 0.1) { conf.classList.add('circle'); }
                else if (shapeRoll < 0.16) { conf.classList.add('emoji'); conf.innerText = ['🎊','🎉','✨'][Math.floor(Math.random()*3)]; conf.style.fontSize = (12 + Math.random()*10) + 'px'; conf.style.lineHeight = '1'; }
                else { conf.classList.add('square'); }

                // Position spread across width
                const left = Math.random() * vw;
                conf.style.left = (left | 0) + 'px';

                // Slight vertical stagger so it forms a dense top curtain
                const topOffset = -8 - (Math.random() * 6) - (r * 6);
                conf.style.top = topOffset + 'vh';

                // Sizes
                const sizeType = Math.random();
                if (sizeType < 0.45) { conf.classList.add('small'); }
                else if (sizeType < 0.85) { conf.classList.add('medium'); }
                else { conf.classList.add('large'); }

                // Color
                const col = colors[Math.floor(Math.random() * colors.length)];
                if (!conf.innerText) conf.style.background = col;

                // Animation timing - vertical fall with slight x sway and varied durations
                const delay = Math.random() * 0.2;
                const duration = 2.5 + Math.random() * 2.5; // 2.5..5s
                const swayDur = 0.9 + Math.random() * 1.4;
                conf.style.animation = `confetti-fall-vertical ${duration}s cubic-bezier(.2,.7,.2,1) ${delay}s forwards, confetti-sway ${swayDur}s ease-in-out ${delay}s infinite`;

                // Random rotation and transform
                conf.style.transform = `rotate(${Math.floor(Math.random()*360)}deg)`;

                _confettiContainer.appendChild(conf);
            }
        }

        // Auto-stop after 4.2s by default (within 3-5s as requested)
        _confettiTimeout = setTimeout(() => stopConfetti(), 4200);
    }

    function stopConfetti() {
        try {
            if (_confettiTimeout) { clearTimeout(_confettiTimeout); _confettiTimeout = null; }
            if (_confettiContainer) { _confettiContainer.remove(); _confettiContainer = null; }
        } catch (e) {}
    }

    // --- Results / history helpers ---
    function loadResults() {
        try {
            const raw = localStorage.getItem('winnerResults');
            results = raw ? JSON.parse(raw) : [];
        } catch (e) { results = []; }
        renderResults();
    }

    function saveResults() {
        try { localStorage.setItem('winnerResults', JSON.stringify(results)); } catch (e) {}
    }

    function renderResults() {
        if (!resultsListEl) return;
        resultsListEl.innerHTML = '';
        results.forEach((r, idx) => {
            const item = document.createElement('div');
            item.className = 'result-item';

            const left = document.createElement('div');
            left.innerHTML = `<div class="name">${escapeHtml(r.name)}</div><div class="time">${escapeHtml(r.time)}</div>`;

            const right = document.createElement('div');
            const btn = document.createElement('button');
            btn.className = 'result-remove';
            btn.innerText = '×';
            btn.title = 'Remove from history';
            btn.addEventListener('click', () => {
                results.splice(idx, 1); saveResults(); renderResults();
            });
            right.appendChild(btn);

            item.appendChild(left); item.appendChild(right);
            resultsListEl.appendChild(item);
        });
        if (resultsCountEl) resultsCountEl.innerText = results.length;
    }

    function addResult(name) {
        const now = new Date();
        const time = now.toLocaleString();
        results.unshift({ name, time }); // newest first
        saveResults(); renderResults();
    }

    function escapeHtml(s) { return (''+s).replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }

    function resetWheel() {
        // Restore the original list and UI state
        nameInput.value = initialList || "";
        currentRotation = 0;
        isSpinning = false;
        nameInput.disabled = false;
        hideWinner(); // ensure modal is closed
        stopSpinSound(); // stop spin audio if playing
        try { if (popupAudio) { popupAudio.pause(); popupAudio.currentTime = 0; } } catch (e) {}
        try { stopConfetti(); } catch (e) {}
        updateNames();
        drawWheel();
        spinBtn.disabled = names.length === 0;
        statusMsg.innerText = names.length === 0 ? "Add some names to spin!" : "";
    }

    // --- CONFETTI SYSTEM ---
const confCanvas = document.getElementById('confetti-canvas');
const confCtx = confCanvas.getContext('2d');
let confettiActive = false;
let particles = [];

function resizeConfetti() {
    confCanvas.width = window.innerWidth;
    confCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

class ConfettiParticle {
    constructor() {
        this.colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FFC300', '#33FFF6'];
        this.reset();
    }

    reset() {
        this.x = Math.random() * confCanvas.width;
        this.y = Math.random() * confCanvas.height - confCanvas.height; // Start above screen
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 2;
        this.rotation = Math.random() * 360;
        this.rotSpeed = Math.random() * 10 - 5;
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotSpeed;
        if (this.y > confCanvas.height) this.reset();
    }

    draw() {
        confCtx.save();
        confCtx.translate(this.x, this.y);
        confCtx.rotate(this.rotation * Math.PI / 180);
        confCtx.fillStyle = this.color;
        confCtx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        confCtx.restore();
    }
}



function initConfetti() {
    particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push(new ConfettiParticle());
    }
}

function animateConfetti() {
    if (!confettiActive) return;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateConfetti);
}

function startCelebration() {
    confettiActive = true;
    initConfetti();
    animateConfetti();
}

function stopCelebration() {
    confettiActive = false;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
}
    // Initialize the app
    init();