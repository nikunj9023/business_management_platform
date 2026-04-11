/**
 * BizCore - Navbar & Sidebar Main Logic
 */

document.addEventListener('DOMContentLoaded', () => {

  // ---- Elements ----
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const toggleIcon = document.getElementById('toggleIcon');
  const mainContent = document.getElementById('mainContent');
  
  const hamburger = document.getElementById('hamburger');
  const mobileTopbar = document.getElementById('mobileTopbar');
  const overlay = document.getElementById('overlay');
  
  const navItems = document.querySelectorAll('.nav-item');
  const currentDateEl = document.getElementById('currentDate');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

  // Auth Elements
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginPass = document.getElementById('loginPassword');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');

  // ---- Current Date Functionality ----
  if (currentDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-IN', options);
  }

  // ---- Desktop Sidebar Toggle ----
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('shifted');
      
      // Close all submenus if collapsing
      if (sidebar.classList.contains('collapsed')) {
        navItems.forEach(item => item.classList.remove('open'));
      }
    });
  }

  // ---- Mobile Sidebar Toggle ----
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });
  }

  // Close sidebar on overlay click
  if (overlay) {
    overlay.addEventListener('click', () => {
      hamburger.classList.remove('open');
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // ---- Navigation Logic (Submenus & Active State) ----
  navItems.forEach(item => {
    
    // Check if item has submenu
    const hasSubmenu = item.classList.contains('has-submenu');
    const link = item.querySelector('.nav-link');

    if (link) {
      link.addEventListener('click', (e) => {
        // If sidebar is collapsed and it has a submenu, open sidebar first
        if (hasSubmenu && sidebar.classList.contains('collapsed') && window.innerWidth > 768) {
          e.preventDefault();
          sidebar.classList.remove('collapsed');
          mainContent.classList.remove('shifted');
          item.classList.add('open');
          return;
        }

        // Toggle submenu
        if (hasSubmenu) {
          e.preventDefault(); // Prevent jump for submenu toggles
          
          // Close other open submenus
          navItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('has-submenu')) {
              otherItem.classList.remove('open');
            }
          });

          item.classList.toggle('open');
        } else {
          // It's a standard link, set active state
          navItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          // Update breadcrumb visually (mock behavior)
          const label = item.querySelector('.nav-label').textContent;
          if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = label;
          }

          // Close mobile menu after clicking a standard link
          if (window.innerWidth <= 768) {
            hamburger.classList.remove('open');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
          }
        }
      });
    }

    // Submenu item click logic (to make visual changes like active state)
    const submenuLinks = item.querySelectorAll('.submenu a');
    submenuLinks.forEach(subLink => {
      subLink.addEventListener('click', (e) => {
        // e.preventDefault(); // uncomment if no real navigation needed in demo
        
        // Remove active from all main items
        navItems.forEach(i => i.classList.remove('active'));
        // Make parent active
        item.classList.add('active');

        // Update breadcrumb to show "Parent / Child"
        const parentLabel = item.querySelector('.nav-label').textContent;
        const childLabel = subLink.textContent.trim();
        if (breadcrumbCurrent) {
          breadcrumbCurrent.textContent = `${parentLabel} / ${childLabel}`;
        }

        // Handle view switching for submenu links — delegates to BizRouter
        const targetId = subLink.getAttribute('href').substring(1); // remove '#'
        if (window.BizRouter) BizRouter.navigate(targetId);
        else if (window.switchView) switchView(targetId);

        // Close mobile menu
        if (window.innerWidth <= 768) {
          hamburger.classList.remove('open');
          sidebar.classList.remove('mobile-open');
          overlay.classList.remove('active');
        }
      });
    });
  });

  // Handle standard link view switching — delegates to BizRouter
  const allLinks = document.querySelectorAll('.nav-link');
  allLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const parentLi = link.closest('.nav-item');
      if (!parentLi.classList.contains('has-submenu')) {
        const targetHref = link.getAttribute('href');
        if (targetHref && targetHref.startsWith('#')) {
          e.preventDefault();
          const targetId = targetHref.substring(1);
          if (window.BizRouter) BizRouter.navigate(targetId);
        }
      }
    });
  });

  // ---- Auth & Login Logic ----
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = loginEmail.value.trim();
      const password = loginPass.value.trim();

      loginSubmitBtn.classList.add('loading');
      loginSubmitBtn.disabled = true;

      try {
        const user = await window.Auth.login(email, password);
        window.showToast(`Welcome back, ${user.name}!`, 'success');
        
        window.location.reload(); 

      } catch (err) {
        window.showToast(err, 'error');
        loginSubmitBtn.classList.remove('loading');
        loginSubmitBtn.disabled = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.Auth.logout();
    });
  }

  // Global toast helper
  function _fallbackToast(msg, type = 'success') {
    if (window.showToast && window.showToast !== _fallbackToast) {
        window.showToast(msg, type);
    } else {
        console.log(`Toast [${type}]: ${msg}`);
    }
  }
  if (!window.showToast) {
    window.showToast = _fallbackToast;
  }

});
