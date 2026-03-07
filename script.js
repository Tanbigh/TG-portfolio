// ============================================
// UTILITY
// ============================================

function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// ============================================
// SECURITY & PROTECTION
// ============================================

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault(); return false;
    }
    if (e.ctrlKey && (e.key === 'u' || e.key === 's')) {
        e.preventDefault(); return false;
    }
});

document.addEventListener('selectstart', function(e) {
    if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
});

document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
});

// Pause animations when tab is hidden (performance)
document.addEventListener('visibilitychange', () => {
    const state = document.hidden ? 'paused' : 'running';
    document.querySelectorAll('.bg-animation span, .orbit-ring, .orbit-dot').forEach(el => {
        el.style.animationPlayState = state;
    });
    // Pause music if tab hidden
    if (document.hidden && musicEnabled && bgMusic) {
        bgMusic.pause();
    } else if (!document.hidden && musicEnabled && bgMusic) {
        bgMusic.play().catch(() => {});
    }
});

// ============================================
// LOADING SCREEN
// ============================================

const loadingScreen = document.getElementById('loadingScreen');
const loaderBar = document.getElementById('loaderBar');
const loaderText = document.getElementById('loaderText');

const loaderPhrases = [
    'Initializing...',
    'Loading assets...',
    'Building portfolio...',
    'Almost ready...',
    'Welcome!'
];

let loaderProgress = 0;
let phraseIndex = 0;

function updateLoader() {
    loaderProgress += Math.random() * 18 + 6;
    if (loaderProgress > 100) loaderProgress = 100;

    if (loaderBar) loaderBar.style.width = loaderProgress + '%';

    const step = Math.floor((loaderProgress / 100) * (loaderPhrases.length - 1));
    if (step !== phraseIndex && loaderText) {
        phraseIndex = step;
        loaderText.textContent = loaderPhrases[phraseIndex];
    }

    if (loaderProgress < 100) {
        setTimeout(updateLoader, Math.random() * 180 + 80);
    } else {
        if (loaderText) loaderText.textContent = 'Welcome!';
        setTimeout(() => {
            if (loadingScreen) loadingScreen.classList.add('hidden');
            tryAutoPlayMusic();
        }, 520);
    }
}

setTimeout(updateLoader, 200);

// ============================================
// THEME TOGGLE
// ============================================

const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const iconDark = themeToggle ? themeToggle.querySelector('.theme-icon-dark') : null;
const iconLight = themeToggle ? themeToggle.querySelector('.theme-icon-light') : null;

const savedTheme = localStorage.getItem('tg-theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem('tg-theme', next);
        updateThemeIcon(next);
        themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
        themeToggle.classList.add('active');
        setTimeout(() => themeToggle.classList.remove('active'), 400);
    });
}

function updateThemeIcon(theme) {
    if (!iconDark || !iconLight) return;
    if (theme === 'dark') {
        iconDark.style.display = 'inline';
        iconLight.style.display = 'none';
    } else {
        iconDark.style.display = 'none';
        iconLight.style.display = 'inline';
    }
}

// ============================================
// MUSIC TOGGLE
// ============================================

const musicToggle = document.getElementById('musicToggle');
const bgMusic = document.getElementById('bgMusic');
const musicIconOn = musicToggle ? musicToggle.querySelector('.music-icon-on') : null;
const musicIconOff = musicToggle ? musicToggle.querySelector('.music-icon-off') : null;

let musicEnabled = false;

function tryAutoPlayMusic() {
    if (!bgMusic) return;
    const source = bgMusic.querySelector('source');
    if (!source || !source.src) return;
    bgMusic.volume = 0.18;
    const p = bgMusic.play();
    if (p !== undefined) {
        p.then(() => {
            musicEnabled = true;
            updateMusicIcon(true);
            if (musicToggle) musicToggle.classList.add('active');
        }).catch(() => {
            musicEnabled = false;
            updateMusicIcon(false);
        });
    }
}

if (musicToggle) {
    musicToggle.addEventListener('click', () => {
        if (!bgMusic) return;
        if (musicEnabled) {
            bgMusic.pause();
            musicEnabled = false;
            updateMusicIcon(false);
            musicToggle.classList.remove('active');
            musicToggle.setAttribute('aria-pressed', 'false');
        } else {
            bgMusic.volume = 0.18;
            bgMusic.play().then(() => {
                musicEnabled = true;
                updateMusicIcon(true);
                musicToggle.classList.add('active');
                musicToggle.setAttribute('aria-pressed', 'true');
            }).catch(() => {});
        }
    });
}

function updateMusicIcon(playing) {
    if (!musicIconOn || !musicIconOff) return;
    musicIconOn.style.display = playing ? 'inline' : 'none';
    musicIconOff.style.display = playing ? 'none' : 'inline';
}

// ============================================
// CURSOR GLOW — Only on non-touch devices
// ============================================

if (!isTouchDevice()) {
    const cursorGlow = document.getElementById('cursorGlow');
    let glowX = window.innerWidth / 2;
    let glowY = window.innerHeight / 2;
    let targetGlowX = glowX;
    let targetGlowY = glowY;
    let glowRAF;

    document.addEventListener('mousemove', (e) => {
        targetGlowX = e.clientX;
        targetGlowY = e.clientY;
    });

    function animateGlow() {
        glowX += (targetGlowX - glowX) * 0.07;
        glowY += (targetGlowY - glowY) * 0.07;
        if (cursorGlow) {
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
        }
        glowRAF = requestAnimationFrame(animateGlow);
    }

    animateGlow();

    // ============================================
    // CIRCULAR SPOTLIGHT — Only on non-touch
    // ============================================

    const cursorSpotlight = document.getElementById('cursorSpotlight');
    let spotX = -200;
    let spotY = -200;
    let targetSpotX = -200;
    let targetSpotY = -200;
    let spotActive = false;

    document.addEventListener('mousemove', (e) => {
        targetSpotX = e.clientX;
        targetSpotY = e.clientY;

        const target = e.target;
        const isOnHL = target.closest('.hl-hover') !== null || target.classList.contains('hl-hover');

        if (isOnHL && !spotActive) {
            spotActive = true;
            if (cursorSpotlight) cursorSpotlight.classList.add('active');
        } else if (!isOnHL && spotActive) {
            spotActive = false;
            if (cursorSpotlight) cursorSpotlight.classList.remove('active');
        }
    });

    document.addEventListener('mouseleave', () => {
        spotActive = false;
        if (cursorSpotlight) cursorSpotlight.classList.remove('active');
    });

    function animateSpotlight() {
        spotX += (targetSpotX - spotX) * 0.18;
        spotY += (targetSpotY - spotY) * 0.18;
        if (cursorSpotlight) {
            cursorSpotlight.style.left = spotX + 'px';
            cursorSpotlight.style.top = spotY + 'px';
        }
        requestAnimationFrame(animateSpotlight);
    }

    animateSpotlight();
}

// ============================================
// MOBILE MENU
// ============================================

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

function closeMenu() {
    if (mobileMenuToggle) {
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }
    if (navMenu) navMenu.classList.remove('active');
}

function openMenu() {
    if (mobileMenuToggle) {
        mobileMenuToggle.classList.add('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'true');
    }
    if (navMenu) navMenu.classList.add('active');
}

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        const isOpen = mobileMenuToggle.classList.contains('active');
        isOpen ? closeMenu() : openMenu();
    });

    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (mobileMenuToggle && navMenu &&
            !mobileMenuToggle.contains(e.target) &&
            !navMenu.contains(e.target)) {
            closeMenu();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

// ============================================
// SMOOTH SCROLLING
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
            const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 70;
            const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
    });
});

// ============================================
// SCROLL TO TOP
// ============================================

const scrollTopBtn = document.getElementById('scrollTopBtn');

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

let scrollTicking = false;

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        requestAnimationFrame(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const documentHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;
            const scrollProgress = (scrollTop / (documentHeight - windowHeight)) * 100;

            document.documentElement.style.setProperty('--scroll-progress', scrollProgress + '%');

            if (scrollTopBtn) {
                if (scrollTop > 300) {
                    scrollTopBtn.classList.add('visible');
                    scrollTopBtn.style.background = `conic-gradient(
                        var(--accent-primary) ${scrollProgress * 3.6}deg,
                        var(--accent-subtle) ${scrollProgress * 3.6}deg
                    )`;
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            }

            // Active nav state
            updateActiveNav();

            scrollTicking = false;
        });
        scrollTicking = true;
    }
}, { passive: true });

// ============================================
// ACTIVE NAV STATE
// ============================================

function updateActiveNav() {
    let current = '';
    document.querySelectorAll('section').forEach(section => {
        if (window.pageYOffset >= section.offsetTop - 180) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// ============================================
// INTERSECTION OBSERVER — SECTIONS REVEAL
// ============================================

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            sectionObserver.unobserve(entry.target); // Only animate once
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    sectionObserver.observe(section);
});

// ============================================
// CARD HOVER RADIAL GRADIENT
// ============================================

document.querySelectorAll('.card, .project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
});

// ============================================
// PARALLAX BACKGROUND (throttled)
// ============================================

let parallaxTicking = false;
window.addEventListener('scroll', () => {
    if (!parallaxTicking) {
        requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            document.querySelectorAll('.bg-animation span').forEach((el, i) => {
                el.style.transform = `translateY(${scrolled * (i + 1) * 0.04}px)`;
            });
            parallaxTicking = false;
        });
        parallaxTicking = true;
    }
}, { passive: true });

// ============================================
// TIMELINE ANIMATION
// ============================================

const timelineObserver = new IntersectionObserver((entries) => {
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
    item.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
    timelineObserver.observe(item);
});

// ============================================
// SKILL CATEGORIES ANIMATION
// ============================================

const skillObserver = new IntersectionObserver((entries) => {
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
    cat.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    skillObserver.observe(cat);
});

// ============================================
// PROFILE FLOATING ANIMATION
// ============================================

const profileImg = document.getElementById('profileImg');
if (profileImg) {
    let floatDir = 1;
    let floatTimer = null;

    function floatImage() {
        floatTimer = setInterval(() => {
            if (profileImg.matches(':hover')) return;
            profileImg.style.transition = 'transform 2s ease-in-out, box-shadow 0.4s ease, border-color 0.4s ease';
            profileImg.style.transform = `translateY(${floatDir * 5}px)`;
            floatDir *= -1;
        }, 2000);
    }

    floatImage();

    profileImg.addEventListener('mouseenter', () => {
        if (floatTimer) clearInterval(floatTimer);
    });
    profileImg.addEventListener('mouseleave', () => {
        profileImg.style.transform = 'translateY(0)';
        floatImage();
    });
}

// ============================================
// CARDS REVEAL ANIMATION
// ============================================

const cardObserver = new IntersectionObserver((entries) => {
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
    card.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    cardObserver.observe(card);
});

// ============================================
// PROJECT CARDS REVEAL ANIMATION
// ============================================

const projectObserver = new IntersectionObserver((entries) => {
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
    card.style.transition = `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s`;
    projectObserver.observe(card);
});

// ============================================
// LANGUAGE ITEMS ANIMATION
// ============================================

const langObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.language-item').forEach((item, i) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, i * 120);
            });
            langObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

const langGrid = document.querySelector('.language-grid');
if (langGrid) {
    langGrid.querySelectorAll('.language-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    });
    langObserver.observe(langGrid);
}

// ============================================
// CONTACT ICON BOUNCE
// ============================================

document.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.querySelectorAll('.contact-icon svg').forEach(svg => {
            svg.style.animation = 'iconBounce 0.55s ease';
        });
    });
    item.addEventListener('mouseleave', function() {
        this.querySelectorAll('.contact-icon svg').forEach(svg => {
            svg.style.animation = '';
        });
    });
});

// ============================================
// ACHIEVEMENT BADGE PULSE
// ============================================

document.querySelectorAll('.achievement-badge').forEach(badge => {
    badge.addEventListener('mouseenter', function() {
        this.style.animation = 'pulse 0.45s ease';
    });
    badge.addEventListener('animationend', function() {
        this.style.animation = '';
    });
});

// ============================================
// DYNAMIC KEYFRAMES
// ============================================

const extraStyles = document.createElement('style');
extraStyles.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.14); }
    }
    @keyframes iconBounce {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25% { transform: translateY(-8px) rotate(-5deg); }
        75% { transform: translateY(-4px) rotate(5deg); }
    }
`;
document.head.appendChild(extraStyles);

// ============================================
// FOOTER YEAR
// ============================================

const yr = document.getElementById('currentYear');
if (yr) yr.textContent = new Date().getFullYear();

// ============================================
// RESPONSIVE FONT SIZE (fluid)
// ============================================

function adjustFontSize() {
    const vw = window.innerWidth;
    let size;
    if (vw > 1440) size = 17;
    else if (vw > 1200) size = 16;
    else if (vw > 768) size = 15;
    else if (vw > 480) size = 14.5;
    else size = 14;
    document.documentElement.style.fontSize = size + 'px';
}

adjustFontSize();
window.addEventListener('resize', adjustFontSize, { passive: true });

// ============================================
// PAGE INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero-content');
    if (hero) {
        hero.style.opacity = '0';
        hero.style.transform = 'translateY(24px)';
        setTimeout(() => {
            hero.style.transition = 'all 0.9s ease';
            hero.style.opacity = '1';
            hero.style.transform = 'translateY(0)';
        }, 100);
    }

    setTimeout(() => document.body.classList.add('loaded'), 500);
});

// ============================================
// PERFORMANCE LOGGING
// ============================================

window.addEventListener('load', () => {
    console.log('%c✨ Tanbi Ghosh Portfolio', 'color: #a8cdff; font-size: 18px; font-weight: bold;');
    console.log('%cLoaded in ' + performance.now().toFixed(2) + 'ms', 'color: #a8cdff; font-size: 12px;');
    console.log('%cContact: ghosh.tanbi@gmail.com', 'color: #8a9ab8; font-size: 12px;');
});

// ============================================
// TOUCH OPTIMIZATIONS
// ============================================

if (isTouchDevice()) {
    // Add touch feedback for cards on mobile
    document.querySelectorAll('.card, .project-card, .skill-category, .timeline-item').forEach(el => {
        el.addEventListener('touchstart', function() {
            this.style.borderColor = 'var(--accent-primary)';
        }, { passive: true });
        el.addEventListener('touchend', function() {
            setTimeout(() => {
                this.style.borderColor = '';
            }, 300);
        }, { passive: true });
    });
}