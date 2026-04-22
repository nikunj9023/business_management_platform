/**
 * BizCore - Supabase Database Interface
 * Synchronizes local state with cloud storage via Supabase.
 */

const Db = {
  async getUserId() {
    if (!window.Auth) return null;
    const user = await window.Auth.getCurrentUser();
    if (!user) return null;
    return window.IS_CLOUD ? user.id : user.email; // Use email as ID in local mode
  },

  _getLocal(key, email) {
    const suffix = `__${email}`;
    return JSON.parse(localStorage.getItem(`${key}${suffix}`) || 'null');
  },

  _setLocal(key, email, data) {
    const suffix = `__${email}`;
    localStorage.setItem(`${key}${suffix}`, JSON.stringify(data));
  },

  // --- BANK ACCOUNTS ---
  async getBankAccounts() {
    const userId = await this.getUserId();
    if (!userId) return [];
    
    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) { console.error('DB Error:', error); return []; }
      return data;
    } else {
      return this._getLocal('bizcore_bank_accounts', userId) || [];
    }
  },

  async saveBankAccount(acc) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      const row = { ...acc, user_id: userId };
      const { error } = await window._supabase
        .from('bank_accounts')
        .upsert(row);
      if (error) console.error('DB Error:', error);
    } else {
      const list = this._getLocal('bizcore_bank_accounts', userId) || [];
      const idx = list.findIndex(a => String(a.id) === String(acc.id));
      if (idx >= 0) list[idx] = acc;
      else list.push(acc);
      this._setLocal('bizcore_bank_accounts', userId, list);
    }
  },

  async deleteBankAccount(id) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      const { error } = await window._supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      if (error) console.error('DB Error:', error);
    } else {
      const list = this._getLocal('bizcore_bank_accounts', userId) || [];
      const filtered = list.filter(a => String(a.id) !== String(id));
      this._setLocal('bizcore_bank_accounts', userId, filtered);
    }
  },

  // --- TRANSACTIONS ---
  async getTransactions() {
    const userId = await this.getUserId();
    if (!userId) return [];

    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) { console.error('DB Error:', error); return []; }
      return data;
    } else {
      return this._getLocal('bizcore_transactions', userId) || [];
    }
  },

  async saveTransaction(txn) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      const { error } = await window._supabase
        .from('transactions')
        .upsert({ ...txn, user_id: userId });
      if (error) console.error('DB Error:', error);
    } else {
      const list = this._getLocal('bizcore_transactions', userId) || [];
      const idx = list.findIndex(t => t.id === txn.id);
      if (idx >= 0) list[idx] = txn;
      else list.push(txn);
      this._setLocal('bizcore_transactions', userId, list);
    }
  },

  // --- BUSINESS PROFILE ---
  async getProfile() {
    const userId = await this.getUserId();
    if (!userId) return null;

    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') console.error('DB Error:', error);
      return data;
    } else {
      return this._getLocal('bizcore_profile', userId);
    }
  },

  async saveProfile(profile) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      const { error } = await window._supabase
        .from('profiles')
        .upsert({ ...profile, id: userId, updated_at: new Date() });
      if (error) console.error('DB Error:', error);
    } else {
      this._setLocal('bizcore_profile', userId, profile);
    }
  },

  // --- RECEIVERS / PAYABLES ---
  async getReceivers() {
    const userId = await this.getUserId();
    if (!userId) return [];
    
    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('receivers')
        .select('*')
        .eq('user_id', userId);
      return data || [];
    } else {
      return this._getLocal('bizcore_receivers', userId) || [];
    }
  },

  async saveReceiver(rec) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      await window._supabase.from('receivers').upsert({ ...rec, user_id: userId });
    } else {
      const list = this._getLocal('bizcore_receivers', userId) || [];
      const idx = list.findIndex(r => r.id === rec.id);
      if (idx >= 0) list[idx] = rec;
      else list.push(rec);
      this._setLocal('bizcore_receivers', userId, list);
    }
  },

  async getPayables() {
    const userId = await this.getUserId();
    if (!userId) return [];

    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('payables')
        .select('*')
        .eq('user_id', userId);
      return data || [];
    } else {
      return this._getLocal('bizcore_payables', userId) || [];
    }
  },

  async savePayable(pay) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      await window._supabase.from('payables').upsert({ ...pay, user_id: userId });
    } else {
      const list = this._getLocal('bizcore_payables', userId) || [];
      const idx = list.findIndex(p => p.id === pay.id);
      if (idx >= 0) list[idx] = pay;
      else list.push(pay);
      this._setLocal('bizcore_payables', userId, list);
    }
  },

  // --- INVOICES ---
  async getInvoices() {
    const userId = await this.getUserId();
    if (!userId) return [];

    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      return data || [];
    } else {
      return this._getLocal('bizcore_invoices', userId) || [];
    }
  },

  async saveInvoice(inv) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      await window._supabase.from('invoices').upsert({ ...inv, user_id: userId });
    } else {
      const list = this._getLocal('bizcore_invoices', userId) || [];
      const idx = list.findIndex(i => i.invNo === inv.invNo);
      if (idx >= 0) list[idx] = inv;
      else list.push(inv);
      this._setLocal('bizcore_invoices', userId, list);
    }
  },

  async deleteInvoice(invNo) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      await window._supabase.from('invoices').delete().eq('inv_no', invNo).eq('user_id', userId);
    } else {
      const list = this._getLocal('bizcore_invoices', userId) || [];
      const filtered = list.filter(i => i.invNo !== invNo);
      this._setLocal('bizcore_invoices', userId, filtered);
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications() {
    const userId = await this.getUserId();
    if (!userId) return [];

    if (window.IS_CLOUD) {
      const { data, error } = await window._supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return data || [];
    } else {
      return this._getLocal('bizcore_notifications', userId) || [];
    }
  },

  async saveNotifications(list) {
    const userId = await this.getUserId();
    if (!userId) return;

    if (window.IS_CLOUD) {
      const rows = list.map(n => ({ ...n, user_id: userId }));
      await window._supabase.from('notifications').upsert(rows);
    } else {
      this._setLocal('bizcore_notifications', userId, list);
    }
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
