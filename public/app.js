const state = {
  cars: [],
  reviews: [],
  brand: null,
  activeCategory: 'all'
};

async function loadWebsiteData() {
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
    'https://www.google.com/maps/place/Mahalaxmi+tours+and+travels/@26.2566343,78.2131111,17z/data=!3m1!4b1!4m6!3m5!1s0x3976c1c0105cf1dd:0x3afc8ce3835dfdef!8m2!3d26.2566343!4d78.2131111!16s%2Fg%2F11jjv2zkmf?entry=ttu&g_ep=EgoyMDI2MTExMC4wIKXMDSoASAFQAw%3D%3D';

  const heroWa = document.getElementById('heroWhatsapp');
  const heroEmail = document.getElementById('heroEmail');
  const officeAddr = document.getElementById('officeAddressText');

  if (heroWa) heroWa.textContent = waNum;
  if (heroEmail) heroEmail.textContent = email;
  if (officeAddr) {
    officeAddr.href = mapUrl;
    officeAddr.textContent = `${locText} ↗`;
  }
}

function renderCars() {
  const grid = document.getElementById('carsGrid');
  if (!grid) return;

  const filtered =
    state.activeCategory === 'all'
      ? state.cars
      : state.cars.filter((c) => c.category === state.activeCategory);

  grid.innerHTML = filtered
    .map(
      (car) => `
      <article class="car-card">
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
}

function renderReviews(reviews) {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  grid.innerHTML = reviews
    .map(
      (r) => `
      <div class="review-card">
        <div class="review-stars">${'★'.repeat(r.rating || 5)}</div>
        <p class="review-comment">“${r.comment}”</p>
        <div class="review-author">
          <strong style="color:var(--navy-900);">${r.name}</strong> · ${r.city}<br/>
          <span>Booked: ${r.car}</span>
        </div>
      </div>
    `
    )
    .join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadWebsiteData();

  // Mobile Navigation Drawer Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  if (mobileMenuBtn && mobileNavDrawer) {
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

  // Interactive Car Category Filtering
  document.getElementById('carFilterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    state.activeCategory = btn.dataset.category;
    document.querySelectorAll('.filter-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderCars();
  });

  // Scroll to Enquiry form when clicking "Enquire Now" on a car card
  document.getElementById('carsGrid').addEventListener('click', (e) => {
    const enquireBtn = e.target.closest('[data-enquire-car]');
    if (!enquireBtn) return;
    document.getElementById('enquiry').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('inputName').focus(), 400);
  });

  // POST a Review Form Submission
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const revFeedback = document.getElementById('reviewFeedback');
      const revBtn = document.getElementById('submitReviewBtn');
      revFeedback.classList.add('hidden');

      const reviewPayload = {
        type: 'review',
        name: document.getElementById('revName').value.trim(),
        city: document.getElementById('revCity').value.trim() || 'Gwalior',
        car: document.getElementById('revCar').value,
        rating: Number(document.getElementById('revRating').value || 5),
        comment: document.getElementById('revComment').value.trim()
      };

      revBtn.disabled = true;
      revBtn.textContent = 'Posting Review…';

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewPayload)
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          revFeedback.textContent = data.error || 'Please enter your name and review comment.';
          revFeedback.className = 'form-feedback error';
          revFeedback.classList.remove('hidden');
          return;
        }

        state.reviews = data.reviews || [data.review, ...state.reviews];
        renderReviews(state.reviews);

        revFeedback.textContent = `Thank you, ${data.review.name}! Your review has been published above.`;
        revFeedback.className = 'form-feedback success';
        revFeedback.classList.remove('hidden');
        reviewForm.reset();
      } catch (err) {
        revFeedback.textContent = 'Could not submit review right now. Please try again.';
        revFeedback.className = 'form-feedback error';
        revFeedback.classList.remove('hidden');
      } finally {
        revBtn.disabled = false;
        revBtn.textContent = 'Post Review on Website';
      }
    });
  }

  // POST /api/enquiry Form Submission (Name, Email, Number, Source, Destination -> Email & WhatsApp)
  document.getElementById('enquiryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('formFeedback');
    const waBox = document.getElementById('whatsappDispatchBox');
    const submitBtn = document.getElementById('submitEnquiryBtn');
    feedback.classList.add('hidden');
    if (waBox) waBox.classList.add('hidden');

    const payload = {
      name: document.getElementById('inputName').value.trim(),
      email: document.getElementById('inputEmail').value.trim(),
      number: document.getElementById('inputNumber').value.trim(),
      source: document.getElementById('inputSource').value.trim(),
      destination: document.getElementById('inputDestination').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending Enquiry…';

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        feedback.textContent = data.error || 'Please fill in all fields (Name, Email, WhatsApp Number, Source & Destination).';
        feedback.className = 'form-feedback error';
        feedback.classList.remove('hidden');
        return;
      }

      const enq = data.enquiry;
      feedback.textContent =
        enq.customMessage ||
        `Thank you for enquiring, ${enq.name}! We will reach out to you in some time on WhatsApp and Email.`;
      feedback.className = 'form-feedback success';
      feedback.classList.remove('hidden');

      if (waBox) {
        document.getElementById('waTargetNumber').textContent = `${enq.normalizedNumber || enq.number} & ${enq.email}`;
        const previewMsg =
          (enq.whatsappResult && enq.whatsappResult.preview) ||
          `🚖 Mahalaxmi Tours and Travels\nNamaste ${enq.name}!\nThank you for enquiring! We will reach out to you in some time on WhatsApp and Email.`;
        document.getElementById('waPreviewText').textContent = previewMsg;

        const directUrl =
          (enq.whatsappResult && enq.whatsappResult.directWaUrl) ||
          enq.whatsappDirectUrl;
        const openBtn = document.getElementById('waDirectOpenBtn');
        openBtn.href = directUrl;
        openBtn.textContent = `💬 Open Message on WhatsApp (${enq.normalizedNumber || enq.number}) ↗`;
        waBox.classList.remove('hidden');
      }

      e.target.reset();
    } catch (err) {
      feedback.textContent = 'Network error. Please try again or WhatsApp us at +918871724435.';
      feedback.className = 'form-feedback error';
      feedback.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Enquiry & Send WhatsApp + Email';
    }
  });
});
