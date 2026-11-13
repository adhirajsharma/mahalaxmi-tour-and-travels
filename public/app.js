/* =========================================================
   Mahalaxmi Tours and Travels — Interactive Frontend
   ========================================================= */

const state = {
  cars: [],
  reviews: [],
  brand: null,
  activeCategory: 'all'
};

/* =========================================================
   Scroll Animations (IntersectionObserver)
   ========================================================= */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach((el) => {
    observer.observe(el);
  });
}

/* =========================================================
   Animated Number Counters (hero stats)
   ========================================================= */
function animateCounter(el, target, duration = 1200) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const counterEls = document.querySelectorAll('[data-count]');
  if (!counterEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          animateCounter(el, parseInt(el.dataset.count, 10));
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );
  counterEls.forEach((el) => observer.observe(el));
}

/* =========================================================
   Floating Book Button + Header Scroll Shadow
   ========================================================= */
function initScrollEffects() {
  const fab = document.getElementById('fabBook');
  const header = document.getElementById('siteHeader');
  const hero = document.getElementById('hero');

  window.addEventListener('scroll', () => {
    const heroBottom = hero ? hero.offsetHeight : 400;
    // FAB
    if (window.scrollY > heroBottom * 0.7) {
      fab && fab.classList.add('visible');
    } else {
      fab && fab.classList.remove('visible');
    }
    // Header shadow
    if (window.scrollY > 10) {
      header && header.classList.add('scrolled');
    } else {
      header && header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/* =========================================================
   Active nav link highlight on scroll
   ========================================================= */
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach((section) => {
      if (window.scrollY >= section.offsetTop - 120) {
        current = section.id;
      }
    });
    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* =========================================================
   Skeleton Loaders → Real Content
   ========================================================= */
function showCarSkeletons() {
  const grid = document.getElementById('carsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="car-skeleton"></div>'.repeat(3);
}

function showReviewSkeletons() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="review-skeleton"></div>'.repeat(3);
}

/* =========================================================
   Data Loading
   ========================================================= */
async function loadWebsiteData() {
  showCarSkeletons();
  showReviewSkeletons();
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    if (!data.success) return;

    state.brand = data.brand || {};
    state.cars = data.cars || [];
    state.reviews = data.reviews || [];

    renderBrandInfo(state.brand);
    renderCars();
    renderReviews(state.reviews);
  } catch (err) {
    console.error('Failed to fetch /api/data:', err);
    document.getElementById('carsGrid').innerHTML =
      '<p style="color:var(--text-muted);padding:20px;">Unable to load cars. Please refresh the page.</p>';
  }
}

function renderBrandInfo(brand) {
  if (!brand) return;
  const waNum = brand.whatsappNumber || '+918871724435';
  const email = brand.email || 'pravin361f@gmail.com';
  const locText =
    brand.officeLocation ||
    'AM-18, DD Nagar (Deendayal Nagar), In front of Bhadouriya Ground, Near Mangal Bhawan, Gwalior, Madhya Pradesh';
  const mapUrl =
    brand.officeMapUrl ||
    'https://www.google.com/maps/place/Mahalaxmi+tours+and+travels/@26.2566343,78.2131111,17z';

  const officeAddr = document.getElementById('officeAddressText');
  const officeWa = document.getElementById('officeWhatsappLink');
  const officePhone = document.getElementById('officePhoneLink');
  const officeEmail = document.getElementById('officeEmailLink');

  if (officeAddr) { officeAddr.href = mapUrl; officeAddr.textContent = `${locText} ↗`; }
  if (officeWa) { officeWa.href = `https://wa.me/${waNum.replace(/\D/g, '')}`; officeWa.textContent = waNum; }
  if (officePhone) { officePhone.href = `tel:${waNum}`; officePhone.textContent = waNum; }
  if (officeEmail) { officeEmail.href = `mailto:${email}`; officeEmail.textContent = email; }
}

/* =========================================================
   Car Cards Renderer
   ========================================================= */
function renderCars() {
  const grid = document.getElementById('carsGrid');
  if (!grid) return;

  const filtered =
    state.activeCategory === 'all'
      ? state.cars
      : state.cars.filter((c) => c.category === state.activeCategory);

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;">No cars found in this category.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (car) => `
      <article class="car-card reveal-up">
        <div class="car-img-wrap">
          <img src="${car.image}" alt="${car.name}" loading="lazy" />
          <span class="car-badge">${car.badge}</span>
          <span class="car-rate">₹${car.ratePerKm} / KM</span>
        </div>
        <div class="car-body">
          <h3 class="car-title">${car.name}</h3>
          <div class="car-type">${car.type}</div>

          <div class="car-specs">
            <span class="spec-tag">💺 ${car.seating}</span>
            <span class="spec-tag">🧳 ${car.bags}</span>
            <span class="spec-tag">❄️ Full AC</span>
            <span class="spec-tag">📍 GPS</span>
          </div>

          <div class="car-actions">
            <a
              href="https://wa.me/918871724435?text=${encodeURIComponent('Hello Mahalaxmi Tours and Travels, I want to enquire about ' + car.name + ' (₹' + car.ratePerKm + '/KM).')}"
              target="_blank"
              rel="noopener"
              class="btn-outline"
            >
              💬 WhatsApp
            </a>
            <button type="button" class="btn-primary-sm" data-enquire-car="${car.name}">
              Enquire Now →
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join('');

  // Animate newly inserted cards
  grid.querySelectorAll('.reveal-up').forEach((el, i) => {
    setTimeout(() => el.classList.add('in-view'), i * 80);
  });
}

/* =========================================================
   Reviews Renderer
   ========================================================= */
function renderReviews(reviews) {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  grid.innerHTML = reviews
    .map(
      (r) => `
      <div class="review-card reveal-up">
        <div class="review-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
        <p class="review-comment">"${r.comment}"</p>
        <div class="review-author">
          <strong style="color:var(--navy-900);">${r.name}</strong> · ${r.city}<br/>
          <span style="color:var(--text-muted);">Booked: ${r.car}</span>
        </div>
      </div>
    `
    )
    .join('');

  grid.querySelectorAll('.reveal-up').forEach((el, i) => {
    setTimeout(() => el.classList.add('in-view'), i * 80);
  });
}

/* =========================================================
   Star Rating Picker
   ========================================================= */
function initStarPicker() {
  const stars = document.querySelectorAll('.star-btn');
  const ratingInput = document.getElementById('revRating');
  if (!stars.length || !ratingInput) return;

  stars.forEach((star) => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.val);
      stars.forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
      });
    });

    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val);
      ratingInput.value = val;
      stars.forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
      });
    });
  });

  document.querySelector('.star-picker').addEventListener('mouseleave', () => {
    const val = parseInt(ratingInput.value);
    stars.forEach((s) => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  });
}

/* =========================================================
   Character Counter for Review Textarea
   ========================================================= */
function initCharCounter() {
  const textarea = document.getElementById('revComment');
  const counter = document.getElementById('revCharCount');
  if (!textarea || !counter) return;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = len;
    counter.style.color = len > 360 ? '#EF4444' : 'var(--text-muted)';
  });
}

/* =========================================================
   Inline Form Validation
   ========================================================= */
function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(errorId);
  if (!input || !err) return;
  err.textContent = message;
  input.classList.toggle('invalid', !!message);
  input.classList.toggle('valid', !message && input.value.trim().length > 0);
}

function validateEnquiryForm(payload) {
  let valid = true;

  if (!payload.name || payload.name.length < 2) {
    setFieldError('inputName', 'errName', 'Please enter your full name (at least 2 characters).');
    valid = false;
  } else {
    setFieldError('inputName', 'errName', '');
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!payload.email || !emailRe.test(payload.email)) {
    setFieldError('inputEmail', 'errEmail', 'Please enter a valid email address.');
    valid = false;
  } else {
    setFieldError('inputEmail', 'errEmail', '');
  }

  const digits = payload.number ? payload.number.replace(/\D/g, '') : '';
  if (!digits || (digits.length !== 10 && digits.length !== 12)) {
    setFieldError('inputNumber', 'errNumber', 'Enter a valid 10-digit WhatsApp number.');
    valid = false;
  } else {
    setFieldError('inputNumber', 'errNumber', '');
  }

  if (!payload.source || payload.source.length < 2) {
    setFieldError('inputSource', 'errSource', 'Please enter pickup location.');
    valid = false;
  } else {
    setFieldError('inputSource', 'errSource', '');
  }

  if (!payload.destination || payload.destination.length < 2) {
    setFieldError('inputDestination', 'errDestination', 'Please enter drop location.');
    valid = false;
  } else {
    setFieldError('inputDestination', 'errDestination', '');
  }

  return valid;
}

/* =========================================================
   Mobile Navigation
   ========================================================= */
function initMobileNav() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  if (!mobileMenuBtn || !mobileNavDrawer) return;

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    mobileNavDrawer.classList.toggle('open');
  });

  mobileNavDrawer.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenuBtn.classList.remove('active');
      mobileNavDrawer.classList.remove('open');
    });
  });
}

/* =========================================================
   Car Filter Tabs
   ========================================================= */
function initCarFilter() {
  document.getElementById('carFilterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    state.activeCategory = btn.dataset.category;
    document.querySelectorAll('.filter-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderCars();
  });

  // Enquire Now → scroll to form + pre-fill
  document.getElementById('carsGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-enquire-car]');
    if (!btn) return;
    document.getElementById('enquiry').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const nameField = document.getElementById('inputName');
      if (nameField) nameField.focus();
    }, 450);
  });
}

/* =========================================================
   Review Form Submission
   ========================================================= */
function initReviewForm() {
  const reviewForm = document.getElementById('reviewForm');
  if (!reviewForm) return;

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const revFeedback = document.getElementById('reviewFeedback');
    const revBtn = document.getElementById('submitReviewBtn');

    const name = document.getElementById('revName').value.trim();
    const comment = document.getElementById('revComment').value.trim();

    if (!name || !comment) {
      revFeedback.textContent = '⚠️ Please enter your name and review.';
      revFeedback.className = 'form-feedback error';
      revFeedback.classList.remove('hidden');
      return;
    }

    const reviewPayload = {
      type: 'review',
      name,
      city: document.getElementById('revCity').value.trim() || 'Gwalior',
      car: document.getElementById('revCar').value,
      rating: Number(document.getElementById('revRating').value || 5),
      comment
    };

    revBtn.disabled = true;
    revBtn.textContent = 'Posting…';
    revFeedback.classList.add('hidden');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        revFeedback.textContent = '⚠️ ' + (data.error || 'Could not submit review. Please try again.');
        revFeedback.className = 'form-feedback error';
        revFeedback.classList.remove('hidden');
        return;
      }

      state.reviews = data.reviews || [data.review, ...state.reviews];
      renderReviews(state.reviews);

      revFeedback.textContent = `✅ Thank you, ${data.review.name}! Your review is now live above.`;
      revFeedback.className = 'form-feedback success';
      revFeedback.classList.remove('hidden');

      reviewForm.reset();
      document.getElementById('revRating').value = '5';
      document.getElementById('revCharCount').textContent = '0';
      // reset stars
      document.querySelectorAll('.star-btn').forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= 5);
      });

      revFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      revFeedback.textContent = '⚠️ Network error. Please try again.';
      revFeedback.className = 'form-feedback error';
      revFeedback.classList.remove('hidden');
    } finally {
      revBtn.disabled = false;
      revBtn.textContent = 'Post Review →';
    }
  });
}

/* =========================================================
   Enquiry Form Submission
   ========================================================= */
function initEnquiryForm() {
  const enquiryForm = document.getElementById('enquiryForm');
  if (!enquiryForm) return;

  // Real-time validation on blur
  ['inputName', 'inputEmail', 'inputNumber', 'inputSource', 'inputDestination'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', () => {
      const payload = {
        name: document.getElementById('inputName').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        number: document.getElementById('inputNumber').value.trim(),
        source: document.getElementById('inputSource').value.trim(),
        destination: document.getElementById('inputDestination').value.trim()
      };
      validateEnquiryForm(payload);
    });
  });

  enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('formFeedback');
    const waBox = document.getElementById('whatsappDispatchBox');
    const submitBtn = document.getElementById('submitEnquiryBtn');
    const btnLabel = submitBtn.querySelector('.btn-label');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    feedback.classList.add('hidden');
    if (waBox) waBox.classList.add('hidden');

    const payload = {
      name: document.getElementById('inputName').value.trim(),
      email: document.getElementById('inputEmail').value.trim(),
      number: document.getElementById('inputNumber').value.trim(),
      source: document.getElementById('inputSource').value.trim(),
      destination: document.getElementById('inputDestination').value.trim()
    };

    if (!validateEnquiryForm(payload)) {
      feedback.textContent = '⚠️ Please fix the highlighted fields above.';
      feedback.className = 'form-feedback error';
      feedback.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Sending…';
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        feedback.textContent = '⚠️ ' + (data.error || 'Please fill in all required fields.');
        feedback.className = 'form-feedback error';
        feedback.classList.remove('hidden');
        return;
      }

      const enq = data.enquiry;
      feedback.textContent =
        '✅ ' + (enq.customMessage || `Thank you, ${enq.name}! We'll reach out via WhatsApp and Email shortly.`);
      feedback.className = 'form-feedback success';
      feedback.classList.remove('hidden');

      if (waBox) {
        document.getElementById('waTargetNumber').textContent = `${enq.normalizedNumber || enq.number} & ${enq.email}`;
        const previewMsg =
          (enq.whatsappResult && enq.whatsappResult.preview) ||
          `🚖 Mahalaxmi Tours and Travels\nNamaste ${enq.name}!\nThank you for enquiring! We will reach out shortly.`;
        document.getElementById('waPreviewText').textContent = previewMsg;

        const directUrl =
          (enq.whatsappResult && enq.whatsappResult.directWaUrl) ||
          enq.whatsappDirectUrl;
        const openBtn = document.getElementById('waDirectOpenBtn');
        openBtn.href = directUrl || '#';
        openBtn.textContent = `💬 Open WhatsApp (${enq.normalizedNumber || enq.number}) ↗`;
        waBox.classList.remove('hidden');
      }

      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      e.target.reset();

      // Clear inline errors
      ['inputName','inputEmail','inputNumber','inputSource','inputDestination'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('invalid', 'valid'); }
      });
      ['errName','errEmail','errNumber','errSource','errDestination'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    } catch (err) {
      feedback.textContent = '⚠️ Network error. Please try again or WhatsApp us at +918871724435.';
      feedback.className = 'form-feedback error';
      feedback.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = 'Send Enquiry & Confirm via WhatsApp + Email';
      if (btnSpinner) btnSpinner.classList.add('hidden');
    }
  });
}

/* =========================================================
   Boot
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCounters();
  initScrollEffects();
  initActiveNav();
  initMobileNav();
  initStarPicker();
  initCharCounter();
  initCarFilter();
  initReviewForm();
  initEnquiryForm();

  // Load data from API
  loadWebsiteData();
});
