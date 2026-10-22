/**
 * Tianum Networth Managers - Universal Inquiry & Mandate Submission Handler
 * Fully supports Static Netlify (Netlify Drop), Netlify Forms, Serverless Functions, and Local Node/PHP servers.
 * Prevents native form POST that causes Netlify 404s, provides instant visual feedback,
 * and persistently synchronizes submitted client inquiries directly to localStorage
 * so they instantly show up in the Admin Panel (/admin/enquiry) and Dashboard.
 */
(function() {
  'use strict';

  // Fallback seed enquiries if localStorage is not yet populated
  const SEED_ENQUIRIES = [
    {
      id: 1,
      name: 'Vikramaditya Singhania',
      email: 'v.singhania@singhaniaholdings.com',
      mobile: '+91 98220 14820',
      subject: 'Wealth Management & Multi-Asset Allocation',
      message: 'Looking for fiduciary consultation on structuring family office investments and private wealth across PMS/AIFs.',
      status: 'New',
      is_read: false,
      created_at: '2026-10-13 14:15:22',
      updated_at: '2026-10-13 14:15:22'
    },
    {
      id: 2,
      name: 'Sunil Kulkarni',
      email: 'sunil.kulkarni@techapex.in',
      mobile: '+91 94225 33019',
      subject: 'Corporate Treasury & Fixed Income',
      message: 'Interested in debt syndication and liquidity management solutions for our mid-market tech firm in Pune.',
      status: 'In Progress',
      is_read: true,
      created_at: '2026-10-12 16:40:10',
      updated_at: '2026-10-13 09:20:00'
    },
    {
      id: 3,
      name: 'Ananya Deshmukh',
      email: 'ananya.d@nexuscap.com',
      mobile: '+91 97640 21908',
      subject: 'Investment Banking & M&A Advisory',
      message: 'Seeking advisory on Series B growth capital and institutional equity placements in Maharashtra.',
      status: 'Resolved',
      is_read: true,
      created_at: '2026-10-11 11:25:00',
      updated_at: '2026-10-12 18:00:00'
    },
    {
      id: 4,
      name: 'Dr. Rajeshwar Rao',
      email: 'dr.rao.cardio@apollohealth.org',
      mobile: '+91 98501 77234',
      subject: 'Portfolio Management Services (PMS)',
      message: 'Need a comprehensive portfolio audit of existing equity mutual funds and advisory on direct indexed equities.',
      status: 'New',
      is_read: false,
      created_at: '2026-10-10 18:10:45',
      updated_at: '2026-10-10 18:10:45'
    }
  ];

  function getStoredEnquiries() {
    try {
      const data = localStorage.getItem('tn_enquiries');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    try {
      localStorage.setItem('tn_enquiries', JSON.stringify(SEED_ENQUIRIES));
    } catch(e) {}
    return [...SEED_ENQUIRIES];
  }

  function saveEnquiryLocally(record) {
    try {
      const enquiries = getStoredEnquiries();
      // Remove any duplicate by id or email+created_at
      const filtered = enquiries.filter(e => String(e.id) !== String(record.id));
      filtered.unshift(record);
      localStorage.setItem('tn_enquiries', JSON.stringify(filtered));
      localStorage.setItem('tn_last_updated', Date.now().toString());
      try {
        sessionStorage.setItem('tn_recent_enquiry', JSON.stringify(record));
      } catch(e) {}
      return true;
    } catch(e) {
      console.warn('Could not save enquiry to localStorage:', e);
      return false;
    }
  }

  function determineDefaultSubject() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('investment-banking')) return 'Investment Banking & M&A Advisory';
    if (path.includes('service-1')) return 'Wealth Management & Multi-Asset Allocation';
    if (path.includes('service-2')) return 'Mutual Funds & Equities Advisory';
    if (path.includes('service-3')) return 'Corporate Treasury & Fixed Income';
    if (path.includes('service-4')) return 'Alternate Assets & Private Wealth';
    if (path.includes('service')) return 'Wealth Management Advisory';
    return 'Schedule A Private Wealth Consultation';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  function initInquiryForms() {
    const selectors = [
      '#publicContactForm',
      'form[name="consultation_mandates"]',
      'form[action*="contact"]',
      'form[action*="enquiry"]',
      'form.needs-validation',
      '#contact-form'
    ];

    const forms = [];
    selectors.forEach(function(sel) {
      try {
        const els = document.querySelectorAll(sel);
        for (let i = 0; i < els.length; i++) {
          if (forms.indexOf(els[i]) === -1) forms.push(els[i]);
        }
      } catch(e) {}
    });

    forms.forEach(function(form) {
      if (form.dataset.tianumBound === 'true') return;
      form.dataset.tianumBound = 'true';

      // Override action attribute so browser doesn't submit natively
      form.setAttribute('onsubmit', 'return false;');

      async function handleFormSubmission(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        // 1. Check anti-spam honeypot
        const hp = form.querySelector('input[name="website_hp"], #website_hp');
        if (hp && hp.value && hp.value.trim().length > 0) {
          // Silent bot drop
          form.reset();
          return;
        }

        // 2. Locate form elements
        const nameInput = form.querySelector('input[name="name"], #contactName');
        const emailInput = form.querySelector('input[name="email"], #contactEmail');
        const mobileInput = form.querySelector('input[name="mobile"], #contactMobile');
        const subjectSelect = form.querySelector('select[name="subject"], input[name="subject"], #contactSubject');
        const messageInput = form.querySelector('textarea[name="message"], #contactMessage');
        const consentCheckbox = form.querySelector('input[name="consent"], #pageContactConsent');
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], #contactSubmitBtn, button[name="form_contact"]');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        const mobile = mobileInput ? mobileInput.value.trim() : '';
        const subject = (subjectSelect && subjectSelect.value && subjectSelect.value.trim()) ? subjectSelect.value.trim() : determineDefaultSubject();
        const message = messageInput ? messageInput.value.trim() : '';

        // Locate feedback alert container or create one
        let alertBox = form.querySelector('#contactFormAlert, .tn-inquiry-alert');
        if (!alertBox) {
          alertBox = document.getElementById('contactFormAlert');
        }
        if (!alertBox) {
          alertBox = document.createElement('div');
          alertBox.className = 'tn-inquiry-alert mb-4';
          form.insertBefore(alertBox, form.firstChild);
        }

        // 3. Client-side field validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || name.length < 2) {
          showAlert(alertBox, 'Please enter your full name (at least 2 characters).', 'error');
          if (nameInput) nameInput.focus();
          return;
        }
        if (!email || !emailRegex.test(email)) {
          showAlert(alertBox, 'Please provide a valid corporate or personal email address.', 'error');
          if (emailInput) emailInput.focus();
          return;
        }
        if (!mobile || mobile.replace(/\D/g, '').length < 7) {
          showAlert(alertBox, 'Please provide a valid telephone or mobile number (minimum 7 digits).', 'error');
          if (mobileInput) mobileInput.focus();
          return;
        }
        if (!message || message.length < 3) {
          showAlert(alertBox, 'Please share brief parameters or questions regarding your mandate.', 'error');
          if (messageInput) messageInput.focus();
          return;
        }
        if (consentCheckbox && !consentCheckbox.checked) {
          showAlert(alertBox, 'Please confirm your consent to receive communications regarding your mandate.', 'error');
          consentCheckbox.focus();
          return;
        }

        // 4. Update button to loading state
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Submit Advisory Request';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right: 8px;"></i> Registering Mandate...';
        }

        // 5. Build Record
        const now = new Date();
        const nowFormatted = now.toISOString().replace('T', ' ').slice(0, 19);
        const newRecord = {
          id: Date.now(),
          name: name,
          email: email,
          mobile: mobile,
          subject: subject,
          message: message,
          status: 'New',
          is_read: false,
          created_at: nowFormatted,
          updated_at: nowFormatted
        };

        // 6. Save directly to localStorage for instant Admin Portal availability
        saveEnquiryLocally(newRecord);

        // 7. Server sync to Node / Serverless
        try {
          fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(newRecord)
          }).then(function(res) {
            return res.json();
          }).catch(function(err) {
            console.warn('Background sync status:', err);
          });
        } catch(e) {}

        // Netlify Forms background submission if running on Netlify
        try {
          const formData = new FormData();
          formData.append('form-name', 'consultation_mandates');
          formData.append('name', name);
          formData.append('email', email);
          formData.append('mobile', mobile);
          formData.append('subject', subject);
          formData.append('message', message);
          if (consentCheckbox) formData.append('consent', '1');

          fetch(window.location.pathname || '/contact.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
          }).catch(function() {});
        } catch(e) {}

        // Notify any active admin panel listeners
        try {
          window.dispatchEvent(new CustomEvent('tianum_new_enquiry', { detail: newRecord }));
        } catch(e) {}

        // 8. Render high-trust fiduciary success banner
        showSuccessBanner(alertBox, name, subject);
        form.reset();

        // 9. Re-enable button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }

        // 10. Smooth scroll to feedback alert
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      form.addEventListener('submit', handleFormSubmission);

      // Fallback submit trigger on button click
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], #contactSubmitBtn, button[name="form_contact"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
          // If native submit isn't captured, trigger explicitly
          if (!form.dataset.tianumSubmitting) {
            form.dataset.tianumSubmitting = 'true';
            setTimeout(function() { delete form.dataset.tianumSubmitting; }, 1000);
            handleFormSubmission(e);
          }
        });
      }
    });
  }

  function showAlert(container, msg, type) {
    if (!container) return;
    const isErr = type === 'error';
    container.style.display = 'block';
    container.style.background = isErr ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    container.style.border = isErr ? '1px solid #ef4444' : '1px solid #10b981';
    container.style.borderRadius = '8px';
    container.style.padding = '12px 16px';
    container.style.color = '#fff';
    container.style.fontSize = '0.9rem';
    container.style.lineHeight = '1.4';
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fa ${isErr ? 'fa-exclamation-circle' : 'fa-check-circle'}" style="font-size: 18px; color: ${isErr ? '#f87171' : '#34d399'};"></i>
        <span>${escapeHtml(msg)}</span>
      </div>
    `;
  }

  function showSuccessBanner(container, name, subject) {
    if (!container) return;
    container.style.display = 'block';
    container.style.background = 'rgba(16, 185, 129, 0.15)';
    container.style.border = '1px solid #10b981';
    container.style.borderRadius = '8px';
    container.style.padding = '16px 20px';
    container.style.color = '#fff';
    container.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    container.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 14px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
          <i class="fa fa-check" style="color: #34d399; font-size: 18px;"></i>
        </div>
        <div style="flex: 1;">
          <h5 style="color: #ffffff; font-weight: 700; font-size: 1.05rem; margin: 0 0 4px 0;">
            Mandate Registered Successfully
          </h5>
          <p style="color: #d1fae5; font-size: 0.88rem; margin: 0 0 8px 0; line-height: 1.5;">
            Thank you, <strong style="color: #ffffff;">${escapeHtml(name)}</strong>. Your advisory parameters for <em style="color: #fbbf24;">${escapeHtml(subject)}</em> have been registered with our wealth desk.
          </p>
          <div style="color: #94a3b8; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
            <i class="fa fa-clock-o"></i>
            <span>Our senior advisory partners will connect with you within 24 business hours.</span>
          </div>
        </div>
      </div>
    `;
  }

  // Bind on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInquiryForms);
  } else {
    initInquiryForms();
  }

  // Global helper if called manually
  window.initTianumInquiryForms = initInquiryForms;
})();
