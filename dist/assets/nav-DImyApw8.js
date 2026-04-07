import{t as e}from"./bootstrap-Cbo2cs6e.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var t={assetsBase:`https://kevinhaus.com/assets`,stillHoldTime:1500,stillFadeDuration:0,defaultTheme:`light`,adminPassword:`zukqaj-8behmi-kYsnyd`};function n(){return localStorage.getItem(`kh-theme`)||t.defaultTheme}function r(e){document.documentElement.setAttribute(`data-bs-theme`,e),localStorage.setItem(`kh-theme`,e),document.querySelectorAll(`[data-logo-light]`).forEach(t=>{t.src=e===`dark`?t.dataset.logoDark:t.dataset.logoLight})}function i(){r(n()===`dark`?`light`:`dark`)}function a(){let e=window.location.pathname;document.querySelectorAll(`.kh-nav-link`).forEach(t=>{let n=t.getAttribute(`href`)||``,r=(n===`/index.html`||n===`/`)&&(e===`/`||e.endsWith(`index.html`)),i=!r&&n!==`/`&&n!==`/index.html`&&e.includes(n.replace(`.html`,``));t.classList.toggle(`active`,r||i)})}document.addEventListener(`DOMContentLoaded`,()=>{r(n());let t=document.getElementById(`khPreloader`);t&&setTimeout(()=>{t.classList.add(`kh-preloader--hidden`),t.addEventListener(`transitionend`,()=>t.remove(),{once:!0})},300),document.querySelectorAll(`.kh-theme-toggle`).forEach(e=>{e.addEventListener(`click`,i)}),a(),document.querySelectorAll(`.kh-nav-link`).forEach(t=>{t.addEventListener(`click`,()=>{let t=document.getElementById(`khOffcanvas`);if(t){let n=e.getInstance(t);n&&n.hide()}})})});var o=`<!-- Shared nav partial — injected by nav.js into every page -->
<nav class="kh-navbar">
  <!-- Logo (left) — hidden on home page via CSS [data-page="home"] -->
  <a href="/index.html" class="kh-nav-logo">
    <img
      src="https://kevinhaus.com/assets/Logo_small_blk.png"
      data-logo-light="https://kevinhaus.com/assets/Logo_small_blk.png"
      data-logo-dark="https://kevinhaus.com/assets/Logo_small_wht.png"
      data-logo-swap
      alt="Kevin Haus"
    >
  </a>

  <!-- Right controls -->
  <div class="kh-nav-right">
    <!-- Theme toggle -->
    <button class="kh-theme-toggle" aria-label="Toggle color theme">
      <!-- Sun icon (shown in dark mode) -->
      <svg class="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <!-- Moon icon (shown in light mode) -->
      <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>

    <!-- Hamburger — swap SVG inside .kh-hamburger-icon to use a custom icon -->
    <button
      class="kh-hamburger"
      type="button"
      data-bs-toggle="offcanvas"
      data-bs-target="#khOffcanvas"
      aria-controls="khOffcanvas"
      aria-label="Open menu"
    >
      <span class="kh-hamburger-icon">
        <!-- Standard Bootstrap hamburger lines. Replace this SVG for a custom icon. -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </span>
    </button>
  </div>
</nav>

<!-- Offcanvas menu -->
<div class="offcanvas offcanvas-end kh-offcanvas" tabindex="-1" id="khOffcanvas" aria-labelledby="khOffcanvasLabel">
  <div class="offcanvas-header">
    <div class="kh-offcanvas-logo">
      <img
        src="https://kevinhaus.com/assets/Logo_small_blk.png"
        data-logo-light="https://kevinhaus.com/assets/Logo_small_blk.png"
        data-logo-dark="https://kevinhaus.com/assets/Logo_small_wht.png"
        data-logo-swap
        alt="Kevin Haus"
        style="height:48px; width:auto;"
      >
    </div>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>
  <div class="offcanvas-body">
    <ul class="kh-nav-links" id="khOffcanvasLabel">
      <li><a href="/index.html" class="kh-nav-link">Home</a></li>
      <li><a href="/work.html" class="kh-nav-link">Work</a></li>
      <li><a href="/about.html" class="kh-nav-link">About</a></li>
      <li><a href="/contact.html" class="kh-nav-link">Contact</a></li>
    </ul>
    <div class="kh-offcanvas-footer">
      <a href="mailto:hello@kevinhaus.com">
        <img
          src="https://kevinhaus.com/assets/hello_blk.png"
          data-logo-light="https://kevinhaus.com/assets/hello_blk.png"
          data-logo-dark="https://kevinhaus.com/assets/hello_wht.png"
          data-logo-swap
          alt="hello@kevinhaus.com"
          class="kh-nav-email-img"
        >
      </a>
    </div>
  </div>
</div>
`;export{t as n,o as t};