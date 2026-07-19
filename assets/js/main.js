/**
 * Apex Agency — Main JavaScript Bundle
 * Vanilla JS with progressive enhancement and accessibility
 */

(function () {
  'use strict';

  // ── DOM Ready ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initSmoothScroll();
    initLazyLoading();
    initScrollAnimations();
    initTestimonialCarousel();
    initCaseStudyFilter();
    initContactForm();
    initCookieConsent();
    initCountUp();
    initHeaderScroll();
    initFAQAccordion();
    initFileUpload();
    initSearch();
    initProjectCarousel();
  });

  // ─── Utility Functions ─────────────────────────────────
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const throttle = (fn, limit) => {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  const isInViewport = (el, offset = 100) => {
    const rect = el.getBoundingClientRect();
    return rect.top <= (window.innerHeight - offset) && rect.bottom >= 0;
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Mobile Menu ───────────────────────────────────────
  function initMobileMenu() {
    const toggleBtn = document.querySelector('[data-mobile-menu-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    const overlay = document.querySelector('[data-mobile-overlay]');
    const closeBtn = document.querySelector('[data-mobile-menu-close]');
    const body = document.body;

    if (!toggleBtn || !menu) return;

    function openMenu() {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
      toggleBtn.setAttribute('aria-expanded', 'true');
      body.style.overflow = 'hidden';
      if (overlay) overlay.classList.remove('hidden');
    }

    function closeMenu() {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      toggleBtn.setAttribute('aria-expanded', 'false');
      body.style.overflow = '';
      if (overlay) overlay.classList.add('hidden');
    }

    toggleBtn.addEventListener('click', () => {
      const isOpen = menu.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
    });

    // Trap focus within mobile menu
    menu.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = menu.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // ─── Smooth Scroll ────────────────────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      });
    });
  }

  // ─── Lazy Loading ─────────────────────────────────────
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.src = img.dataset.src || img.src;
      });
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      });
      document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
    }
  }

  // ─── Scroll Animations ────────────────────────────────
  function initScrollAnimations() {
    if (prefersReducedMotion()) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.delay || 0;
          setTimeout(() => {
            el.classList.add('animate-fade-up');
            el.style.opacity = '1';
          }, delay);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ─── Testimonial Carousel ──────────────────────────────
  function initTestimonialCarousel() {
    const container = document.querySelector('[data-testimonials-carousel]');
    if (!container) return;

    const slides = container.querySelectorAll('[data-testimonial-slide]');
    const prevBtn = container.querySelector('[data-carousel-prev]');
    const nextBtn = container.querySelector('[data-carousel-next]');
    const dotsContainer = container.querySelector('[data-carousel-dots]');
    let currentIndex = 0;
    let autoplayInterval;

    if (slides.length === 0) return;

    // Create dots
    if (dotsContainer) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.setAttribute('data-carousel-dot', '');
        dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
        dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
          i === 0 ? 'bg-gold w-6' : 'bg-cloud-dark'
        }`;
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      });
    }

    function goToSlide(index) {
      slides.forEach((slide, i) => {
        slide.style.display = i === index ? 'block' : 'none';
        slide.setAttribute('aria-hidden', i !== index);
      });
      currentIndex = index;
      updateDots();
    }

    function updateDots() {
      if (!dotsContainer) return;
      const dots = dotsContainer.querySelectorAll('[data-carousel-dot]');
      dots.forEach((dot, i) => {
        dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
          i === currentIndex ? 'bg-gold w-6' : 'bg-cloud-dark'
        }`;
      });
    }

    function nextSlide() {
      goToSlide((currentIndex + 1) % slides.length);
    }

    function prevSlide() {
      goToSlide((currentIndex - 1 + slides.length) % slides.length);
    }

    function startAutoplay() {
      stopAutoplay();
      if (!prefersReducedMotion()) {
        autoplayInterval = setInterval(nextSlide, 5000);
      }
    }

    function stopAutoplay() {
      clearInterval(autoplayInterval);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAutoplay(); });

    container.addEventListener('mouseenter', stopAutoplay);
    container.addEventListener('mouseleave', startAutoplay);

    // Keyboard navigation
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });

    goToSlide(0);
    startAutoplay();
  }

  // ─── Case Study Filter ────────────────────────────────
  function initCaseStudyFilter() {
    const filterContainer = document.querySelector('[data-filter-container]');
    if (!filterContainer) return;

    const filterBtns = filterContainer.querySelectorAll('[data-filter-btn]');
    const items = document.querySelectorAll('[data-filter-item]');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filterBtn;
        
        // Update active button
        filterBtns.forEach(b => {
          b.classList.remove('bg-midnight', 'text-cloud');
          b.classList.add('bg-transparent', 'text-midnight');
        });
        btn.classList.remove('bg-transparent', 'text-midnight');
        btn.classList.add('bg-midnight', 'text-cloud');

        // Filter items
        items.forEach(item => {
          const tags = item.dataset.filterItem;
          if (filter === 'all' || (tags && tags.includes(filter))) {
            item.style.display = 'block';
            setTimeout(() => item.classList.remove('opacity-0', 'scale-95'), 50);
          } else {
            item.classList.add('opacity-0', 'scale-95');
            setTimeout(() => item.style.display = 'none', 300);
          }
        });
      });
    });
  }

  // ─── Contact Form (multi-step with validation) ──────────
  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const steps = form.querySelectorAll('[data-form-step]');
    const progressSteps = form.querySelectorAll('[data-progress-step]');
    const nextBtns = form.querySelectorAll('[data-next-step]');
    const prevBtns = form.querySelectorAll('[data-prev-step]');
    const submitBtn = form.querySelector('[data-submit-btn]');
    const charCounters = form.querySelectorAll('[data-char-count]');
    let currentStep = 0;

    function showStep(index) {
      steps.forEach((step, i) => {
        step.style.display = i === index ? 'block' : 'none';
      });
      progressSteps.forEach((step, i) => {
        step.classList.remove('active', 'completed');
        if (i < index) step.classList.add('completed');
        if (i === index) step.classList.add('active');
      });
      currentStep = index;
    }

    function validateStep(index) {
      const step = steps[index];
      const inputs = step.querySelectorAll('[required]');
      let valid = true;

      inputs.forEach(input => {
        const errorEl = input.parentElement.querySelector('[data-error]');
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('input-error');
          if (errorEl) errorEl.textContent = 'This field is required';
        } else {
          input.classList.remove('input-error');
          if (errorEl) errorEl.textContent = '';
        }

        // Email validation
        if (input.type === 'email' && input.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value)) {
            valid = false;
            input.classList.add('input-error');
            if (errorEl) errorEl.textContent = 'Please enter a valid email';
          }
        }

        // Phone validation
        if (input.type === 'tel' && input.value) {
          const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
          if (!phoneRegex.test(input.value)) {
            valid = false;
            input.classList.add('input-error');
            if (errorEl) errorEl.textContent = 'Please enter a valid phone number';
          }
        }
      });

      return valid;
    }

    nextBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
          showStep(currentStep + 1);
        }
      });
    });

    prevBtns.forEach(btn => {
      btn.addEventListener('click', () => showStep(currentStep - 1));
    });

    // Character counters
    charCounters.forEach(counter => {
      const input = counter.closest('[data-char-count-container]')?.querySelector('textarea, input');
      if (!input) return;
      const max = parseInt(input.getAttribute('maxlength') || input.dataset.maxlength);
      if (!max) return;

      const update = () => {
        counter.textContent = `${input.value.length}/${max}`;
      };
      input.addEventListener('input', update);
      update();
    });

    // Form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateStep(currentStep)) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="loader"></span> Sending...';
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': form.querySelector('[name="_csrf"]')?.value,
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (response.ok) {
            form.innerHTML = `
              <div class="text-center py-16 animate-fade-up">
                <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                  <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 class="font-display text-heading-xl font-bold mb-4">Thank You!</h3>
                <p class="text-body-lg text-midnight/70">We'll be in touch within 24 hours.</p>
              </div>
            `;
          } else {
            throw new Error(result.error || 'Something went wrong');
          }
        } catch (error) {
          const errorContainer = form.querySelector('[data-form-error]');
          if (errorContainer) {
            errorContainer.textContent = error.message;
            errorContainer.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
          }
        }
      });
    }

    showStep(0);
  }

  // ─── Cookie Consent Banner ─────────────────────────────
  function initCookieConsent() {
    const banner = document.querySelector('[data-cookie-banner]');
    const acceptBtn = document.querySelector('[data-cookie-accept]');
    const rejectBtn = document.querySelector('[data-cookie-reject]');
    const customizeBtn = document.querySelector('[data-cookie-customize]');

    if (!banner) return;

    const hasConsented = localStorage.getItem('apex_cookie_consent');

    if (!hasConsented) {
      setTimeout(() => banner.classList.add('visible'), 1000);
    }

    function setConsent(type) {
      localStorage.setItem('apex_cookie_consent', type);
      banner.classList.remove('visible');
      if (type === 'all') {
        // Load analytics scripts
        loadAnalytics();
      }
    }

    if (acceptBtn) acceptBtn.addEventListener('click', () => setConsent('all'));
    if (rejectBtn) rejectBtn.addEventListener('click', () => setConsent('essential'));
    if (customizeBtn) customizeBtn.addEventListener('click', () => {
      // Open cookie preferences modal
      const modal = document.querySelector('[data-cookie-modal]');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // ─── Analytics Loader ──────────────────────────────────
  function loadAnalytics() {
    // Google Analytics (only loaded after consent)
    const gaId = document.querySelector('meta[name="ga4-id"]')?.content;
    if (gaId && typeof gtag === 'undefined') {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);
      
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', gaId, { anonymize_ip: true });
    }
  }

  // ─── Count Up Animation ────────────────────────────────
  function initCountUp() {
    if (prefersReducedMotion()) return;

    const counters = document.querySelectorAll('[data-count-up]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.countUp);
          const suffix = el.dataset.countSuffix || '';
          const duration = parseInt(el.dataset.countDuration) || 2000;
          const startTime = performance.now();

          function updateCount(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);
            el.textContent = current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(updateCount);
          }

          requestAnimationFrame(updateCount);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  }

  // ─── Header Scroll Effect ──────────────────────────────
  function initHeaderScroll() {
    const header = document.querySelector('[data-header]');
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener('scroll', throttle(() => {
      const currentScroll = window.scrollY;
      
      if (currentScroll > 50) {
        header.classList.add('shadow-soft', 'backdrop-blur-lg', 'bg-cloud/90');
      } else {
        header.classList.remove('shadow-soft', 'backdrop-blur-lg', 'bg-cloud/90');
      }

      // Hide/show on scroll
      if (currentScroll > lastScroll && currentScroll > 200) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll;
    }, 100));
  }

  // ─── FAQ Accordion ─────────────────────────────────────
  function initFAQAccordion() {
    const faqItems = document.querySelectorAll('[data-faq-item]');
    
    faqItems.forEach(item => {
      const question = item.querySelector('[data-faq-question]');
      const answer = item.querySelector('[data-faq-answer]');
      const toggle = item.querySelector('[data-faq-toggle]');

      if (!question || !answer) return;

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        // Close all
        faqItems.forEach(i => {
          i.classList.remove('active');
          i.querySelector('[data-faq-answer]')?.setAttribute('hidden', '');
          i.querySelector('[data-faq-toggle]')?.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('active');
          answer.removeAttribute('hidden');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
      });

      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });
    });
  }

  // ─── File Upload ───────────────────────────────────────
  function initFileUpload() {
    const dropZones = document.querySelectorAll('[data-file-upload]');
    
    dropZones.forEach(zone => {
      const input = zone.querySelector('input[type="file"]');
      const preview = zone.querySelector('[data-file-preview]');
      const placeholder = zone.querySelector('[data-file-placeholder]');

      if (!input) return;

      function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];

        if (file.size > 5 * 1024 * 1024) {
          alert('File is too large. Maximum size is 5MB.');
          return;
        }

        if (preview) {
          preview.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-cloud-dark rounded-md">
              <svg class="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-body-sm font-medium truncate">${file.name}</p>
                <p class="text-caption text-midnight/50">${(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" class="text-red-500 hover:text-red-700" data-remove-file>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;

          const removeBtn = preview.querySelector('[data-remove-file]');
          if (removeBtn) {
            removeBtn.addEventListener('click', () => {
              input.value = '';
              preview.innerHTML = '';
              if (placeholder) placeholder.style.display = 'block';
            });
          }
        }

        if (placeholder) placeholder.style.display = 'none';
      }

      input.addEventListener('change', () => handleFiles(input.files));

      // Drag and drop
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
      });
    });
  }

  // ─── Search ────────────────────────────────────────────
  function initSearch() {
    const searchInput = document.querySelector('[data-search-input]');
    const searchResults = document.querySelector('[data-search-results]');

    if (!searchInput) return;

    const performSearch = debounce(async (query) => {
      if (query.length < 2) {
        if (searchResults) searchResults.innerHTML = '';
        return;
      }

      try {
        const response = await fetch(`/api/blog?search=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (searchResults && data.posts) {
          searchResults.innerHTML = data.posts.map(post => `
            <a href="${post.url}" class="block p-4 hover:bg-cloud-dark/50 transition-colors">
              <h4 class="font-medium text-body-sm">${post.title}</h4>
              <p class="text-caption text-midnight/50 mt-1">${post.excerpt}</p>
            </a>
          `).join('');
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);

    searchInput.addEventListener('input', (e) => performSearch(e.target.value));
  }

  // ─── Project / Case Study Carousel ─────────────────────
  function initProjectCarousel() {
    const carousel = document.querySelector('[data-project-carousel]');
    if (!carousel) return;

    const track = carousel.querySelector('[data-carousel-track]');
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    const slides = carousel.querySelectorAll('[data-carousel-slide]');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    const slideWidth = slides[0].offsetWidth + 32; // including gap

    function goToSlide(index) {
      currentIndex = Math.max(0, Math.min(index, slides.length - 1));
      track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
      
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= slides.length - 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

    // Touch support
    let startX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const diff = startX - e.touches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(currentIndex + 1);
        else goToSlide(currentIndex - 1);
        isDragging = false;
      }
    }, { passive: true });

    track.addEventListener('touchend', () => { isDragging = false; }, { passive: true });

    goToSlide(0);
  }

})();
