// script.js
(() => {
  "use strict";

  const SELECTORS = {
    header: "[data-header]",
    nav: "[data-nav]",
    navMenu: "[data-nav-menu]",
    navToggle: "[data-nav-toggle]",
    navLink: "[data-nav-link]",
    section: "[data-section]",
    reveal: "[data-reveal]",
    themeToggle: "[data-theme-toggle]",
    backtop: "[data-backtop]",
    year: "[data-year]",
    form: "[data-form]",
    formSuccess: "[data-form-success]",
    errorFor: "[data-error-for]",
  };

  const CLASSES = {
    navOpen: "is-open",
    visible: "is-visible",
  };

  const STORAGE_KEYS = {
    theme: "bd_theme",
  };

  const THRESHOLDS = {
    backTopPx: 520,
  };

  const THEME = {
    light: "light",
    dark: "dark",
  };

  /**
   * @param {string} selector
   * @param {ParentNode} [root=document]
   * @returns {HTMLElement|null}
   */
  function getEl(selector, root = document) {
    return root.querySelector(selector);
  }

  /**
   * @param {string} selector
   * @param {ParentNode} [root=document]
   * @returns {HTMLElement[]}
   */
  function getAll(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  /**
   * @param {HTMLElement} element
   * @param {string} className
   * @param {boolean} shouldHaveClass
   */
  function setClass(element, className, shouldHaveClass) {
    if (!element) return;
    element.classList.toggle(className, shouldHaveClass);
  }

  /**
   * @param {string} value
   * @returns {boolean}
   */
  function isNonEmpty(value) {
    return Boolean(value && value.trim().length > 0);
  }

  /**
   * Basic email validation without overfitting.
   * @param {string} value
   * @returns {boolean}
   */
  function isValidEmail(value) {
    if (!isNonEmpty(value)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  /**
   * @param {HTMLElement} input
   * @param {string} message
   */
  function showError(input, message) {
    if (!input) return;
    const errorEl = getEl(`${SELECTORS.errorFor}[data-error-for="${input.id}"]`);
    if (errorEl) errorEl.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  /**
   * @param {HTMLElement} input
   */
  function clearError(input) {
    if (!input) return;
    const errorEl = getEl(`${SELECTORS.errorFor}[data-error-for="${input.id}"]`);
    if (errorEl) errorEl.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {{isValid: boolean, firstInvalidEl: HTMLElement|null}}
   */
  function validateForm(form) {
    const inputs = getAll("input, textarea", form);
    let firstInvalidEl = null;

    inputs.forEach((input) => {
      clearError(input);

      const { name, value, required, type } = input;
      if (!required) return;

      if (!isNonEmpty(value)) {
        showError(input, "Bitte ausfüllen.");
        firstInvalidEl = firstInvalidEl ?? input;
        return;
      }

      if (type === "email" && !isValidEmail(value)) {
        showError(input, "Bitte eine gültige E-Mail eingeben.");
        firstInvalidEl = firstInvalidEl ?? input;
        return;
      }

      // Example: message min length
      if (name === "message" && value.trim().length < 10) {
        showError(input, "Bitte mindestens 10 Zeichen schreiben.");
        firstInvalidEl = firstInvalidEl ?? input;
      }
    });

    return { isValid: firstInvalidEl === null, firstInvalidEl };
  }

  /**
   * @param {HTMLFormElement} form
   * @param {string} message
   */
  function showSuccess(form, message) {
    const successEl = getEl(SELECTORS.formSuccess, form);
    if (!successEl) return;
    successEl.textContent = message;
  }

  /**
   * @param {HTMLFormElement} form
   */
  function clearSuccess(form) {
    const successEl = getEl(SELECTORS.formSuccess, form);
    if (!successEl) return;
    successEl.textContent = "";
  }

  /**
   * NAV: Mobile menu toggle with focus handling
   */
  function initMobileNav() {
    const toggle = getEl(SELECTORS.navToggle);
    const menu = getEl(SELECTORS.navMenu);
    const navLinks = getAll(SELECTORS.navLink);

    if (!toggle || !menu) return;

    const closeMenu = () => {
      setClass(menu, CLASSES.navOpen, false);
      toggle.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      setClass(menu, CLASSES.navOpen, true);
      toggle.setAttribute("aria-expanded", "true");
      const firstLink = navLinks[0];
      if (firstLink) firstLink.focus();
    };

    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.contains(CLASSES.navOpen);
      if (isOpen) {
        closeMenu();
        return;
      }
      openMenu();
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeMenu();
      toggle.focus();
    });
  }

  /**
   * Smooth scroll for in-page links while respecting reduced motion
   */
  function initSmoothScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    getAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();

        if (prefersReduced) {
          target.scrollIntoView();
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /**
   * Active nav marker based on sections in view
   */
  function initActiveNav() {
    const sections = getAll(SELECTORS.section);
    const links = getAll(SELECTORS.navLink);

    if (sections.length === 0 || links.length === 0) return;

    const linkByHash = new Map(
      links.map((link) => [link.getAttribute("href"), link])
    );

    const setActive = (hash) => {
      links.forEach((l) => l.removeAttribute("aria-current"));
      const active = linkByHash.get(hash);
      if (active) active.setAttribute("aria-current", "true");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const id = visible.target.getAttribute("id");
        if (!id) return;
        setActive(`#${id}`);
      },
      {
        root: null,
        threshold: [0.25, 0.4, 0.6],
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /**
   * Reveal on scroll (IntersectionObserver)
   */
  function initReveal() {
    const elements = getAll(SELECTORS.reveal);
    if (elements.length === 0) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add(CLASSES.visible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(CLASSES.visible);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /**
   * Back-to-top button
   */
  function initBackTop() {
    const button = getEl(SELECTORS.backtop);
    if (!button) return;

    const updateVisibility = () => {
      const shouldShow = window.scrollY >= THRESHOLDS.backTopPx;
      setClass(button, CLASSES.visible, shouldShow);
    };

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /**
   * Theme toggle: respects system preference and persists choice
   */
  function initTheme() {
    const toggle = getEl(SELECTORS.themeToggle);
    if (!toggle) return;

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const stored = localStorage.getItem(STORAGE_KEYS.theme);

    const initialTheme =
      stored === THEME.dark || stored === THEME.light
        ? stored
        : systemPrefersDark
          ? THEME.dark
          : THEME.light;

    applyTheme(initialTheme);
    updateToggleLabel(toggle, initialTheme);

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === THEME.dark ? THEME.light : THEME.dark;

      applyTheme(next);
      localStorage.setItem(STORAGE_KEYS.theme, next);
      updateToggleLabel(toggle, next);
    });
  }

  /**
   * @param {string} theme
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  /**
   * @param {HTMLButtonElement} button
   * @param {string} theme
   */
  function updateToggleLabel(button, theme) {
    const label = theme === THEME.dark ? "Light Mode" : "Dark Mode";
    button.textContent = label;
  }

  /**
   * Forms: validation + success handling (demo-only)
   */
  function initForms() {
    const forms = getAll(SELECTORS.form);

    forms.forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearSuccess(form);

        const { isValid, firstInvalidEl } = validateForm(form);
        if (!isValid) {
          firstInvalidEl?.focus();
          return;
        }

        // Demo success behavior (no backend)
        showSuccess(form, "Danke! Wir haben deine Anfrage erhalten.");
        form.reset();
      });

      // Clear errors on input
      getAll("input, textarea", form).forEach((input) => {
        input.addEventListener("input", () => clearError(input));
      });
    });
  }

  function initYear() {
    const yearEl = getEl(SELECTORS.year);
    if (!yearEl) return;
    yearEl.textContent = String(new Date().getFullYear());
  }

  function init() {
    initYear();
    initMobileNav();
    initSmoothScroll();
    initActiveNav();
    initReveal();
    initBackTop();
    initTheme();
    initForms();
  }

  init();
})();
