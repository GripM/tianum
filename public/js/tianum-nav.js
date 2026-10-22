/**
 * Tianum Networth Managers - Master Navigation & Real-time Market Ribbon Controller
 * High-performance, accessible, responsive controller for executive drawer & ticker ribbon.
 */
(function(window, document) {
  'use strict';

  // State
  var isDrawerOpen = false;
  var lastActiveElement = null;

  // 1. Mobile Drawer Functions (Exposed Globally on window)
  window.tnOpenMobileMenu = function(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    var drawer = document.getElementById('tnMobileDrawer');
    var overlay = document.querySelector('.body-overlay');
    var openBtn = document.getElementById('tnHamburgerBtn');

    if (!drawer) return;
    lastActiveElement = document.activeElement;

    drawer.classList.add('offcanvas-opened');
    drawer.setAttribute('aria-hidden', 'false');

    if (overlay) {
      overlay.classList.add('opened');
      overlay.setAttribute('aria-hidden', 'false');
    }

    if (openBtn) {
      openBtn.setAttribute('aria-expanded', 'true');
    }

    document.documentElement.classList.add('tn-drawer-open');
    document.body.classList.add('tn-drawer-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    isDrawerOpen = true;

    // Focus close button inside drawer for accessibility
    var closeBtn = drawer.querySelector('.tn-drawer-close-btn');
    if (closeBtn) {
      setTimeout(function() { closeBtn.focus(); }, 100);
    }
  };

  window.tnCloseMobileMenu = function(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    var drawer = document.getElementById('tnMobileDrawer');
    var overlay = document.querySelector('.body-overlay');
    var openBtn = document.getElementById('tnHamburgerBtn');

    if (drawer) {
      drawer.classList.remove('offcanvas-opened');
      drawer.setAttribute('aria-hidden', 'true');
    }

    if (overlay) {
      overlay.classList.remove('opened');
      overlay.setAttribute('aria-hidden', 'true');
    }

    if (openBtn) {
      openBtn.setAttribute('aria-expanded', 'false');
    }

    document.documentElement.classList.remove('tn-drawer-open');
    document.body.classList.remove('tn-drawer-open');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    isDrawerOpen = false;

    // Restore focus to menu toggle button
    if (openBtn) {
      openBtn.focus();
    } else if (lastActiveElement && lastActiveElement.focus) {
      lastActiveElement.focus();
    }
  };

  window.tnToggleMobileMenu = function(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    var drawer = document.getElementById('tnMobileDrawer');
    if (drawer && drawer.classList.contains('offcanvas-opened')) {
      window.tnCloseMobileMenu(e);
    } else {
      window.tnOpenMobileMenu(e);
    }
  };

  window.tnToggleMobileSubmenu = function(btn) {
    if (!btn) return;
    var parentItem = btn.closest('.tn-mobile-dropdown');
    if (!parentItem) return;
    var submenu = parentItem.querySelector('.tn-mobile-submenu');
    var isOpened = btn.classList.contains('opened');

    if (isOpened) {
      btn.classList.remove('opened');
      btn.setAttribute('aria-expanded', 'false');
      if (submenu) {
        submenu.classList.remove('show');
        submenu.style.display = 'none';
      }
    } else {
      btn.classList.add('opened');
      btn.setAttribute('aria-expanded', 'true');
      if (submenu) {
        submenu.classList.add('show');
        submenu.style.display = 'block';
      }
    }
  };

  // 2. Real Benchmark Market Ribbon Controller
  if (!document.querySelector('.tn-ribbon-group')) {
    // Page uses real-time TradingView widget - no custom polling required
    return;
  }

  var REFRESH_INTERVAL_MS = 15000; // 15s refresh interval
  var STORAGE_KEY = 'tianum_market_data_v2';
  var activeController = null;
  var pollTimer = null;
  var backoffDelayMs = REFRESH_INTERVAL_MS;
  var lastSuccessfulUpdate = 0;

  function normalizeSymbolKey(sym) {
    if (!sym) return '';
    return sym.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  function applyRibbonData(marketData, meta) {
    if (!marketData || typeof marketData !== 'object') return;
    var ribbonGroups = document.querySelectorAll('.tn-ribbon-group');
    ribbonGroups.forEach(function(group) {
      var items = group.querySelectorAll('.tn-ribbon-item');
      items.forEach(function(item) {
        var symEl = item.querySelector('.tn-ribbon-symbol');
        var valEl = item.querySelector('.tn-ribbon-value');
        var changeEl = item.querySelector('.tn-ribbon-change');
        if (symEl && valEl && changeEl) {
          var key = normalizeSymbolKey(symEl.textContent);
          var dataItem = marketData[key];
          if (dataItem) {
            valEl.textContent = dataItem.value;
            changeEl.className = 'tn-ribbon-change ' + dataItem.changeClass;
            changeEl.innerHTML = dataItem.changeHtml;
          }
        }
      });
    });

    // Update status badge tooltip if metadata is available
    if (meta && meta.lastUpdated) {
      var badges = document.querySelectorAll('.tn-ribbon-badge');
      var timeStr = new Date(meta.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var bseStatus = (meta.marketStatus && meta.marketStatus.bse) ? 'BSE: ' + meta.marketStatus.bse : '';
      badges.forEach(function(badge) {
        badge.setAttribute('title', 'Verified Market Benchmarks (BSE, COMEX, NYMEX, FX) | ' + bseStatus + ' | Updated ' + timeStr);
      });
    }
  }

  // Instant hydration from local cache (0ms render)
  try {
    var localCachedStr = localStorage.getItem(STORAGE_KEY);
    if (localCachedStr) {
      var cachedObj = JSON.parse(localCachedStr);
      if (cachedObj && cachedObj.marketData && (Date.now() - (cachedObj.timestamp || 0) < 3600000)) {
        applyRibbonData(cachedObj.marketData, cachedObj.meta);
      }
    }
  } catch (e) {}

  function scheduleNextRefresh(delay) {
    if (pollTimer) clearTimeout(pollTimer);
    if (typeof document !== 'undefined' && document.hidden) return;
    pollTimer = setTimeout(function() {
      updateMarketRibbon();
    }, delay || backoffDelayMs);
  }

  function updateMarketRibbon() {
    // If no market ribbon container exists on this page, do not fetch or poll
    if (!document.querySelector('.tn-ribbon-group') && !document.querySelector('.tn-market-ribbon')) {
      return;
    }

    // Prevent overlapping requests
    if (activeController) {
      try { activeController.abort(); } catch (e) {}
      activeController = null;
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    activeController = controller;
    var signal = controller ? controller.signal : null;
    var timeoutId = null;

    if (controller) {
      timeoutId = setTimeout(function() {
        try { controller.abort(); } catch (e) {}
      }, 4000);
    }

    fetch('/api/market-data', { signal: signal, cache: 'no-cache' })
      .then(function(res) {
        if (!res.ok) {
          return fetch('/public/data/market-data.json', { cache: 'no-cache' })
            .then(function(fb) {
              if (!fb.ok) throw new Error('API HTTP ' + res.status);
              return fb.json();
            });
        }
        return res.json();
      })
      .catch(function(err) {
        return fetch('/public/data/market-data.json', { cache: 'no-cache' })
          .then(function(fb) {
            if (!fb.ok) throw err;
            return fb.json();
          });
      })
      .then(function(json) {
        if (timeoutId) clearTimeout(timeoutId);
        activeController = null;

        if (json && json.data && Array.isArray(json.data)) {
          var marketData = {};
          json.data.forEach(function(item) {
            var icon = '';
            if (item.changeClass === 'up') {
              icon = '<i class="fa-solid fa-arrow-trend-up"></i> ';
            } else if (item.changeClass === 'down') {
              icon = '<i class="fa-solid fa-arrow-trend-down"></i> ';
            }
            var itemPayload = {
              value: item.value,
              changeHtml: icon + item.change,
              changeClass: item.changeClass
            };

            var normalizedKey = normalizeSymbolKey(item.symbol);
            marketData[normalizedKey] = itemPayload;

            if (normalizedKey === 'SILVER (1KG)') {
              marketData['SILVER (1KG)'] = itemPayload;
            }
          });

          var meta = {
            lastUpdated: json.lastUpdated || new Date().toISOString(),
            marketStatus: json.marketStatus,
            provider: json.provider
          };

          applyRibbonData(marketData, meta);
          lastSuccessfulUpdate = Date.now();
          backoffDelayMs = REFRESH_INTERVAL_MS;

          // Save to localStorage for instant subsequent loads
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              marketData: marketData,
              meta: meta,
              timestamp: Date.now()
            }));
          } catch (e) {}
        }
      })
      .catch(function(err) {
        if (timeoutId) clearTimeout(timeoutId);
        activeController = null;
        if (err && err.name === 'AbortError') return;

        // On failure, preserve existing ribbon values without disruption or fake data
        console.warn('Market ribbon update failed, preserving previous quotes:', err.message || err);
        // Exponential backoff up to 60s
        backoffDelayMs = Math.min(60000, Math.round(backoffDelayMs * 1.5));
      })
      .finally(function() {
        scheduleNextRefresh(backoffDelayMs);
      });
  }

  // Manage visibility change to pause polling in hidden tabs and refresh on restore
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (pollTimer) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
        if (activeController) {
          try { activeController.abort(); } catch (e) {}
          activeController = null;
        }
      } else {
        backoffDelayMs = REFRESH_INTERVAL_MS;
        updateMarketRibbon();
      }
    });
  }

  // 3. Attach Event Listeners on DOM Ready
  function initNavigation() {
    var drawer = document.getElementById('tnMobileDrawer');
    var overlay = document.querySelector('.body-overlay');
    var openBtn = document.getElementById('tnHamburgerBtn');
    var closeBtn = drawer ? drawer.querySelector('.tn-drawer-close-btn') : null;

    if (openBtn) {
      openBtn.addEventListener('click', function(e) {
        window.tnToggleMobileMenu(e);
      });
      openBtn.addEventListener('touchend', function(e) {
        window.tnToggleMobileMenu(e);
      }, { passive: false });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        window.tnCloseMobileMenu(e);
      });
      closeBtn.addEventListener('touchend', function(e) {
        window.tnCloseMobileMenu(e);
      }, { passive: false });
    }

    if (overlay) {
      overlay.addEventListener('click', function(e) {
        window.tnCloseMobileMenu(e);
      });
      overlay.addEventListener('touchend', function(e) {
        window.tnCloseMobileMenu(e);
      }, { passive: false });
    }

    // Escape Key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (isDrawerOpen) {
          window.tnCloseMobileMenu();
        }
      }
    });

    // Close when regular destination links are clicked inside drawer
    if (drawer) {
      var links = drawer.querySelectorAll('.tn-mobile-link:not([href="#"]), .tn-mobile-sublink, .tn-mobile-drawer-cta a');
      links.forEach(function(link) {
        link.addEventListener('click', function() {
          window.tnCloseMobileMenu();
        });
      });
    }

    // Reset drawer if resized to desktop viewport
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 992 && isDrawerOpen) {
        window.tnCloseMobileMenu();
      }
    });

    // Initialize market ribbon data immediately on load (subsequent refreshes handled adaptively with backoff and visibility awareness)
    updateMarketRibbon();

    // 4. Back To Top Floating Controller
    initBackToTop();
  }

  function initBackToTop() {
    var bttWrapper = document.querySelector('.back-to-top-wrapper');
    var bttBtn = document.getElementById('back_to_top') || (bttWrapper ? bttWrapper.querySelector('.back-to-top-btn') : null);
    if (!bttWrapper) return;

    var isShown = false;
    function handleScroll() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollY > 250) {
        if (!isShown) {
          bttWrapper.classList.add('back-to-top-btn-show');
          isShown = true;
        }
      } else {
        if (isShown) {
          bttWrapper.classList.remove('back-to-top-btn-show');
          isShown = false;
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    function scrollToTop(e) {
      if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, 0);
      }
    }

    if (bttBtn) {
      bttBtn.addEventListener('click', scrollToTop);
    }
    bttWrapper.addEventListener('click', scrollToTop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }

})(window, document);
