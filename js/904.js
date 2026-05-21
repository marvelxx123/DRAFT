(function () {
  'use strict';

  // ── CONTACT FORM ──────────────────────────────────────────────────
  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const success   = document.getElementById('formSuccess');

  if (form) {
    // Highlight the form border red when an emergency service is selected
    const serviceSelect = document.getElementById('service');
    const emergencyValues = new Set(['broken-spring', 'off-track', 'broken-cable', 'wont-close']);

    serviceSelect.addEventListener('change', function () {
      const isEmergency = emergencyValues.has(this.value);
      this.style.borderColor  = isEmergency ? '#d32f2f' : '';
      this.style.color        = isEmergency ? '#d32f2f' : '';
      this.style.fontWeight   = isEmergency ? '700'     : '';
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const data = {
        name:        form.name.value.trim(),
        phone:       form.phone.value.trim(),
        service:     form.service.value,
        source:      '904-landing-page',
        userAgent:   navigator.userAgent,
        submittedAt: new Date().toISOString(),
      };

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Sending…';

      try {
        const res = await fetch('/api/leads/contact', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data),
        });

        if (res.ok) {
          form.style.display = 'none';
          success.style.display = 'block';
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          throw new Error('server');
        }
      } catch {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Send My Free Estimate Request →';
        // Don't block the lead — fall back to showing the phone number
        alert('Having trouble sending — please call or text us directly at (904) 468-3428. We pick up live.');
      }
    });
  }

  // ── SCROLL-TRIGGERED FLOAT BUTTON PULSE ──────────────────────────
  // Make the floating call button pulse once after the user scrolls
  // past the hero — a gentle nudge without being annoying
  const floatBtn = document.querySelector('.float-call');
  if (floatBtn) {
    let pulsed = false;
    window.addEventListener('scroll', function () {
      if (!pulsed && window.scrollY > 400) {
        pulsed = true;
        floatBtn.style.animation = 'pulse 0.6s ease';
        setTimeout(() => { floatBtn.style.animation = ''; }, 700);
      }
    }, { passive: true });
  }

})();
