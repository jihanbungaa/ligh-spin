const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('name-input');
const spinBtn = document.getElementById('center-spin-button');
const wheelWrapper = document.getElementById('wheel-wrapper');
const resetBtn = document.getElementById('reset-btn');
const centerSpinBtn = document.getElementById('center-spin-button');
const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const winnerDisplay = document.getElementById('winner-name');
const closeModal = document.getElementById('close-modal');
const popupToggle = document.getElementById('popup-toggle');
const statusMsg = document.getElementById('status-msg');


// Tab & Results / history UI elements
const tabEntriesBtn = document.getElementById('tab-entries');
const tabResultsBtn = document.getElementById('tab-results');
const entriesPanel = document.getElementById('entries-panel');
const resultsPanel = document.getElementById('results-panel');
const entriesCountEl = document.getElementById('entries-count');
const resultsListEl = document.getElementById('results-list');
const resultsCountEl = document.getElementById('results-count');
const clearResultsBtn = document.getElementById('clear-results');
const sortResultsBtn = document.getElementById('sort-results');
let results = [];

// Image background feature
const addImageBtn = document.getElementById('add-image-btn');
const imageInput = document.getElementById('image-input');
let wheelBackgroundImage = null; // Image object untuk background
let backgroundImageData = null; // Base64 data untuk localStorage

let audioDataUrl = null;
let audioEnabled = false;
let audioContext = null;
let spinOsc = null;
let spinGain = null;

let names = [];
let currentRotation = 0;
let isSpinning = false;
let initialList = "";
let lastWinnerIndex = null;

const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F333FF', 
    '#FF33A1', '#33FFF6', '#FFC300', '#581845',
    '#28B463', '#AF7AC5', '#F4D03F', '#E67E22'
];

// ==================== HIDDEN CHEAT FEATURE (UPDATED) ====================
const CHEAT_KEY = 'wheelCheatName_secret';

// Fungsi untuk mengaktifkan prompt (dipicu oleh double click)
function activateCheatMode() {
    const currentCheat = localStorage.getItem(CHEAT_KEY);
    const defaultValue = currentCheat || '';
    
    // Teks prompt harus sama persis sesuai permintaan
    const cheatName = prompt(
        "Cheat Mode Aktif 🔒\nMasukkan nama yang ingin selalu menang.\n(Kosongkan untuk menonaktifkan cheat)",
        defaultValue
    );
    
    if (cheatName === null) return; // Jika tekan Cancel
    
    if (cheatName.trim() === '') {
        localStorage.removeItem(CHEAT_KEY);
    } else {
        localStorage.setItem(CHEAT_KEY, cheatName.trim());
    }
}

// Fungsi pembantu untuk mengecek apakah cheat valid dengan daftar nama yang ada
function getCheatWinnerIndex() {
    const cheatName = localStorage.getItem(CHEAT_KEY);
    if (!cheatName) return null;
    
    // Cari index nama yang case-insensitive
    const foundIndex = names.findIndex(n => n.toLowerCase() === cheatName.toLowerCase());
    
    // Jika nama tidak ada di daftar (entries), return null (kembali ke random normal)
    return (foundIndex !== -1) ? foundIndex : null;
}
// ==================== END HIDDEN CHEAT FEATURE ====================


// ==================== IMAGE BACKGROUND FEATURE ====================
function initImageFeature() {
    if (!addImageBtn || !imageInput) return;
    
    // Load saved image from localStorage
    loadBackgroundImage();
    
    // Click tombol Add image → trigger file input
    addImageBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    // Handle file selection
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        
        // Validasi format file
        const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Format tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.');
            return;
        }
        
        // Baca file sebagai base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            setBackgroundImage(base64Data);
        };
        reader.readAsDataURL(file);
        
        // Reset input agar bisa pilih file yang sama lagi
        imageInput.value = '';
    });
}

function setBackgroundImage(base64Data) {
    backgroundImageData = base64Data;
    
    // Create image object
    const img = new Image();
    img.onload = () => {
        wheelBackgroundImage = img;
        // Save to localStorage
        try {
            localStorage.setItem('wheelBackgroundImage', base64Data);
        } catch (e) {
            console.warn('Failed to save image to localStorage (might be too large)', e);
        }
        // Redraw wheel dengan background baru
        drawWheel();
    };
    img.src = base64Data;
}

function loadBackgroundImage() {
    try {
        const saved = localStorage.getItem('wheelBackgroundImage');
        if (saved) {
            setBackgroundImage(saved);
        }
    } catch (e) {
        console.warn('Failed to load background image', e);
    }
}

function clearBackgroundImage() {
    wheelBackgroundImage = null;
    backgroundImageData = null;
    try {
        localStorage.removeItem('wheelBackgroundImage');
    } catch (e) {}
    drawWheel();
}
// ==================== END IMAGE BACKGROUND FEATURE ====================

function init() {
    initialList = nameInput.value;
    updateNames();
    
    // Initialize image feature
    initImageFeature();
    
    nameInput.addEventListener('input', updateNames);
    spinBtn.addEventListener('click', spin);
    resetBtn.addEventListener('click', resetWheel);
    closeModal.addEventListener('click', hideWinner);
    modalOverlay.addEventListener('click', (e) => {
        if(e.target === modalOverlay) hideWinner();
    });

    if (centerSpinBtn) {
        centerSpinBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!isSpinning) spin(); });
        centerSpinBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isSpinning) spin(); }, {passive:false});
    }
    
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if (e.button && e.button !== 0) return;
            if (!isSpinning) spin();
        });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isSpinning) spin(); }, {passive:false});
    }

    const modalCloseX = document.getElementById('modal-close-x');
    const removeBtn = document.getElementById('remove-btn');
    if (modalCloseX) modalCloseX.addEventListener('click', hideWinner);
    if (removeBtn) removeBtn.addEventListener('click', () => {
        if (lastWinnerIndex !== null && typeof lastWinnerIndex !== 'undefined') {
            removeName(lastWinnerIndex);
            lastWinnerIndex = null;
            hideWinner();
        }
    });

    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.getElementById('theme-label');
    function applyTheme(theme) {
        if (theme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
        if (themeToggle) themeToggle.checked = theme === 'dark';
        if (themeLabel) themeLabel.innerText = theme === 'dark' ? 'Dark' : 'Light';
        localStorage.setItem('theme', theme);
    }
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    if (themeToggle) themeToggle.addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'dark' : 'light');
    });

    const hideToggle = document.getElementById('hide-toggle');
    const sidePanelEl = document.querySelector('.side-panel');
    function applyHideMode(h) {
        if (!sidePanelEl || !hideToggle) return;
        if (h) {
            sidePanelEl.classList.add('hidden');
            hideToggle.setAttribute('aria-pressed', 'true');
            hideToggle.classList.add('active');
            hideToggle.title = 'Show inputs';
        } else {
            sidePanelEl.classList.remove('hidden');
            hideToggle.setAttribute('aria-pressed', 'false');
            hideToggle.classList.remove('active');
            hideToggle.title = 'Hide inputs';
        }
        try { localStorage.setItem('hideSide', h ? 'true' : 'false'); } catch (e) {}
    }
    const savedHide = localStorage.getItem('hideSide') === 'true';
    if (hideToggle) {
        applyHideMode(savedHide);
        hideToggle.addEventListener('click', () => {
            const isPressed = hideToggle.getAttribute('aria-pressed') === 'true';
            applyHideMode(!isPressed);
        });
    } else if (savedHide && sidePanelEl) {
        sidePanelEl.classList.add('hidden');
    }

    try {
        audioDataUrl = localStorage.getItem('spinAudioData');
        audioEnabled = localStorage.getItem('spinAudioEnabled') === 'true';
        const savedVol = parseFloat(localStorage.getItem('spinAudioVolume')) || 0.8;

        if (audioDataUrl) spinAudio.src = audioDataUrl;
        if (soundEnable) soundEnable.checked = audioEnabled;
        if (soundVolume) soundVolume.value = savedVol;
        spinAudio.volume = savedVol;
        if (soundEnable) soundEnable.addEventListener('change', (e) => {
            audioEnabled = !!e.target.checked;
            localStorage.setItem('spinAudioEnabled', audioEnabled);
        });

        if (soundVolume) soundVolume.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            spinAudio.volume = v;
            localStorage.setItem('spinAudioVolume', v);
        });

        if (soundFile) soundFile.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                audioDataUrl = reader.result;
                spinAudio.src = audioDataUrl;
                localStorage.setItem('spinAudioData', audioDataUrl);
            };
            reader.readAsDataURL(f);
        });

        if (testSoundBtn) testSoundBtn.addEventListener('click', () => {
            if (!spinAudio.src) {
                const ac = new (window.AudioContext || window.webkitAudioContext)();
                const o = ac.createOscillator();
                const g = ac.createGain();
                o.type = 'sawtooth'; o.frequency.value = 400;
                g.gain.value = parseFloat(soundVolume.value) || 0.8;
                o.connect(g); g.connect(ac.destination);
                o.start();
                setTimeout(() => { o.stop(); ac.close(); }, 400);
            } else {
                spinAudio.currentTime = 0;
                spinAudio.volume = parseFloat(soundVolume.value) || 0.8;
                spinAudio.play().catch(() => {});
                setTimeout(() => { spinAudio.pause(); spinAudio.currentTime = 0; }, 800);
            }
        });
    } catch (err) {
        console.warn('Sound setup failed', err);
    }

    if (clearResultsBtn) clearResultsBtn.addEventListener('click', () => {
        if (!confirm('Clear the results history?')) return;
        results = [];
        saveResults(); renderResults();
    });
    if (sortResultsBtn) sortResultsBtn.addEventListener('click', () => {
        results.sort((a,b) => a.name.localeCompare(b.name));
        saveResults(); renderResults();
    });

    if (tabEntriesBtn) tabEntriesBtn.addEventListener('click', () => switchTab('entries'));
    if (tabResultsBtn) tabResultsBtn.addEventListener('click', () => switchTab('results'));

    function switchTab(tab) {
        if (tab === 'entries') {
            if (tabEntriesBtn) tabEntriesBtn.classList.add('active');
            if (tabResultsBtn) tabResultsBtn.classList.remove('active');
            if (entriesPanel) entriesPanel.classList.add('show');
            if (resultsPanel) resultsPanel.classList.remove('show');
        } else {
            if (tabEntriesBtn) tabEntriesBtn.classList.remove('active');
            if (tabResultsBtn) tabResultsBtn.classList.add('active');
            if (entriesPanel) entriesPanel.classList.remove('show');
            if (resultsPanel) resultsPanel.classList.add('show');
        }
    }

    const shuffleBtn = document.getElementById('shuffle-btn');
    const sortBtn = document.getElementById('sort-btn');
    if (shuffleBtn) shuffleBtn.addEventListener('click', () => {
        const arr = names.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        nameInput.value = arr.join('\n');
        updateNames();
    });
    if (sortBtn) sortBtn.addEventListener('click', () => {
        nameInput.value = names.slice().sort((a,b) => a.localeCompare(b)).join('\n'); updateNames();
    });

    if (entriesCountEl) entriesCountEl.innerText = nameInput.value.split('\n').filter(n=>n.trim()).length;
    if (resultsCountEl) resultsCountEl.innerText = results.length;

    loadResults();

    const wheelTitleEl = document.getElementById('wheel-title');
    const wheelDescEl = document.getElementById('wheel-description');
    const editTitleBtn = document.getElementById('floating-edit-btn') || document.getElementById('edit-title-btn');
    const editOverlay = document.getElementById('edit-overlay');
    const editModal = document.getElementById('edit-modal');
    const editTitleInput = document.getElementById('edit-title-input');
    const editDescTextarea = document.getElementById('edit-desc-textarea');
    const editCancelBtn = document.getElementById('edit-cancel');
    const editOkBtn = document.getElementById('edit-ok');
    const editCloseX = document.getElementById('edit-close-x');

    function openEditModal() {
        if (!editOverlay) return;
        editOverlay.dataset.origTitle = (wheelTitleEl && wheelTitleEl.innerText) ? wheelTitleEl.innerText : '';
        editOverlay.dataset.origDesc = (wheelDescEl && wheelDescEl.innerText) ? wheelDescEl.innerText : '';

        editTitleInput.value = editOverlay.dataset.origTitle;
        editDescTextarea.value = editOverlay.dataset.origDesc;

        const onTitleInput = () => { if (wheelTitleEl) wheelTitleEl.innerText = editTitleInput.value || 'Wheel title'; };
        const onDescInput = () => { if (wheelDescEl) wheelDescEl.innerText = editDescTextarea.value || 'Wheel description'; };
        editTitleInput.addEventListener('input', onTitleInput);
        editDescTextarea.addEventListener('input', onDescInput);

        editOverlay._previewHandlers = { onTitleInput, onDescInput };

        editOverlay.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(()=>{ editOverlay.style.opacity = '1'; editModal.classList.add('show'); }, 10);
        setTimeout(()=> { if (editTitleInput) editTitleInput.focus(); }, 160);
    }
    function closeEditModal(revertPreview = false) {
        if (!editOverlay) return;

        if (editOverlay._previewHandlers) {
            try {
                editTitleInput.removeEventListener('input', editOverlay._previewHandlers.onTitleInput);
                editDescTextarea.removeEventListener('input', editOverlay._previewHandlers.onDescInput);
            } catch (e) {}
            delete editOverlay._previewHandlers;
        }

        if (revertPreview) {
            if (wheelTitleEl) wheelTitleEl.innerText = editOverlay.dataset.origTitle || 'Wheel title';
            if (wheelDescEl) wheelDescEl.innerText = editOverlay.dataset.origDesc || 'Wheel description';
        }

        editOverlay.style.opacity = '0';
        editModal.classList.remove('show');
        document.body.classList.remove('modal-open');
        setTimeout(()=> { editOverlay.style.display = 'none'; }, 260);
    }

    if (editTitleBtn) editTitleBtn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(); });
    if (editOverlay) editOverlay.addEventListener('click', (e) => { if (e.target === editOverlay) closeEditModal(true); });
    if (editCancelBtn) editCancelBtn.addEventListener('click', (e)=> { e.preventDefault(); closeEditModal(true); });
    if (editCloseX) editCloseX.addEventListener('click', (e)=> { e.preventDefault(); closeEditModal(true); });
    if (editOkBtn) editOkBtn.addEventListener('click', (e)=> {
        e.preventDefault();
        const finalTitle = editTitleInput.value.trim() || 'Wheel title';
        const finalDesc = editDescTextarea.value.trim() || 'Wheel description';
        if (wheelTitleEl) wheelTitleEl.innerText = finalTitle;
        if (wheelDescEl) wheelDescEl.innerText = finalDesc;
        try { localStorage.setItem('wheelTitle', finalTitle); localStorage.setItem('wheelDescription', finalDesc); } catch (e) {}
        closeEditModal(false);
    });
    document.addEventListener('keydown', (e)=> {
        if (e.key === 'Escape' && editOverlay && editOverlay.style.display === 'flex') closeEditModal(true);
    });

    try {
        const savedTitle = localStorage.getItem('wheelTitle');
        const savedDesc = localStorage.getItem('wheelDescription');
        if (savedTitle && wheelTitleEl) wheelTitleEl.innerText = savedTitle;
        if (savedDesc && wheelDescEl) wheelDescEl.innerText = savedDesc;
    } catch (e) {}
}

function triggerSpin() {
    spinBtn.click();
}

spinBtn.addEventListener('click', () => {
    const instruction = document.querySelector('.wheel-instruction');
    if (instruction) instruction.style.opacity = '0';
});

function updateNames() {
    names = nameInput.value.split('\n').filter(name => name.trim() !== "");
    drawWheel();
    if (entriesCountEl) entriesCountEl.innerText = names.length;
    
    if (names.length === 0) {
        spinBtn.disabled = true;
        statusMsg.innerText = "Add some names to spin!";
    } else if (names.length === 1 && isSpinning === false) {
         statusMsg.innerText = "One person left!";
         spinBtn.disabled = false;
    } else {
        spinBtn.disabled = false;
        statusMsg.innerText = "";
    }
}

function drawWheel() {
    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 10;
    
    ctx.clearRect(0, 0, size, size);

    // LAYER 1: Draw background image (jika ada) - PALING BAWAH
    if (wheelBackgroundImage) {
        ctx.save();
        
        // Translate ke center untuk rotasi
        ctx.translate(center, center);
        ctx.rotate(currentRotation);
        ctx.translate(-center, -center);
        
        // Clip ke bentuk lingkaran
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw image dengan object-fit: cover effect
        const imgSize = Math.max(wheelBackgroundImage.width, wheelBackgroundImage.height);
        const scale = (radius * 2) / imgSize;
        const scaledWidth = wheelBackgroundImage.width * scale;
        const scaledHeight = wheelBackgroundImage.height * scale;
        
        // Center image
        const imgX = center - scaledWidth / 2;
        const imgY = center - scaledHeight / 2;
        
        ctx.drawImage(wheelBackgroundImage, imgX, imgY, scaledWidth, scaledHeight);
        
        ctx.restore();
    }

    // LAYER 2: Draw wheel slices (warna + border)
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
        
        // Draw Segment dengan transparansi jika ada background image
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, angle, angle + arcSize);
        
        // Jika ada background image, buat warna semi-transparan
        if (wheelBackgroundImage) {
            const color = colors[i % colors.length];
            // Convert hex to rgba dengan opacity 0.7
            const r = parseInt(color.slice(1,3), 16);
            const g = parseInt(color.slice(3,5), 16);
            const b = parseInt(color.slice(5,7), 16);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        } else {
            ctx.fillStyle = colors[i % colors.length];
        }
        
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // LAYER 3: Draw Text - PALING ATAS
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Sans-Serif";
        
        // Text shadow untuk keterbacaan
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        const displayText = name.length > 15 ? name.substring(0, 12) + "..." : name;
        ctx.fillText(displayText, radius - 30, 10);
        ctx.restore();
    });

    // Center circle decoration
    ctx.beginPath();
    ctx.arc(center, center, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    updatePointerColor();
}

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
    let index = Math.floor((0 - normalizedRotation) / arcSize) % names.length;
    if (index < 0) index += names.length;
    pointer.style.color = colors[index % colors.length] || '#fff';
}

function spin() {
    if (isSpinning || names.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    nameInput.disabled = true;
    try { if (centerSpinBtn) { centerSpinBtn.classList.add('spinning'); centerSpinBtn.disabled = true; } } catch (e) {}

    if (audioEnabled) startSpinSound();

    // CHEAT LOGIC
    const cheatIndex = getCheatWinnerIndex();
    let targetWinnerIndex;
    
    if (cheatIndex !== null && cheatIndex >= 0) {
        targetWinnerIndex = cheatIndex;
    } else {
        targetWinnerIndex = Math.floor(Math.random() * names.length);
    }

    const arcSize = (Math.PI * 2) / names.length;
    const targetSegmentAngle = targetWinnerIndex * arcSize;
    const targetAngle = targetSegmentAngle + (arcSize / 2);

    const extraSpins = 5 + Math.random() * 5;
    const spinDuration = 4000 + Math.random() * 2000;
    const startRotation = currentRotation;
    
    let normalizedCurrent = startRotation % (Math.PI * 2);
    if (normalizedCurrent < 0) normalizedCurrent += Math.PI * 2;
    
    let finalAngle = (Math.PI * 2) - targetAngle;
    if (finalAngle < 0) finalAngle += Math.PI * 2;
    
    let rotationNeeded = finalAngle - normalizedCurrent;
    if (rotationNeeded < 0) rotationNeeded += Math.PI * 2;
    
    const totalRotationGoal = startRotation + (extraSpins * Math.PI * 2) + rotationNeeded;
    
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        currentRotation = startRotation + (totalRotationGoal - startRotation) * easeOut;

        if (audioEnabled) updateSpinSound(easeOut);
        
        drawWheel(); // Background image ikut berputar karena menggunakan currentRotation

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin();
        }
    }

    requestAnimationFrame(animate);
}

function finishSpin() {
    isSpinning = false;
    nameInput.disabled = false;
    try { if (centerSpinBtn) { centerSpinBtn.classList.remove('spinning'); centerSpinBtn.disabled = false; } } catch (e) {}

    if (audioEnabled) stopSpinSound();
    
    const normalizedRotation = (currentRotation % (Math.PI * 2));
    const arcSize = (Math.PI * 2) / names.length;
    
    let winnerIndex = Math.floor((0 - normalizedRotation) / arcSize) % names.length;
    if (winnerIndex < 0) winnerIndex += names.length;
    
    const winner = names[winnerIndex];

    try { addResult(winner); } catch (e) {}

    if (popupToggle.checked) {
        lastWinnerIndex = winnerIndex;
        showWinner(winner);
    } else {
        setTimeout(() => {
            removeName(winnerIndex);
        }, 200);
    }
}

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
    if (typeof winSound !== 'undefined') {
        winSound.currentTime = 0;
        winSound.play().catch(() => {});
    }

    winnerDisplay.innerText = name;
    modalOverlay.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    startCelebration();

    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modal.classList.add('show');
    }, 10);
}

function hideWinner() {
    modalOverlay.style.opacity = '0';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
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
