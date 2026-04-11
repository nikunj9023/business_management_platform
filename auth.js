/**
 * BizCore - Authentication & Role-Based Access Control
 * Handles simulated login, session persistence, and role validation.
 */

const Auth = {
  // Mock users for simulation
  mockUsers: [
    { email: 'admin@bizcore.com', password: 'password123', name: 'Nikunj Patel', role: 'admin' },
    { email: 'user@bizcore.com', password: 'password123', name: 'John Doe', role: 'user' }
  ],

  init() {
    this.checkSession();
  },

  login(email, password) {
    return new Promise((resolve, reject) => {
      const user = this.mockUsers.find(u => u.email === email && u.password === password);
      if (user) {
        const sessionUser = { ...user };
        delete sessionUser.password;
        localStorage.setItem('bizcore_session', JSON.stringify(sessionUser));
        resolve(sessionUser);
      } else {
        reject('Invalid email or password.');
      }
    });
  },

  logout() {
    localStorage.removeItem('bizcore_session');
    window.location.reload();
  },

  getCurrentUser() {
    const session = localStorage.getItem('bizcore_session');
    return session ? JSON.parse(session) : null;
  },

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  checkSession() {
    const user = this.getCurrentUser();
    const appBody = document.body;

    if (user) {
      appBody.classList.add('is-authenticated');
      appBody.classList.remove('is-guest');
      if (user.role === 'admin') {
        appBody.classList.add('is-admin');
      } else {
        appBody.classList.remove('is-admin');
      }
      
      // Update UI names
      document.querySelectorAll('.user-name, .t-user-name, .user-display-name').forEach(el => {
        el.textContent = user.name;
      });
      document.querySelectorAll('.user-role, .t-user-role').forEach(el => {
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      });
      document.querySelectorAll('.user-avatar').forEach(el => {
        el.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
      });

    } else {
      appBody.classList.add('is-guest');
      appBody.classList.remove('is-authenticated', 'is-admin');
      // If we are not on the login page/view, we might want to force it
      // For SPA, navbar.js will handle showing the login view
    }
  }
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => Auth.init());
window.Auth = Auth;
