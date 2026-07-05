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
    // Loading screen is decorative chrome — once it's gone, release it from
    // the accessibility tree and stop it from ever intercepting focus/clicks.
    if (loadingScreen) {
        loadingScreen.setAttribute('aria-hidden', 'true');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 450);
    }
}

// Skip the loader entirely for users who've asked for reduced motion,
// and for anyone landing directly on a deep link (in-page anchor).
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion || window.location.hash) {
    hideLoader();
} else {
    // Start the rAF loop
    loaderRAF = requestAnimationFrame(runLoader);
    // HARD FAILSAFE: if anything above stalls, force-hide after 3.5 s
    setTimeout(hideLoader, 3500);
}

// ============================================
// THEME TOGGLE — SMOOTH FLASH
// ============================================
const themeToggle = document.getElementById('themeToggle');
const htmlEl   = document.documentElement;
const iconDark  = themeToggle ? themeToggle.querySelector('.theme-icon-dark')  : null;
const iconLight = themeToggle ? themeToggle.querySelector('.theme-icon-light') : null;

function getPreferredTheme() {
    const saved = localStorage.getItem('tg-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const savedTheme = getPreferredTheme();
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
if (themeToggle) themeToggle.setAttribute('aria-pressed', savedTheme === 'light' ? 'true' : 'false');

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        // Respect reduced-motion users: skip the flash overlay entirely.
        if (prefersReducedMotion) {
            htmlEl.setAttribute('data-theme', next);
            localStorage.setItem('tg-theme', next);
            updateThemeIcon(next);
            themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
            return;
        }

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
    if (!source || !source.getAttribute('src')) return;
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
// ORCHID ID BUTTON — COPY TO CLIPBOARD
// ============================================
const orchidBtn = document.getElementById('orchidCopyBtn');
if (orchidBtn) {
    orchidBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const orchidValue = '0009-0003-4428-7162';
        const contactValue = orchidBtn.querySelector('.contact-value');
        const originalText = contactValue ? contactValue.textContent : '';

        function showCopied() {
            orchidBtn.style.borderColor = 'var(--accent-primary)';
            orchidBtn.style.background = 'var(--accent-subtle)';
            if (contactValue) contactValue.textContent = 'Copied!';
            orchidBtn.setAttribute('aria-live', 'polite');
            setTimeout(() => {
                if (contactValue) contactValue.textContent = originalText;
                orchidBtn.style.borderColor = '';
                orchidBtn.style.background = '';
            }, 2000);
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(orchidValue);
            } else {
                // Fallback for non-secure contexts / older browsers
                const ta = document.createElement('textarea');
                ta.value = orchidValue;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            showCopied();
        } catch (err) {
            console.error('Failed to copy ORCHID ID:', err);
        }
    });
}

// ============================================
// CURSOR — non-touch, non-reduced-motion only
// ============================================
if (!isTouchDevice() && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    const cursorGlow = document.getElementById('cursorGlow');
    const cursorSpotlight = document.getElementById('cursorSpotlight');
    let glowX = window.innerWidth / 2, glowY = window.innerHeight / 2;
    let targetGlowX = glowX, targetGlowY = glowY;
    let spotX = -200, spotY = -200, targetSpotX = -200, targetSpotY = -200, spotActive = false;
    let cursorRAF = null;

    document.addEventListener('mousemove', e => {
        targetGlowX = e.clientX; targetGlowY = e.clientY;
        targetSpotX = e.clientX; targetSpotY = e.clientY;
        const isOnHL = e.target.closest('.hl-hover') !== null;
        if (isOnHL && !spotActive) { spotActive = true; if (cursorSpotlight) cursorSpotlight.classList.add('active'); }
        else if (!isOnHL && spotActive) { spotActive = false; if (cursorSpotlight) cursorSpotlight.classList.remove('active'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => { spotActive = false; if (cursorSpotlight) cursorSpotlight.classList.remove('active'); });

    // Single rAF loop drives both elements — avoids two competing loops.
    (function animateCursor() {
        glowX += (targetGlowX - glowX) * 0.07;
        glowY += (targetGlowY - glowY) * 0.07;
        spotX += (targetSpotX - spotX) * 0.18;
        spotY += (targetSpotY - spotY) * 0.18;
        if (cursorGlow) { cursorGlow.style.left = glowX + 'px'; cursorGlow.style.top = glowY + 'px'; }
        if (cursorSpotlight) { cursorSpotlight.style.left = spotX + 'px'; cursorSpotlight.style.top = spotY + 'px'; }
        cursorRAF = requestAnimationFrame(animateCursor);
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
    document.body.classList.remove('menu-open');
}
function openMenu() {
    if (mobileMenuToggle) { mobileMenuToggle.classList.add('active'); mobileMenuToggle.setAttribute('aria-expanded','true'); }
    if (navMenu) navMenu.classList.add('active');
    document.body.classList.add('menu-open');
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
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 70;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            history.pushState(null, '', targetId);
        }
    });
});

// ============================================
// SCROLL TO TOP + PROGRESS
// ============================================
const scrollTopBtn = document.getElementById('scrollTopBtn');
function scrollToTop() { window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }); }
let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
        const st = window.pageYOffset;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const prog = scrollable > 0 ? (st / scrollable) * 100 : 0;
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
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a[href^="#"]');
function updateActiveNav() {
    let current = '';
    sections.forEach(s => { if (window.pageYOffset >= s.offsetTop - 180) current = s.getAttribute('id'); });
    navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${current}`;
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
}

// ============================================
// SECTION REVEAL (CSS class-driven, no inline styles)
// ============================================
const revealTargets = document.querySelectorAll('section, .timeline-item, .exp-entry, .skill-category, .cards .card, .projects-grid .project-card');
if (prefersReducedMotion) {
    revealTargets.forEach(el => el.classList.add('is-visible'));
} else {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealTargets.forEach(el => {
        el.classList.add('reveal-init');
        revealObserver.observe(el);
    });

    // Staggered delays for grouped items, applied via CSS custom property
    document.querySelectorAll('.timeline-item, .skill-category, .cards .card, .projects-grid .project-card, .exp-entry').forEach((el, i) => {
        el.style.setProperty('--reveal-delay', Math.min(i * 0.08, 0.5) + 's');
    });
}

// ============================================
// CARD RADIAL GRADIENT ON MOUSE MOVE (desktop only)
// ============================================
if (!isTouchDevice() && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card, .project-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%');
            card.style.setProperty('--mouse-y', ((e.clientY - r.top)  / r.height * 100) + '%');
        });
    });
}

// ============================================
// PARALLAX BG (skipped for reduced motion)
// ============================================
if (!prefersReducedMotion) {
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
}

// ============================================
// LANGUAGE ITEMS ANIMATION
// ============================================
const langGrid = document.querySelector('.language-grid');
if (langGrid) {
    if (prefersReducedMotion) {
        langGrid.querySelectorAll('.language-item').forEach(item => item.classList.add('is-visible'));
    } else {
        const langObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.language-item').forEach((item, i) => {
                        setTimeout(() => item.classList.add('is-visible'), i * 100);
                    });
                    langObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        langGrid.querySelectorAll('.language-item').forEach(item => item.classList.add('reveal-init-x'));
        langObserver.observe(langGrid);
    }
}

// ============================================
// ACHIEVEMENT BADGE PULSE
// ============================================
if (!prefersReducedMotion) {
    document.querySelectorAll('.achievement-badge').forEach(badge => {
        badge.addEventListener('mouseenter', function() { this.style.animation = 'pulse .45s ease'; });
        badge.addEventListener('animationend', function() { this.style.animation = ''; });
    });
}

// ============================================
// PROFILE FLOAT
// ============================================
const profileImg = document.getElementById('profileImg');
if (profileImg && !prefersReducedMotion) {
    let floatDir = 1, floatTimer = null;
    function floatImage() {
        floatTimer = setInterval(() => {
            if (profileImg.matches(':hover')) return;
            profileImg.style.transform = `translateY(${floatDir * 5}px)`;
            floatDir *= -1;
        }, 2000);
    }
    floatImage();
    profileImg.addEventListener('mouseenter', () => { if (floatTimer) clearInterval(floatTimer); });
    profileImg.addEventListener('mouseleave', () => { profileImg.style.transform = 'translateY(0)'; floatImage(); });
}

// ============================================
// LEADERSHIP BUBBLE TRANSITION
// Injects rising bubbles between the two exp-cards
// ============================================
(function injectLeadershipBubbles() {
    if (prefersReducedMotion) return;
    const timeline = document.querySelector('.exp-timeline');
    if (!timeline) return;

    const entries = timeline.querySelectorAll('.exp-entry');
    if (entries.length < 2) return;

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
            'left:'              + def[0] + '%',
            'width:'             + def[1] + 'px',
            'height:'            + def[1] + 'px',
            'animation-duration:'+ def[2] + 's',
            'animation-delay:'   + def[3] + 's',
            'background:'        + def[4],
        ].join(';');
        container.appendChild(b);
    });

    entries[0].insertAdjacentElement('afterend', container);
})();

// ============================================
// FOOTER YEAR
// ============================================
const yr = document.getElementById('currentYear');
if (yr) yr.textContent = new Date().getFullYear();

// ============================================
// TOUCH OPTIMIZATIONS
// ============================================
if (isTouchDevice()) {
    document.querySelectorAll('.card, .project-card, .skill-category, .timeline-item, .exp-card').forEach(el => {
        el.addEventListener('touchstart', function() { this.classList.add('touch-active'); }, { passive: true });
        el.addEventListener('touchend', function() { setTimeout(() => this.classList.remove('touch-active'), 300); }, { passive: true });
    });
}
