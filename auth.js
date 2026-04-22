/**
 * BizCore - Hybrid Authentication (Supabase + Local Fallback)
 */

const SUPABASE_CONFIG = {
  // TODO: Replace these with your actual Supabase credentials
  url: 'YOUR_SUPABASE_URL',
  key: 'YOUR_SUPABASE_ANON_KEY'
};

const IS_CLOUD = (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && SUPABASE_CONFIG.url !== '');

// Initialize Supabase Client
const _supabase = IS_CLOUD 
  ? supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
  : { auth: { 
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase unconfigured.' } }),
      signInWithOAuth: async () => ({ error: { message: 'Supabase unconfigured.' } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => {} 
    } 
  };

const Auth = {
  mockUsers: [
    { id: 'admin-123', email: 'admin@bizcore.com', password: 'password123', name: 'Admin', role: 'admin' },
    { id: 'user-456', email: 'user@bizcore.com', password: 'password123', name: 'User', role: 'user' }
  ],

  async init() {
    if (IS_CLOUD) {
      _supabase.auth.onAuthStateChange((event, session) => {
        this.checkSession(session);
        window.dispatchEvent(new CustomEvent('bizAuthStateChanged', { detail: { event, session } }));
      });
      const { data: { session } } = await _supabase.auth.getSession();
      this.checkSession(session);
    } else {
      console.warn('BizCore: Operating in Local/Demo mode. Cloud sync is disabled.');
      this.checkSession(); 
    }
  },

  async register(name, email, password) {
    if (IS_CLOUD) {
      const { data, error } = await _supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error.message;
      return data.user;
    } else {
      // Local Registration
      const newUser = { email, password, name, role: 'user' };
      this.mockUsers.push(newUser);
      localStorage.setItem('bizcore_session', JSON.stringify(newUser));
      window.location.reload();
      return newUser;
    }
  },

  async login(email, password) {
    if (IS_CLOUD) {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) throw error.message;
      return data.user;
    } else {
      // Local Login Fallback
      const user = this.mockUsers.find(u => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem('bizcore_session', JSON.stringify(user));
        window.location.reload();
        return user;
      }
      throw 'Invalid email or password. (Demo Mode: use admin@bizcore.com / password123)';
    }
  },

  async loginWithGoogle() {
    if (IS_CLOUD) {
      const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error.message;
      return data;
    } else {
      throw 'Google Login requires Supabase configuration. Please add your keys to auth.js.';
    }
  },

  async logout() {
    if (IS_CLOUD) {
      await _supabase.auth.signOut();
    } else {
      localStorage.removeItem('bizcore_session');
    }
    window.location.reload();
  },

  async getCurrentUser() {
    if (IS_CLOUD) {
      const { data: { session } } = await _supabase.auth.getSession();
      return session ? session.user : null;
    } else {
      const session = localStorage.getItem('bizcore_session');
      return session ? JSON.parse(session) : null;
    }
  },

  checkSession(cloudSession = null) {
    let user = null;
    if (IS_CLOUD && cloudSession) {
      user = cloudSession.user;
    } else if (!IS_CLOUD) {
      const session = localStorage.getItem('bizcore_session');
      user = session ? JSON.parse(session) : null;
    }

    const appBody = document.body;
    if (user) {
      appBody.classList.add('is-authenticated');
      appBody.classList.remove('is-guest');
      
      const isCloudUser = !!user.id;
      const displayName = isCloudUser ? (user.user_metadata?.full_name || user.email.split('@')[0]) : user.name;
      const role = isCloudUser ? (user.app_metadata?.role || 'user') : user.role;

      if (role === 'admin') appBody.classList.add('is-admin');
      else appBody.classList.remove('is-admin');
      
      document.querySelectorAll('.user-name, .t-user-name, .user-display-name').forEach(el => el.textContent = displayName);
      document.querySelectorAll('.user-role, .t-user-role').forEach(el => el.textContent = role.charAt(0).toUpperCase() + role.slice(1));
      document.querySelectorAll('.user-avatar').forEach(el => el.textContent = displayName.split(' ').map(n => n[0]).join('').toUpperCase());
    } else {
      appBody.classList.add('is-guest');
      appBody.classList.remove('is-authenticated', 'is-admin');
    }
  }
};

window._supabase = _supabase;
window.IS_CLOUD = IS_CLOUD;
document.addEventListener('DOMContentLoaded', () => Auth.init());
window.Auth = Auth;
