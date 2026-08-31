/* public/js/navbar.js — injects navbar & footer into every page */

// Auto-inject Favicon if not present
(() => {
  if (!document.querySelector("link[rel*='icon']")) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/images/favicon.svg';
    document.head.appendChild(link);
  }
})();

const NAV_HTML = `
<div id="pageLoader" class="page-loader">
  <img src="/images/logo-icon.svg" class="loader-logo-img" alt="Rinky Jewellers" />
  <p style="color:var(--gold);font-size:11px;letter-spacing:.24em;text-transform:uppercase;margin-top:14px;font-weight:700">Rinky Jewellers</p>
  <div class="loader-progress-track">
    <div class="loader-progress-bar"></div>
  </div>
</div>

<div id="pageTransitionOverlay" class="page-transition-overlay"></div>

<div id="toast" class="toast"></div>

<nav class="navbar">
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <div class="brand-logo-wrap">
        <img src="/images/logo-icon.svg" class="brand-logo-img" alt="Rinky Jewellers Logo" />
      </div>
      <div>
        <span class="brand-text-main">Rinky Jewellers</span>
        <span class="brand-text-sub">Awas Vikas · Kanpur</span>
      </div>
    </a>

    <ul class="nav-links">
      <li><a href="/" class="nav-link">Home</a></li>
      <li><a href="/products" class="nav-link">Collection</a></li>
      <li><a href="/about" class="nav-link">About</a></li>
      <li><a href="/contact" class="nav-link">Contact</a></li>
    </ul>

    <div class="nav-actions">
      <a href="/wishlist" class="nav-icon-btn" title="Wishlist" style="position:relative">
        <i class="far fa-heart"></i>
        <span class="nav-badge" id="wishBadge" style="display:none">0</span>
      </a>

      <!-- Not logged in -->
      <div id="authBtnGroup" style="display:none">
        <a href="/login" class="btn btn-outline btn-sm">Login</a>
        <a href="/signup" class="btn btn-gold btn-sm">Sign Up</a>
      </div>

      <!-- Logged in -->
      <div id="userMenuArea" style="display:none;position:relative;align-items:center;gap:8px">
        <button id="userMenuBtn">
          <i class="fas fa-user-circle"></i>
          <span id="navUserName">User</span>
          <i class="fas fa-chevron-down" style="font-size:10px;opacity:.5"></i>
        </button>
        <div id="userDropdown" class="user-dropdown">
          <a href="/profile"><i class="fas fa-user"></i> My Profile</a>
          <a href="/wishlist"><i class="fas fa-heart"></i> Wishlist</a>
          <a href="/admin" id="navAdminLink" style="display:none"><i class="fas fa-crown"></i> Admin Panel</a>
          <div class="separator"></div>
          <button data-logout><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      </div>

      <!-- Hamburger -->
      <button class="hamburger" id="hamburger" aria-label="Toggle Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</nav>

<!-- Mobile Navigation Drawer -->
<div class="mobile-nav" id="mobileNav">
  <a href="/">Home</a>
  <a href="/products">Collection</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/wishlist">Wishlist</a>
  
  <!-- Logged-in only -->
  <a href="/profile" class="mob-auth-only" style="display:none"><i class="fas fa-user" style="margin-right:8px;color:var(--gold)"></i>My Profile</a>
  <a href="/admin"   id="mobAdminLink" class="mob-auth-only" style="display:none"><i class="fas fa-crown" style="margin-right:8px;color:var(--gold)"></i>Admin Panel</a>
  <a href="#" data-logout class="mob-auth-only" style="display:none;color:var(--red) !important"><i class="fas fa-sign-out-alt" style="margin-right:8px"></i>Logout</a>

  <!-- Logged-out only -->
  <a href="/login" class="mob-guest-only"><i class="fas fa-sign-in-alt" style="margin-right:8px;color:var(--gold)"></i>Login</a>
  <a href="/signup" class="mob-guest-only"><i class="fas fa-user-plus" style="margin-right:8px;color:var(--gold)"></i>Sign Up</a>
</div>
`;

const FOOTER_HTML = `
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3 style="display:flex;align-items:center;gap:8px">
          <img src="/images/logo-icon.svg" class="footer-logo-img" alt="Emblem" />
          <span>Rinky Jewellers</span>
        </h3>
        <p>Crafting timeless elegance since 2004. Every piece tells a story of artistry, tradition, and love.</p>
        <div class="social-links">
          <a href="https://www.instagram.com/rinky_jewellers?igsi=dXFvd3ZwcnZtMmU0" target="_blank" rel="noopener" class="social-link" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="https://wa.me/message/3C7ZPKXJJS3OP1" target="_blank" rel="noopener" class="social-link" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
          <a href="https://share.google/wYAWqkxLuFsukUtnW" target="_blank" rel="noopener" class="social-link" aria-label="Google Maps"><i class="fas fa-map-marked-alt"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/products">Collection</a></li>
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Categories</h4>
        <ul>
          <li><a href="/products?category=Necklaces">Necklaces</a></li>
          <li><a href="/products?category=Rings">Rings</a></li>
          <li><a href="/products?category=Earrings">Earrings</a></li>
          <li><a href="/products?category=Bangles">Bangles</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Visit Us</h4>
        <div class="footer-contact-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>
            Awas Vikas Colony,<br>Kanpur, U.P. – 208 021<br>
            <a href="https://share.google/wYAWqkxLuFsukUtnW" target="_blank" rel="noopener" style="color:var(--gold);font-size:12px;display:inline-flex;align-items:center;gap:4px;margin-top:4px">
              <i class="fas fa-directions"></i> Get Directions (Google Maps)
            </a>
          </span>
        </div>
        <div class="footer-contact-item"><i class="fas fa-phone"></i><a href="tel:+919839721896" style="color:inherit;text-decoration:none">+91 98397 21896</a></div>
        <div class="footer-contact-item"><i class="fas fa-envelope"></i><a href="mailto:rinkyjewellers0@gmail.com" style="color:inherit;text-decoration:none">rinkyjewellers0@gmail.com</a></div>
        <div class="footer-contact-item"><i class="fas fa-clock"></i><span>Mon–Sun: 11AM – 8PM (All Days)</span></div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p class="footer-credit">
      &copy; ${new Date().getFullYear()} Rinky Jewellers. All Rights Reserved. |
      Designed &amp; Developed by
      <a href="mailto:agarwallakshya172@gmail.com">Lakshya Agarwal</a>
    </p>
    <p class="footer-tagline">✦ Elegance You Can Wear ✦</p>
  </div>
</footer>
`;

// Inject before page content
document.addEventListener('DOMContentLoaded', () => {
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) placeholder.outerHTML = NAV_HTML;

  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) footerPlaceholder.outerHTML = FOOTER_HTML;
});
