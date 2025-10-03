const STORAGE_KEYS = {
  PRODUCTS: 'childrenOfHopeProducts',
  CART: 'childrenOfHopeCart',
  EVENTS: 'childrenOfHopeEvents'
};

const safeCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto : null;

const createId = () => (safeCrypto ? safeCrypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

const ADMIN_SECRET = '0702343293';
const ADMIN_AUTH_KEY = 'childrenOfHopeAdminAuth';
const MAX_EVENTS = 200;
const FALLBACK_IMAGE = 'https://via.placeholder.com/900x600?text=Children+of+Hope';

let editingProductId = null;
let currentGallery = { product: null, media: [], index: 0 };

const defaultProducts = [
  {
    id: createId(),
    name: 'Eko Dawn Silk Dress',
    category: 'Dresses',
    price: 95000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80'
      },
      {
        type: 'video',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      }
    ],
    description: 'Bias-cut midi dress in hand-dyed silk charmeuse with adjustable halter neckline.',
    featured: true,
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: createId(),
    name: 'Lekki Leather Mini Tote',
    category: 'Accessories',
    price: 52000,
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80',
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1520186994231-2a48a7b37301?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    description: 'Structured mini tote crafted from vegetable-tanned leather with brass hardware.',
    featured: false,
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: createId(),
    name: 'Azuré Quartz Earrings',
    category: 'Jewelry',
    price: 28500,
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80',
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80'
      },
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    description: 'Hand-cut quartz drops set in recycled sterling silver with sky-blue enamel.',
    featured: false,
    createdAt: Date.now() - 86400000 * 6
  }
];

const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0
});

const dom = {
  productGrid: document.querySelector('[data-product-grid]'),
  emptyState: document.querySelector('[data-empty-state]'),
  filterForm: document.querySelector('[data-product-filter]'),
  featuredWrap: document.querySelector('[data-featured]'),
  featuredName: document.querySelector('[data-featured] .product-name'),
  featuredPrice: document.querySelector('[data-featured] .product-price'),
  featuredCTA: document.querySelector('[data-featured-cta]'),
  navToggle: document.querySelector('.nav-toggle'),
  navLinks: document.querySelector('.nav-links'),
  adminModal: document.querySelector('[data-admin-modal]'),
  loginModal: document.querySelector('[data-login-modal]'),
  openAdmin: document.querySelector('[data-open-admin]'),
  closeAdmin: document.querySelectorAll('[data-close-admin]'),
  closeLogin: document.querySelectorAll('[data-close-login]'),
  productForm: document.querySelector('[data-product-form]'),
  productMessage: document.querySelector('[data-product-message]'),
  submitProduct: document.querySelector('[data-submit-product]'),
  cancelEdit: document.querySelector('[data-cancel-edit]'),
  adminProductList: document.querySelector('[data-admin-product-list]'),
  adminEventList: document.querySelector('[data-admin-event-list]'),
  adminEventSummary: document.querySelector('[data-admin-event-summary]'),
  imageModal: document.querySelector('[data-image-modal]'),
  closeImage: document.querySelectorAll('[data-close-image]'),
  modalStage: document.querySelector('[data-modal-stage]'),
  modalThumbs: document.querySelector('[data-modal-thumbs]'),
  galleryPrev: document.querySelector('[data-gallery-prev]'),
  galleryNext: document.querySelector('[data-gallery-next]'),
  modalName: document.querySelector('[data-modal-name]'),
  modalPrice: document.querySelector('[data-modal-price]'),
  modalDescription: document.querySelector('[data-modal-description]'),
  loginForm: document.querySelector('[data-login-form]'),
  loginMessage: document.querySelector('[data-login-message]'),
  logoutAdmin: document.querySelector('[data-logout-admin]'),
  cartModal: document.querySelector('[data-cart-modal]'),
  openCart: document.querySelector('[data-open-cart]'),
  closeCart: document.querySelectorAll('[data-close-cart]'),
  cartItems: document.querySelector('[data-cart-items]'),
  cartCount: document.querySelector('[data-cart-count]'),
  cartTotal: document.querySelector('[data-cart-total]'),
  cartEmpty: document.querySelector('[data-cart-empty]'),
  checkout: document.querySelector('[data-checkout]'),
  contactForm: document.querySelector('[data-contact-form]'),
  contactMessage: document.querySelector('[data-form-message]'),
  year: document.querySelector('[data-year]')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  bootstrapYear();
  bootstrapProducts();
  bootstrapEvents();
  renderProducts();
  hydrateCategories();
  hydrateFeatured();
  bootstrapCart();
  bindEvents();
  syncAdminState();
}

function bootstrapYear() {
  if (dom.year) {
    dom.year.textContent = new Date().getFullYear();
  }
}

function bootstrapProducts() {
  const stored = safeParse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
  if (!stored || !stored.length) {
    const seeded = normalizeProducts(defaultProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(seeded));
    return;
  }

  const normalized = normalizeProducts(stored);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalized));
}

function bootstrapCart() {
  const storedCart = safeParse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(storedCart));
  updateCartUI(storedCart);
}

function bindEvents() {
  dom.navToggle?.addEventListener('click', () => {
    dom.navLinks?.classList.toggle('open');
  });

  dom.navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => dom.navLinks?.classList.remove('open'));
  });

  dom.openAdmin?.addEventListener('click', handleAdminGate);

  dom.closeAdmin.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.adminModal, false));
  });

  dom.closeLogin.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.loginModal, false));
  });

  dom.closeImage.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.imageModal, false));
  });

  dom.galleryPrev?.addEventListener('click', () => stepGallery(-1));
  dom.galleryNext?.addEventListener('click', () => stepGallery(1));

  dom.modalThumbs?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-gallery-index]');
    if (!target) return;
    const index = Number(target.dataset.galleryIndex);
    if (Number.isInteger(index)) {
      setGalleryIndex(index, true);
    }
  });

  dom.openCart?.addEventListener('click', () => toggleModal(dom.cartModal, true));

  dom.closeCart.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.cartModal, false));
  });

  dom.productForm?.addEventListener('submit', handleProductSubmit);
  dom.filterForm?.addEventListener('input', debounce(handleFilterChange, 200));
  dom.checkout?.addEventListener('click', handleCheckout);
  dom.contactForm?.addEventListener('submit', handleContactSubmit);
  dom.loginForm?.addEventListener('submit', handleAdminLogin);
  dom.logoutAdmin?.addEventListener('click', handleAdminLogout);
  dom.cancelEdit?.addEventListener('click', () => handleCancelEdit(true));

  dom.featuredCTA?.addEventListener('click', () => {
    const featuredId = dom.featuredCTA?.dataset.id;
    if (!featuredId) return;
    const productEl = dom.productGrid?.querySelector(`[data-product-id="${featuredId}"]`);
    productEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    productEl?.classList.add('pulse');
    setTimeout(() => productEl?.classList.remove('pulse'), 1600);
  });

  document.addEventListener('keydown', handleKeyDown);
}

function handleProductSubmit(event) {
  event.preventDefault();
  if (!dom.productForm) return;

  if (!isAdmin()) {
    showFormMessage(dom.productMessage, 'You must be signed in as an administrator to publish products.');
    return;
  }

  const formData = new FormData(dom.productForm);
  const candidate = {
    name: (formData.get('name') || '').toString().trim(),
    category: (formData.get('category') || '').toString().trim(),
    price: Number(formData.get('price')),
    image: (formData.get('image') || '').toString().trim(),
    description: (formData.get('description') || '').toString().trim(),
    featured: Boolean(formData.get('featured'))
  };

  if (!candidate.name || !candidate.category || !candidate.price || !candidate.image) {
    showFormMessage(dom.productMessage, 'Please fill in all required fields.');
    return;
  }

  const mediaInput = (formData.get('media') || '').toString();
  const mediaList = buildMediaList(candidate.image, mediaInput);
  candidate.media = mediaList;
  candidate.image = getPrimaryImageUrl(mediaList);

  const products = getProducts();
  const isEditing = Boolean(editingProductId);

  if (isEditing) {
    const index = products.findIndex((item) => item.id === editingProductId);
    if (index === -1) {
      showFormMessage(dom.productMessage, 'Unable to update this product. Please refresh and try again.');
      return;
    }

    const original = products[index];
    const updated = {
      ...original,
      ...candidate,
      price: candidate.price,
      featured: candidate.featured,
      media: mediaList,
      image: candidate.image
    };

    products[index] = updated;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    renderProducts();
    hydrateCategories();
    hydrateFeatured();
    showFormMessage(dom.productMessage, 'Product details updated.');
    logEvent('product.update', { id: updated.id, name: updated.name });
    handleCancelEdit(true);
    setTimeout(() => showFormMessage(dom.productMessage, ''), 3000);
  } else {
    const product = {
      id: createId(),
      ...candidate,
      createdAt: Date.now()
    };
    products.push(product);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    renderProducts();
    hydrateCategories();
    hydrateFeatured();
    dom.productForm.reset();
    showFormMessage(dom.productMessage, 'Product published. It is now visible in the collection.');
    logEvent('product.create', { id: product.id, name: product.name });
    setTimeout(() => showFormMessage(dom.productMessage, ''), 3000);
  }

  renderAdminDashboard();
}

function handleFilterChange() {
  renderProducts();
}

function handleCheckout() {
  const cart = getCart();
  if (!cart.length) {
    return;
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  logEvent('checkout.start', { items: cart.length, total });
  alert('Checkout placeholder: connect your preferred payment gateway or e-commerce platform.');
}

function handleContactSubmit(event) {
  event.preventDefault();
  if (!dom.contactForm) return;
  const formData = new FormData(dom.contactForm);
  const name = (formData.get('name') || '').toString().trim();
  const interest = (formData.get('interest') || '').toString();
  showFormMessage(dom.contactMessage, 'Thanks! We will reach out within 24 hours.');
  dom.contactForm.reset();
  setTimeout(() => showFormMessage(dom.contactMessage, ''), 3500);
  logEvent('contact.submit', { name, interest });
}

function toggleModal(modal, open) {
  if (!modal) return;
  if (open) {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (modal === dom.adminModal) {
      renderAdminDashboard();
    }
  } else {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (modal === dom.loginModal) {
      dom.loginForm?.reset();
      showFormMessage(dom.loginMessage, '');
    }
    if (modal === dom.adminModal) {
      showFormMessage(dom.productMessage, '');
      handleCancelEdit(true);
    }
    if (modal === dom.imageModal) {
      currentGallery = { product: null, media: [], index: 0 };
      if (dom.modalStage) dom.modalStage.innerHTML = '';
      if (dom.modalThumbs) dom.modalThumbs.innerHTML = '';
    }
  }
}

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (!dom.adminModal?.hasAttribute('hidden')) {
    toggleModal(dom.adminModal, false);
  }
  if (!dom.cartModal?.hasAttribute('hidden')) {
    toggleModal(dom.cartModal, false);
  }
  if (!dom.loginModal?.hasAttribute('hidden')) {
    toggleModal(dom.loginModal, false);
  }
  if (!dom.imageModal?.hasAttribute('hidden')) {
    toggleModal(dom.imageModal, false);
  }
}

function handleAdminGate() {
  if (isAdmin()) {
    renderAdminDashboard();
    toggleModal(dom.adminModal, true);
  } else {
    toggleModal(dom.loginModal, true);
  }
}

function handleAdminLogin(event) {
  event.preventDefault();
  if (!dom.loginForm) return;

  const formData = new FormData(dom.loginForm);
  const passcode = (formData.get('passcode') || '').toString().trim();

  if (!passcode) {
    showFormMessage(dom.loginMessage, 'Enter the admin passcode.');
    return;
  }

  if (passcode !== ADMIN_SECRET) {
    showFormMessage(dom.loginMessage, 'Incorrect passcode. Please try again.');
    return;
  }

  localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  dom.loginForm.reset();
  showFormMessage(dom.loginMessage, '');
  toggleModal(dom.loginModal, false);
  syncAdminState();
  renderAdminDashboard();
  handleCancelEdit(true);
  logEvent('admin.login', {});
  toggleModal(dom.adminModal, true);
}

function handleAdminLogout() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  toggleModal(dom.adminModal, false);
  handleCancelEdit(true);
  syncAdminState();
  renderAdminDashboard();
  logEvent('admin.logout', {});
  alert('You have signed out of the Children of Hope admin portal.');
}

function renderProducts() {
  if (!dom.productGrid) return;

  const products = getProducts();
  const filters = getFilters();
  const filtered = applyFilters(products, filters);

  dom.productGrid.innerHTML = '';

  if (!filtered.length) {
    dom.emptyState?.removeAttribute('hidden');
    return;
  }
  dom.emptyState?.setAttribute('hidden', '');

  filtered.forEach((product) => {
    const card = createProductCard(product);
    dom.productGrid.appendChild(card);
  });
}

function getProducts() {
  const stored = safeParse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
  return normalizeProducts(stored);
}

function getCart() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartUI(cart);
}

function getFilters() {
  if (!dom.filterForm) return { query: '', category: 'all', sort: 'newest' };
  const formData = new FormData(dom.filterForm);
  return {
    query: (formData.get('query') || '').toLowerCase(),
    category: formData.get('category') || 'all',
    sort: formData.get('sort') || 'newest'
  };
}

function applyFilters(products, { query, category, sort }) {
  let result = [...products];

  if (query) {
    result = result.filter((product) => {
      return [product.name, product.category, product.description]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }

  if (category && category !== 'all') {
    result = result.filter((product) => product.category === category);
  }

  result.sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    return b.createdAt - a.createdAt;
  });

  return result;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.productId = product.id;

  const media = getProductMedia(product);
  const cover = media[0];
  const coverMarkup = renderProductCover(cover, product.name);

  card.innerHTML = `
    <button type="button" class="product-image-button" data-view-product="${product.id}">
      ${coverMarkup}
    </button>
    <div class="product-body">
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-footer">
        <span class="product-price-tag">${currencyFormatter.format(product.price)}</span>
        <button class="button secondary" data-add-to-cart="${product.id}">Add to Cart</button>
      </div>
    </div>
  `;

  card.querySelector('[data-view-product]')?.addEventListener('click', () => openImageModal(product));
  card.querySelector('[data-add-to-cart]')?.addEventListener('click', () => addToCart(product));
  return card;
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    const coverImage = getPrimaryImageUrl(getProductMedia(product));
    cart.push({ id: product.id, name: product.name, price: product.price, image: coverImage, quantity: 1 });
  }
  saveCart(cart);
  logEvent('cart.add', { id: product.id, name: product.name });
}

function updateCartUI(cart) {
  if (!dom.cartItems || !dom.cartCount || !dom.cartTotal || !dom.cartEmpty) return;

  dom.cartItems.innerHTML = '';
  dom.cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!cart.length) {
    dom.cartEmpty.removeAttribute('hidden');
    dom.cartTotal.textContent = currencyFormatter.format(0);
    return;
  }

  dom.cartEmpty.setAttribute('hidden', '');

  cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/160x160?text=Item';" />
      <div>
        <h4>${item.name}</h4>
        <p>${currencyFormatter.format(item.price)} × ${item.quantity}</p>
      </div>
      <button data-remove-item="${item.id}">Remove</button>
    `;
    row.querySelector('[data-remove-item]')?.addEventListener('click', () => removeCartItem(item.id));
    dom.cartItems.appendChild(row);
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  dom.cartTotal.textContent = currencyFormatter.format(total);
}

function removeCartItem(id) {
  const cart = getCart();
  const removed = cart.find((item) => item.id === id);
  const updated = cart.filter((item) => item.id !== id);
  saveCart(updated);
  if (removed) {
    logEvent('cart.remove', { id: removed.id, name: removed.name });
  }
}

function renderAdminDashboard() {
  if (!dom.adminProductList || !dom.adminEventList || !dom.adminEventSummary) return;
  if (!isAdmin()) {
    dom.adminProductList.innerHTML = '';
    dom.adminEventList.innerHTML = '';
    dom.adminEventSummary.innerHTML = '';
    return;
  }
  renderAdminProducts();
  renderAdminEvents();
}

function renderAdminProducts() {
  if (!dom.adminProductList) return;
  const products = [...getProducts()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!products.length) {
    dom.adminProductList.innerHTML = '<div class="admin-event-empty">No products yet. Publish your first piece to see it listed here.</div>';
    return;
  }

  dom.adminProductList.innerHTML = '';

  products.forEach((product) => {
    const row = document.createElement('article');
    row.className = 'admin-product-row';
    const featuredPill = product.featured ? '<span class="pill">Featured</span>' : '';
    row.innerHTML = `
      <header>
        <h5>${product.name}</h5>
        ${featuredPill}
      </header>
      <div class="meta">${product.category} • ${currencyFormatter.format(product.price)}</div>
      <div class="meta">${product.media?.length || 0} media item${product.media?.length === 1 ? '' : 's'}</div>
      <div class="meta">Published ${formatTimestamp(product.createdAt)}</div>
      <div class="admin-product-actions">
        <button data-edit-product="${product.id}">Edit</button>
        <button data-delete-product="${product.id}">Remove</button>
      </div>
    `;

    row.querySelector('[data-edit-product]')?.addEventListener('click', () => handleEditProduct(product.id));
    row.querySelector('[data-delete-product]')?.addEventListener('click', () => handleDeleteProduct(product.id));

    dom.adminProductList.appendChild(row);
  });
}

function renderAdminEvents() {
  if (!dom.adminEventList || !dom.adminEventSummary) return;
  const events = getEvents();
  const summary = summarizeEvents(events);

  if (!events.length) {
    dom.adminEventSummary.innerHTML = '<div class="admin-note">No activity recorded yet. Shopper and inquiry events will appear here once your community interacts with the site.</div>';
    dom.adminEventList.innerHTML = '<div class="admin-event-empty">No events logged.</div>';
    return;
  }

  dom.adminEventSummary.innerHTML = `
    <span><strong>${events.length}</strong> total events logged</span>
    <span><strong>${summary['product.viewImage'] || 0}</strong> gallery views</span>
    <span><strong>${summary['cart.add'] || 0}</strong> cart additions</span>
    <span><strong>${summary['checkout.start'] || 0}</strong> checkout attempts</span>
    <span><strong>${summary['contact.submit'] || 0}</strong> inquiries received</span>
  `;

  const recent = events.slice(-20).reverse();
  dom.adminEventList.innerHTML = '';

  recent.forEach((event) => {
    const row = document.createElement('article');
    row.className = 'admin-event-row';
    row.innerHTML = `
      <header>
        <h5>${formatEventLabel(event.type, event.detail)}</h5>
        <span class="pill">${getEventCategory(event.type)}</span>
      </header>
      <div class="meta">${formatTimestamp(event.timestamp)}</div>
      <div class="meta">${formatEventDetail(event.type, event.detail)}</div>
    `;
    dom.adminEventList.appendChild(row);
  });
}

function handleEditProduct(id) {
  if (!dom.productForm || !isAdmin()) return;
  const products = getProducts();
  const product = products.find((item) => item.id === id);
  if (!product) return;

  editingProductId = product.id;
  const idField = dom.productForm.querySelector('input[name="productId"]');
  const nameField = dom.productForm.querySelector('input[name="name"]');
  const categoryField = dom.productForm.querySelector('input[name="category"]');
  const priceField = dom.productForm.querySelector('input[name="price"]');
  const imageField = dom.productForm.querySelector('input[name="image"]');
  const descriptionField = dom.productForm.querySelector('textarea[name="description"]');
  const mediaField = dom.productForm.querySelector('textarea[name="media"]');
  const featuredField = dom.productForm.querySelector('input[name="featured"]');

  if (idField) idField.value = product.id;
  if (nameField) nameField.value = product.name;
  if (categoryField) categoryField.value = product.category;
  if (priceField) priceField.value = product.price ?? '';
  if (imageField) imageField.value = product.image;
  if (descriptionField) descriptionField.value = product.description;
  if (mediaField) {
    const extras = getProductMedia(product)
      .slice(1)
      .map((item) => item.url)
      .join('\n');
    mediaField.value = extras;
  }
  if (featuredField) {
    featuredField.checked = Boolean(product.featured);
  }

  if (dom.submitProduct) {
    dom.submitProduct.textContent = 'Update Product';
  }
  dom.cancelEdit?.removeAttribute('hidden');
  showFormMessage(dom.productMessage, 'Editing product. Update the details and click Update Product to save.');
  dom.productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleDeleteProduct(id) {
  if (!isAdmin()) return;
  const products = getProducts();
  const target = products.find((item) => item.id === id);
  if (!target) return;

  const confirmed = confirm(`Remove "${target.name}" from the collection?`);
  if (!confirmed) return;

  const remaining = products.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remaining));
  renderProducts();
  hydrateCategories();
  hydrateFeatured();
  renderAdminDashboard();
  showFormMessage(dom.productMessage, 'Product removed from the collection.');
  logEvent('product.delete', { id: target.id, name: target.name });
  handleCancelEdit(true);
  setTimeout(() => showFormMessage(dom.productMessage, ''), 3000);
}

function handleCancelEdit(silent = false) {
  if (!dom.productForm) return;
  editingProductId = null;
  dom.productForm.reset();
  const idField = dom.productForm.querySelector('input[name="productId"]');
  const mediaField = dom.productForm.querySelector('textarea[name="media"]');
  if (idField) idField.value = '';
  if (mediaField) mediaField.value = '';
  if (dom.submitProduct) {
    dom.submitProduct.textContent = 'Publish Product';
  }
  dom.cancelEdit?.setAttribute('hidden', '');
  if (!silent) {
    showFormMessage(dom.productMessage, '');
  }
}

function openImageModal(product) {
  if (!dom.imageModal || !dom.modalStage || !dom.modalThumbs || !dom.modalName || !dom.modalPrice || !dom.modalDescription) {
    return;
  }

  const media = getProductMedia(product);
  currentGallery = { product, media, index: 0 };
  setGalleryIndex(0, false);

  dom.modalName.textContent = product.name;
  dom.modalPrice.textContent = currencyFormatter.format(product.price);
  dom.modalDescription.textContent = product.description;

  toggleModal(dom.imageModal, true);
  logGalleryView(product, 0);
}

function hydrateCategories() {
  if (!dom.filterForm) return;
  const select = dom.filterForm.querySelector('select[name="category"]');
  if (!select) return;

  const products = getProducts();
  const categories = Array.from(new Set(products.map((item) => item.category))).sort();

  select.innerHTML = '<option value="all">All Categories</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');
}

function hydrateFeatured() {
  if (!dom.featuredWrap || !dom.featuredName || !dom.featuredPrice || !dom.featuredCTA) return;

  const products = getProducts();
  const featured = products.find((item) => item.featured) || products[0];
  if (!featured) {
    dom.featuredWrap.style.display = 'none';
    return;
  }

  dom.featuredName.textContent = featured.name;
  dom.featuredPrice.textContent = currencyFormatter.format(featured.price);
  dom.featuredCTA.dataset.id = featured.id;
}

function bootstrapEvents() {
  const stored = safeParse(localStorage.getItem(STORAGE_KEYS.EVENTS));
  if (!Array.isArray(stored)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
  }
}

function getEvents() {
  const events = safeParse(localStorage.getItem(STORAGE_KEYS.EVENTS));
  return Array.isArray(events) ? events : [];
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

function logEvent(type, detail = {}) {
  try {
    const events = getEvents();
    const entry = {
      id: createId(),
      type,
      detail,
      timestamp: Date.now()
    };
    events.push(entry);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    saveEvents(events);
    if (isAdmin() && !dom.adminModal?.hasAttribute('hidden')) {
      renderAdminEvents();
    }
  } catch (error) {
    console.error('Failed to log event', error);
  }
}

function summarizeEvents(events) {
  return events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown time';
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    return new Date(timestamp).toString();
  }
}

function formatEventLabel(type, detail = {}) {
  const labels = {
    'product.create': 'New product published',
    'product.update': 'Product details updated',
    'product.delete': 'Product removed',
    'product.viewImage': 'Product image viewed',
    'cart.add': 'Item added to cart',
    'cart.remove': 'Item removed from cart',
    'checkout.start': 'Checkout attempted',
    'contact.submit': 'Contact inquiry received',
    'admin.login': 'Admin signed in',
    'admin.logout': 'Admin signed out'
  };
  if (type === 'contact.submit' && detail.interest) {
    return `Inquiry: ${detail.interest}`;
  }
  if (type === 'product.create' || type === 'product.update' || type === 'product.delete' || type === 'product.viewImage') {
    return `${labels[type]}${detail.name ? `: ${detail.name}` : ''}`;
  }
  if ((type === 'cart.add' || type === 'cart.remove') && detail.name) {
    return `${labels[type]}: ${detail.name}`;
  }
  return labels[type] || type;
}

function getEventCategory(type) {
  if (type.startsWith('product')) return 'Product';
  if (type.startsWith('cart')) return 'Cart';
  if (type.startsWith('checkout')) return 'Checkout';
  if (type.startsWith('contact')) return 'Contact';
  if (type.startsWith('admin')) return 'Admin';
  return 'Activity';
}

function formatEventDetail(type, detail = {}) {
  switch (type) {
    case 'product.create':
    case 'product.update':
    case 'product.delete':
      return detail.name ? `Item: ${detail.name}` : 'Catalogue change recorded';
    case 'product.viewImage':
      return detail.name ? `Previewed: ${detail.name}` : 'Image opened';
    case 'cart.add':
    case 'cart.remove':
      return detail.name ? `Item: ${detail.name}` : 'Cart updated';
    case 'checkout.start':
      return `Items: ${detail.items || 0} • Total: ${currencyFormatter.format(detail.total || 0)}`;
    case 'contact.submit':
      return `${detail.name || 'Guest'} requested: ${detail.interest || 'General inquiry'}`;
    case 'admin.login':
    case 'admin.logout':
      return 'Administrator activity';
    default:
      return 'Activity recorded';
  }
}

function normalizeProducts(products) {
  return (products || []).map(normalizeProduct);
}

function normalizeProduct(product) {
  const clone = { ...product };
  const media = Array.isArray(product.media) ? product.media : [];
  const normalizedMedia = media
    .map((item) => normalizeMediaItem(item))
    .filter(Boolean);

  const primaryImage = (product.image || '').trim();
  if (primaryImage && !normalizedMedia.some((item) => item.url === primaryImage)) {
    normalizedMedia.unshift(createMediaItem(primaryImage));
  }

  if (!normalizedMedia.length) {
    normalizedMedia.push(createMediaItem(primaryImage || FALLBACK_IMAGE));
  }

  clone.media = normalizedMedia;
  clone.image = getPrimaryImageUrl(normalizedMedia);
  return clone;
}

function normalizeMediaItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return createMediaItem(item);
  }
  if (!item.url) return null;
  return {
    ...item,
    url: item.url,
    kind: item.kind || item.type || detectMediaKind(item.url)
  };
}

function buildMediaList(primary, rawInput) {
  const entries = [];
  const push = (url) => {
    const cleaned = (url || '').trim();
    if (!cleaned) return;
    if (entries.some((entry) => entry.url === cleaned)) return;
    entries.push(createMediaItem(cleaned));
  };

  push(primary);

  rawInput
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .forEach(push);

  if (!entries.length) {
    entries.push(createMediaItem(FALLBACK_IMAGE));
  }

  return entries;
}

function createMediaItem(url) {
  return {
    url,
    kind: detectMediaKind(url)
  };
}

function detectMediaKind(url) {
  const value = (url || '').toLowerCase();
  if (!value) return 'image';
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('vimeo.com')) return 'vimeo';

  const extensionMatch = value.split('?')[0].split('#')[0].split('.').pop();
  const extension = (extensionMatch || '').toLowerCase();
  const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'svg'];
  const videoExt = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v'];

  if (imageExt.includes(extension)) return 'image';
  if (videoExt.includes(extension)) return 'video';
  return 'image';
}

function getProductMedia(product) {
  if (!product) return [createMediaItem(FALLBACK_IMAGE)];
  if (Array.isArray(product.media) && product.media.length) {
    return product.media.map(normalizeMediaItem).filter(Boolean);
  }
  return [createMediaItem(product.image || FALLBACK_IMAGE)];
}

function getPrimaryMedia(product) {
  const media = getProductMedia(product);
  return media[0] || createMediaItem(FALLBACK_IMAGE);
}

function getPrimaryImageUrl(mediaList) {
  const image = mediaList.find((item) => item.kind === 'image');
  return image ? image.url : mediaList[0]?.url || FALLBACK_IMAGE;
}

function renderProductCover(media, alt) {
  const kind = media?.kind || 'image';
  const preview = getMediaPreview(media);
  const safeAlt = alt || 'Product media';
  const videoClass = kind === 'video' || kind === 'youtube' || kind === 'vimeo' ? ' video' : '';
  return `<div class="product-cover${videoClass}"><img src="${preview}" alt="${safeAlt}" onerror="this.src='${FALLBACK_IMAGE}'; this.onerror=null;" /></div>`;
}

function getMediaPreview(media) {
  if (!media) return FALLBACK_IMAGE;
  if (media.poster) return media.poster;
  if (media.kind === 'image') return media.url;
  if (media.kind === 'youtube') {
    const id = extractYouTubeId(media.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : FALLBACK_IMAGE;
  }
  if (media.kind === 'vimeo') {
    return FALLBACK_IMAGE;
  }
  return FALLBACK_IMAGE;
}

function extractYouTubeId(url) {
  if (!url) return '';
  const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : '';
}

function getYouTubeEmbed(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : url;
}

function getVimeoEmbed(url) {
  const idMatch = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url || '');
  const id = idMatch ? idMatch[1] : '';
  return id ? `https://player.vimeo.com/video/${id}?autoplay=1&title=0&byline=0&portrait=0` : url;
}

function renderGalleryStage() {
  if (!dom.modalStage || !currentGallery.media.length) return;
  const media = currentGallery.media[currentGallery.index];
  const productName = currentGallery.product?.name || 'Product';
  const mediaAlt = `${productName} media ${currentGallery.index + 1}`;

  let markup = '';
  switch (media.kind) {
    case 'image':
      markup = `<img src="${media.url}" alt="${mediaAlt}" onerror="this.src='${FALLBACK_IMAGE}'; this.onerror=null;" />`;
      break;
    case 'youtube':
      markup = `<iframe src="${getYouTubeEmbed(media.url)}" title="${mediaAlt}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      break;
    case 'vimeo':
      markup = `<iframe src="${getVimeoEmbed(media.url)}" title="${mediaAlt}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      break;
    case 'video':
      markup = `<video controls playsinline src="${media.url}" poster="${getMediaPreview(media)}"></video>`;
      break;
    default:
      markup = `<img src="${FALLBACK_IMAGE}" alt="${mediaAlt}" />`;
  }

  dom.modalStage.innerHTML = markup;
}

function renderGalleryThumbs() {
  if (!dom.modalThumbs) return;
  if (!currentGallery.media.length) {
    dom.modalThumbs.innerHTML = '';
    return;
  }

  dom.modalThumbs.innerHTML = currentGallery.media
    .map((media, index) => {
      const preview = getMediaPreview(media);
      const isVideo = media.kind === 'video' || media.kind === 'youtube' || media.kind === 'vimeo';
      const badge = isVideo ? '<span class="thumb-badge">&#9658;</span>' : '';
      const activeClass = index === currentGallery.index ? ' active' : '';
      return `
        <button type="button" data-gallery-index="${index}" class="gallery-thumb${activeClass}">
          <img src="${preview}" alt="Thumbnail ${index + 1}" onerror="this.src='${FALLBACK_IMAGE}'; this.onerror=null;" />
          ${badge}
        </button>
      `;
    })
    .join('');
}

function updateGalleryControls() {
  const total = currentGallery.media.length;
  if (!dom.galleryPrev || !dom.galleryNext) return;
  dom.galleryPrev.disabled = total <= 1 || currentGallery.index === 0;
  dom.galleryNext.disabled = total <= 1 || currentGallery.index === total - 1;
}

function setGalleryIndex(index, logInteraction = false) {
  if (!currentGallery.media.length) return;
  const total = currentGallery.media.length;
  const bounded = Math.max(0, Math.min(index, total - 1));
  const previous = currentGallery.index;
  currentGallery.index = bounded;
  renderGalleryStage();
  renderGalleryThumbs();
  updateGalleryControls();
  if (logInteraction && previous !== bounded) {
    logGalleryView(currentGallery.product, bounded);
  }
}

function stepGallery(delta) {
  if (!currentGallery.media.length) return;
  setGalleryIndex(currentGallery.index + delta, true);
}

function logGalleryView(product, index) {
  if (!product) return;
  const media = currentGallery.media[index];
  if (!media) return;
  logEvent('product.viewImage', {
    id: product.id,
    name: product.name,
    mediaIndex: index,
    mediaType: media?.kind || 'image'
  });
}

function showFormMessage(target, message) {
  if (!target) return;
  target.textContent = message;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), delay);
  };
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse data', error);
    return null;
  }
}

function isAdmin() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

function syncAdminState() {
  if (isAdmin()) {
    dom.logoutAdmin?.removeAttribute('hidden');
  } else {
    dom.logoutAdmin?.setAttribute('hidden', '');
  }
}
