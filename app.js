/* Vision Sketches - JS Enhancements
   Implements:
   - Lightbox gallery for product images
   - Modal utilities (used by contact success modal)
   - Accessible accordion/tabs (optional if markup exists)
   - Smooth animations + active sections (lightweight)
   - AJAX-like client-side form validation + simulated async submit

   Note: This is client-side only (no backend). Forms show a success modal and
   build a mailto link for contact.
*/

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // ---------------------------
  // Utilities: Modal
  // ---------------------------
  const modal = {
    el: null,
    closeBtn: null,
    messageEl: null,

    init(root = document) {
      this.el = $('#success-modal', root);
      this.closeBtn = $('#modal-close', root);
      this.messageEl = $('#modal-message', root);

      if (!this.el) return false;

      this.el.setAttribute('role', 'dialog');
      this.el.setAttribute('aria-modal', 'true');
      this.el.style.display = 'none';

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.hide());
      }

      // close on overlay click
      this.el.addEventListener('click', (e) => {
        if (e.target === this.el) this.hide();
      });

      // close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.el && this.el.style.display !== 'none') {
          this.hide();
        }
      });

      return true;
    },

    show(message) {
      if (!this.el) return;
      if (this.messageEl && typeof message === 'string') this.messageEl.textContent = message;
      this.el.style.display = 'block';
      this.el.classList.add('is-open');
      // Basic focus management
      this.closeBtn?.focus?.();
    },

    hide() {
      if (!this.el) return;
      this.el.style.display = 'none';
      this.el.classList.remove('is-open');
    }
  };

  // Inject minimal modal styling if not present
  function ensureModalStyles() {
    const id = 'bbai-modal-styles';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
#success-modal.modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:none;}
#success-modal .modal-content{background:rgba(11,16,32,.96);border:1px solid rgba(234,242,255,.18);color:#eaf2ff;border-radius:16px;padding:18px;max-width:520px;margin:12vh auto;box-shadow:0 22px 60px rgba(0,0,0,.45);}
#success-modal .close{float:right;cursor:pointer;font-size:28px;line-height:1;color:rgba(234,242,255,.78)}
#success-modal p{margin:0;color:rgba(234,242,255,.9)}
`;
    document.head.appendChild(style);
  }

  // ---------------------------
  // Gallery Lightbox
  // ---------------------------
  function initLightbox(root = document) {
    // Only enable if there are product thumbnails on the page.
    const thumbs = $$('.product-thumb', root);
    if (!thumbs.length) return;

    // Create lightbox DOM once
    let overlay = $('#bbai-lightbox', root);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bbai-lightbox';
      overlay.innerHTML = `
        <div class="bbai-lightbox-inner" role="dialog" aria-modal="true" aria-label="Image preview">
          <button class="bbai-close" type="button" aria-label="Close">&times;</button>
          <div class="bbai-stage">
            <button class="bbai-nav bbai-prev" type="button" aria-label="Previous image">&#10094;</button>
            <img class="bbai-img" alt="Preview" />
            <button class="bbai-nav bbai-next" type="button" aria-label="Next image">&#10095;</button>
          </div>
          <div class="bbai-caption" aria-live="polite"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.style.display = 'none';
      overlay.setAttribute('role', 'presentation');

      const styleId = 'bbai-lightbox-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
#bbai-lightbox{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);display:none;}
#bbai-lightbox .bbai-lightbox-inner{position:relative;max-width:980px;margin:8vh auto;padding:14px;background:rgba(11,16,32,.98);border:1px solid rgba(234,242,255,.18);border-radius:16px;}
#bbai-lightbox .bbai-close{position:absolute;top:10px;right:10px;border:none;background:transparent;color:rgba(234,242,255,.85);font-size:34px;cursor:pointer;}
#bbai-lightbox .bbai-stage{display:flex;align-items:center;gap:14px;}
#bbai-lightbox .bbai-img{max-height:72vh;max-width:760px;margin:0 auto;object-fit:contain;border-radius:12px;}
#bbai-lightbox .bbai-nav{border:none;background:rgba(255,255,255,.06);color:rgba(234,242,255,.9);border:1px solid rgba(234,242,255,.12);width:44px;height:44px;border-radius:999px;cursor:pointer;}
#bbai-lightbox .bbai-caption{margin-top:10px;color:rgba(234,242,255,.82);text-align:center;}
#bbai-lightbox .bbai-nav:disabled{opacity:.4;cursor:not-allowed;}
`;
        document.head.appendChild(style);
      }
    }

    let currentIndex = -1;
    const imgEl = $('.bbai-img', overlay);
    const captionEl = $('.bbai-caption', overlay);
    const prevBtn = $('.bbai-prev', overlay);
    const nextBtn = $('.bbai-next', overlay);

    let lastFocusEl = null;

    function openAt(index) {
      currentIndex = index;
      const t = thumbs[currentIndex];
      if (!t) return;

      lastFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      const src = t.getAttribute('src');
      const alt = t.getAttribute('alt') || '';
      imgEl.src = src;
      imgEl.alt = alt || 'Preview';

      // Try to pull caption from nearby <p class="product-price">
      const wrapper = t.closest('.product-center') || t.parentElement;
      const p = wrapper ? wrapper.querySelector('.product-price') : null;
      captionEl.textContent = (p?.textContent || alt || '').trim();

      prevBtn.disabled = currentIndex <= 0;
      nextBtn.disabled = currentIndex >= thumbs.length - 1;

      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';

      // Move focus inside dialog
      const focusTarget = $('.bbai-close', overlay) || prevBtn;
      focusTarget?.focus?.();
    }

    function close() {
      overlay.style.display = 'none';
      imgEl.src = '';
      document.body.style.overflow = '';

      // Restore focus to the last thumbnail trigger
      if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
        lastFocusEl.focus();
      }
    }


    thumbs.forEach((t, idx) => {
      t.style.cursor = 'zoom-in';
      t.addEventListener('click', (e) => {
        e.preventDefault();
        openAt(idx);
      });
    });

    $('.bbai-close', overlay)?.addEventListener('click', close);

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) openAt(currentIndex - 1);
    });
    nextBtn.addEventListener('click', () => {
      if (currentIndex < thumbs.length - 1) openAt(currentIndex + 1);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (overlay.style.display === 'none') return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prevBtn.click();
      if (e.key === 'ArrowRight') nextBtn.click();
    });
  }

  // ---------------------------
  // Animations: subtle entry
  // ---------------------------
  function initScrollReveal(root = document) {
    // Lightweight: only adds class if elements exist.
    const candidates = $$('.reveal', root);
    if (!candidates.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    candidates.forEach((el) => io.observe(el));

    const id = 'bbai-reveal-styles';
    if (!document.getElementById(id)) {
      const st = document.createElement('style');
      st.id = id;
      st.textContent = `.reveal{opacity:0;transform:translateY(10px);transition:opacity .6s ease,transform .6s ease}.reveal.is-visible{opacity:1;transform:translateY(0)}`;
      document.head.appendChild(st);
    }
  }

  // ---------------------------
  // Forms: validation + simulated AJAX
  // ---------------------------
  function validateEmail(email) {
    // Basic RFC-ish check
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function validatePhone(phone) {
    // Allow digits, spaces, +, - and parentheses
    const p = String(phone || '').trim();
    return p === '' || /^[+]?[-()\d\s]{7,}$/.test(p);
  }

  function setFieldError(fieldEl, errorId, message) {
    if (!fieldEl || !(fieldEl instanceof HTMLElement)) return;

    // Mark invalid for screen readers
    fieldEl.setAttribute('aria-invalid', 'true');
    if (errorId) fieldEl.setAttribute('aria-describedby', errorId);

    const err = document.createElement('div');
    err.className = 'form-error';
    err.id = errorId;
    err.setAttribute('role', 'alert');

    err.style.color = '#ff5a7a';
    err.style.fontWeight = '700';
    err.style.marginTop = '-2px';
    err.textContent = message;

    fieldEl.insertAdjacentElement('afterend', err);
  }

  function clearFormErrors(rootEl) {
    $$('.form-error', rootEl).forEach((n) => n.remove());
    $$('input[aria-invalid="true"], textarea[aria-invalid="true"], select[aria-invalid="true"]', rootEl).forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
  }

  function initContactForm(root = document) {
    const form = $('#contact-form', root);
    if (!form) return;

    // Ensure modal is ready
    modal.init(root);
    ensureModalStyles();

    // Basic client-side validation + async simulation
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear any previous errors
      clearFormErrors(root);

      const name = $('#name', form);
      const email = $('#email', form);
      const message = $('#message', form);


      const nameVal = name?.value?.trim() || '';
      const emailVal = email?.value?.trim() || '';
      const msgVal = message?.value?.trim() || '';

      // HTML5 handles required, but we also validate formats.
      const errors = [];
      if (!nameVal) errors.push({ el: name, text: 'Please enter your name.' });
      if (!emailVal || !validateEmail(emailVal)) errors.push({ el: email, text: 'Please enter a valid email address.' });
      if (!msgVal || msgVal.length < 10) errors.push({ el: message, text: 'Please enter a message (min 10 characters).' });

      if (errors.length) {
        errors.forEach(({ el, text }, i) => {
          if (!el) return;
          const errorId = `bbai-err-${form.id || 'form'}-${(el.id || el.name || 'field')}-${i}`;
          setFieldError(el, errorId, text);
        });
        return;
      }

      // Simulate AJAX request
      const submitBtn = $('button[type="submit"]', form);
      if (submitBtn) submitBtn.disabled = true;

      try {
        await new Promise((r) => setTimeout(r, 650));

        // Build mailto link (so user can send email as required by the spec)
        const to = 'infor@vhonengudza.com';
        const subject = encodeURIComponent('Vision Sketches - Contact Message');
        const body = encodeURIComponent(
          `Name: ${nameVal}\nEmail: ${emailVal}\n\nMessage:\n${msgVal}`
        );

        // Show success modal
        modal.show('Thank you! Your message is ready to send.');

        // Attempt to open mail client after short delay
        setTimeout(() => {
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        }, 300);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // If an enquiry.html exists, support it generically.
  function initEnquiryForm(root = document) {
    // Support generic enquiry form; if present, enhance validation UX.

    const form = $('#enquiry-form', root) || $('#enquiry', root).querySelector?.('form');
    if (!form) return;

    modal.init(root);
    ensureModalStyles();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $$('.form-error', root).forEach((n) => n.remove());

      // Common fields (optional)
      const getVal = (sel) => $(sel, form)?.value?.trim() || '';
      const nameVal = getVal('#name') || getVal('input[name="name"]');
      const emailVal = getVal('#email') || getVal('input[name="email"]');
      const phoneVal = getVal('#phone') || getVal('input[name="phone"]');
      const topicVal = getVal('#topic') || getVal('select[name="topic"]');
      const msgVal = getVal('#message') || getVal('textarea[name="message"]');

      const errors = [];
      if (!nameVal) errors.push({ el: $('#name', form) || form, text: 'Please enter your name.' });
      if (emailVal && !validateEmail(emailVal)) errors.push({ el: $('#email', form) || form, text: 'Please enter a valid email address.' });
      if (!emailVal) errors.push({ el: $('#email', form) || form, text: 'Please enter your email address.' });
      if (phoneVal && !validatePhone(phoneVal)) errors.push({ el: $('#phone', form) || form, text: 'Please enter a valid phone number.' });
      if (!msgVal || msgVal.length < 10) errors.push({ el: $('#message', form) || form, text: 'Please enter more details (min 10 characters).' });

      if (errors.length) {
        errors.forEach(({ el, text }) => {
          if (!el || !(el instanceof HTMLElement)) return;
          const err = document.createElement('div');
          err.className = 'form-error';
          err.style.color = '#ff5a7a';
          err.style.fontWeight = '700';
          err.style.marginTop = '-2px';
          err.textContent = text;
          el.insertAdjacentElement('afterend', err);
        });
        return;
      }

      const submitBtn = $('button[type="submit"]', form);
      if (submitBtn) submitBtn.disabled = true;

      try {
        await new Promise((r) => setTimeout(r, 650));

        // Show response based on enquiry type.
        let response = 'Thank you for your enquiry! We will get back to you soon.';
        if (topicVal) {
          response = `Thanks, we received your enquiry about "${topicVal}". Pricing/availability details will be sent to your email.`;
        }

        modal.show(response);

        // Mailto (client side)
        const to = 'infor@vhonengudza.com';
        const subject = encodeURIComponent('Vision Sketches - Enquiry');
        const body = encodeURIComponent(
          `Name: ${nameVal}\nEmail: ${emailVal}\nPhone: ${phoneVal || '-'}\nType: ${topicVal || '-'}\n\nDetails:\n${msgVal}`
        );
        setTimeout(() => {
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        }, 300);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // ---------------------------
  // Run
  // ---------------------------
  // ---------------------------
  // Optional: Product search (client-side)
  // ---------------------------
  function initProductSearch(root = document) {
    // Activate only when there is a search input on the page.
    const searchInput = root.querySelector('#search, input[type="search"], input[data-search], .search-input');
    if (!searchInput) return;

    // Results region (optional)
    const resultsRegion = root.querySelector('[data-search-results], #search-results, .search-results');

    const inputName = searchInput.getAttribute('name') || 'search';
    if (!searchInput.hasAttribute('aria-label')) {
      searchInput.setAttribute('aria-label', 'Search products');
    }

    const items = Array.from(root.querySelectorAll('.product-center'));
    if (!items.length) return;

    const outputId = 'bbai-search-status';
    let status = root.querySelector(`#${outputId}`);
    if (!status) {
      status = document.createElement('div');
      status.id = outputId;
      status.setAttribute('aria-live', 'polite');
      status.style.position = 'absolute';
      status.style.left = '-9999px';
      status.style.width = '1px';
      status.style.height = '1px';
      status.style.overflow = 'hidden';
      document.body.appendChild(status);
    }

    function getTextForItem(el) {
      const img = el.querySelector('img.product-thumb');
      const alt = img?.getAttribute('alt') || '';
      const price = el.querySelector('.product-price')?.textContent || '';
      const dataKeywords = el.getAttribute('data-keywords') || '';
      const dataTitle = el.getAttribute('data-title') || '';
      return `${dataTitle} ${dataKeywords} ${alt} ${price}`.toLowerCase();
    }

    function applyFilter(query) {
      const q = String(query || '').trim().toLowerCase();
      let visibleCount = 0;

      items.forEach((el) => {
        const haystack = getTextForItem(el);
        const match = !q || haystack.includes(q);
        el.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      if (resultsRegion) {
        // If there's a visible region, keep it updated.
        resultsRegion.textContent = visibleCount ? `${visibleCount} result(s)` : 'No results found';
      }
      status.textContent = visibleCount ? `${visibleCount} result(s) found` : 'No results found';
    }

    // Initial
    applyFilter('');

    let raf = null;
    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyFilter(val));
    });
  }

  function initSiteClock(root = document) {
    const timeEl = root.querySelector('#bbai-time');
    const dateEl = root.querySelector('#bbai-date');
    if (!timeEl || !dateEl) return;

    function pad(n) {
      return String(n).padStart(2, '0');
    }

    function render() {
      const now = new Date();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());

      // Date like: YYYY-MM-DD
      const y = now.getFullYear();
      const m = pad(now.getMonth() + 1);
      const d = pad(now.getDate());

      timeEl.textContent = `${hours}:${minutes}:${seconds}`;
      dateEl.textContent = `${y}-${m}-${d}`;
    }

    render();
    setInterval(render, 1000);
  }

  ready(() => {
    modal.init();
    initProductSearch();
    initSiteClock();
    ensureModalStyles();

    initLightbox();
    initScrollReveal();
    initContactForm();
    initEnquiryForm();

    // Optional: if there are any elements that should animate, add a reveal class.
    // (No markup changes required; only affects existing .reveal elements.)
  });
})();

