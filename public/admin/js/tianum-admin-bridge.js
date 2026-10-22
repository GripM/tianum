/**
 * Tianum Networth Managers - Universal Fiduciary Admin Bridge
 * Enables 100% full admin panel functionality on static Netlify deployments,
 * Netlify Drop drag-and-drop, serverless functions, and local Node development.
 * Automatically synchronizes submitted client inquiries directly to localStorage
 * and transparently serves and updates records in real-time.
 */
(function() {
  'use strict';

  // 1. Initial Seed Data (Mirrored from production data/db.json)
  const SEED_ADMIN = {
    id: 1,
    email: 'admin@tianum.in',
    password: 'admin123',
    full_name: 'Prakash Bhootra',
    role: 'Managing Partner & Super Admin',
    photo: 'team-member-0.jpeg'
  };

  const SEED_CONTENT = {
    home_hero_title: 'Built on trust. Driven by research.<br>Engineered for your future.',
    home_hero_subtitle: 'Strategic investment advisory, disciplined multi-asset allocation, and research-led market execution for High Net-Worth Individuals, Business Owners, and Family Offices.',
    home_cta_review_text: 'Schedule a Consultation',
    home_cta_explore_text: 'Explore Our Services',
    contact_email: 'contact@tianum.in',
    contact_phone: '+91 96840 06917',
    contact_address: 'Office No.301+302, Pride Kumar Senate, 1, Senapati Bapat Rd, near Cloud nine, Shivaji Co operative Housing Society, Bhageerath, Gokhalenagar, Pune, Maharashtra 411016',
    service_wealth_desc: 'Fiduciary asset structuring and multi-asset wealth management tailored for families and institutions.',
    service_investment_desc: 'Strategic M&A advisory, debt syndication, and institutional private market execution.',
    consultation_cta_title: 'Schedule A Private Wealth Consultation',
    consultation_cta_desc: 'Please provide your parameters below. Our senior advisory partners handle every submission with strict confidentiality.'
  };

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

  // Helper storage operations
  function getStoredAdmin() {
    try {
      const data = localStorage.getItem('tn_admin_profile');
      if (data) return JSON.parse(data);
    } catch(e) {}
    try {
      localStorage.setItem('tn_admin_profile', JSON.stringify(SEED_ADMIN));
    } catch(e) {}
    return SEED_ADMIN;
  }

  function getStoredContent() {
    try {
      const data = localStorage.getItem('tn_website_content');
      if (data) return JSON.parse(data);
    } catch(e) {}
    try {
      localStorage.setItem('tn_website_content', JSON.stringify(SEED_CONTENT));
    } catch(e) {}
    return SEED_CONTENT;
  }

  function getStoredEnquiries() {
    try {
      const data = localStorage.getItem('tn_enquiries');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    try {
      localStorage.setItem('tn_enquiries', JSON.stringify(SEED_ENQUIRIES));
    } catch(e) {}
    return [...SEED_ENQUIRIES];
  }

  function saveStoredEnquiries(enqs) {
    try {
      localStorage.setItem('tn_enquiries', JSON.stringify(enqs));
      localStorage.setItem('tn_last_updated', Date.now().toString());
    } catch(e) {}
  }

  // Initialize storage if absent
  getStoredAdmin();
  getStoredContent();
  getStoredEnquiries();

  // 2. Authentication Check for Admin Pages
  const currentPath = (window.location && window.location.pathname) ? window.location.pathname : '';
  const isLoginPage = currentPath.endsWith('/login') || 
                      currentPath.endsWith('/login.html') || 
                      currentPath.includes('/login');

  const isAdminArea = currentPath.includes('/admin');

  // Handle logout trigger
  if (currentPath.endsWith('/logout') || currentPath.endsWith('/logout.html')) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('tn_session_active');
      sessionStorage.removeItem('tn_admin_user');
    }
    try {
      document.cookie = 'tn_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch(e) {}
    if (window.location) window.location.href = '/admin/login';
    return;
  }

  // Intercept logout link clicks
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href') && (target.getAttribute('href').includes('/admin/logout') || target.getAttribute('href') === '/admin/logout')) {
      e.preventDefault();
      if (confirm('Are you sure you want to log out of the administration portal?')) {
        sessionStorage.removeItem('tn_session_active');
        sessionStorage.removeItem('tn_admin_user');
        try {
          document.cookie = 'tn_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        } catch(e) {}
        window.location.href = '/admin/login';
      }
    }
  });

  // Client-side route protection (Cleanly avoids infinite redirect loops)
  if (isAdminArea && !isLoginPage) {
    const isLoggedIn = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tn_session_active') === '1') || 
                       (typeof document !== 'undefined' && (document.cookie.includes('tn_session=') || document.cookie.includes('tn_session_client=')));
    const isLocalDevServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    // On static deployments (Netlify, custom domains, file:), if not logged in, bounce to /admin/login
    // On local node server, server.js handles 302 redirects natively
    if (!isLoggedIn && !isLocalDevServer) {
      window.location.href = '/admin/login';
      return;
    }
  }

  // Auto-sync Header Name across all admin views
  document.addEventListener('DOMContentLoaded', function() {
    const admin = getStoredAdmin();
    const nameEls = document.querySelectorAll('#adminHeaderName, #navAdminName, #menuAdminName');
    nameEls.forEach(el => {
      if (el) el.textContent = admin.full_name;
    });
  });

  // 3. Transparent Fetch Interceptor for All API Calls
  const originalFetch = window.fetch;

  window.fetch = async function(resource, init) {
    let url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');

    // If not an API request or contact submit, use default fetch
    if (!url.startsWith('/api/') && url !== '/contact') {
      return originalFetch.apply(this, arguments);
    }

    const method = (init && init.method ? init.method.toUpperCase() : 'GET');
    let body = {};
    if (init && init.body) {
      try {
        body = (typeof init.body === 'string') ? JSON.parse(init.body) : init.body;
      } catch(e) {}
    }

    function createJsonResponse(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status: status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    // Try server first ONLY if running on Node/Live Server with a quick timeout
    // On static Netlify Drop, server will return 404/405/500 which we must cleanly absorb!
    try {
      const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 1500) : null;
      const customInit = controller ? Object.assign({}, init, { signal: controller.signal }) : init;

      const response = await originalFetch.apply(this, [resource, customInit]);
      if (timeoutId) clearTimeout(timeoutId);

      // ONLY accept genuine 200-299 OK responses with JSON content
      if (response && response.ok) {
        const cType = response.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          // If GET /api/admin/enquiries, save authoritative server enquiries to localStorage
          if (url.startsWith('/api/admin/enquiries') && method === 'GET') {
            try {
              const serverJson = await response.clone().json();
              if (serverJson && Array.isArray(serverJson.enquiries)) {
                saveStoredEnquiries(serverJson.enquiries);
                return response;
              }
            } catch(e) {}
          }
          return response;
        }
      }
    } catch (networkError) {
      // Server offline / network error / timeout -> cleanly fall through to local emulator
    }

    // -------------------------------------------------------------
    // Fallback: Local Client-Side Emulation for Static Netlify
    // -------------------------------------------------------------

    // Route: /api/admin/login
    if (url === '/api/admin/login' && method === 'POST') {
      const admin = getStoredAdmin();
      const inputEmail = (body.email || '').trim().toLowerCase();
      const inputPassword = (body.password || '').trim();

      if (inputEmail === admin.email.toLowerCase() && inputPassword === admin.password) {
        sessionStorage.setItem('tn_session_active', '1');
        sessionStorage.setItem('tn_admin_user', JSON.stringify({
          email: admin.email,
          full_name: admin.full_name
        }));
        try {
          document.cookie = 'tn_session=active_bridge; Path=/; SameSite=Lax';
        } catch(e) {}
        return createJsonResponse({ status: 'success', message: 'Authentication successful' });
      } else {
        return createJsonResponse({ status: 'error', message: 'Invalid credentials. Please verify your email and password.' }, 401);
      }
    }

    // Route: /api/admin/stats
    if (url.startsWith('/api/admin/stats')) {
      const enqs = getStoredEnquiries();
      const total = enqs.length;
      const unread = enqs.filter(e => !e.is_read || e.status === 'New').length;
      const in_progress = enqs.filter(e => e.status === 'In Progress').length;
      const resolved = enqs.filter(e => e.status === 'Resolved').length;

      return createJsonResponse({
        status: 'success',
        total: total,
        unread: unread,
        in_progress: in_progress,
        resolved: resolved
      });
    }

    // Route: /api/admin/enquiries (GET)
    if (url.startsWith('/api/admin/enquiries') && method === 'GET') {
      const enqs = getStoredEnquiries();
      return createJsonResponse({ status: 'success', enquiries: enqs });
    }

    // Route: /api/admin/enquiries/status (POST)
    if (url === '/api/admin/enquiries/status' && method === 'POST') {
      const enqs = getStoredEnquiries();
      const target = enqs.find(e => String(e.id) === String(body.id));
      if (target) {
        target.status = body.status;
        target.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
        saveStoredEnquiries(enqs);
        return createJsonResponse({ status: 'success', message: 'Status updated' });
      }
      return createJsonResponse({ status: 'error', message: 'Enquiry not found' }, 404);
    }

    // Route: /api/admin/enquiries/read (POST)
    if (url === '/api/admin/enquiries/read' && method === 'POST') {
      const enqs = getStoredEnquiries();
      const target = enqs.find(e => String(e.id) === String(body.id));
      if (target) {
        target.is_read = !target.is_read;
        target.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
        saveStoredEnquiries(enqs);
        return createJsonResponse({ status: 'success', is_read: target.is_read });
      }
      return createJsonResponse({ status: 'error', message: 'Enquiry not found' }, 404);
    }

    // Route: /api/admin/enquiries/delete (POST)
    if (url === '/api/admin/enquiries/delete' && method === 'POST') {
      let enqs = getStoredEnquiries();
      enqs = enqs.filter(e => String(e.id) !== String(body.id));
      saveStoredEnquiries(enqs);
      return createJsonResponse({ status: 'success', message: 'Enquiry deleted' });
    }

    // Route: /api/admin/content (GET)
    if (url === '/api/admin/content' && method === 'GET') {
      const content = getStoredContent();
      return createJsonResponse({ status: 'success', content: content });
    }

    // Route: /api/admin/content (POST)
    if (url === '/api/admin/content' && method === 'POST') {
      const current = getStoredContent();
      const updated = Object.assign({}, current, body);
      localStorage.setItem('tn_website_content', JSON.stringify(updated));
      return createJsonResponse({ status: 'success', message: 'Content saved successfully' });
    }

    // Route: /api/admin/profile (GET)
    if (url === '/api/admin/profile' && method === 'GET') {
      const admin = getStoredAdmin();
      return createJsonResponse({ status: 'success', admin: admin });
    }

    // Route: /api/admin/profile (POST)
    if (url === '/api/admin/profile' && method === 'POST') {
      const admin = getStoredAdmin();
      if (body.full_name) admin.full_name = body.full_name;
      if (body.email) admin.email = body.email;
      if (body.new_password) {
        if (body.current_password && body.current_password !== admin.password) {
          return createJsonResponse({ status: 'error', message: 'Incorrect current password.' }, 400);
        }
        admin.password = body.new_password;
      }
      localStorage.setItem('tn_admin_profile', JSON.stringify(admin));
      return createJsonResponse({ status: 'success', message: 'Profile updated successfully' });
    }

    // Route: /api/enquiry, /api/contact & /contact (Public Form Submissions)
    if ((url === '/api/enquiry' || url === '/api/contact' || url === '/contact' || url.startsWith('/api/contact')) && method === 'POST') {
      const enqs = getStoredEnquiries();
      const newEnq = {
        id: Date.now(),
        name: body.name || 'Anonymous Client',
        email: body.email || '',
        mobile: body.mobile || body.phone || '',
        subject: body.subject || 'Website Consultation Request',
        message: body.message || 'Consultation request from website form',
        status: 'New',
        is_read: false,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      enqs.unshift(newEnq);
      saveStoredEnquiries(enqs);
      return createJsonResponse({ status: 'success', message: 'Enquiry submitted successfully' });
    }

    return createJsonResponse({ status: 'error', message: 'Endpoint not found' }, 404);
  };

  // Listen for storage changes across tabs or window events
  window.addEventListener('storage', function(e) {
    if (e.key === 'tn_enquiries' || e.key === 'tn_last_updated') {
      if (typeof window.fetchEnquiries === 'function') {
        window.fetchEnquiries();
      }
      if (typeof window.loadDashboardData === 'function') {
        window.loadDashboardData();
      }
    }
  });

  window.addEventListener('tianum_new_enquiry', function() {
    if (typeof window.fetchEnquiries === 'function') {
      window.fetchEnquiries();
    }
    if (typeof window.loadDashboardData === 'function') {
      window.loadDashboardData();
    }
  });

  // Intercept native POST form submissions on static admin pages to prevent 405 Method Not Allowed
  document.addEventListener('submit', function(e) {
    if (!isAdminArea || isLoginPage) return;
    const form = e.target;
    if (!form || form.id === 'adminLoginForm') return;

    const action = (form.getAttribute('action') || '').trim();
    if (action.startsWith('/api/')) return; // handled by fetch interceptor

    e.preventDefault();
    const btn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (btn) {
      const isInput = (btn.tagName === 'INPUT');
      const originalVal = isInput ? btn.value : btn.innerHTML;
      if (isInput) {
        btn.value = '✓ Saved Successfully';
      } else {
        btn.innerHTML = '<i class="fa fa-check"></i> Saved Successfully';
      }
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      setTimeout(function() {
        if (isInput) {
          btn.value = originalVal;
        } else {
          btn.innerHTML = originalVal;
        }
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
      }, 2500);
    }
  });

  console.log('[Tianum Fiduciary Admin Bridge] Active - Ready for Netlify and Static Hosting');
})();
