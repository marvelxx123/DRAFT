(function () {
  const form = document.getElementById('contactForm');
  const btn  = document.getElementById('submitBtn');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = {
      name:    form.name.value.trim(),
      phone:   form.phone.value.trim(),
      service: form.service.value,
      area:    form.area.value.trim(),
      message: form.message.value.trim(),
      source:  '904-landing-page',
      submittedAt: new Date().toISOString(),
    };

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch('/api/leads/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        form.style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
        // Scroll to success message
        document.getElementById('formSuccess').scrollIntoView({ behavior: 'smooth' });
      } else {
        throw new Error('Server error');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Send My Request →';
      alert('Something went wrong. Please call us directly at (904) 468-3428');
    }
  });

  // Highlight emergency services in red when selected
  const serviceSelect = document.getElementById('service');
  if (serviceSelect) {
    serviceSelect.addEventListener('change', function () {
      const emergencyServices = ['broken-spring', 'off-track', 'broken-cable'];
      if (emergencyServices.includes(this.value)) {
        this.style.borderColor = '#d32f2f';
        this.style.color = '#d32f2f';
        this.style.fontWeight = '700';
      } else {
        this.style.borderColor = '';
        this.style.color = '';
        this.style.fontWeight = '';
      }
    });
  }
})();
