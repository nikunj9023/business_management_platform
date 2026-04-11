/**
 * BizCore — Page Router
 * Hash-based SPA router with auth/admin guards, breadcrumbs,
 * active-nav sync, and browser back/forward support.
 *
 * API:
 *   BizRouter.navigate(route)          → go to a route
 *   BizRouter.back()                   → go back in history
 *   BizRouter.getCurrentRoute()        → returns current route string
 *   BizRouter.addGuard(fn)             → add a custom guard fn(route) → true|false
 */

(function () {
  'use strict';

  /* ============================================================
     ROUTE MAP
     Each entry: routeKey → { viewId, title, breadcrumb, adminOnly }
     ============================================================ */
  const ROUTES = {
    // Auth
    'login': {
      viewId:    'view-login',
      title:     'Sign In',
      breadcrumb: 'Login',
      public:    true
    },

    // Dashboard
    'dashboard': {
      viewId:    'view-dashboard',
      title:     'Dashboard',
      breadcrumb: 'Dashboard'
    },

    // Transactions
    'income': {
      viewId:    'view-income',
      title:     'Record Income',
      breadcrumb: 'Transactions / Income'
    },
    'expenses': {
      viewId:    'view-expenses',
      title:     'Record Expense',
      breadcrumb: 'Transactions / Expenses'
    },
    'invoices': {
      viewId:    'view-invoice',
      title:     'Invoices',
      breadcrumb: 'Transactions / Invoices'
    },
    'all-transactions': {
      viewId:    'view-transactions',
      title:     'All Transactions',
      breadcrumb: 'Transactions / All'
    },

    // Accounts & Banking
    'accounts': {
      viewId:    'view-accounts',
      title:     'Accounts & Banking',
      breadcrumb: 'Accounts & Banking'
    },
    'bank-accounts': {
      viewId:    'view-accounts',
      title:     'Bank Accounts',
      breadcrumb: 'Accounts / Bank Accounts'
    },
    'cash-flow': {
      viewId:    'view-accounts',
      title:     'Cash Flow',
      breadcrumb: 'Accounts / Cash Flow'
    },
    'reconciliation': {
      viewId:    'view-accounts',
      title:     'Reconciliation',
      breadcrumb: 'Accounts / Reconciliation'
    },
    'integrations': {
      viewId:    'view-accounts',
      title:     'Integrations',
      breadcrumb: 'Accounts / Integrations'
    },

    // Reports
    'reports': {
      viewId:    'view-reports',
      title:     'Reports & Analytics',
      breadcrumb: 'Reports & Analytics'
    },

    // Settings
    'subscription': {
      viewId:    'view-subscription',
      title:     'Subscription',
      breadcrumb: 'Subscription'
    },
    'business-profile': {
      viewId:    'view-profile',
      title:     'Business Profile',
      breadcrumb: 'Business Profile'
    },
    'help': {
      viewId:    'view-help',
      title:     'Help & Support',
      breadcrumb: 'Help & Support'
    },

    // Admin (protected)
    'admin': {
      viewId:    'view-admin',
      title:     'Admin Control Center',
      breadcrumb: 'Admin Panel',
      adminOnly: true
    },
    'admin-users': {
      viewId:    'view-admin',
      title:     'User Management',
      breadcrumb: 'Admin / User Management',
      adminOnly: true
    },
    'admin-analytics': {
      viewId:    'view-admin',
      title:     'Global Analytics',
      breadcrumb: 'Admin / Global Analytics',
      adminOnly: true
    },
    'admin-settings': {
      viewId:    'view-admin',
      title:     'System Settings',
      breadcrumb: 'Admin / System Settings',
      adminOnly: true
    }
  };

  /* Default / Fallback routes */
  const DEFAULT_ROUTE        = 'dashboard';
  const LOGIN_ROUTE          = 'login';
  const FORBIDDEN_ROUTE      = 'dashboard';
  const NOT_FOUND_ROUTE      = 'dashboard';
  const APP_TITLE_SUFFIX     = ' | BizCore';

  /* ============================================================
     INTERNAL STATE
     ============================================================ */
  let _currentRoute  = null;
  let _extraGuards   = [];
  let _history       = [];          // manual route history stack

  /* ============================================================
     HELPERS
     ============================================================ */
  function _getUser() {
    return (window.Auth && window.Auth.getCurrentUser) ? window.Auth.getCurrentUser() : null;
  }

  function _getAllViews() {
    return document.querySelectorAll('.view-section');
  }

  function _getBreadcrumbEl() {
    return document.getElementById('breadcrumbCurrent');
  }

  function _toast(msg, type) {
    if (window.showToast) window.showToast(msg, type);
  }

  /* ============================================================
     GUARD CHECK
     Returns { allowed: bool, redirectTo: string|null, reason: string }
     ============================================================ */
  function _runGuards(route, def) {
    const user = _getUser();

    // 1. Auth guard — route is protected and user not logged in
    if (!def.public && !user) {
      return { allowed: false, redirectTo: LOGIN_ROUTE, reason: 'auth' };
    }

    // 2. Admin guard
    if (def.adminOnly && (!user || user.role !== 'admin')) {
      return { allowed: false, redirectTo: FORBIDDEN_ROUTE, reason: 'admin' };
    }

    // 3. Logged-in user trying to visit login page
    if (route === LOGIN_ROUTE && user) {
      return { allowed: false, redirectTo: DEFAULT_ROUTE, reason: 'already-logged-in' };
    }

    // 4. Custom guards registered via BizRouter.addGuard()
    for (const guardFn of _extraGuards) {
      const result = guardFn(route, def, user);
      if (result === false || (result && result.allowed === false)) {
        const redirect = (result && result.redirectTo) || FORBIDDEN_ROUTE;
        const reason   = (result && result.reason)     || 'custom-guard';
        return { allowed: false, redirectTo: redirect, reason };
      }
    }

    return { allowed: true };
  }

  /* ============================================================
     ACTIVE NAV SYNC
     Highlights the sidebar link that matches the current route
     ============================================================ */
  function _syncActiveNav(route) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Try to find a nav link whose href matches #<route>
    const matchingLink = document.querySelector(`.nav-link[href="#${route}"], .submenu a[href="#${route}"]`);
    if (matchingLink) {
      const parentLi = matchingLink.closest('.nav-item');
      if (parentLi) {
        parentLi.classList.add('active');

        // If it's inside a submenu, open the parent
        const parentNav = matchingLink.closest('.has-submenu');
        if (parentNav) parentNav.classList.add('open');
      }
    } else {
      // Fallback: try to match parent nav items by data or class
      const parentNavId = _resolveParentNavId(route);
      if (parentNavId) {
        const el = document.getElementById(parentNavId);
        if (el) el.classList.add('active');
      }
    }
  }

  function _resolveParentNavId(route) {
    if (['income', 'expenses', 'invoices', 'all-transactions'].includes(route)) return 'nav-transactions';
    if (['accounts', 'bank-accounts', 'cash-flow', 'reconciliation', 'integrations'].includes(route)) return 'nav-accounts';
    if (['reports'].includes(route))                                                                    return 'nav-reports';
    if (['admin', 'admin-users', 'admin-analytics', 'admin-settings'].includes(route))                 return 'nav-admin';
    if (route === 'dashboard')    return 'nav-dashboard';
    if (route === 'subscription') return 'nav-subscription';
    if (route === 'business-profile') return 'nav-profile';
    if (route === 'help')         return 'nav-help';
    return null;
  }

  /* ============================================================
     RENDER VIEW
     ============================================================ */
  function _renderView(route, def) {
    const allViews = _getAllViews();
    const targetEl = document.getElementById(def.viewId);

    // Hide all views
    allViews.forEach(v => v.classList.remove('active'));

    if (targetEl) {
      targetEl.classList.add('active');
    } else {
      // View DOM element not found — show dashboard as fallback
      const dash = document.getElementById('view-dashboard');
      if (dash) dash.classList.add('active');
      console.warn(`[BizRouter] View not found: "${def.viewId}" for route "${route}"`);
    }

    // Update <title>
    document.title = def.title + APP_TITLE_SUFFIX;

    // Update breadcrumb
    const breadcrumb = _getBreadcrumbEl();
    if (breadcrumb) breadcrumb.textContent = def.breadcrumb;

    // Sync active nav
    _syncActiveNav(route);

    // Dispatch route-changed event for other modules to listen
    window.dispatchEvent(new CustomEvent('bizRouteChanged', {
      detail: { route, viewId: def.viewId, title: def.title }
    }));
  }

  /* ============================================================
     CORE NAVIGATE FUNCTION
     ============================================================ */
  function _navigate(rawRoute, { replace = false, silent = false } = {}) {
    const route = (rawRoute || '').trim().toLowerCase() || DEFAULT_ROUTE;
    const def   = ROUTES[route];

    // Unknown route
    if (!def) {
      console.warn(`[BizRouter] Unknown route: "${route}" → redirecting to "${NOT_FOUND_ROUTE}"`);
      _navigate(NOT_FOUND_ROUTE, { replace: true });
      return;
    }

    // Run guards
    const guard = _runGuards(route, def);
    if (!guard.allowed) {
      if (guard.reason === 'admin') {
        _toast('Access Denied: Admin privileges required.', 'error');
      }
      if (guard.reason === 'auth') {
        _toast('Please login to continue.', 'warning');
      }
      // Redirect without adding to history
      _navigate(guard.redirectTo, { replace: true });
      return;
    }

    // Push / replace hash (triggers hashchange only if different)
    const newHash = '#' + route;
    if (replace) {
      history.replaceState(null, '', newHash);
    } else {
      if (window.location.hash !== newHash) {
        history.pushState(null, '', newHash);
      }
    }

    // Track history stack
    if (!replace && _currentRoute !== route) {
      _history.push(route);
      if (_history.length > 50) _history.shift(); // cap stack
    }

    _currentRoute = route;

    // Render only if not silent
    if (!silent) {
      _renderView(route, def);
    }
  }

  /* ============================================================
     HANDLE HASH CHANGE (browser back / forward / direct URL)
     ============================================================ */
  function _handleHashChange() {
    const hash        = window.location.hash.substring(1) || DEFAULT_ROUTE;
    const route       = hash.toLowerCase();
    _navigate(route, { replace: true });
  }

  /* ============================================================
     CLOSE MOBILE SIDEBAR (utility helper for nav clicks)
     ============================================================ */
  function _closeMobileSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('overlay');
    if (hamburger) hamburger.classList.remove('open');
    if (sidebar)   sidebar.classList.remove('mobile-open');
    if (overlay)   overlay.classList.remove('active');
  }

  /* ============================================================
     BIND NAV LINKS
     Intercepts all <a href="#route"> clicks inside the sidebar
     ============================================================ */
  function _bindNavLinks() {
    // All sidebar nav links + submenu links
    document.querySelectorAll('.nav-link, .submenu a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        const route = href.substring(1);

        // Let submenu-toggle links just toggle the submenu, not navigate
        const parentLi = link.closest('.nav-item');
        if (parentLi && parentLi.classList.contains('has-submenu') && link.classList.contains('nav-link')) {
          // Only toggle if not a direct route link
          if (!ROUTES[route]) return; // let default toggle behavior handle it
        }

        e.preventDefault();
        _navigate(route);
        _closeMobileSidebar();
      });
    });
  }

  /* ============================================================
     PUBLIC API  →  window.BizRouter
     ============================================================ */
  window.BizRouter = {
    /**
     * Navigate to a named route.
     * @param {string} route  - route key from ROUTES map (e.g. 'income')
     * @param {object} opts   - { replace: bool }
     */
    navigate(route, opts = {}) {
      _navigate(route, opts);
    },

    /**
     * Go back one step in the router's internal history.
     */
    back() {
      if (_history.length > 1) {
        _history.pop(); // remove current
        const prev = _history[_history.length - 1];
        _navigate(prev, { replace: true });
      } else {
        _navigate(DEFAULT_ROUTE);
      }
    },

    /**
     * Returns the current route key string.
     */
    getCurrentRoute() {
      return _currentRoute;
    },

    /**
     * Add a custom guard function.
     * fn(route, routeDef, user) → return false or { allowed: false, redirectTo, reason }
     *                          → return true or nothing to allow
     */
    addGuard(fn) {
      if (typeof fn === 'function') _extraGuards.push(fn);
    },

    /**
     * Returns true if the given route exists in the route map.
     */
    hasRoute(route) {
      return !!ROUTES[route];
    },

    /**
     * Returns a copy of the full route map.
     */
    getRoutes() {
      return { ...ROUTES };
    },

    /**
     * Returns the internal navigation history stack.
     */
    getHistory() {
      return [..._history];
    }
  };

  /* Backward-compatible alias — so existing onclick="window.switchView('income')" still works */
  window.switchView = function (route) {
    _navigate(route);
  };

  /* ============================================================
     INIT — runs on DOMContentLoaded
     ============================================================ */
  function _init() {
    // Bind all sidebar links
    _bindNavLinks();

    // Listen to browser back/forward
    window.addEventListener('hashchange', _handleHashChange);

    // Read initial route from URL hash
    _handleHashChange();

    console.info('[BizRouter] Initialized. Current route:', _currentRoute);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
