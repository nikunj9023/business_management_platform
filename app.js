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
  const invoiceItemGst   = document.getElementById('invoiceItemGst');
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
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.baseTotal || item.total || 0), 0);
    const tax      = invoiceItems.reduce((sum, item) => sum + (item.taxAmt || 0), 0);
    const total    = subtotal + tax;

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
        const gstValue = item.gst !== undefined ? item.gst : 18;
        const dispTotal = (item.baseTotal || item.total || 0) + (item.taxAmt || 0);

        const row = document.createElement('div');
        row.className = 'added-item';
        row.innerHTML = `
          <div class="i-info">
            <span class="i-name">${item.name}</span>
            <span class="i-meta">${gstValue}% GST</span>
          </div>
          <span class="i-qty">${item.qty}</span>
          <span class="i-price">${formatCurrency(item.price)}</span>
          <span class="i-total">${formatCurrency(dispTotal)}</span>
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

  const customGstInput   = document.getElementById('customGstInput');

  if (invoiceItemGst && customGstInput) {
    invoiceItemGst.addEventListener('change', () => {
      if (invoiceItemGst.value === 'custom') {
        customGstInput.style.display = 'block';
        customGstInput.focus();
      } else {
        customGstInput.style.display = 'none';
      }
    });
  }

  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      const name  = invoiceItemName ? invoiceItemName.value.trim() : '';
      const qty   = invoiceItemQty  ? parseFloat(invoiceItemQty.value)  : 0;
      const price = invoiceItemPrice ? parseFloat(invoiceItemPrice.value) : 0;
      
      let gstStr = invoiceItemGst ? invoiceItemGst.value : '0';
      if (gstStr === 'custom' && customGstInput) {
        gstStr = customGstInput.value;
      }
      const gst = parseFloat(gstStr) || 0;

      if (!name) { showToast('Please enter an item name.', 'error'); return; }
      if (isNaN(qty)   || qty <= 0)   { showToast('Quantity must be > 0.', 'error'); return; }
      if (isNaN(price) || price <= 0) { showToast('Price must be > 0.', 'error'); return; }

      const baseTotal = qty * price;
      const taxAmt    = baseTotal * (gst / 100);

      invoiceItems.push({ name, qty, price, gst, baseTotal, taxAmt });

      // Clear inputs
      if (invoiceItemName)  invoiceItemName.value  = '';
      if (invoiceItemQty)   invoiceItemQty.value   = '1';
      if (invoiceItemPrice) invoiceItemPrice.value = '';
      if (invoiceItemGst) {
        invoiceItemGst.value = '18';
        if (customGstInput) customGstInput.style.display = 'none';
      }

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

      // Calculate totals
      const subtotal = invoiceItems.reduce((s, i) => s + i.baseTotal, 0);
      const tax = invoiceItems.reduce((s, i) => s + i.taxAmt, 0);
      const total = subtotal + tax;
      const invNoVal = 'INV-' + Math.floor(1000 + Math.random() * 9000);
      const dateVal = invoiceDate ? invoiceDate.value : new Date().toISOString().split('T')[0];

      // Save Invoice to History BEFORE opening window (safer)
      saveInvoiceToHistory({
        invNo: invNoVal,
        date: dateVal,
        client: client,
        items: [...invoiceItems],
        subtotal,
        tax,
        total,
        status: 'Sent'
      });

      addNotification('Invoice Generated', `Invoice ${invNoVal} created for ${client}.`, 'success');
      showToast('Invoice generated!', 'success');

      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (!printWin) {
        showToast('Print window blocked. Invoice was saved to history.', 'warning');
        return;
      }
      
      printWin.document.write(`
        <!DOCTYPE html><html><head><title>Invoice – ${client}</title>
...
        <script>window.onload = () => { window.print(); }<\/script>
        </body></html>`);
      printWin.document.close();
      
      // Clear current builder items if successfully generated
      invoiceItems = [];
      renderItems();
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
      
      // Update sidebar/topbar brand name if changed
      if (profileData.name) {
        document.querySelectorAll('.brand-name').forEach(el => {
          el.textContent = profileData.name;
        });
        const mobileBrandSpan = document.querySelector('.mobile-brand span');
        if (mobileBrandSpan) mobileBrandSpan.textContent = profileData.name;
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
    
    // Set UI brand name
    if (savedProfile.name) {
      document.querySelectorAll('.brand-name').forEach(el => {
        el.textContent = savedProfile.name;
      });
      const mobileBrandSpan = document.querySelector('.mobile-brand span');
      if (mobileBrandSpan) mobileBrandSpan.textContent = savedProfile.name;
    }
  }

  /* ── Business Logo Upload ── */
  const uploadLogoBtn = document.getElementById('uploadLogoBtn');
  const removeLogoBtn = document.getElementById('removeLogoBtn');
  const logoFileInput = document.getElementById('logoFileInput');
  const pLogoImg      = document.getElementById('pLogoImg');
  const pLogoIcon     = document.getElementById('pLogoIcon');

  function applyLogo(dataUrl) {
    if (!dataUrl) return;
    if (pLogoImg)  { pLogoImg.src = dataUrl; pLogoImg.style.display = 'block'; }
    if (pLogoIcon) pLogoIcon.style.display = 'none';
    if (removeLogoBtn) removeLogoBtn.style.display = 'block';

    // Removed avatar updating so user profile avatars stay intact

    
    // Apply to Desktop Sidebar Logo
    const sidebarLogo = document.querySelector('.brand-logo');
    if (sidebarLogo) {
       sidebarLogo.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
    }
    
    // Apply to Mobile Topbar Logo
    const mobileBrandI = document.querySelector('.mobile-brand i');
    if (mobileBrandI) {
       mobileBrandI.outerHTML = `<img src="${dataUrl}" class="mobile-logo-img" style="height:24px; width:24px; border-radius:4px; object-fit:cover; margin-right:8px;">`;
    } else {
       const mobileLogoImg = document.querySelector('.mobile-logo-img');
       if (mobileLogoImg) mobileLogoImg.src = dataUrl;
    }
  }

  // Restore saved logo on page load
  const savedLogo = localStorage.getItem('bizcore_logo');
  if (savedLogo) applyLogo(savedLogo);

  if (uploadLogoBtn && logoFileInput) {
    uploadLogoBtn.addEventListener('click', () => logoFileInput.click());
    logoFileInput.addEventListener('change', () => {
      const file = logoFileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo must be smaller than 2 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        localStorage.setItem('bizcore_logo', dataUrl);
        applyLogo(dataUrl);
        showToast('Logo uploaded successfully!', 'success');
      };
      reader.readAsDataURL(file);
      logoFileInput.value = '';
    });
  }

  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      localStorage.removeItem('bizcore_logo');
      if (pLogoImg)  { pLogoImg.src = ''; pLogoImg.style.display = 'none'; }
      if (pLogoIcon) pLogoIcon.style.display = '';
      removeLogoBtn.style.display = 'none';
      showToast('Logo removed.', 'info');

      // Trigger Auth Session Check to refresh user avatars/names
      if (window.Auth && window.Auth.checkSession) {
        window.Auth.checkSession();
      }


      // Reset brand logos
      const sidebarLogo = document.querySelector('.brand-logo');
      if (sidebarLogo) {
        sidebarLogo.innerHTML = `<span class="logo-icon"><i class="fa-solid fa-chart-network"></i></span>`;
      }
      
      const mobileLogoImg = document.querySelector('.mobile-logo-img');
      if (mobileLogoImg) {
        mobileLogoImg.outerHTML = `<i class="fa-solid fa-chart-network"></i>`;
      }
    });
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
    return []; // No default accounts, fresh start
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

    if (typeof updateDashboardBalances === 'function') updateDashboardBalances();
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
      position:fixed; inset:0; background:rgba(220, 38, 38, 0.25); backdrop-filter: blur(4px);
      display:flex; align-items:center; justify-content:center; z-index:10000; transition: all 0.3s ease;`;
    modal.innerHTML = `
      <div style="background:var(--card-bg,#fff); border: 2px solid #ef4444; border-radius:16px; padding:32px; width:400px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(239, 68, 68, 0.2); text-align:center; position:relative; overflow:hidden;">
        <div style="position:absolute; top:0; left:0; right:0; height:6px; background:#ef4444;"></div>
        <div style="background: rgba(239, 68, 68, 0.1); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <i class="fa-solid fa-trash-can" style="color:#ef4444; font-size:36px;"></i>
        </div>
        <h3 style="margin:0 0 12px; font-size:20px; font-weight:800; color: #ef4444;">Delete Account Permanently?</h3>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height: 1.5;">
          You are about to delete <strong>${accName}</strong>. This action will completely wipe this account from your records and <strong>cannot be undone</strong>.
        </p>
        <div style="display:flex; gap:12px;">
          <button id="delAccCancel" class="btn btn-outline" style="flex:1; padding: 12px; font-size: 14px; font-weight: 600;">Cancel</button>
          <button id="delAccConfirm" class="btn" style="flex:1; background:#ef4444; color:#fff; border:none; padding: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">Yes, Delete It</button>
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

  // ── Render Dashboard Balances ──
  function updateDashboardBalances() {
    const dashTotalBank = document.getElementById('dashTotalBank');
    const dashTotalCash = document.getElementById('dashTotalCash');

    const totalBank = bankAccounts.filter(a => !a.accountType || a.accountType === 'bank').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
    const totalCash = bankAccounts.filter(a => a.accountType === 'cash').reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    if (dashTotalBank) dashTotalBank.textContent = '₹' + totalBank.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    if (dashTotalCash) dashTotalCash.textContent = '₹' + totalCash.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    
    // Income & Expense
    const dashIncome = document.getElementById('dashTotalIncome');
    const dashExpense = document.getElementById('dashTotalExpense');
    
    if (dashIncome) {
      const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      dashIncome.dataset.value = totalIncome;
      dashIncome.textContent = '₹' + totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
    
    if (dashExpense) {
      const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      dashExpense.dataset.value = totalExpense;
      dashExpense.textContent = '₹' + totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    // Purchase & Sales
    const dashPurchase = document.getElementById('dashTotalPurchase');
    const dashSales = document.getElementById('dashTotalSales');

    if (dashPurchase) {
      const totalPurchase = transactions.filter(t => t.type === 'Expense' && (t.category === 'Purchase' || t.category === 'Purchases')).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      dashPurchase.textContent = '₹' + totalPurchase.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    if (dashSales) {
      const totalSales = transactions.filter(t => t.type === 'Income' && (t.category === 'Sales' || t.category === 'Sale')).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      dashSales.textContent = '₹' + totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }
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

    updateDashboardBalances();
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
     5.5. ADMIN PANEL ACTIONS
     ============================================================ */
  const viewAdmin = document.getElementById('view-admin');
  if (viewAdmin) {
    viewAdmin.addEventListener('click', (e) => {
      // Handle the '...' action buttons on the Users table
      const actionBtn = e.target.closest('.btn-icon-circular');
      if (actionBtn) {
        const row = actionBtn.closest('tr');
        const userName = row ? row.querySelector('.u-name').textContent : 'User';
        showToast(`User settings for ${userName} are locked in this demo mode.`, 'warning');
      }

      // Handle the 'Export System Audit' button
      const exportBtn = e.target.closest('.header-actions .btn-outline');
      if (exportBtn) {
        showToast('Generating System Audit report...', 'info');
        setTimeout(() => showToast('Audit.csv downloaded successfully.', 'success'), 1500);
      }
    });
  }

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
  window.showToast = showToast;

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
    
    // Dashboard Total Income will automatically recalculate on renderTransactions

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

    let catText = 'Sales';
    const typeSelect = document.getElementById('incomeTypeSelect');
    if (typeSelect && typeSelect.value) {
      catText = typeSelect.options[typeSelect.selectedIndex].text;
    }

    const newTxn = {
      id: tId,
      date: tDate,
      description: desc,
      category: catText,
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

      const dateVal  = invDate ? invDate.value : new Date().toISOString().split('T')[0];
      const invNoVal  = invNo  ? invNo.value   : 'INV-0001';
      const descVal   = incomeDescription ? incomeDescription.value : '';

      // Pull Receiver/Client details
      let clientInfo = 'Client';
      if (incomeReceivableSelect && incomeReceivableSelect.value) {
        const receivers = getReceivers();
        const rec = receivers.find(r => String(r.id) === String(incomeReceivableSelect.value));
        if (rec) {
          clientInfo = `<strong>${rec.name}</strong>${rec.mobile ? '<br>' + rec.mobile : ''}${rec.address ? '<br>' + rec.address : ''}`;
        }
      }

      // Pull Business Profile from localStorage
      const profile   = JSON.parse(localStorage.getItem('bizcore_profile') || '{}');
      const logo = localStorage.getItem('bizcore_logo') || '';
      const bName    = profile.name    || 'BizCore';
      const bGSTIN   = profile.gstin   || '';
      const bAddress = profile.address || '';
      const logoHtml = logo ? `<img src="${logo}" style="max-height:70px; max-width:140px; object-fit:contain; margin-bottom:12px; display:block;" alt="Logo" />` : '';

      // Save rich invoice data to history BEFORE opening window (safer)
      saveInvoiceToHistory({
        invNo: invNoVal,
        date: dateVal,
        client: clientInfo.replace(/<[^>]*>?/gm, ' '), // strip html for summary
        items: [...invItems],
        subtotal,
        tax: taxAmt,
        total: grand,
        status: 'Paid'
      });

      addNotification('Payment Recorded', `Invoice ${invNoVal} generated and payment recorded successfully.`, 'success');
      showToast('Invoice generated!', 'success');

      const win = window.open('', '_blank', 'width=860,height=1000');
      if (win) {
        win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invNoVal}</title>
...
        <script>window.onload=()=>window.print();<\/script>
        </body></html>`);
        win.document.close();
      } else {
        showToast('Print window blocked. Invoice saved to records.', 'warning');
      }

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
     8. HISTORICAL INVOICES & REPORTS
     ============================================================ */
  const invTableBody   = document.querySelector('#invTable tbody');
  const invSearchInput = document.getElementById('invSearch');

  function loadInvoices() {
    return JSON.parse(localStorage.getItem('bizcore_invoices') || '[]');
  }
  function saveInvoices(list) {
    localStorage.setItem('bizcore_invoices', JSON.stringify(list));
  }

  function saveInvoiceToHistory(invObj) {
    const list = loadInvoices();
    list.unshift(invObj);
    saveInvoices(list);
    renderInvoiceList();
    renderReports();
  }

  function renderInvoiceList() {
    if (!invTableBody) return;
    const allInvoices = loadInvoices();
    const query = invSearchInput ? invSearchInput.value.toLowerCase() : '';

    // Filter
    const filtered = allInvoices.filter(inv => 
      inv.invNo.toLowerCase().includes(query) || 
      inv.client.toLowerCase().includes(query)
    );

    // Clear except the 'no results' row
    Array.from(invTableBody.children).forEach(child => {
      if (child.id !== 'invNoResults') child.remove();
    });

    const noResultsEl = document.getElementById('invNoResults');
    if (filtered.length === 0) {
      if (noResultsEl) noResultsEl.style.display = '';
      return;
    }
    if (noResultsEl) noResultsEl.style.display = 'none';

    filtered.forEach(inv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${inv.date}</td>
        <td style="font-weight:700; color:var(--accent);">${inv.invNo}</td>
        <td>${inv.client}</td>
        <td style="font-weight:700;">₹${inv.total.toLocaleString('en-IN')}</td>
        <td>
          <select class="form-control small-status" onchange="updateInvoiceStatus('${inv.invNo}', this.value)">
            <option value="Paid" ${inv.status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Sent" ${inv.status === 'Sent' ? 'selected' : ''}>Sent</option>
            <option value="Void" ${inv.status === 'Void' ? 'selected' : ''}>Void</option>
          </select>
        </td>
        <td style="display:flex; gap:8px;">
          <button class="btn btn-outline small" onclick="window.printPastInvoice('${inv.invNo}')" title="Print"><i class="fa-solid fa-print"></i></button>
          <button class="btn btn-outline small text-danger" onclick="deleteInvoice('${inv.invNo}')" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      `;
      invTableBody.appendChild(row);
    });
  }

  window.deleteInvoice = function(invNo) {
    if (!confirm(`Are you sure you want to delete Invoice ${invNo}? This cannot be undone.`)) return;
    const list = loadInvoices();
    const newList = list.filter(i => i.invNo !== invNo);
    saveInvoices(newList);
    renderInvoiceList();
    addNotification('Invoice Deleted', `Invoice ${invNo} has been removed from history.`, 'warning');
  };

  window.updateInvoiceStatus = function(invNo, newStatus) {
    const list = loadInvoices();
    const inv = list.find(i => i.invNo === invNo);
    if (inv) {
      inv.status = newStatus;
      saveInvoices(list);
      addNotification('Status Updated', `Invoice ${invNo} marked as ${newStatus}.`, 'info');
      renderInvoiceList();
    }
  };

  if (invSearchInput) {
    invSearchInput.addEventListener('input', renderInvoiceList);
  }

  // Support printing past invoices
  window.printPastInvoice = function(invNo) {
    const inv = loadInvoices().find(i => i.invNo === invNo);
    if (!inv) return;
    
    // Re-use logic for generating the HTML
    const profile = JSON.parse(localStorage.getItem('bizcore_profile') || '{}');
    const logo = localStorage.getItem('bizcore_logo') || '';
    const bName = profile.name || 'BizCore';
    const bGSTIN = profile.gstin || '';
    const bAddress = profile.address || '';
    const logoHtml = logo ? `<img src="${logo}" style="max-height:70px; max-width:140px; object-fit:contain; margin-bottom:12px; display:block;" alt="Logo" />` : '';

    const rows = inv.items.map((item, idx) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.qty}</td>
        <td style="text-align:right">₹${item.price.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="text-align:center">${item.gst}%</td>
        <td style="text-align:right">₹${item.taxAmt.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="text-align:right">₹${(item.baseTotal + item.taxAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=860,height=1000');
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invNo}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.5; }
      .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #6366f1; padding-bottom:20px; }
      .biz-info h1 { font-size: 26px; font-weight: 800; color: #6366f1; margin: 0; }
      .biz-info p { margin: 2px 0 0; font-size: 13px; color: #555; }
      .inv-meta { text-align:right; font-size:13px; color:#555; }
      .inv-meta strong { color:#1a1a2e; font-size: 20px; display: block; margin-bottom: 4px; }
      table { width:100%; border-collapse:collapse; margin:24px 0; font-size:13px; }
      th { background:#6366f1; color:#fff; padding:12px 14px; text-align:left; font-weight:600; }
      td { padding:12px 14px; border-bottom:1px solid #eee; }
      tr:nth-child(even) td { background:#f8f8ff; }
      .totals { width:300px; margin-left:auto; font-size:14px; }
      .totals div { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; }
      .grand { font-size:20px; font-weight:800; color:#6366f1; border-top:2px solid #6366f1 !important; padding-top:10px !important; border-bottom:none !important; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="inv-header">
      <div class="biz-info">
        ${logoHtml}
        <h1>${bName}</h1>
        ${bGSTIN ? `<p><strong>GSTIN:</strong> ${bGSTIN}</p>` : ''}
        ${bAddress ? `<p>${bAddress}</p>` : ''}
      </div>
      <div class="inv-meta">
        <strong>INVOICE</strong>
        No: ${inv.invNo}<br>
        Date: ${inv.date}
      </div>
    </div>
    <div style="margin-bottom:32px;"><strong>Bill To:</strong><br>${inv.client}</div>
    <table>
      <thead><tr><th>Items</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">GST%</th><th style="text-align:right">GST Amt</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>₹${inv.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      <div><span>Total Tax</span><span>₹${inv.tax.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
      <div class="grand"><span>Grand Total</span><span>₹${inv.total.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
    </div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
    win.document.close();
  };

  /* ============================================================
     REPORTS & ANALYTICS LOGIC
     ============================================================ */
  const reportPeriodSelect = document.getElementById('reportPeriodSelect');

  function renderReports() {
    const revenueEl = document.getElementById('repTotalRevenue');
    const netEl     = document.getElementById('repNetProfit');
    const taxEl     = document.getElementById('repTotalTax');
    const expEl     = document.getElementById('repTotalExpense');
    const chartCont = document.getElementById('analyticsChartContainer');
    const incCatList = document.getElementById('categoryBreakdownList');
    const expCatList = document.getElementById('expenseBreakdownList');

    if (!revenueEl) return;

    const period = reportPeriodSelect ? reportPeriodSelect.value : 'month';
    const now    = new Date();
    const curMonth = now.getMonth();
    const curYear  = now.getFullYear();

    // 1. Calculate Period Totals
    const filteredTxns = transactions.filter(t => {
      if (period === 'year') return true;
      const tDate = new Date(t.date);
      return tDate.getMonth() === curMonth && tDate.getFullYear() === curYear;
    });

    let rev = 0, exp = 0, tax = 0;
    const incCatMap = {};
    const expCatMap = {};

    filteredTxns.forEach(t => {
      if (t.type === 'Income') {
        rev += t.amount;
        incCatMap[t.category] = (incCatMap[t.category] || 0) + t.amount;
      } else {
        exp += t.amount;
        expCatMap[t.category] = (expCatMap[t.category] || 0) + t.amount;
      }
    });

    // Tax from invoices
    const allInvoices = loadInvoices();
    allInvoices.forEach(inv => {
      const iDate = new Date(inv.date);
      if (period === 'month') {
        if (iDate.getMonth() === curMonth && iDate.getFullYear() === curYear) tax += inv.tax;
      } else {
        tax += inv.tax;
      }
    });

    revenueEl.textContent = formatCurrency(rev);
    expEl.textContent     = formatCurrency(exp);
    taxEl.textContent     = formatCurrency(tax);
    netEl.textContent     = formatCurrency(rev - exp);

    // 2. Render Category Breakdowns
    const renderCatList = (listEl, map, total, isIncome) => {
      if (!listEl) return;
      listEl.innerHTML = '';
      const fallbackTotal = total || 1;
      const sortedKeys = Object.keys(map).sort((a,b) => map[b] - map[a]);
      
      if (sortedKeys.length === 0) {
        listEl.innerHTML = '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No data recorded yet.</div>';
        return;
      }

      sortedKeys.forEach(cat => {
        const perc = Math.round((map[cat] / fallbackTotal) * 100);
        const item = document.createElement('div');
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
            <span>${cat}</span>
            <span style="font-weight:700;">₹${map[cat].toLocaleString('en-IN')} (${perc}%)</span>
          </div>
          <div style="height:6px; background:var(--bg-active); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${perc}%; background:${isIncome ? 'var(--accent)' : 'var(--danger)'};"></div>
          </div>
        `;
        listEl.appendChild(item);
      });
    };

    renderCatList(incCatList, incCatMap, rev, true);
    renderCatList(expCatList, expCatMap, exp, false);

    // 3. Render 6-Month Trend Chart
    if (chartCont) {
      chartCont.innerHTML = '';
      const months = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: monthNames[d.getMonth()],
          m: d.getMonth(),
          y: d.getFullYear(),
          revenue: 0,
          expense: 0
        });
      }

      transactions.forEach(t => {
        const tDate = new Date(t.date);
        const mObj = months.find(obj => obj.m === tDate.getMonth() && obj.y === tDate.getFullYear());
        if (mObj) {
          if (t.type === 'Income') mObj.revenue += t.amount;
          else mObj.expense += t.amount;
        }
      });

      const maxVal = Math.max(...months.map(m => Math.max(m.revenue, m.expense)), 1000);

      months.forEach(m => {
        const revH = (m.revenue / maxVal) * 100;
        const expH = (m.expense / maxVal) * 100;
        const barGroup = document.createElement('div');
        barGroup.className = 'chart-bar-group';
        barGroup.innerHTML = `
          <div class="chart-bars">
            <div class="chart-bar" style="height:${revH}%; background:var(--accent);" data-value="₹${m.revenue.toLocaleString('en-IN')}"></div>
            <div class="chart-bar" style="height:${expH}%; background:var(--danger);" data-value="₹${m.expense.toLocaleString('en-IN')}"></div>
          </div>
          <div style="font-size:11px; color:var(--text-secondary); font-weight:600;">${m.label}</div>
        `;
        chartCont.appendChild(barGroup);
      });
    }
  }

  if (reportPeriodSelect) {
    reportPeriodSelect.addEventListener('change', renderReports);
  }

  // Initial Renders
  renderInvoiceList();
  renderReports();

  window.addEventListener('bizRouteChanged', (e) => {
    if (e.detail.route === 'invoices') renderInvoiceList();
    if (e.detail.route === 'reports') renderReports();
    // Close notif dropdown on route change
    if (notifDropdown) notifDropdown.classList.remove('active');
  });

  /* ============================================================
     9. NOTIFICATION SYSTEM LOGIC
     ============================================================ */
  const notifBtn       = document.getElementById('notifBtn');
  const notifDropdown  = document.getElementById('notifDropdown');
  const notifList      = document.getElementById('notifList');
  const notifCount     = document.getElementById('notifCount');
  const clearNotifsBtn = document.getElementById('clearNotifsBtn');

  function loadNotifications() {
    return JSON.parse(localStorage.getItem('bizcore_notifications') || '[]');
  }
  function saveNotifications(list) {
    localStorage.setItem('bizcore_notifications', JSON.stringify(list));
  }

  window.addNotification = function(title, msg, type = 'info') {
    const list = loadNotifications();
    const newNotif = {
      id: Date.now(),
      title,
      msg,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    list.unshift(newNotif);
    saveNotifications(list.slice(0, 20)); // Keep last 20
    renderNotifications();
  };

  function renderNotifications() {
    if (!notifList) return;
    const list = loadNotifications();
    const unreadCount = list.filter(n => !n.read).length;

    if (notifCount) {
      notifCount.textContent = unreadCount;
      notifCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    if (list.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">No new notifications</div>';
      return;
    }

    notifList.innerHTML = list.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifAsRead(${n.id})">
        <span class="notif-title">${n.title}</span>
        <span class="notif-msg">${n.msg}</span>
        <span class="notif-time">${n.time}</span>
      </div>
    `).join('');
  }

  window.markNotifAsRead = function(id) {
    const list = loadNotifications();
    const n = list.find(x => x.id === id);
    if (n) n.read = true;
    saveNotifications(list);
    renderNotifications();
  };

  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
    });
  }

  if (clearNotifsBtn) {
    clearNotifsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveNotifications([]);
      renderNotifications();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (notifDropdown) notifDropdown.classList.remove('active');
  });

  // Initial Check: If first time, add a welcome notification
  const allNotifs = loadNotifications();
  if (allNotifs.length === 0) {
    addNotification('Welcome to BizCore!', 'Start by setting up your business profile and adding a bank account.', 'info');
  }

  renderNotifications();

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

      // Dashboard Total Expense will automatically recalculate on renderTransactions

      let desc = document.getElementById('expenseDescription') ? document.getElementById('expenseDescription').value : '';
      if (!desc) {
        desc = document.getElementById('expenseTypeSelect') ? document.getElementById('expenseTypeSelect').options[document.getElementById('expenseTypeSelect').selectedIndex].text : 'Recorded Expense';
      }

      const tDate = new Date().toISOString().split('T')[0];
      const tId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

      let catText = 'Expenses';
      const typeSelectExp = document.getElementById('expenseTypeSelect');
      if (typeSelectExp && typeSelectExp.value) {
        catText = typeSelectExp.options[typeSelectExp.selectedIndex].text;
      }

      const newTxn = {
        id: tId,
        date: tDate,
        description: desc,
        category: catText,
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
