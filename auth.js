/**
 * BizCore - Supabase Authentication & Session Management
 */

const SUPABASE_CONFIG = {
  // TODO: Replace these with your actual Supabase credentials
  url: 'YOUR_SUPABASE_URL',
  key: 'YOUR_SUPABASE_ANON_KEY'
};

// Initialize Supabase Client
const _supabase = (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL') 
  ? supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
  : { auth: { 
      onAuthStateChange: (cb) => { console.warn('Supabase not configured. Auth is disabled.'); return { data: { subscription: { unsubscribe: () => {} } } }; },
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase URL/Key missing. Please configure in auth.js.' } }),
      signUp: async () => ({ error: { message: 'Supabase URL/Key missing. Please configure in auth.js.' } }),
      signOut: async () => {}
    } 
  };

const Auth = {
  async init() {
    // Listen for auth changes
    _supabase.auth.onAuthStateChange((event, session) => {
      this.checkSession(session);
      // Trigger a custom event for app.js to reload data
      window.dispatchEvent(new CustomEvent('bizAuthStateChanged', { detail: { event, session } }));
    });
    
    const { data: { session } } = await _supabase.auth.getSession();
    this.checkSession(session);
  },

  async register(name, email, password) {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) throw error.message;
    return data.user;
  },

  async login(email, password) {
    const { data, error } = await _supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error.message;
    return data.user;
  },

  async loginWithGoogle() {
    const { data, error } = await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error.message;
    return data;
  },

  async logout() {
    await _supabase.auth.signOut();
    window.location.reload();
  },

  async getCurrentUser() {
    const { data: { session } } = await _supabase.auth.getSession();
    return session ? session.user : null;
  },

  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  async isAdmin() {
    // In Supabase, role can be stored in auth.users metadata or a profiles table
    // For now, we allow the mock 'admin' check if needed, but ideally we check metadata
    const user = await this.getCurrentUser();
    return user && (user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin');
  },

  checkSession(session) {
    const user = session ? session.user : null;
    const appBody = document.body;

    if (user) {
      appBody.classList.add('is-authenticated');
      appBody.classList.remove('is-guest');
      
      const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
      const role = user.app_metadata?.role || 'user';

      if (role === 'admin') appBody.classList.add('is-admin');
      else appBody.classList.remove('is-admin');
      
      // Update UI names
      document.querySelectorAll('.user-name, .t-user-name, .user-display-name').forEach(el => {
        el.textContent = displayName;
      });
      document.querySelectorAll('.user-role, .t-user-role').forEach(el => {
        el.textContent = role.charAt(0).toUpperCase() + role.slice(1);
      });
      document.querySelectorAll('.user-avatar').forEach(el => {
        el.textContent = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
      });

    } else {
      appBody.classList.add('is-guest');
      appBody.classList.remove('is-authenticated', 'is-admin');
    }
  }
};

// Internal Supabase reference for app.js
window._supabase = _supabase;

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => Auth.init());
window.Auth = Auth;
