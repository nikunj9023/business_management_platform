/**
 * BizCore - Supabase Database Interface
 * Synchronizes local state with cloud storage via Supabase.
 */

const Db = {
  async getUserId() {
    if (!window.Auth) return null;
    const user = await window.Auth.getCurrentUser();
    return user ? user.id : null;
  },

  // --- BANK ACCOUNTS ---
  async getBankAccounts() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) { console.error('DB Error:', error); return []; }
    return data;
  },

  async saveBankAccount(acc) {
    const userId = await this.getUserId();
    if (!userId) return;
    const row = { ...acc, user_id: userId };
    // Remove client-only properties if any
    const { error } = await window._supabase
      .from('bank_accounts')
      .upsert(row);
    if (error) console.error('DB Error:', error);
  },

  async deleteBankAccount(id) {
    const { error } = await window._supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id);
    if (error) console.error('DB Error:', error);
  },

  // --- TRANSACTIONS ---
  async getTransactions() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) { console.error('DB Error:', error); return []; }
    return data;
  },

  async saveTransaction(txn) {
    const userId = await this.getUserId();
    if (!userId) return;
    const { error } = await window._supabase
      .from('transactions')
      .upsert({ ...txn, user_id: userId });
    if (error) console.error('DB Error:', error);
  },

  // --- BUSINESS PROFILE ---
  async getProfile() {
    const userId = await this.getUserId();
    if (!userId) return null;
    const { data, error } = await window._supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') console.error('DB Error:', error);
    return data;
  },

  async saveProfile(profile) {
    const userId = await this.getUserId();
    if (!userId) return;
    const { error } = await window._supabase
      .from('profiles')
      .upsert({ ...profile, id: userId, updated_at: new Date() });
    if (error) console.error('DB Error:', error);
  },

  // --- RECEIVERS / PAYABLES ---
  async getReceivers() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('receivers')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  },

  async saveReceiver(rec) {
    const userId = await this.getUserId();
    if (!userId) return;
    await window._supabase.from('receivers').upsert({ ...rec, user_id: userId });
  },

  async getPayables() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('payables')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  },

  async savePayable(pay) {
    const userId = await this.getUserId();
    if (!userId) return;
    await window._supabase.from('payables').upsert({ ...pay, user_id: userId });
  },

  // --- INVOICES ---
  async getInvoices() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    return data || [];
  },

  async saveInvoice(inv) {
    const userId = await this.getUserId();
    if (!userId) return;
    await window._supabase.from('invoices').upsert({ ...inv, user_id: userId });
  },

  async deleteInvoice(invNo) {
    const userId = await this.getUserId();
    if (!userId) return;
    await window._supabase.from('invoices').delete().eq('inv_no', invNo).eq('user_id', userId);
  },

  // --- NOTIFICATIONS ---
  async getNotifications() {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await window._supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async saveNotifications(list) {
    const userId = await this.getUserId();
    if (!userId) return;
    // For simplicity with the existing array-based logic in app.js, we might just clear and insert
    // but better to upsert individually. App logic currently sends the whole list.
    // We'll perform a bulk upsert.
    const rows = list.map(n => ({ ...n, user_id: userId }));
    await window._supabase.from('notifications').upsert(rows);
  },

  // --- MIGRATION LOGIC ---
  async migrateFromLocalStorage(email) {
    const userId = await this.getUserId();
    if (!userId) return;

    // Check if cloud transactions exist
    const { count } = await window._supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count > 0) return; // Already migrated

    const suffix = `__${email}`;
    const getLocal = (k) => JSON.parse(localStorage.getItem(`${k}${suffix}`) || 'null');

    console.log('Starting migration to Supabase for:', email);

    // Profile
    const profile = getLocal('bizcore_profile');
    if (profile) await this.saveProfile(profile);

    // Bank Accounts
    const accounts = getLocal('bizcore_bank_accounts');
    if (Array.isArray(accounts)) {
      for (const acc of accounts) await this.saveBankAccount(acc);
    }

    // Transactions
    const txns = getLocal('bizcore_transactions');
    if (Array.isArray(txns)) {
      for (const t of txns) await this.saveTransaction(t);
    }

    // Receivers
    const recs = getLocal('bizcore_receivers');
    if (Array.isArray(recs)) {
      for (const r of recs) await this.saveReceiver(r);
    }

    // Invoices
    const invs = getLocal('bizcore_invoices');
    if (Array.isArray(invs)) {
      for (const i of invs) await this.saveInvoice(i);
    }

    console.log('Migration complete.');
  }
};

window.Db = Db;
