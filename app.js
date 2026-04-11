/**
 * BizCore – App Logic
 * Handles: Invoice Builder, Transaction Search, Subscription Toggle
 */

document.addEventListener('DOMContentLoaded', () => {

  // Auto-dismiss welcome message after 5 seconds
  const welcomeCard = document.querySelector('.welcome-card');
  if (welcomeCard) {
    setTimeout(() => {
      welcomeCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      welcomeCard.style.opacity = '0';
      welcomeCard.style.transform = 'translateY(-10px)';
      setTimeout(() => welcomeCard.remove(), 500); // Remove after fade completes
    }, 5000);
  }

  /* ============================================================
     1. INVOICE / BILL BUILDER
     ============================================================ */
  const invoiceItemName  = document.getElementById('invoiceItemName');
  const invoiceItemQty   = document.getElementById('invoiceItemQty');
  const invoiceItemPrice = document.getElementById('invoiceItemPrice');
  const addItemBtn       = document.getElementById('addItemBtn');
  const addedItemsList   = document.getElementById('addedItemsList');
  const subtotalEl       = document.getElementById('invoiceSubtotal');
  const taxEl            = document.getElementById('invoiceTax');
  const totalEl          = document.getElementById('invoiceTotal');
  const clientSelect     = document.getElementById('invoiceClient');
  const invoiceDate      = document.getElementById('invoiceDate');
  const generateBtn      = document.getElementById('generateInvoiceBtn');
  const saveDraftBtn     = document.getElementById('saveDraftBtn');

  const TAX_RATE = 0.18;
  let invoiceItems = [];

  // Set today's date as default
  if (invoiceDate) {
    const today = new Date().toISOString().split('T')[0];
    invoiceDate.value = today;
  }

  function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function recalculateTotals() {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl)      taxEl.textContent      = formatCurrency(tax);
    if (totalEl)    totalEl.textContent    = formatCurrency(total);
  }

  function renderItems() {
    if (!addedItemsList) return;
    addedItemsList.innerHTML = '';

    if (invoiceItems.length === 0) {
      addedItemsList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No items added yet.</p>';
    } else {
      invoiceItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'added-item';
        row.innerHTML = `
          <span class="i-name">${item.name}</span>
          <span class="i-qty">${item.qty}</span>
          <span class="i-price">${formatCurrency(item.price)}</span>
          <span class="i-total">${formatCurrency(item.total)}</span>
          <button class="btn-icon-circular text-danger remove-item-btn" data-index="${index}" title="Remove Item">
            <i class="fa-solid fa-xmark"></i>
          </button>`;
        addedItemsList.appendChild(row);
      });
    }

    // Attach remove listeners
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        invoiceItems.splice(idx, 1);
        renderItems();
        recalculateTotals();
      });
    });

    recalculateTotals();
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      const name  = invoiceItemName ? invoiceItemName.value.trim() : '';
      const qty   = invoiceItemQty  ? parseFloat(invoiceItemQty.value)  : 0;
      const price = invoiceItemPrice ? parseFloat(invoiceItemPrice.value) : 0;

      if (!name) { showToast('Please enter an item name.', 'error'); return; }
      if (isNaN(qty)   || qty <= 0)   { showToast('Quantity must be > 0.', 'error'); return; }
      if (isNaN(price) || price <= 0) { showToast('Price must be > 0.', 'error'); return; }

      invoiceItems.push({ name, qty, price, total: qty * price });

      // Clear inputs
      if (invoiceItemName)  invoiceItemName.value  = '';
      if (invoiceItemQty)   invoiceItemQty.value   = '';
      if (invoiceItemPrice) invoiceItemPrice.value = '';

      invoiceItemName && invoiceItemName.focus();
      renderItems();
      showToast('Item added!', 'success');
    });
  }

  // Allow Enter key on price input to add item
  if (invoiceItemPrice) {
    invoiceItemPrice.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && addItemBtn) addItemBtn.click();
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (invoiceItems.length === 0) {
        showToast('Add at least one item before generating.', 'error'); return;
      }
      const client = clientSelect ? clientSelect.options[clientSelect.selectedIndex].text : 'Client';
      if (clientSelect && clientSelect.value === '') {
        showToast('Please select a client!', 'error'); return;
      }

      // Build a simple printable invoice
      const subtotal = invoiceItems.reduce((s, i) => s + i.total, 0);
      const tax = subtotal * TAX_RATE;
      const total = subtotal + tax;

      const rows = invoiceItems.map(i => `
        <tr>
          <td>${i.name}</td>
          <td style="text-align:center">${i.qty}</td>
          <td style="text-align:right">₹${i.price.toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${i.total.toLocaleString('en-IN')}</td>
        </tr>`).join('');

      const printWin = window.open('', '_blank', 'width=800,height=900');
      printWin.document.write(`
        <!DOCTYPE html><html><head><title>Invoice – ${client}</title>
        <style>
          body { font-family: Inter, sans-serif; padding: 40px; color: #111; }
          h1   { font-size: 28px; color: #6366f1; margin-bottom: 4px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
          th { background: #f3f4f6; font-weight: 700; }
          .totals { margin-top: 24px; text-align: right; font-size: 14px; }
          .totals div { margin-bottom: 6px; }
          .grand { font-size: 18px; font-weight: 700; color: #6366f1; }
        </style></head><body>
        <h1>BizCore Invoice</h1>
        <div class="meta">
          <div><strong>Client:</strong> ${client}</div>
          <div><strong>Date:</strong> ${invoiceDate ? invoiceDate.value : '--'}</div>
        </div>
        <table>
          <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><strong>Subtotal:</strong> ₹${subtotal.toLocaleString('en-IN')}</div>
          <div><strong>Tax (18%):</strong> ₹${tax.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
          <div class="grand"><strong>Grand Total:</strong> ₹${total.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
        </div>
        <script>window.onload = () => { window.print(); }<\/script>
        </body></html>`);
      printWin.document.close();
    });
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      const draft = { client: clientSelect ? clientSelect.value : '', date: invoiceDate ? invoiceDate.value : '', items: invoiceItems };
      localStorage.setItem('bizcore_draft_invoice', JSON.stringify(draft));
      showToast('Draft saved! Reload the page to restore.', 'success');
    });
  }

  // Restore draft on load
  const draft = JSON.parse(localStorage.getItem('bizcore_draft_invoice') || 'null');
  if (draft) {
    if (clientSelect && draft.client)  clientSelect.value = draft.client;
    if (invoiceDate  && draft.date)    invoiceDate.value  = draft.date;
    if (Array.isArray(draft.items)) { invoiceItems = draft.items; renderItems(); }
  } else {
    renderItems(); // Show "no items" message
  }

  /* ============================================================
     2. TRANSACTIONS LIVE SEARCH
     ============================================================ */
  const txnSearch = document.getElementById('txnSearch');
  const txnTable  = document.getElementById('txnTable');

  if (txnSearch && txnTable) {
    txnSearch.addEventListener('keyup', () => {
      const query = txnSearch.value.toLowerCase().trim();
      const rows = txnTable.querySelectorAll('tbody tr');
      let visibleCount = 0;

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      // Show "no results" message
      let noResultsEl = document.getElementById('txnNoResults');
      if (!noResultsEl) {
        noResultsEl = document.createElement('tr');
        noResultsEl.id = 'txnNoResults';
        noResultsEl.innerHTML = '<td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No transactions match your search.</td>';
        txnTable.querySelector('tbody').appendChild(noResultsEl);
      }
      noResultsEl.style.display = visibleCount === 0 ? '' : 'none';
    });
  }

  /* ============================================================
     3. SUBSCRIPTION PRICING TOGGLE (Monthly / Yearly)
     ============================================================ */
  const monthlyPrices  = [499, 999, 2499];
  const yearlyPrices   = [4790, 9590, 23990]; // ~20% off, billed annually
  const toggleBtns     = document.querySelectorAll('.t-btn');
  const priceEls       = document.querySelectorAll('.p-price');
  const pricePerEls    = document.querySelectorAll('.p-price span');

  if (toggleBtns.length && priceEls.length) {
    toggleBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const isYearly = btn.dataset.period === 'yearly';
        const prices   = isYearly ? yearlyPrices : monthlyPrices;
        const suffix   = isYearly ? '/yr' : '/mo';

        priceEls.forEach((el, idx) => {
          const span = el.querySelector('span');
          // Update only the text node (price number), keep <span> inside
          el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) node.textContent = '₹' + prices[idx].toLocaleString('en-IN');
          });
          if (span) span.textContent = suffix;
        });
      });
    });
  }

  /* ============================================================
     4. BUSINESS PROFILE LOGIC
     ============================================================ */
  const profileName    = document.getElementById('profileName');
  const profileType    = document.getElementById('profileType');
  const profileGSTIN   = document.getElementById('profileGSTIN');
  const profileAddress = document.getElementById('profileAddress');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      const profileData = {
        name: profileName ? profileName.value : '',
        type: profileType ? profileType.value : '',
        gstin: profileGSTIN ? profileGSTIN.value : '',
        address: profileAddress ? profileAddress.value : ''
      };

      localStorage.setItem('bizcore_profile', JSON.stringify(profileData));
      showToast('Business Profile updated successfully!', 'success');
      
      // Update sidebar/topbar name if changed
      if (profileData.name) {
        document.querySelectorAll('.user-name, .t-user-name').forEach(el => {
          el.textContent = profileData.name;
        });
      }
    });
  }

  // Restore Profile on load
  const savedProfile = JSON.parse(localStorage.getItem('bizcore_profile') || 'null');
  if (savedProfile) {
    if (profileName)    profileName.value    = savedProfile.name   || '';
    if (profileType)    profileType.value    = savedProfile.type   || '';
    if (profileGSTIN)   profileGSTIN.value   = savedProfile.gstin  || '';
    if (profileAddress) profileAddress.value = savedProfile.address || '';
    
    // Set UI name
    if (savedProfile.name) {
      document.querySelectorAll('.user-name, .t-user-name').forEach(el => {
        el.textContent = savedProfile.name;
      });
    }
  }

  /* ============================================================
     5. DYNAMIC BANK ACCOUNTS MANAGEMENT
     ============================================================ */
  const bankingGrid      = document.getElementById('bankingGrid');
  const addAccountBtn    = document.getElementById('addAccountBtn');
  const incomeBankSelect = document.getElementById('incomeBankSelect');

  // ── Helpers ──
  function _toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
    else setTimeout(() => showToast && showToast(msg, type), 100);
  }

  function loadBankAccounts() {
    const saved = localStorage.getItem('bizcore_bank_accounts');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'ba1', name: 'Bank 1', balance: 0, accountNo: '**** **** 1234', isPrimary: true },
      { id: 'ba2', name: 'Bank 2', balance: 0, accountNo: '**** **** 5678', isPrimary: false },
      { id: 'ba3', name: 'Bank 3', balance: 0, accountNo: '**** **** 9012', isPrimary: false }
    ];
  }

  function saveBankAccounts() {
    localStorage.setItem('bizcore_bank_accounts', JSON.stringify(bankAccounts));
  }

  let bankAccounts = loadBankAccounts();

  // ── Transactions Storage ──
  function loadTransactions() {
    const saved = localStorage.getItem('bizcore_transactions');
    if (saved) return JSON.parse(saved);
    return []; // No default transactions
  }

  function saveTransactions() {
    localStorage.setItem('bizcore_transactions', JSON.stringify(transactions));
  }

  let transactions = loadTransactions();

  function renderTransactions() {
    const txnTableBody = document.querySelector('#txnTable tbody');
    if (!txnTableBody) return;
    
    // Clear out except the 'no results' row
    Array.from(txnTableBody.children).forEach(child => {
      if (child.id !== 'txnNoResults') child.remove();
    });

    const noResultsEl = document.getElementById('txnNoResults');

    if (transactions.length === 0) {
      if (noResultsEl) noResultsEl.style.display = '';
      return;
    }

    if (noResultsEl) noResultsEl.style.display = 'none';

    // Render in reverse chronological order
    const toRender = [...transactions].reverse();
    toRender.forEach(txn => {
      const tr = document.createElement('tr');
      
      const badgeClass = txn.type === 'Income' ? 'badge-success' : 'badge-danger';
      
      tr.innerHTML = `
        <td>${txn.date}</td>
        <td><strong>${txn.id}</strong></td>
        <td>${txn.description || 'Income/Sale'}</td>
        <td>${txn.category || 'Sales'}</td>
        <td style="font-weight:700;" class="${txn.type === 'Income' ? 'text-success' : ''}">₹${txn.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
        <td><span class="badge ${badgeClass}">${txn.status || 'Completed'}</span></td>
      `;
      txnTableBody.insertBefore(tr, noResultsEl);
    });
  }

  // Initial render for transactions
  renderTransactions();

  // ── Handlers ──
  function bankDelete(id) {
    const acc = bankAccounts.find(a => String(a.id) === String(id));
    if (!acc) return;
    const accName = acc.name;

    const old = document.getElementById('bankDeleteModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'bankDeleteModal';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.55);
      display:flex; align-items:center; justify-content:center; z-index:10000;`;
    modal.innerHTML = `
      <div style="background:var(--card-bg,#fff); border-radius:16px; padding:28px; width:380px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.3); text-align:center;">
        <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444; font-size:40px; margin-bottom:16px;"></i>
        <h3 style="margin:0 0 12px; font-size:18px; font-weight:700;">Delete Account?</h3>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:24px;">
          Are you sure you want to delete <strong>${accName}</strong>? This action cannot be undone.
        </p>
        <div style="display:flex; gap:10px;">
          <button id="delAccConfirm" class="btn" style="flex:1; background:#ef4444; color:#fff; border:none; font-weight:600;">Yes, Delete</button>
          <button id="delAccCancel" class="btn btn-outline" style="flex:1;">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('delAccCancel').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('delAccConfirm').onclick = () => {
      bankAccounts = bankAccounts.filter(a => String(a.id) !== String(id));
      saveBankAccounts();
      renderBankAccounts();
      modal.remove();
      _toast(`"${accName}" deleted successfully.`, 'success');
    };
  }

  function bankEdit(id) {
    const acc = bankAccounts.find(a => String(a.id) === String(id));
    if (!acc) return;

    const old = document.getElementById('bankEditModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'bankEditModal';
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.55);
      display:flex; align-items:center; justify-content:center; z-index:10000;`;
    modal.innerHTML = `
      <div style="background:var(--card-bg,#fff); border-radius:16px; padding:28px; width:380px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="margin:0 0 20px; font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-pen-to-square" style="color:var(--primary);"></i> Edit Bank Account
        </h3>
        <div class="form-group mb-4">
          <label style="font-size:13px; font-weight:600;">Bank Name <span style="color:#ef4444;">*</span></label>
          <input id="editAccName" class="form-control" value="${acc.name}" style="margin-top:6px;" />
        </div>
        <div class="form-group mb-4">
          <label style="font-size:13px; font-weight:600;">Balance (₹)</label>
          <input id="editAccBal" class="form-control" type="number" value="${acc.balance}" min="0" step="0.01" style="margin-top:6px;" />
        </div>
        <div style="display:flex; gap:10px; margin-top:4px;">
          <button id="editAccConfirm" class="btn btn-primary" style="flex:1;">
            <i class="fa-solid fa-check"></i> Save Changes
          </button>
          <button id="editAccCancel" class="btn btn-outline">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const nameInput = document.getElementById('editAccName');
    nameInput.focus();

    document.getElementById('editAccCancel').onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('editAccConfirm').onclick = () => {
      const newName = nameInput.value.trim();
      if (!newName) { _toast('Bank name cannot be empty.', 'error'); nameInput.focus(); return; }
      acc.name = newName;
      acc.balance = parseFloat(document.getElementById('editAccBal').value) || 0;
      saveBankAccounts();
      renderBankAccounts();
      modal.remove();
      _toast(`"${newName}" updated successfully!`, 'success');
    };

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('editAccConfirm').click();
    });
  }

  // ── Render ──
  function renderBankAccounts() {
    if (!bankingGrid) return;
    bankingGrid.innerHTML = '';

    // Sync Income Bank dropdown
    if (incomeBankSelect) {
      incomeBankSelect.innerHTML = '<option value="" disabled selected>Select Bank Account</option>';
    }

    if (bankAccounts.length === 0) {
      bankingGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">
          <i class="fa-solid fa-building-columns" style="font-size:32px; margin-bottom:12px; display:block; opacity:0.3;"></i>
          No accounts found. Click "Add Account" to add one.
        </div>`;
      return;
    }

    bankAccounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = `banking-card ${acc.isPrimary ? 'bank-primary' : ''}`;
      card.innerHTML = `
        <div class="bank-top">
          <div class="bank-logo">${acc.name}</div>
          ${acc.isPrimary ? '<span class="bank-status">Primary</span>' : ''}
        </div>
        <div class="bank-mid">
          <p class="b-label">Available Balance</p>
          <h2 class="b-amount">₹${acc.balance.toLocaleString('en-IN')}</h2>
        </div>
        <div class="bank-bottom">
          <p class="b-acct">${acc.accountNo}</p>
          <div class="bank-actions">
            <button class="btn-icon-circular text-success" data-action="receive" data-id="${acc.id}" title="Receive Money" style="position:relative; z-index:10; pointer-events:auto;">
              <i class="fa-solid fa-arrow-down" style="pointer-events:none;"></i>
            </button>
            <button class="btn-icon-circular text-danger" data-action="send" data-id="${acc.id}" title="Send Money" style="position:relative; z-index:10; pointer-events:auto;">
              <i class="fa-solid fa-arrow-up" style="pointer-events:none;"></i>
            </button>
            <button class="btn-icon-circular" data-action="edit" data-id="${acc.id}" title="Edit Account"
              style="background:#e0e7ff; color:#4f46e5; border:none; cursor:pointer; position:relative; z-index:10; pointer-events:auto; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%;">
              <i class="fa-solid fa-pen-to-square" style="pointer-events:none;"></i>
            </button>
            <button class="btn-icon-circular" data-action="delete" data-id="${acc.id}" title="Delete Account"
              style="background:#fee2e2; color:#dc2626; border:none; cursor:pointer; position:relative; z-index:10; pointer-events:auto; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%;">
              <i class="fa-solid fa-trash" style="pointer-events:none;"></i>
            </button>
          </div>
        </div>`;
      bankingGrid.appendChild(card);

      // Sync income dropdown
      if (incomeBankSelect) {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = `${acc.name}  (${acc.accountNo})`;
        incomeBankSelect.appendChild(opt);
      }
    });
  }

  // Event Delegation for Bank Account Actions
  if (bankingGrid) {
    bankingGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'delete') {
        bankDelete(id);
      } else if (action === 'edit') {
        bankEdit(id);
      } else if (action === 'receive') {
        _toast('Ready to receive payments into this account.', 'success');
      } else if (action === 'send') {
        _toast('Payment gateway initialized for this account.', 'info');
      }
    });
  }

  // ── Add Account Modal ──
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
      const old = document.getElementById('addAccountModal');
      if (old) old.remove();

      const modal = document.createElement('div');
      modal.id = 'addAccountModal';
      modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.55);
        display:flex; align-items:center; justify-content:center; z-index:10000;`;
      modal.innerHTML = `
        <div style="background:var(--card-bg,#fff); border-radius:16px; padding:28px;
                    width:380px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <h3 style="margin:0 0 20px; font-size:16px; font-weight:700;
                     display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-wallet" style="color:var(--primary);"></i>
            Add New Account
          </h3>
          <div class="form-group mb-4">
            <label style="font-size:13px; font-weight:600;">Account Type</label>
            <select id="newAccType" class="form-control" style="margin-top:6px;">
              <option value="bank" selected>Bank Account</option>
              <option value="cash">Cash Account</option>
            </select>
          </div>
          <div class="form-group mb-4">
            <label id="newAccNameLabel" style="font-size:13px; font-weight:600;">
              Bank Name <span style="color:#ef4444;">*</span>
            </label>
            <input id="newAccName" class="form-control" placeholder="e.g. HDFC Bank"
                   style="margin-top:6px;" />
          </div>
          <div class="form-group mb-4">
            <label style="font-size:13px; font-weight:600;">Initial Balance (₹)</label>
            <input id="newAccBal" class="form-control" type="number"
                   placeholder="0.00" min="0" step="0.01" style="margin-top:6px;" />
          </div>
          <div style="display:flex; gap:10px; margin-top:4px;">
            <button id="addAccConfirm" class="btn btn-primary" style="flex:1;">
              <i class="fa-solid fa-plus"></i> Add Account
            </button>
            <button id="addAccCancel" class="btn btn-outline">Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const nameInput = document.getElementById('newAccName');
      const typeSelect = document.getElementById('newAccType');
      const nameLabel = document.getElementById('newAccNameLabel');

      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'cash') {
          nameLabel.innerHTML = 'Cash Account Name <span style="color:#ef4444;">*</span>';
          nameInput.placeholder = 'e.g. Main Cash Box';
        } else {
          nameLabel.innerHTML = 'Bank Name <span style="color:#ef4444;">*</span>';
          nameInput.placeholder = 'e.g. HDFC Bank';
        }
      });

      nameInput.focus();

      document.getElementById('addAccCancel').onclick = () => modal.remove();
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

      document.getElementById('addAccConfirm').onclick = () => {
        const name = nameInput.value.trim();
        if (!name) { _toast('Please enter an account name.', 'error'); nameInput.focus(); return; }
        const bal = parseFloat(document.getElementById('newAccBal').value) || 0;
        const type = typeSelect ? typeSelect.value : 'bank';
        const newAcc = {
          id:        'ba_' + Date.now(),
          name,
          balance:   bal,
          accountNo: type === 'cash' ? 'CASH ACCOUNT' : `**** **** ${Math.floor(1000 + Math.random() * 9000)}`,
          isPrimary: bankAccounts.length === 0,
          accountType: type
        };
        bankAccounts.push(newAcc);
        saveBankAccounts();
        renderBankAccounts();
        modal.remove();
        _toast(`"${name}" added successfully!`, 'success');
      };

      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('addAccConfirm').click();
      });
    });
  }

  // Initial render
  renderBankAccounts();

  /* ============================================================
     6. TOAST NOTIFICATION HELPER
     ============================================================ */
  let toastTimeout;
  function showToast(msg, type = 'success') {
    let toast = document.getElementById('bizToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bizToast';
      document.body.appendChild(toast);
    }
    
    // Map types to icons
    const icons = {
      success: '<i class="fa-solid fa-circle-check"></i>',
      error: '<i class="fa-solid fa-circle-exclamation"></i>',
      info: '<i class="fa-solid fa-circle-info"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation"></i>'
    };

    toast.innerHTML = `${icons[type] || ''} <span>${msg}</span>`;
    toast.className = `biz-toast active ${type}`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('active'), 3500);
  }

  /* ============================================================
     7. INCOME FORM — CASCADING + INVOICE BUILDER
     ============================================================ */
  const incomeTypeSelect          = document.getElementById('incomeTypeSelect');
  const incomeModeContainer       = document.getElementById('incomeModeContainer');
  const incomeModeSelect          = document.getElementById('incomeModeSelect');
  const incomeBankContainer       = document.getElementById('incomeBankContainer');
  const incomeCashContainer       = document.getElementById('incomeCashContainer');
  const incomeReceivableContainer = document.getElementById('incomeReceivableContainer');
  const incomeReceivableSelect    = document.getElementById('incomeReceivableSelect');
  const addReceiverForm           = document.getElementById('addReceiverForm');
  const saveReceiverBtn           = document.getElementById('saveReceiverBtn');
  const cancelReceiverBtn         = document.getElementById('cancelReceiverBtn');
  const receiverNameInput         = document.getElementById('receiverName');
  const receiverMobileInput       = document.getElementById('receiverMobile');
  const receiverAddressInput      = document.getElementById('receiverAddress');

  // Step 3: Description + Price
  const incomeDetailsContainer    = document.getElementById('incomeDetailsContainer');
  const incomeDescription         = document.getElementById('incomeDescription');
  const incomePrice               = document.getElementById('incomePrice');

  // Step 4: Action buttons
  const incomeActionBtns          = document.getElementById('incomeActionBtns');
  const saveOnlyIncomeBtn         = document.getElementById('saveOnlyIncomeBtn');
  const saveAndInvoiceBtn         = document.getElementById('saveAndInvoiceBtn');

  // Invoice builder
  const incomeInvoiceBuilder      = document.getElementById('incomeInvoiceBuilder');
  const invDate                   = document.getElementById('invDate');
  const invNo                     = document.getElementById('invNo');
  const invItemName               = document.getElementById('invItemName');
  const invItemQty                = document.getElementById('invItemQty');
  const invItemPrice              = document.getElementById('invItemPrice');
  const invItemGst                = document.getElementById('invItemGst');
  const invAddItemBtn             = document.getElementById('invAddItemBtn');
  const invItemsTbody             = document.getElementById('invItemsTbody');
  const invItemsTableWrap         = document.getElementById('invItemsTableWrap');
  const invEmptyMsg               = document.getElementById('invEmptyMsg');
  const invSubtotal               = document.getElementById('invSubtotal');
  const invTaxTotal               = document.getElementById('invTaxTotal');
  const invGrandTotal             = document.getElementById('invGrandTotal');
  const invTotalsBox              = document.getElementById('invTotalsBox');
  const invGenerateBtn            = document.getElementById('invGenerateBtn');
  const invSaveOnlyBtn            = document.getElementById('invSaveOnlyBtn');
  const invCancelBtn              = document.getElementById('invCancelBtn');

  let invItems = [];   // invoice line items

  /* ─────────────────── RECEIVER HELPERS ─────────────────── */
  function getReceivers() {
    return JSON.parse(localStorage.getItem('bizcore_receivers') || '[]');
  }
  function saveReceivers(list) {
    localStorage.setItem('bizcore_receivers', JSON.stringify(list));
  }
  function renderReceiverDropdown(autoSelectId = null) {
    if (!incomeReceivableSelect) return;
    incomeReceivableSelect.innerHTML =
      '<option value="" disabled selected>Select Receiver</option>' +
      '<option value="new">+ Add New Receiver</option>';
    const receivers = getReceivers();
    if (receivers.length > 0) {
      const grp = document.createElement('optgroup');
      grp.label = 'Saved Receivers';
      receivers.forEach(rec => {
        const opt = document.createElement('option');
        opt.value = rec.id;
        opt.textContent = rec.name + (rec.mobile ? '  |  ' + rec.mobile : '');
        grp.appendChild(opt);
      });
      incomeReceivableSelect.appendChild(grp);
    }
    if (autoSelectId !== null) incomeReceivableSelect.value = autoSelectId;
  }
  renderReceiverDropdown();

  /* ─────────────────── HIDE / SHOW HELPERS ─────────────────── */
  function hideAllModeContainers() {
    if (incomeBankContainer)        incomeBankContainer.style.display       = 'none';
    if (incomeCashContainer)        incomeCashContainer.style.display       = 'none';
    if (incomeReceivableContainer)  incomeReceivableContainer.style.display = 'none';
    if (addReceiverForm)            addReceiverForm.style.display           = 'none';
  }

  function showDetailsAndButtons() {
    if (incomeDetailsContainer) incomeDetailsContainer.style.display = 'block';
    if (incomeActionBtns) {
      incomeActionBtns.style.display     = 'flex';
      incomeActionBtns.style.gap         = '12px';
      incomeActionBtns.style.flexWrap    = 'wrap';
      incomeActionBtns.style.marginTop   = '8px';
    }
  }

  function hideDetailsAndButtons() {
    if (incomeDetailsContainer) incomeDetailsContainer.style.display = 'none';
    if (incomeActionBtns)       incomeActionBtns.style.display       = 'none';
    if (incomeInvoiceBuilder)   incomeInvoiceBuilder.style.display   = 'none';
  }

  function resetFullIncomeForm() {
    if (incomeTypeSelect)    incomeTypeSelect.value    = '';
    if (incomeModeSelect)    incomeModeSelect.value    = '';
    if (incomeDescription)   incomeDescription.value   = '';
    if (incomePrice)         incomePrice.value         = '';
    if (incomeModeContainer) incomeModeContainer.style.display = 'none';
    hideAllModeContainers();
    hideDetailsAndButtons();
    invItems = [];
    renderInvItems();
  }

  /* ─────────────────── RECEIVER EVENTS ─────────────────── */
  if (incomeReceivableSelect) {
    incomeReceivableSelect.addEventListener('change', () => {
      if (incomeReceivableSelect.value === 'new') {
        if (addReceiverForm) addReceiverForm.style.display = 'block';
        if (receiverNameInput) receiverNameInput.focus();
        incomeReceivableSelect.value = '';
      } else {
        if (addReceiverForm) addReceiverForm.style.display = 'none';
      }
    });
  }

  if (saveReceiverBtn) {
    saveReceiverBtn.addEventListener('click', () => {
      const name    = receiverNameInput    ? receiverNameInput.value.trim()    : '';
      const mobile  = receiverMobileInput  ? receiverMobileInput.value.trim()  : '';
      const address = receiverAddressInput ? receiverAddressInput.value.trim() : '';
      if (!name) {
        showToast('Receiver Name is required (*)', 'error');
        if (receiverNameInput) receiverNameInput.focus();
        return;
      }
      const newRec = { id: 'rec_' + Date.now(), name, mobile, address };
      const list = getReceivers();
      list.push(newRec);
      saveReceivers(list);
      renderReceiverDropdown(newRec.id);
      if (addReceiverForm) addReceiverForm.style.display = 'none';
      showToast('Receiver "' + name + '" saved & selected!', 'success');
    });
  }

  if (cancelReceiverBtn) {
    cancelReceiverBtn.addEventListener('click', () => {
      if (addReceiverForm) addReceiverForm.style.display = 'none';
      if (incomeReceivableSelect) incomeReceivableSelect.value = '';
    });
  }

  /* ─────────────────── INCOME TYPE → MODE ─────────────────── */
  if (incomeTypeSelect) {
    incomeTypeSelect.addEventListener('change', () => {
      if (incomeTypeSelect.value) {
        if (incomeModeContainer) incomeModeContainer.style.display = 'block';
      } else {
        if (incomeModeContainer) incomeModeContainer.style.display = 'none';
        if (incomeModeSelect)    incomeModeSelect.value = '';
        hideAllModeContainers();
        hideDetailsAndButtons();
      }
    });
  }

  /* ─────────────────── PAYMENT MODE → SUB-CONTAINER ─────────────────── */
  if (incomeModeSelect) {
    incomeModeSelect.addEventListener('change', () => {
      hideAllModeContainers();
      hideDetailsAndButtons();

      const mode = incomeModeSelect.value;
      if (mode === 'bank' && incomeBankContainer) {
        incomeBankContainer.style.display = 'block';
        showDetailsAndButtons();
      } else if (mode === 'cash' && incomeCashContainer) {
        incomeCashContainer.style.display = 'block';
        showDetailsAndButtons();
      } else if (mode === 'receivable' && incomeReceivableContainer) {
        incomeReceivableContainer.style.display = 'block';
        // Show details only when receiver is selected
        if (incomeReceivableSelect) {
          incomeReceivableSelect.addEventListener('change', function onRecSel() {
            if (incomeReceivableSelect.value && incomeReceivableSelect.value !== 'new') {
              showDetailsAndButtons();
            }
            // run once then keep watching
          });
        }
      }
    });
  }

  /* ─────────────────── SAVE ONLY ─────────────────── */
  function validateIncomeForm() {
    const mode = incomeModeSelect ? incomeModeSelect.value : '';
    if (!mode) { showToast('Please select a payment mode.', 'warning'); return false; }
    if (mode === 'receivable') {
      const v = incomeReceivableSelect ? incomeReceivableSelect.value : '';
      if (!v || v === 'new') { showToast('Please select or add a receiver.', 'warning'); return false; }
    }
    const price = parseFloat(incomePrice ? incomePrice.value : '');
    if (!price || price <= 0) { showToast('Please enter a valid Amount / Price.', 'error'); if (incomePrice) incomePrice.focus(); return false; }
    return true;
  }

  function processIncome(amount) {
    if (!amount || amount <= 0) return;
    
    // Update Dashboard Total Income
    const dashIncome = document.getElementById('dashTotalIncome');
    if (dashIncome) {
      let currentTotal = parseFloat(dashIncome.dataset.value || '0') + amount;
      dashIncome.dataset.value = currentTotal;
      dashIncome.textContent = '₹' + currentTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    // Update specific Bank Account if selected
    const mode = incomeModeSelect ? incomeModeSelect.value : '';
    const bankId = incomeBankSelect ? incomeBankSelect.value : '';
    
    if (mode === 'bank' && bankId) {
      let bAcc = bankAccounts.find(a => String(a.id) === String(bankId));
      if (bAcc) {
        bAcc.balance += amount;
        if (typeof saveBankAccounts === 'function') saveBankAccounts();
        if (typeof renderBankAccounts === 'function') renderBankAccounts();
      }
    } else if (mode === 'cash') {
      // Future hook: If Cash accounts exist specifically, track here.
    }

    // Record Transaction
    let desc = document.getElementById('incomeDescription') ? document.getElementById('incomeDescription').value : '';
    if (!desc) {
      desc = mode === 'bank' ? 'Bank Transfer' : (mode === 'cash' ? 'Cash Payment' : 'Recorded Income');
    }

    const tDate = new Date().toISOString().split('T')[0];
    const tId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const newTxn = {
      id: tId,
      date: tDate,
      description: desc,
      category: 'Sales',
      amount: amount,
      type: 'Income',
      status: 'Completed'
    };

    transactions.push(newTxn);
    if (typeof saveTransactions === 'function') saveTransactions();
    if (typeof renderTransactions === 'function') renderTransactions();
  }

  if (saveOnlyIncomeBtn) {
    saveOnlyIncomeBtn.addEventListener('click', () => {
      if (!validateIncomeForm()) return;
      
      const amt = parseFloat(incomePrice ? incomePrice.value : '0');
      processIncome(amt);
      
      showToast('Income recorded successfully!', 'success');
      resetFullIncomeForm();
    });
  }

  /* ─────────────────── SAVE & GENERATE INVOICE ─────────────────── */
  if (saveAndInvoiceBtn) {
    saveAndInvoiceBtn.addEventListener('click', () => {
      if (!validateIncomeForm()) return;

      // Show invoice builder
      if (incomeInvoiceBuilder) {
        incomeInvoiceBuilder.style.display = 'block';
        incomeInvoiceBuilder.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Set today's date
      if (invDate) {
        invDate.value = new Date().toISOString().split('T')[0];
      }

      // Auto invoice number
      if (invNo) {
        const seq = (parseInt(localStorage.getItem('bizcore_inv_seq') || '0') + 1);
        localStorage.setItem('bizcore_inv_seq', seq);
        invNo.value = 'INV-' + String(seq).padStart(4, '0');
      }

      invItems = [];
      renderInvItems();
    });
  }

  /* ─────────────────── INVOICE BUILDER — ADD ITEM ─────────────────── */
  function formatINR(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function recalcInvTotals() {
    const subtotal = invItems.reduce((s, i) => s + i.baseTotal, 0);
    const taxAmt   = invItems.reduce((s, i) => s + i.taxAmt, 0);
    const grand    = subtotal + taxAmt;
    if (invSubtotal)   invSubtotal.textContent   = formatINR(subtotal);
    if (invTaxTotal)   invTaxTotal.textContent   = formatINR(taxAmt);
    if (invGrandTotal) invGrandTotal.textContent = formatINR(grand);
  }

  function renderInvItems() {
    if (!invItemsTbody) return;
    invItemsTbody.innerHTML = '';

    if (invItems.length === 0) {
      if (invItemsTableWrap) invItemsTableWrap.style.display = 'none';
      if (invEmptyMsg)       invEmptyMsg.style.display       = 'block';
      if (invTotalsBox)      invTotalsBox.style.display      = 'none';
    } else {
      if (invItemsTableWrap) invItemsTableWrap.style.display = 'block';
      if (invEmptyMsg)       invEmptyMsg.style.display       = 'none';
      if (invTotalsBox)      invTotalsBox.style.display      = 'block';

      invItems.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td style="text-align:center;">${item.qty}</td>
          <td style="text-align:right;">${formatINR(item.unitPrice)}</td>
          <td style="text-align:center;">${item.gst}%</td>
          <td style="text-align:right;">${formatINR(item.taxAmt)}</td>
          <td style="text-align:right; font-weight:600;">${formatINR(item.baseTotal + item.taxAmt)}</td>
          <td style="text-align:center;">
            <button class="btn-icon-circular text-danger inv-del-btn" data-idx="${idx}" title="Delete item" style="background:#fee2e2; border:none; cursor:pointer; border-radius:50%; width:30px; height:30px;">
              <i class="fa-solid fa-trash" style="font-size:12px;"></i>
            </button>
          </td>`;
        invItemsTbody.appendChild(tr);
      });

      // Attach delete listeners
      invItemsTbody.querySelectorAll('.inv-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.idx);
          invItems.splice(i, 1);
          renderInvItems();
          recalcInvTotals();
          showToast('Item removed.', 'info');
        });
      });
    }
    recalcInvTotals();
  }

  if (invAddItemBtn) {
    invAddItemBtn.addEventListener('click', () => {
      const name  = invItemName  ? invItemName.value.trim()         : '';
      const qty   = invItemQty   ? parseFloat(invItemQty.value)     : 0;
      const price = invItemPrice ? parseFloat(invItemPrice.value)   : 0;
      const gst   = invItemGst   ? parseFloat(invItemGst.value)     : 0;

      if (!name)              { showToast('Enter an item name.',       'error'); if (invItemName)  invItemName.focus();  return; }
      if (!qty   || qty  <= 0){ showToast('Qty must be greater than 0.','error'); if (invItemQty)  invItemQty.focus();   return; }
      if (!price || price <= 0){ showToast('Enter a valid unit price.', 'error'); if (invItemPrice) invItemPrice.focus(); return; }

      const baseTotal = qty * price;
      const taxAmt    = baseTotal * (gst / 100);

      invItems.push({ name, qty, unitPrice: price, gst, baseTotal, taxAmt });

      // Clear inputs, reset qty to 1
      if (invItemName)  invItemName.value  = '';
      if (invItemQty)   invItemQty.value   = '1';
      if (invItemPrice) invItemPrice.value = '';
      if (invItemGst)   invItemGst.value   = '18';
      if (invItemName)  invItemName.focus();

      renderInvItems();
      showToast('Item added!', 'success');
    });

    // Enter on price field triggers add
    if (invItemPrice) {
      invItemPrice.addEventListener('keydown', e => {
        if (e.key === 'Enter') invAddItemBtn.click();
      });
    }
  }

  /* ─────────────────── INVOICE BUILDER BUTTONS ─────────────────── */
  if (invGenerateBtn) {
    invGenerateBtn.addEventListener('click', () => {
      if (invItems.length === 0) { showToast('Add at least one item before generating.', 'error'); return; }

      const subtotal = invItems.reduce((s, i) => s + i.baseTotal, 0);
      const taxAmt   = invItems.reduce((s, i) => s + i.taxAmt, 0);
      const grand    = subtotal + taxAmt;
      const rows     = invItems.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td style="text-align:center;">${item.qty}</td>
          <td style="text-align:right;">₹${item.unitPrice.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          <td style="text-align:center;">${item.gst}%</td>
          <td style="text-align:right;">₹${item.taxAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          <td style="text-align:right; font-weight:700;">₹${(item.baseTotal + item.taxAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        </tr>`).join('');

      const dateVal = invDate ? invDate.value : new Date().toISOString().split('T')[0];
      const invNoVal = invNo  ? invNo.value   : 'INV-0001';
      const descVal  = incomeDescription ? incomeDescription.value : '';

      const win = window.open('', '_blank', 'width=860,height=1000');
      win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invNoVal}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; background:#fff; }
        .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #6366f1; padding-bottom:20px; }
        .brand { font-size:26px; font-weight:800; color:#6366f1; }
        .brand small { display:block; font-size:13px; font-weight:400; color:#888; }
        .inv-meta { text-align:right; font-size:13px; color:#555; line-height:1.8; }
        .inv-meta strong { color:#1a1a2e; }
        table { width:100%; border-collapse:collapse; margin:24px 0; font-size:13px; }
        th { background:#6366f1; color:#fff; padding:10px 14px; text-align:left; font-weight:600; }
        td { padding:10px 14px; border-bottom:1px solid #eee; }
        tr:nth-child(even) td { background:#f8f8ff; }
        .totals { width:280px; margin-left:auto; font-size:14px; }
        .totals div { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee; }
        .grand { font-size:18px; font-weight:800; color:#6366f1; border-top:2px solid #6366f1 !important; margin-top:4px; padding-top:8px !important; border-bottom:none !important; }
        .note { margin-top:40px; font-size:12px; color:#999; text-align:center; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="inv-header">
        <div>
          <div class="brand">BizCore <small>Business Management Suite</small></div>
          ${descVal ? `<p style="margin-top:8px;font-size:13px;color:#555;">${descVal}</p>` : ''}
        </div>
        <div class="inv-meta">
          <strong>INVOICE</strong><br>
          No: ${invNoVal}<br>
          Date: ${dateVal}<br>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Item / Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST%</th><th style="text-align:right">GST Amt</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div><span>Total GST</span><span>₹${taxAmt.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div class="grand"><span>Grand Total</span><span>₹${grand.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      </div>
      <p class="note">Thank you for your business! — Generated by BizCore</p>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
      win.document.close();

      showToast('Invoice generated!', 'success');
    });
  }

  /* Invoice Action Handlers */
  if (invGenerateBtn) {
    invGenerateBtn.addEventListener('click', () => {
      if (invItems.length === 0) {
        showToast('Please add at least one item to generate invoice.', 'warning');
        return;
      }

      const subtotal = invItems.reduce((sum, item) => sum + item.baseTotal, 0);
      const taxAmt   = invItems.reduce((sum, item) => sum + item.taxAmt, 0);
      const grand    = subtotal + taxAmt;

      // Persist the generated income amount to dashboard and accounts
      processIncome(grand);

      const rows     = invItems.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td style="text-align:center;">${item.qty}</td>
          <td style="text-align:right;">₹${item.unitPrice.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          <td style="text-align:center;">${item.gst}%</td>
          <td style="text-align:right;">₹${item.taxAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          <td style="text-align:right; font-weight:700;">₹${(item.baseTotal + item.taxAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        </tr>`).join('');

      const dateVal = invDate ? invDate.value : new Date().toISOString().split('T')[0];
      const invNoVal = invNo  ? invNo.value   : 'INV-0001';
      const descVal  = incomeDescription ? incomeDescription.value : '';

      const win = window.open('', '_blank', 'width=860,height=1000');
      win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invNoVal}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; background:#fff; }
        .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #6366f1; padding-bottom:20px; }
        .brand { font-size:26px; font-weight:800; color:#6366f1; }
        .brand small { display:block; font-size:13px; font-weight:400; color:#888; }
        .inv-meta { text-align:right; font-size:13px; color:#555; line-height:1.8; }
        .inv-meta strong { color:#1a1a2e; }
        table { width:100%; border-collapse:collapse; margin:24px 0; font-size:13px; }
        th { background:#6366f1; color:#fff; padding:10px 14px; text-align:left; font-weight:600; }
        td { padding:10px 14px; border-bottom:1px solid #eee; }
        tr:nth-child(even) td { background:#f8f8ff; }
        .totals { width:280px; margin-left:auto; font-size:14px; }
        .totals div { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee; }
        .grand { font-size:18px; font-weight:800; color:#6366f1; border-top:2px solid #6366f1 !important; margin-top:4px; padding-top:8px !important; border-bottom:none !important; }
        .note { margin-top:40px; font-size:12px; color:#999; text-align:center; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="inv-header">
        <div>
          <div class="brand">BizCore <small>Business Management Suite</small></div>
          ${descVal ? `<p style="margin-top:8px;font-size:13px;color:#555;">${descVal}</p>` : ''}
        </div>
        <div class="inv-meta">
          <strong>INVOICE</strong><br>
          No: ${invNoVal}<br>
          Date: ${dateVal}<br>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Item / Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST%</th><th style="text-align:right">GST Amt</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div><span>Total GST</span><span>₹${taxAmt.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div class="grand"><span>Grand Total</span><span>₹${grand.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      </div>
      <p class="note">Thank you for your business! — Generated by BizCore</p>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
      win.document.close();

      showToast('Invoice generated & Income Recorded!', 'success');
      resetFullIncomeForm();
    });
  }

  if (invSaveOnlyBtn) {
    invSaveOnlyBtn.addEventListener('click', () => {
      let amt = 0;
      if (invItems.length > 0) {
        const subtotal = invItems.reduce((sum, item) => sum + item.baseTotal, 0);
        const taxAmt   = invItems.reduce((sum, item) => sum + item.taxAmt, 0);
        amt = subtotal + taxAmt;
      } else {
        amt = parseFloat(incomePrice ? incomePrice.value : 0);
      }
      
      processIncome(amt);
      
      showToast('Income recorded successfully!', 'success');
      resetFullIncomeForm();
    });
  }

  if (invCancelBtn) {
    invCancelBtn.addEventListener('click', () => {
      if (incomeInvoiceBuilder) incomeInvoiceBuilder.style.display = 'none';
      invItems = [];
      renderInvItems();
    });
  }

  /* ============================================================
     8. EXPENSE FORM — CASCADING
     ============================================================ */
  const expenseTypeSelect          = document.getElementById('expenseTypeSelect');
  const expenseModeContainer       = document.getElementById('expenseModeContainer');
  const expenseModeSelect          = document.getElementById('expenseModeSelect');
  const expenseBankContainer       = document.getElementById('expenseBankContainer');
  const expenseCashContainer       = document.getElementById('expenseCashContainer');
  const expensePayableContainer    = document.getElementById('expensePayableContainer');
  const expenseBankSelect          = document.getElementById('expenseBankSelect');
  const expenseCashSelect          = document.getElementById('expenseCashSelect');
  const expensePayableSelect       = document.getElementById('expensePayableSelect');
  const addPayableForm             = document.getElementById('addPayableForm');
  const savePayableBtn             = document.getElementById('savePayableBtn');
  const cancelPayableBtn           = document.getElementById('cancelPayableBtn');
  const payableNameInput           = document.getElementById('payableName');
  const payableMobileInput         = document.getElementById('payableMobile');
  const payableAddressInput        = document.getElementById('payableAddress');
  const expenseDetailsContainer    = document.getElementById('expenseDetailsContainer');
  const expenseDescription         = document.getElementById('expenseDescription');
  const expensePrice               = document.getElementById('expensePrice');
  const expenseActionBtns          = document.getElementById('expenseActionBtns');
  const saveExpenseBtn             = document.getElementById('saveExpenseBtn');

  // Helpers
  function getPayables() {
    return JSON.parse(localStorage.getItem('bizcore_payables') || '[]');
  }
  function savePayables(list) {
    localStorage.setItem('bizcore_payables', JSON.stringify(list));
  }
  function renderPayableDropdown(autoSelectId = null) {
    if (!expensePayableSelect) return;
    expensePayableSelect.innerHTML =
      '<option value="" disabled selected>Select Payable</option>' +
      '<option value="new">+ Add New Payable</option>';
    const payables = getPayables();
    if (payables.length > 0) {
      const grp = document.createElement('optgroup');
      grp.label = 'Saved Payables';
      // Give 5 payables from list as requested
      payables.slice(0, 5).forEach(pay => {
        const opt = document.createElement('option');
        opt.value = pay.id;
        opt.textContent = pay.name + (pay.mobile ? '  |  ' + pay.mobile : '');
        grp.appendChild(opt);
      });
      expensePayableSelect.appendChild(grp);
    }
    if (autoSelectId !== null) expensePayableSelect.value = autoSelectId;
  }
  renderPayableDropdown();

  // Populate banks and cash
  function renderExpenseBankAndCash() {
    if (expenseBankSelect) {
      expenseBankSelect.innerHTML = '<option value="" disabled selected>Select Bank Account</option>';
      const banks = bankAccounts.filter(a => a.accountType === 'bank' || !a.accountType);
      banks.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.accountNo})`;
        expenseBankSelect.appendChild(opt);
      });
    }
    if (expenseCashSelect) {
      expenseCashSelect.innerHTML = '<option value="" disabled selected>Select Cash Account</option>';
      const cash = bankAccounts.filter(a => a.accountType === 'cash');
      cash.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = acc.name;
        expenseCashSelect.appendChild(opt);
      });
    }
  }
  
  // Tie to renderBankAccounts to keep sync
  const originalRenderBankAccounts = renderBankAccounts;
  renderBankAccounts = function() {
    originalRenderBankAccounts();
    renderExpenseBankAndCash();
  };
  renderExpenseBankAndCash(); // Initial

  function hideAllExpenseModeContainers() {
    if (expenseBankContainer) expenseBankContainer.style.display = 'none';
    if (expenseCashContainer) expenseCashContainer.style.display = 'none';
    if (expensePayableContainer) expensePayableContainer.style.display = 'none';
    if (addPayableForm) addPayableForm.style.display = 'none';
  }

  function showExpenseDetails() {
    if (expenseDetailsContainer) expenseDetailsContainer.style.display = 'block';
    if (expenseActionBtns) {
      expenseActionBtns.style.display = 'flex';
      expenseActionBtns.style.gap = '12px';
      expenseActionBtns.style.flexWrap = 'wrap';
      expenseActionBtns.style.marginTop = '8px';
    }
  }

  function hideExpenseDetails() {
    if (expenseDetailsContainer) expenseDetailsContainer.style.display = 'none';
    if (expenseActionBtns) expenseActionBtns.style.display = 'none';
  }

  // Events
  if (expenseTypeSelect) {
    expenseTypeSelect.addEventListener('change', () => {
      if (expenseTypeSelect.value) {
        if (expenseModeContainer) expenseModeContainer.style.display = 'block';
      } else {
        if (expenseModeContainer) expenseModeContainer.style.display = 'none';
        if (expenseModeSelect) expenseModeSelect.value = '';
        hideAllExpenseModeContainers();
        hideExpenseDetails();
      }
    });
  }

  if (expenseModeSelect) {
    expenseModeSelect.addEventListener('change', () => {
      hideAllExpenseModeContainers();
      hideExpenseDetails();

      const mode = expenseModeSelect.value;
      if (mode === 'bank' && expenseBankContainer) {
        expenseBankContainer.style.display = 'block';
        showExpenseDetails();
      } else if (mode === 'cash' && expenseCashContainer) {
        expenseCashContainer.style.display = 'block';
        showExpenseDetails();
      } else if (mode === 'payable' && expensePayableContainer) {
        expensePayableContainer.style.display = 'block';
        if (expensePayableSelect) {
          expensePayableSelect.addEventListener('change', function onPaySel() {
            if (expensePayableSelect.value && expensePayableSelect.value !== 'new') {
              showExpenseDetails();
            }
          });
        }
      }
    });
  }

  if (expensePayableSelect) {
    expensePayableSelect.addEventListener('change', () => {
      if (expensePayableSelect.value === 'new') {
        if (addPayableForm) addPayableForm.style.display = 'block';
        if (payableNameInput) payableNameInput.focus();
        expensePayableSelect.value = '';
        hideExpenseDetails();
      } else {
        if (addPayableForm) addPayableForm.style.display = 'none';
      }
    });
  }

  if (savePayableBtn) {
    savePayableBtn.addEventListener('click', () => {
      const name = payableNameInput ? payableNameInput.value.trim() : '';
      const mobile = payableMobileInput ? payableMobileInput.value.trim() : '';
      const address = payableAddressInput ? payableAddressInput.value.trim() : '';
      if (!name) {
        showToast('Payable Name is required (*)', 'error');
        if (payableNameInput) payableNameInput.focus();
        return;
      }
      const newPay = { id: 'pay_' + Date.now(), name, mobile, address };
      const list = getPayables();
      list.unshift(newPay); // Add to top since limit 5
      savePayables(list);
      renderPayableDropdown(newPay.id);
      if (addPayableForm) addPayableForm.style.display = 'none';
      showExpenseDetails();
      showToast('Payable "' + name + '" saved & selected!', 'success');
    });
  }

  if (cancelPayableBtn) {
    cancelPayableBtn.addEventListener('click', () => {
      if (addPayableForm) addPayableForm.style.display = 'none';
      if (expensePayableSelect) expensePayableSelect.value = '';
    });
  }

  function validateExpenseForm() {
    const mode = expenseModeSelect ? expenseModeSelect.value : '';
    if (!mode) { showToast('Please select a payment mode.', 'warning'); return false; }
    if (mode === 'payable') {
      const v = expensePayableSelect ? expensePayableSelect.value : '';
      if (!v || v === 'new') { showToast('Please select or add a payable.', 'warning'); return false; }
    }
    const price = parseFloat(expensePrice ? expensePrice.value : '');
    if (!price || price <= 0) { showToast('Please enter a valid Amount / Price.', 'error'); if (expensePrice) expensePrice.focus(); return false; }
    return true;
  }

  function resetFullExpenseForm() {
    if (expenseTypeSelect)  expenseTypeSelect.value  = '';
    if (expenseModeSelect)  expenseModeSelect.value  = '';
    if (expenseDescription) expenseDescription.value = '';
    if (expensePrice)       expensePrice.value       = '';
    if (expenseModeContainer) expenseModeContainer.style.display = 'none';
    hideAllExpenseModeContainers();
    hideExpenseDetails();
  }

  if (saveExpenseBtn) {
    saveExpenseBtn.addEventListener('click', () => {
      if (!validateExpenseForm()) return;
      
      const amount = parseFloat(expensePrice ? expensePrice.value : '0');
      if (!amount || amount <= 0) return;
      
      const mode = expenseModeSelect.value;
      const bankId = expenseBankSelect.value;
      const cashId = expenseCashSelect.value;

      if (mode === 'bank' && bankId) {
        let bAcc = bankAccounts.find(a => String(a.id) === String(bankId));
        if (bAcc) {
          bAcc.balance -= amount;
          if (typeof saveBankAccounts === 'function') saveBankAccounts();
          if (typeof renderBankAccounts === 'function') renderBankAccounts();
        }
      } else if (mode === 'cash' && cashId) {
        let cAcc = bankAccounts.find(a => String(a.id) === String(cashId));
        if (cAcc) {
          cAcc.balance -= amount;
          if (typeof saveBankAccounts === 'function') saveBankAccounts();
          if (typeof renderBankAccounts === 'function') renderBankAccounts();
        }
      }

      // Update Dashboard Total Expense
      const dashExpense = document.getElementById('dashTotalExpense');
      if (dashExpense) {
        let currentTotal = parseFloat(dashExpense.dataset.value || '0') + amount;
        dashExpense.dataset.value = currentTotal;
        dashExpense.textContent = '₹' + currentTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      }

      let desc = document.getElementById('expenseDescription') ? document.getElementById('expenseDescription').value : '';
      if (!desc) {
        desc = document.getElementById('expenseTypeSelect') ? document.getElementById('expenseTypeSelect').options[document.getElementById('expenseTypeSelect').selectedIndex].text : 'Recorded Expense';
      }

      const tDate = new Date().toISOString().split('T')[0];
      const tId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

      const newTxn = {
        id: tId,
        date: tDate,
        description: desc,
        category: 'Expenses',
        amount: amount,
        type: 'Expense',
        status: 'Completed'
      };

      transactions.push(newTxn);
      if (typeof saveTransactions === 'function') saveTransactions();
      if (typeof renderTransactions === 'function') renderTransactions();
      
      showToast('Expense recorded successfully!', 'success');
      resetFullExpenseForm();
    });
  }

});
