// ============================================
// UTILITY
// ============================================
function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// ============================================
// FIX: ALWAYS START AT TOP ON REFRESH
// ============================================
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
document.addEventListener('DOMContentLoaded', () => window.scrollTo({ top: 0, behavior: 'instant' }));

// ============================================
// SECURITY
// ============================================
document.addEventListener('contextmenu', e => { e.preventDefault(); return false; });
document.addEventListener('keydown', e => {
    if (e.key === 'F12') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) { e.preventDefault(); return false; }
    if (e.ctrlKey && (e.key === 'u' || e.key === 's')) { e.preventDefault(); return false; }
});
document.addEventListener('selectstart', e => { if (e.target.tagName === 'IMG') { e.preventDefault(); return false; } });
document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') { e.preventDefault(); return false; } });

document.addEventListener('visibilitychange', () => {
    const state = document.hidden ? 'paused' : 'running';
    document.querySelectorAll('.bg-animation span, .orbit-ring, .orbit-dot').forEach(el => el.style.animationPlayState = state);
    if (document.hidden && musicEnabled && bgMusic) bgMusic.pause();
    else if (!document.hidden && musicEnabled && bgMusic) bgMusic.play().catch(() => {});
});

// ============================================
// LOADING SCREEN — GUARANTEED 3-SECOND TIMER
// ============================================
const loadingScreen = document.getElementById('loadingScreen');
const loaderBar     = document.getElementById('loaderBar');
const loaderText    = document.getElementById('loaderText');

const loaderPhrases = [
    'Initializing...',
    'Loading assets...',
    'Building portfolio...',
    'Almost ready...',
    'Welcome!'
];

// Total visible duration in ms — exactly 3 seconds
const LOADER_DURATION = 3000;
let loaderStartTime   = null;
let loaderRAF         = null;
let loaderDone        = false;

// Phrase thresholds (% of progress at which each phrase shows)
const phraseThresholds = [0, 20, 45, 70, 92];
let currentPhraseIndex = 0;

function runLoader(timestamp) {
    if (loaderDone) return;

    // Initialise start time on first frame
    if (!loaderStartTime) loaderStartTime = timestamp;

    // Elapsed since loader started (capped at LOADER_DURATION)
    const elapsed  = Math.min(timestamp - loaderStartTime, LOADER_DURATION);

    // easeInOutQuad so the bar accelerates then decelerates naturally
    const t        = elapsed / LOADER_DURATION;               // 0 → 1
    const eased    = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const progress = eased * 100;                             // 0 → 100

    // Update bar width
    if (loaderBar) loaderBar.style.width = progress + '%';

    // Update phrase based on current progress
    for (let i = phraseThresholds.length - 1; i >= 0; i--) {
        if (progress >= phraseThresholds[i] && currentPhraseIndex < i) {
            currentPhraseIndex = i;
            if (loaderText) loaderText.textContent = loaderPhrases[i];
            break;
        }
    }

    // Keep animating until duration is complete
    if (elapsed < LOADER_DURATION) {
        loaderRAF = requestAnimationFrame(runLoader);
    } else {
        // Reached 100% — show "Welcome!" and hide
        if (loaderBar)  loaderBar.style.width = '100%';
        if (loaderText) loaderText.textContent = 'Welcome!';
        hideLoader();
    }
}

function hideLoader() {
    if (loaderDone) return;   // guard: run only once
    loaderDone = true;
    if (loaderRAF) cancelAnimationFrame(loaderRAF);
    if (loadingScreen) loadingScreen.classList.add('hidden');
    tryAutoPlayMusic();
}

// Start the rAF loop
loaderRAF = requestAnimationFrame(runLoader);

// HARD FAILSAFE: if anything above stalls, force-hide after 3.5 s
setTimeout(hideLoader, 3500);

// ============================================
// THEME TOGGLE — SMOOTH FLASH
// ============================================
const themeToggle = document.getElementById('themeToggle');
const htmlEl   = document.documentElement;
const iconDark  = themeToggle ? themeToggle.querySelector('.theme-icon-dark')  : null;
const iconLight = themeToggle ? themeToggle.querySelector('.theme-icon-light') : null;

const savedTheme = localStorage.getItem('tg-theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;z-index:99999;pointer-events:none;
            background:${next === 'light' ? 'rgba(255,255,255,0.16)' : 'rgba(5,6,10,0.16)'};
            opacity:0;transition:opacity 0.22s ease;`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            setTimeout(() => {
                htmlEl.setAttribute('data-theme', next);
                localStorage.setItem('tg-theme', next);
                updateThemeIcon(next);
                themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 250);
            }, 110);
        });
        themeToggle.classList.add('active');
        setTimeout(() => themeToggle.classList.remove('active'), 400);
    });
}

function updateThemeIcon(theme) {
    if (!iconDark || !iconLight) return;
    iconDark.style.display  = theme === 'dark' ? 'inline' : 'none';
    iconLight.style.display = theme === 'dark' ? 'none'   : 'inline';
}

// ============================================
// MUSIC
// ============================================
const musicToggle = document.getElementById('musicToggle');
const bgMusic     = document.getElementById('bgMusic');
const musicIconOn  = musicToggle ? musicToggle.querySelector('.music-icon-on')  : null;
const musicIconOff = musicToggle ? musicToggle.querySelector('.music-icon-off') : null;
let musicEnabled = false;

function tryAutoPlayMusic() {
    if (!bgMusic) return;
    const source = bgMusic.querySelector('source');
    if (!source || !source.src) return;
    bgMusic.volume = 0.18;
    const p = bgMusic.play();
    if (p) p.then(() => { musicEnabled = true; updateMusicIcon(true); if (musicToggle) musicToggle.classList.add('active'); }).catch(() => { musicEnabled = false; updateMusicIcon(false); });
}
if (musicToggle) {
    musicToggle.addEventListener('click', () => {
        if (!bgMusic) return;
        if (musicEnabled) {
            bgMusic.pause(); musicEnabled = false; updateMusicIcon(false);
            musicToggle.classList.remove('active'); musicToggle.setAttribute('aria-pressed','false');
        } else {
            bgMusic.volume = 0.18;
            bgMusic.play().then(() => { musicEnabled = true; updateMusicIcon(true); musicToggle.classList.add('active'); musicToggle.setAttribute('aria-pressed','true'); }).catch(() => {});
        }
    });
}
function updateMusicIcon(playing) {
    if (!musicIconOn || !musicIconOff) return;
    musicIconOn.style.display  = playing ? 'inline' : 'none';
    musicIconOff.style.display = playing ? 'none'   : 'inline';
}

// ============================================
// CURSOR — non-touch only
// ============================================
if (!isTouchDevice()) {
    const cursorGlow = document.getElementById('cursorGlow');
    let glowX = window.innerWidth / 2, glowY = window.innerHeight / 2;
    let targetGlowX = glowX, targetGlowY = glowY;
    document.addEventListener('mousemove', e => { targetGlowX = e.clientX; targetGlowY = e.clientY; });
    (function animateGlow() {
        glowX += (targetGlowX - glowX) * 0.07;
        glowY += (targetGlowY - glowY) * 0.07;
        if (cursorGlow) { cursorGlow.style.left = glowX + 'px'; cursorGlow.style.top = glowY + 'px'; }
        requestAnimationFrame(animateGlow);
    })();

    const cursorSpotlight = document.getElementById('cursorSpotlight');
    let spotX = -200, spotY = -200, targetSpotX = -200, targetSpotY = -200, spotActive = false;
    document.addEventListener('mousemove', e => {
        targetSpotX = e.clientX; targetSpotY = e.clientY;
        const isOnHL = e.target.closest('.hl-hover') !== null || e.target.classList.contains('hl-hover');
        if (isOnHL && !spotActive) { spotActive = true; if (cursorSpotlight) cursorSpotlight.classList.add('active'); }
        else if (!isOnHL && spotActive) { spotActive = false; if (cursorSpotlight) cursorSpotlight.classList.remove('active'); }
    });
    document.addEventListener('mouseleave', () => { spotActive = false; if (cursorSpotlight) cursorSpotlight.classList.remove('active'); });
    (function animateSpot() {
        spotX += (targetSpotX - spotX) * 0.18;
        spotY += (targetSpotY - spotY) * 0.18;
        if (cursorSpotlight) { cursorSpotlight.style.left = spotX + 'px'; cursorSpotlight.style.top = spotY + 'px'; }
        requestAnimationFrame(animateSpot);
    })();
}

// ============================================
// MOBILE MENU
// ============================================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
function closeMenu() {
    if (mobileMenuToggle) { mobileMenuToggle.classList.remove('active'); mobileMenuToggle.setAttribute('aria-expanded','false'); }
    if (navMenu) navMenu.classList.remove('active');
}
function openMenu() {
    if (mobileMenuToggle) { mobileMenuToggle.classList.add('active'); mobileMenuToggle.setAttribute('aria-expanded','true'); }
    if (navMenu) navMenu.classList.add('active');
}
if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => mobileMenuToggle.classList.contains('active') ? closeMenu() : openMenu());
    document.querySelectorAll('.nav-menu a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('click', e => { if (mobileMenuToggle && navMenu && !mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 70;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navHeight, behavior: 'smooth' });
        }
    });
});

// ============================================
// SCROLL TO TOP + PROGRESS
// ============================================
const scrollTopBtn = document.getElementById('scrollTopBtn');
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
        const st = window.pageYOffset;
        const prog = (st / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        document.documentElement.style.setProperty('--scroll-progress', prog + '%');
        if (scrollTopBtn) {
            if (st > 300) {
                scrollTopBtn.classList.add('visible');
                scrollTopBtn.style.background = `conic-gradient(var(--accent-primary) ${prog * 3.6}deg, var(--accent-subtle) ${prog * 3.6}deg)`;
            } else scrollTopBtn.classList.remove('visible');
        }
        updateActiveNav();
        scrollTicking = false;
    });
}, { passive: true });

// Active nav
function updateActiveNav() {
    let current = '';
    document.querySelectorAll('section').forEach(s => { if (window.pageYOffset >= s.offsetTop - 180) current = s.getAttribute('id'); });
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
    });
}

// ============================================
// SECTION REVEAL
// ============================================
const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            sectionObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('section').forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(20px)';
    s.style.transition = 'opacity .7s ease, transform .7s ease';
    sectionObserver.observe(s);
});

// ============================================
// CARD RADIAL GRADIENT ON MOUSE MOVE
// ============================================
document.querySelectorAll('.card, .project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--mouse-y', ((e.clientY - r.top)  / r.height * 100) + '%');
    });
});

// ============================================
// PARALLAX BG
// ============================================
let parallaxTick = false;
window.addEventListener('scroll', () => {
    if (parallaxTick) return;
    parallaxTick = true;
    requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;
        document.querySelectorAll('.bg-animation span').forEach((el, i) => el.style.transform = `translateY(${scrolled * (i + 1) * 0.04}px)`);
        parallaxTick = false;
    });
}, { passive: true });

// ============================================
// TIMELINE ANIMATION
// ============================================
const timelineObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
            timelineObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });
document.querySelectorAll('.timeline-item').forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-30px)';
    item.style.transition = `opacity .5s ease ${i * .07}s, transform .5s ease ${i * .07}s`;
    timelineObserver.observe(item);
});

// ============================================
// EXP CARDS REVEAL
// ============================================
const expObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
            expObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });
document.querySelectorAll('.exp-entry').forEach((entry, i) => {
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(28px) scale(0.98)';
    entry.style.transition = `opacity .6s ease ${i * .15}s, transform .6s ease ${i * .15}s`;
    expObserver.observe(entry);
});

// ============================================
// SKILL CATEGORIES ANIMATION
// ============================================
const skillObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
            skillObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });
document.querySelectorAll('.skill-category').forEach((cat, i) => {
    cat.style.opacity = '0';
    cat.style.transform = 'translateX(-30px)';
    cat.style.transition = `opacity .5s ease ${i * .1}s, transform .5s ease ${i * .1}s`;
    skillObserver.observe(cat);
});

// ============================================
// PROFILE FLOAT
// ============================================
const profileImg = document.getElementById('profileImg');
if (profileImg) {
    let floatDir = 1, floatTimer = null;
    function floatImage() {
        floatTimer = setInterval(() => {
            if (profileImg.matches(':hover')) return;
            profileImg.style.transition = 'transform 2s ease-in-out, box-shadow .4s ease';
            profileImg.style.transform = `translateY(${floatDir * 5}px)`;
            floatDir *= -1;
        }, 2000);
    }
    floatImage();
    profileImg.addEventListener('mouseenter', () => { if (floatTimer) clearInterval(floatTimer); });
    profileImg.addEventListener('mouseleave', () => { profileImg.style.transform = 'translateY(0)'; floatImage(); });
}

// ============================================
// CARDS REVEAL (internship grid)
// ============================================
const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
            cardObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });
document.querySelectorAll('.cards .card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px) scale(0.97)';
    card.style.transition = `opacity .5s ease ${i * .1}s, transform .5s ease ${i * .1}s`;
    cardObserver.observe(card);
});

// Project cards reveal
const projectObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
            projectObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });
document.querySelectorAll('.projects-grid .project-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px) scale(0.97)';
    card.style.transition = `opacity .55s ease ${i * .1}s, transform .55s ease ${i * .1}s`;
    projectObserver.observe(card);
});

// ============================================
// LANGUAGE ITEMS ANIMATION
// ============================================
const langObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.language-item').forEach((item, i) => {
                setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 120);
            });
            langObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });
const langGrid = document.querySelector('.language-grid');
if (langGrid) {
    langGrid.querySelectorAll('.language-item').forEach(item => {
        item.style.opacity = '0'; item.style.transform = 'translateX(-20px)';
        item.style.transition = 'opacity .45s ease, transform .45s ease';
    });
    langObserver.observe(langGrid);
}

// ============================================
// ACHIEVEMENT BADGE PULSE
// ============================================
document.querySelectorAll('.achievement-badge').forEach(badge => {
    badge.addEventListener('mouseenter', function() { this.style.animation = 'pulse .45s ease'; });
    badge.addEventListener('animationend', function() { this.style.animation = ''; });
});

// ============================================
// EMAIL LINK FIX
// Bypasses any Cloudflare email obfuscation by
// setting the href via JS at runtime.
// ============================================
(function fixEmailLinks() {
    const user   = 'ghosh.tanbi';
    const domain = 'gmail.com';
    const address = user + '@' + domain;
    // Fix every contact-item whose label text is "Email"
    document.querySelectorAll('.contact-item').forEach(function(item) {
        const label = item.querySelector('.contact-label');
        if (label && label.textContent.trim().toLowerCase() === 'email') {
            // Force correct href
            item.setAttribute('href', 'mailto:' + address);
            // Fix displayed text — replace any obfuscated span/text
            const val = item.querySelector('.contact-value');
            if (val) val.textContent = address;
        }
    });
})();

// ============================================
// LEADERSHIP BUBBLE TRANSITION
// Injects rising bubbles between the two exp-cards
// ============================================
(function injectLeadershipBubbles() {
    const timeline = document.querySelector('.exp-timeline');
    if (!timeline) return;

    const entries = timeline.querySelectorAll('.exp-entry');
    if (entries.length < 2) return;

    // Create bubble container positioned between entry[0] bottom and entry[1]
    const container = document.createElement('div');
    container.className = 'exp-inter-bubbles';
    container.setAttribute('aria-hidden', 'true');

    // Config for each bubble: [left%, size-px, duration-s, delay-s, colorVar]
    const bubbleDefs = [
        [8,   10, 3.6, 0.0,  'var(--accent-primary)'],
        [18,  7,  4.2, 0.5,  'var(--accent-secondary)'],
        [30,  13, 3.4, 1.0,  'var(--accent-gold)'],
        [42,  8,  4.5, 0.3,  'var(--accent-primary)'],
        [54,  11, 3.8, 0.8,  'var(--accent-secondary)'],
        [65,  9,  4.1, 1.4,  'var(--accent-primary)'],
        [75,  14, 3.5, 0.6,  'var(--accent-gold)'],
        [87,  7,  4.3, 1.1,  'var(--accent-secondary)'],
        [95,  10, 3.7, 0.2,  'var(--accent-primary)'],
    ];

    bubbleDefs.forEach(function(def) {
        const b = document.createElement('span');
        b.className = 'exp-inter-bubble';
        b.style.cssText = [
            'left:'             + def[0] + '%',
            'width:'            + def[1] + 'px',
            'height:'           + def[1] + 'px',
            'animation-duration:'+ def[2] + 's',
            'animation-delay:'  + def[3] + 's',
            'background:'       + def[4],
        ].join(';');
        container.appendChild(b);
    });

    // Insert after the first entry
    entries[0].insertAdjacentElement('afterend', container);
})();

// ============================================
// DYNAMIC KEYFRAMES
// ============================================
const extraStyles = document.createElement('style');
extraStyles.textContent = `
@keyframes pulse { 0%,100%{transform:scale(1);}50%{transform:scale(1.14);} }
@keyframes iconBounce { 0%,100%{transform:translateY(0) rotate(0);}25%{transform:translateY(-8px) rotate(-5deg);}75%{transform:translateY(-4px) rotate(5deg);} }
`;
document.head.appendChild(extraStyles);

// ============================================
// FOOTER YEAR
// ============================================
const yr = document.getElementById('currentYear');
if (yr) yr.textContent = new Date().getFullYear();

// ============================================
// FLUID FONT SIZE
// ============================================
function adjustFontSize() {
    const vw = window.innerWidth;
    document.documentElement.style.fontSize =
        (vw > 1440 ? 17 : vw > 1200 ? 16 : vw > 768 ? 15 : vw > 480 ? 14.5 : 14) + 'px';
}
adjustFontSize();
window.addEventListener('resize', adjustFontSize, { passive: true });

// ============================================
// PAGE INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero-content');
    if (hero) {
        hero.style.opacity = '0'; hero.style.transform = 'translateY(24px)';
        setTimeout(() => { hero.style.transition = 'all .9s ease'; hero.style.opacity = '1'; hero.style.transform = 'translateY(0)'; }, 100);
    }
    setTimeout(() => document.body.classList.add('loaded'), 500);
});

// ============================================
// TOUCH OPTIMIZATIONS
// ============================================
if (isTouchDevice()) {
    document.querySelectorAll('.card, .project-card, .skill-category, .timeline-item, .exp-card').forEach(el => {
        el.addEventListener('touchstart', function() { this.style.borderColor = 'var(--accent-primary)'; }, { passive: true });
        el.addEventListener('touchend', function() { setTimeout(() => this.style.borderColor = '', 300); }, { passive: true });
    });
}

// ============================================
// PERFORMANCE LOG
// ============================================
window.addEventListener('load', () => {
    console.log('%c✨ Tanbi Ghosh Portfolio', 'color:#a8cdff;font-size:18px;font-weight:bold;');
    console.log('%cLoaded in ' + performance.now().toFixed(2) + 'ms', 'color:#a8cdff;font-size:12px;');
    console.log('%cContact: ghosh.tanbi@gmail.com', 'color:#8a9ab8;font-size:12px;');
});