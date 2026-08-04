
// ============================================
// UTILITY
// ============================================
function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// ============================================
// MAILTO LINKS — "Let's Work Together" button + Email card
// Forces navigation explicitly via script, on top of the native
// href, so the mail client opens even if something in the page
// (extension, overlay, etc.) ever interferes with default anchor
// behavior. Also shows a copy-to-clipboard fallback toast if no
// mail client responds, since a blank click is usually caused by
// the OS/browser having no default mail app registered — not by
// the code — and the person deserves a way forward either way.
// ============================================
(function initMailtoLinks() {
    const links = document.querySelectorAll('.js-mailto-link');
    if (!links.length) return;

    function showMailFallback(email) {
        let toast = document.getElementById('mailFallbackToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mailFallbackToast';
            toast.className = 'resume-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = `No email app responded — address copied: ${email}`;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 5000);
        if (navigator.clipboard) navigator.clipboard.writeText(email).catch(() => {});
    }

    function fireMailto(link) {
        const href = link.getAttribute('href');
        const label = link.dataset.mailtoLabel || 'mailto link';
        console.log(`${label} clicked ->`, href);
        if (!href) return;

        window.location.href = href;

        // Heuristic: if the tab is still in the foreground ~1.2s later,
        // no mail client intercepted the mailto: request (most likely
        // because no default mail app is registered on this device).
        // Offer the email address as a copyable fallback so the click
        // never dead-ends.
        const email = href.replace('mailto:', '').split('?')[0];
        const checkTimer = setTimeout(() => {
            if (document.visibilityState === 'visible') {
                showMailFallback(email);
            }
        }, 1200);
        window.addEventListener('blur', () => clearTimeout(checkTimer), { once: true });
    }

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            fireMailto(this);
        });

        // Native <a> elements activate on Enter automatically, but NOT on
        // Space (only <button> does that natively). Add explicit Space
        // support so both keys work for full keyboard accessibility.
        link.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') {
                e.preventDefault();
                fireMailto(this);
            }
        });
    });

    // ------------------------------------------------------------
    // SELF-DIAGNOSTIC: on load, ask the browser what element actually
    // sits at the visual center of each mailto target. If it's not the
    // link itself (or something inside it), an overlay truly is blocking
    // clicks and this logs exactly which element + selector is guilty —
    // no manual DevTools inspection required.
    // ------------------------------------------------------------
    window.addEventListener('load', () => {
        setTimeout(() => {
            links.forEach(link => {
                const r = link.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) {
                    console.warn(`[mailto-diagnostic] "${link.dataset.mailtoLabel}" has zero size — it may be hidden or collapsed.`);
                    return;
                }
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const topEl = document.elementFromPoint(cx, cy);
                const isSelfOrChild = topEl && (topEl === link || link.contains(topEl));
                if (isSelfOrChild) {
                    console.log(`[mailto-diagnostic] OK — "${link.dataset.mailtoLabel}" is the top-most element at its center point.`);
                } else {
                    const desc = topEl ? `${topEl.tagName.toLowerCase()}${topEl.id ? '#' + topEl.id : ''}${topEl.className ? '.' + String(topEl.className).replace(/\s+/g, '.') : ''}` : 'null';
                    console.warn(`[mailto-diagnostic] BLOCKED — "${link.dataset.mailtoLabel}" is covered by: ${desc}`);
                }
            });
        }, 500);
    });
})();

// ============================================
// GITHUB CONTRIBUTION IMAGES — fade in on load, show
// fallback on error. Handled here (not inline onload/onerror
// attributes) so each image gets its own real function scope —
// no shared-scope variable collisions between them.
// ============================================
(function initGithubImages() {
    const images = [
        { imgId: 'ghgChart', skelId: 'ghgSkel' },
        { imgId: 'ghgStreakChart', skelId: 'ghgStreakSkel' }
    ];

    function showFailed(img, skel) {
        const wrap = img.closest('.ghg-img-wrap');
        if (wrap) wrap.classList.add('ghg-error');
        if (skel) skel.hidden = true;
    }

    images.forEach(({ imgId, skelId }) => {
        const img = document.getElementById(imgId);
        if (!img) return;
        const skel = document.getElementById(skelId);

        // HARD TIMEOUT: these are free third-party services and occasionally
        // hang instead of erroring outright. If nothing has resolved within
        // 8s, treat it as failed so the section never sits blank/loading
        // forever — the fallback message always wins eventually.
        const hangTimer = setTimeout(() => {
            if (!img.classList.contains('is-loaded')) showFailed(img, skel);
        }, 8000);

        img.addEventListener('load', () => {
            clearTimeout(hangTimer);
            img.classList.add('is-loaded');
            if (skel) skel.hidden = true;
        });

        img.addEventListener('error', () => {
            // The primary service failed — try the documented fallback
            // service once before giving up and showing the "couldn't
            // load" message. This is real failover, not just a dead end.
            const fallback = img.dataset.fallbackSrc;
            if (fallback && !img.dataset.fallbackTried) {
                img.dataset.fallbackTried = 'true';
                img.src = fallback;
                return;
            }
            clearTimeout(hangTimer);
            showFailed(img, skel);
        });

        // Handle the case where the image loaded from cache before
        // this listener was attached (load event already fired).
        if (img.complete && img.naturalWidth > 0) {
            clearTimeout(hangTimer);
            img.classList.add('is-loaded');
            if (skel) skel.hidden = true;
        }
    });
})();

// ============================================
// PROJECT PREVIEW SCREENSHOTS — real homepage previews
// (mshots, generated live from each project's actual URL) with a
// shimmer skeleton while loading and a graceful icon fallback if a
// particular screenshot service request ever fails.
// ============================================
(function initProjectPreviews() {
    const imgs = document.querySelectorAll('.project-preview-img');
    if (!imgs.length) return;

    imgs.forEach(img => {
        const preview = img.closest('.project-preview');

        img.addEventListener('load', () => {
            img.classList.add('is-loaded');
        });

        img.addEventListener('error', () => {
            if (preview) preview.classList.add('img-error');
        });

        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('is-loaded');
        }
    });
})();

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

// Total visible duration in ms — exactly 2.5 seconds
const LOADER_DURATION = 2500;
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
    // HARD FAILSAFE: if anything above stalls, force-hide after 3 s
    setTimeout(hideLoader, 3000);
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
            // Read the ACTUAL rendered nav height instead of trying to parse the
            // --nav-height custom property with parseInt(). Custom properties are
            // returned as their raw, un-resolved text (e.g. "clamp(60px,8vh,80px)")
            // by getComputedStyle, so parseInt() on that always returned NaN and
            // silently fell back to a hardcoded 70 — wrong on many viewports.
            const navEl = document.querySelector('nav');
            const navHeight = (navEl ? navEl.offsetHeight : 70) + 16;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            history.pushState(null, '', targetId);
        }
    });
});

// Native/browser-driven anchor jumps (direct link with #hash, refresh, back/forward)
// never run the click handler above, so they'd land with the section flush under
// the fixed nav. scroll-margin-top on sections (in style.css) is the primary fix;
// this just re-corrects once on load in case the browser already jumped before
// that CSS could apply the offset.
if (window.location.hash) {
    window.addEventListener('load', () => {
        const target = document.querySelector(window.location.hash);
        if (target) {
            const navEl = document.querySelector('nav');
            const navHeight = (navEl ? navEl.offsetHeight : 70) + 16;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navHeight, behavior: 'auto' });
        }
    });
}

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
const revealTargets = document.querySelectorAll(
    'section, .timeline-item, .skill-category, .cards .card, .projects-grid .project-card, ' +
    '.experience-intro, .github-subtitle, .ghg-card, .otw-card'
);
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
    document.querySelectorAll('.timeline-item, .skill-category, .cards .card, .projects-grid .project-card').forEach((el, i) => {
        el.style.setProperty('--reveal-delay', Math.min(i * 0.08, 0.5) + 's');
    });
}

// ============================================
// EXPERIENCE TIMELINE REVEAL
// The timeline cards live inside a nested scroll pane
// (.experience-scroll). A viewport-rooted observer never
// fires for cards clipped inside that pane until the user
// scrolls the pane itself, which would leave most cards
// permanently invisible. Reveal them as one batch as soon
// as the section enters view instead — reliable on every
// device, with the stagger delay preserved for the cascade.
// ============================================
(function revealExperienceTimeline() {
    const expSection = document.querySelector('.experience-section');
    const expNodes = document.querySelectorAll('.exp-node');
    if (!expSection || !expNodes.length) return;

    if (prefersReducedMotion) {
        expNodes.forEach(el => el.classList.add('is-visible'));
        return;
    }

    expNodes.forEach((el, i) => {
        el.classList.add('reveal-init');
        el.style.setProperty('--reveal-delay', Math.min(i * 0.07, 0.45) + 's');
    });

    const expObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                expNodes.forEach(el => el.classList.add('is-visible'));
                expObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    expObserver.observe(expSection);

    // FAIL-SAFE: guarantee the timeline cards are never permanently stuck
    // invisible if the observer misses its trigger for any reason (e.g. the
    // section is inside a nested scroll pane on some devices). Cards get
    // their scroll-triggered entrance normally; this is just a backstop.
    setTimeout(() => {
        expNodes.forEach(el => el.classList.add('is-visible'));
        expObserver.disconnect();
    }, 2500);
})();

// ============================================
// CARD RADIAL GRADIENT ON MOUSE MOVE (desktop only)
// ============================================
if (!isTouchDevice() && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card, .project-card, .exp-node-card, .ghg-card').forEach(card => {
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
// FOOTER YEAR
// ============================================
const yr = document.getElementById('currentYear');
if (yr) yr.textContent = new Date().getFullYear();

// ============================================
// TOUCH OPTIMIZATIONS
// ============================================
if (isTouchDevice()) {
    document.querySelectorAll('.card, .project-card, .skill-category, .timeline-item, .exp-node-card, .ghg-card').forEach(el => {
        el.addEventListener('touchstart', function() { this.classList.add('touch-active'); }, { passive: true });
        el.addEventListener('touchend', function() { setTimeout(() => this.classList.remove('touch-active'), 300); }, { passive: true });
    });
}

// ============================================
// EXPERIENCE CARD IMAGE FALLBACK
// Swaps a missing/broken assets/experience/*.jpg for a
// generated initials badge so the layout never looks broken.
// ============================================
window.handleExpImageError = function (img) {
    if (!img || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    const initials = img.getAttribute('data-initials') || '?';
    const wrap = img.parentElement;
    img.remove();
    if (!wrap) return;
    const fallback = document.createElement('div');
    fallback.className = 'exp-initials-fallback';
    fallback.textContent = initials;
    fallback.setAttribute('aria-hidden', 'true');
    wrap.appendChild(fallback);
};

// ============================================
// BUTTON RIPPLE EFFECT
// ============================================
if (!prefersReducedMotion) {
    document.querySelectorAll('.ripple-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            this.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    });
}

// ============================================
// RESUME DOWNLOAD — graceful failure
// If assets/resume.pdf hasn't been added yet, avoid a raw
// browser 404: show a small toast and offer the email
// fallback instead of a dead link.
// ============================================
(function resumeDownloadGuard() {
    const buttons = document.querySelectorAll('.resume-download-btn');
    if (!buttons.length) return;

    let cachedOk = null; // null = unknown, true/false once checked

    function showToast(message) {
        let toast = document.getElementById('resumeToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'resumeToast';
            toast.className = 'resume-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 4200);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (cachedOk === true) return; // known good, let the download proceed
            if (cachedOk === false) {
                e.preventDefault();
                showToast('Resume is being updated — email ghosh.tanbi@gmail.com for a copy in the meantime.');
                return;
            }
            // First click: verify before letting the browser navigate
            e.preventDefault();
            const href = this.getAttribute('href');
            fetch(href, { method: 'HEAD' })
                .then(res => {
                    cachedOk = res.ok;
                    if (res.ok) {
                        window.location.href = href;
                    } else {
                        showToast('Resume is being updated — email ghosh.tanbi@gmail.com for a copy in the meantime.');
                    }
                })
                .catch(() => {
                    cachedOk = false;
                    showToast('Resume is being updated — email ghosh.tanbi@gmail.com for a copy in the meantime.');
                });
        });
    });
})();