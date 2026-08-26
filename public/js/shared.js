/* ═══════════════════════════════════════════════════════════════════════════
   Rinky Jewellers — shared.js
   Auth state management, navbar, toast, utilities
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Toast ──────────────────────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i><span>${msg}</span>`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Format Indian Rupee ────────────────────────────────────────────────────────
function fmtPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ── Format Date ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

// ── Auth State ─────────────────────────────────────────────────────────────────
let _authState = null;

async function getAuthState(forceRefresh = false) {
  if (_authState && !forceRefresh) return _authState;
  try {
    const r = await fetch('/api/auth/me');
    _authState = await r.json();
  } catch {
    _authState = { loggedIn: false };
  }
  return _authState;
}

function clearAuthState() { _authState = null; }

// ── Render Navbar Auth Area ────────────────────────────────────────────────────
async function renderNavAuth() {
  const authGroup  = document.getElementById('authBtnGroup');
  const userMenu   = document.getElementById('userMenuArea');
  const wishBadge  = document.getElementById('wishBadge');
  const mobAuthLinks = document.querySelectorAll('.mob-auth-only');
  const mobGuestLinks = document.querySelectorAll('.mob-guest-only');
  const state = await getAuthState();

  if (state.loggedIn) {
    if (authGroup) authGroup.style.display = 'none';
    if (userMenu)  userMenu.style.display  = 'flex';

    // Mobile nav toggle
    mobAuthLinks.forEach(el => el.style.display = 'block');
    mobGuestLinks.forEach(el => el.style.display = 'none');

    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = state.user.name.split(' ')[0];

    // Admin links
    const adminLink = document.getElementById('navAdminLink');
    if (adminLink) adminLink.style.display = state.user.role === 'admin' ? 'flex' : 'none';
    const mobAdminLink = document.getElementById('mobAdminLink');
    if (mobAdminLink) mobAdminLink.style.display = state.user.role === 'admin' ? 'block' : 'none';

    // Wishlist count
    if (wishBadge) {
      try {
        const wr = await fetch('/api/wishlist');
        const wd = await wr.json();
        if (wd.success && wd.wishlist.length > 0) {
          wishBadge.textContent = wd.wishlist.length;
          wishBadge.style.display = 'flex';
        } else {
          wishBadge.style.display = 'none';
        }
      } catch {}
    }
  } else {
    if (authGroup) authGroup.style.display = 'flex';
    if (userMenu)  userMenu.style.display  = 'none';
    if (wishBadge) wishBadge.style.display = 'none';

    // Mobile nav toggle
    mobAuthLinks.forEach(el => el.style.display = 'none');
    mobGuestLinks.forEach(el => el.style.display = 'block');
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────────
async function logout() {
  await fetch('/api/auth/logout', { method:'POST' });
  clearAuthState();
  showToast('Logged out successfully.', 'info');
  setTimeout(() => window.location.href = '/', 800);
}

// ── Wishlist Toggle ────────────────────────────────────────────────────────────
async function toggleWishlist(productId, btn) {
  const state = await getAuthState();
  if (!state.loggedIn) {
    showToast('Please log in to save to your wishlist.', 'info');
    setTimeout(() => window.location.href = '/login', 1200);
    return;
  }
  try {
    const r = await fetch(`/api/wishlist/${productId}`, { method: 'POST' });
    const d = await r.json();
    if (d.success) {
      if (btn) {
        btn.classList.toggle('active', d.inWishlist);
        const icon = btn.querySelector('i');
        if (icon) icon.className = d.inWishlist ? 'fas fa-heart' : 'far fa-heart';
      }
      showToast(d.inWishlist ? 'Added to wishlist ♥' : 'Removed from wishlist', d.inWishlist ? 'success' : 'info');
      // Update badge
      const badge = document.getElementById('wishBadge');
      if (badge) {
        badge.textContent = d.count;
        badge.style.display = d.count > 0 ? 'flex' : 'none';
      }
    }
  } catch {
    showToast('Something went wrong.', 'error');
  }
}

// ── Product Card HTML ──────────────────────────────────────────────────────────
function buildProductCard(p, wishlist = []) {
  const inWish = wishlist.includes(p._id);
  
  // Existing products (no jewelryType or bisHallmark) default to Gold and Hallmarked
  const isGoldOrSilver = !p.jewelryType || p.jewelryType === 'Gold' || p.jewelryType === 'Silver';
  const hasHallmark = p.bisHallmark === true || (p.bisHallmark === undefined && isGoldOrSilver);
  
  let hallmarkHTML = '';
  if (isGoldOrSilver && hasHallmark) {
    const hallmarkLabel = p.bisNumber ? `BIS Hallmark No: ${p.bisNumber}` : 'BIS Hallmark';
    hallmarkHTML = `<p class="prod-hallmark"><i class="fas fa-certificate" style="color:var(--gold);margin-right:4px;font-size:11px"></i>${hallmarkLabel}</p>`;
  }

  return `
    <div class="prod-card" data-id="${p._id}">
      <div class="prod-img">
        <a href="/product?id=${p._id}">
          <img src="${p.image}" alt="${p.name}" loading="lazy" />
          <div class="prod-img-overlay">
            <span class="prod-view-btn">View Details</span>
          </div>
        </a>
        ${p.featured ? '<span class="badge-feat">Featured</span>' : ''}
        ${!p.inStock ? '<span class="badge-oos">Out of Stock</span>' : ''}
        <button class="wish-btn ${inWish ? 'active' : ''}" onclick="toggleWishlist('${p._id}', this)" aria-label="Add to wishlist">
          <i class="${inWish ? 'fas' : 'far'} fa-heart"></i>
        </button>
      </div>
      <div class="prod-body">
        <span class="prod-cat">${p.category}</span>
        <h3 class="prod-name"><a href="/product?id=${p._id}">${p.name}</a></h3>
        <p class="prod-mat"><i class="fas fa-gem" style="color:var(--gold);margin-right:4px;font-size:11px"></i>${p.material || '22K Gold'}</p>
        ${hallmarkHTML}
        <p class="prod-price">${fmtPrice(p.price)}</p>
        <a href="/product?id=${p._id}" class="btn btn-sm btn-gold btn-full">View Details</a>
      </div>
    </div>`;
}

// ── Skeleton Cards ─────────────────────────────────────────────────────────────
function skeletonCards(n = 6) {
  return Array(n).fill(`
    <div class="skel-card">
      <div class="skel-img skeleton"></div>
      <div class="skel-body">
        <div class="skel-line skeleton w40"></div>
        <div class="skel-line skeleton w80" style="height:18px;margin-top:8px"></div>
        <div class="skel-line skeleton w60" style="margin-top:4px"></div>
        <div class="skel-line skeleton w80" style="margin-top:14px;height:36px;border-radius:6px"></div>
      </div>
    </div>`).join('');
}

// ── Smooth Scrolling (Lenis + Native Damping) ─────────────────────────────────
let _lenisInstance = null;

function setupLenis() {
  if (typeof Lenis === 'undefined' || _lenisInstance) return;
  try {
    _lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      infinite: false
    });

    function raf(time) {
      if (_lenisInstance) _lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    window.lenis = _lenisInstance;
  } catch (err) {
    console.warn('Smooth scroll fallback:', err);
  }
}

function initSmoothScroll() {
  if (typeof Lenis !== 'undefined') {
    setupLenis();
  } else {
    // Dynamically inject Lenis
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js';
    script.async = true;
    script.onload = setupLenis;
    document.head.appendChild(script);
  }
}

// ── Smooth Page Transitions & Navigation ──────────────────────────────────────
function initPageTransitions() {
  const overlay = document.getElementById('pageTransitionOverlay');

  // Intercept internal links for seamless fade
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;

    const href = a.getAttribute('href');
    const target = a.getAttribute('target');

    // Skip special links, external links, anchor hashes, and blank targets
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') ||
        target === '_blank' || a.hasAttribute('download')) {
      return;
    }

    if (href.startsWith('/')) {
      // If navigating to the same page, let browser handle normally
      if (href === window.location.pathname) return;

      e.preventDefault();
      if (overlay) overlay.classList.add('active');
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    }
  });

  // Smooth dismiss of page loader on refresh/load
  const hideLoader = () => {
    const loader = document.getElementById('pageLoader');
    if (loader && !loader.classList.contains('hidden')) {
      setTimeout(() => {
        loader.classList.add('hidden');
      }, 180);
    }
  };

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
    // Fallback safety timeout
    setTimeout(hideLoader, 1200);
  }
}

// ── 3D Card Interactive Tilt ──────────────────────────────────────────────────
function init3DCardTilt() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) return; // Only for mouse pointer precision

  const cards = document.querySelectorAll('.prod-card, .feat-card, .cat-card');
  cards.forEach(card => {
    // Avoid double attaching
    if (card._hasTilt) return;
    card._hasTilt = true;

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
    });
  });
}

// ── Navbar Init ────────────────────────────────────────────────────────────────
function initNavbar() {
  // Scroll effect with navbar glassmorphism
  const nav = document.querySelector('.navbar');
  if (nav) {
    window.addEventListener('scroll', () =>
      nav.classList.toggle('scrolled', window.scrollY > 30), { passive: true });
  }

  // Active link highlight
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href)))
      a.classList.add('active');
  });

  // Hamburger
  const ham = document.getElementById('hamburger');
  const mob = document.getElementById('mobileNav');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      mob.classList.toggle('open');
      const spans = ham.querySelectorAll('span');
      const open  = mob.classList.contains('open');
      spans[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)'  : '';
      spans[1].style.opacity   = open ? '0' : '1';
      spans[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });
  }

  // User dropdown
  const userBtn = document.getElementById('userMenuBtn');
  const dropdown= document.getElementById('userDropdown');
  if (userBtn && dropdown) {
    userBtn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // Logout
  document.querySelectorAll('[data-logout]').forEach(btn =>
    btn.addEventListener('click', logout));

  // Auth
  renderNavAuth();
}

// ── Scroll Reveal ─────────────────────────────────────────────────────────────
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('.prod-card,.feat-card,.cat-card,.about-stat,.info-item,.stat-tile');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'translateY(0)';
        }, i * 45);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  targets.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition= 'opacity .55s cubic-bezier(0.16, 1, 0.3, 1), transform .55s cubic-bezier(0.16, 1, 0.3, 1)';
    obs.observe(el);
  });

  // Re-init 3D card tilt on newly revealed items
  init3DCardTilt();
}

// ── Password Toggle ────────────────────────────────────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll('.toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.previousElementSibling || btn.parentElement.querySelector('input');
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.className = btn.className.replace(/fa-eye(-slash)?/, show ? 'fa-eye-slash' : 'fa-eye');
    });
  });
}

// ── DOM Ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initPageTransitions();
  initNavbar();
  initScrollReveal();
  init3DCardTilt();
  initPasswordToggles();
});

