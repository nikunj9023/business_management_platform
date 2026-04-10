/**
 * BizCore – App Logic
 * Handles: Invoice Builder, Transaction Search, Subscription Toggle
 */

document.addEventListener('DOMContentLoaded', () => {

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
     5. BANK ACCOUNTS INTERACTIONS (MOCK)
     ============================================================ */
  const bankActionBtns = document.querySelectorAll('.bank-actions button');
  bankActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isReceive = btn.title.includes('Receive');
      const bankName = btn.closest('.banking-card').querySelector('.bank-logo').textContent;
      
      if (isReceive) {
        showToast(`Ready to receive payments into ${bankName} account.`, 'success');
      } else {
        showToast(`Payment gateway initialized for ${bankName} account.`, 'info');
      }
    });
  });

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

});
