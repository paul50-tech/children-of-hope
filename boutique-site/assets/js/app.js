const STORAGE_KEYS = {
  CART: 'childrenOfHopeCart',
  EVENTS: 'childrenOfHopeEvents',
  PRODUCTS: 'childrenOfHopeProducts'
};

const safeCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto : null;
const createId = () => (safeCrypto ? safeCrypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

const ADMIN_SECRET = '0702343293';
const ADMIN_AUTH_KEY = 'childrenOfHopeAdminAuth';
const MAX_EVENTS = 200;
const FALLBACK_IMAGE = 'https://via.placeholder.com/900x600?text=Children+of+Hope';

const supabaseConfig = window.CH_SUPABASE || {};
const supabaseReady =
  typeof window.supabase !== 'undefined' &&
  Boolean(supabaseConfig.url && supabaseConfig.anonKey) &&
  !supabaseConfig.url.includes('YOUR-PROJECT-REF') &&
  !supabaseConfig.anonKey.includes('YOUR-SUPABASE-ANON-KEY');
const supabaseClient = supabaseReady ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
const storageBucket = supabaseConfig.storageBucket || 'product-media';

const dataProvider = supabaseReady ? createSupabaseProvider() : createLocalProvider();

let productCache = [];
let eventCache = [];
let cartCache = [];
let editingProductId = null;
let currentGallery = { product: null, media: [], index: 0 };
let adminState = {
  passcode: localStorage.getItem(ADMIN_AUTH_KEY) === 'true',
  supabaseSession: null
};

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
  loginEmailWrapper: document.querySelector('[data-login-email-wrapper]'),
  loginEmail: document.querySelector('[data-login-email]'),
  loginPassword: document.querySelector('[data-login-password]'),
  loginHint: document.querySelector('[data-login-hint]'),
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
  mediaFiles: document.querySelector('[data-media-files]'),
  year: document.querySelector('[data-year]')
};

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => console.error('Failed to initialise site', error));
});

async function init() {
  bootstrapYear();
  configureLoginForm();
  await dataProvider.init();
  productCache = await dataProvider.listProducts();
  renderProducts();
  hydrateCategories();
  hydrateFeatured();
  cartCache = getCart();
  updateCartUI(cartCache);
  bindEvents();
  await refreshEvents();
  renderAdminProducts();
  syncAdminState();
}

function bootstrapYear() {
  if (dom.year) {
    dom.year.textContent = new Date().getFullYear();
  }
}

function configureLoginForm() {
  if (!dom.loginForm) return;
  if (!supabaseReady) {
    dom.loginEmailWrapper?.setAttribute('hidden', '');
    if (dom.loginEmail) {
      dom.loginEmail.removeAttribute('required');
    }
    if (dom.loginHint) {
      dom.loginHint.textContent = 'Enter the admin passcode to unlock (default: 0702343293).';
    }
  } else {
    dom.loginEmailWrapper?.removeAttribute('hidden');
    if (dom.loginEmail) {
      dom.loginEmail.setAttribute('required', 'true');
    }
    if (dom.loginHint) {
      dom.loginHint.textContent = 'Sign in with your Supabase admin email and password.';
    }
  }
}

function bindEvents() {
  dom.navToggle?.addEventListener('click', () => {
    dom.navLinks?.classList.toggle('open');
  });

  dom.navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => dom.navLinks?.classList.remove('open'));
  });

  dom.openAdmin?.addEventListener('click', () => handleAdminGate());

  dom.closeAdmin.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.adminModal, false));
  });

  dom.closeLogin.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.loginModal, false));
  });

  dom.closeImage.forEach((el) => {
    el.addEventListener('click', () => toggleModal(dom.imageModal, false));
  });

  dom.productForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleProductSubmit().catch((error) => {
      console.error('Failed to save product', error);
      showFormMessage(dom.productMessage, 'Could not save product. Please try again.');
    });
  });

  dom.filterForm?.addEventListener('input', debounce(() => renderProducts(), 200));
  dom.checkout?.addEventListener('click', handleCheckout);
  dom.contactForm?.addEventListener('submit', handleContactSubmit);
  dom.loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAdminLogin().catch((error) => {
      console.error('Admin login failed', error);
      showFormMessage(dom.loginMessage, 'Could not sign in. Please try again.');
    });
  });
  dom.logoutAdmin?.addEventListener('click', () => {
    handleAdminLogout().catch((error) => console.error('Admin logout failed', error));
  });
  dom.cancelEdit?.addEventListener('click', () => handleCancelEdit());

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

  document.addEventListener('keydown', handleKeyDown);
}

async function handleProductSubmit() {
  if (!dom.productForm) return;

  if (!isAdmin()) {
    showFormMessage(dom.productMessage, 'You must be signed in as an administrator to publish products.');
    return;
  }

  const formData = new FormData(dom.productForm);
  const baseProduct = {
    name: (formData.get('name') || '').toString().trim(),
    category: (formData.get('category') || '').toString().trim(),
    price: Number(formData.get('price')),
    image: (formData.get('image') || '').toString().trim(),
    description: (formData.get('description') || '').toString().trim(),
    featured: Boolean(formData.get('featured'))
  };

  const mediaInput = (formData.get('media') || '').toString();
  const fileList = dom.mediaFiles?.files;
  const selectedFiles = fileList ? Array.from(fileList) : [];

  if (!baseProduct.name || !baseProduct.category || !baseProduct.price || (!baseProduct.image && selectedFiles.length === 0)) {
    showFormMessage(dom.productMessage, 'Please provide the required fields and at least one media item.');
    return;
  }

  if (selectedFiles.length && !dataProvider.uploadMedia) {
    showFormMessage(dom.productMessage, 'Uploading files requires Supabase storage configuration.');
    return;
  }

  const productId = editingProductId || createId();
  let mediaList = buildMediaList(baseProduct.image, mediaInput);

  if (selectedFiles.length && dataProvider.uploadMedia) {
    const uploads = [];
    for (const file of selectedFiles) {
      const upload = await dataProvider.uploadMedia(productId, file);
      uploads.push(upload);
    }
    mediaList = mediaList.concat(uploads);
    if (!baseProduct.image && uploads.length) {
      baseProduct.image = uploads[0].url;
    }
  }

  if (!mediaList.length) {
    mediaList.push(createMediaItem(baseProduct.image || FALLBACK_IMAGE));
  }

  const existing = editingProductId ? getProducts().find((item) => item.id === productId) : null;
  const productRecord = {
    id: productId,
    name: baseProduct.name,
    category: baseProduct.category,
    price: baseProduct.price,
    image: baseProduct.image || getPrimaryImageUrl(mediaList),
    media: mediaList,
    description: baseProduct.description,
    featured: baseProduct.featured,
    createdAt: existing?.createdAt || Date.now()
  };

  try {
    if (editingProductId) {
      await dataProvider.updateProduct(productId, productRecord);
      showFormMessage(dom.productMessage, 'Product details updated.');
      await logEvent('product.update', { id: productId, name: productRecord.name });
    } else {
      await dataProvider.createProduct(productRecord);
      showFormMessage(dom.productMessage, 'Product published. It is now visible in the collection.');
      await logEvent('product.create', { id: productId, name: productRecord.name });
    }

    dom.productForm.reset();
    if (dom.mediaFiles) {
      dom.mediaFiles.value = '';
    }
    handleCancelEdit(true);
    await refreshProducts();
    setTimeout(() => showFormMessage(dom.productMessage, ''), 3000);
  } catch (error) {
    console.error('Failed to save product', error);
    showFormMessage(dom.productMessage, error.message || 'Could not save product. Please try again.');
  }
}

function handleFilterChange() {
  renderProducts();
}

function handleCheckout() {
  if (!cartCache.length) {
    return;
  }
  const total = cartCache.reduce((sum, item) => sum + item.price * item.quantity, 0);
  logEvent('checkout.start', { items: cartCache.length, total });
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
      renderAdminProducts();
      renderAdminEvents();
    }
  } else {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (modal === dom.loginModal && dom.loginForm) {
      dom.loginForm.reset();
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
    toggleModal(dom.adminModal, true);
    renderAdminProducts();
    renderAdminEvents();
  } else {
    toggleModal(dom.loginModal, true);
  }
}

async function handleAdminLogin() {
  if (!dom.loginForm) return;
  showFormMessage(dom.loginMessage, '');

  if (supabaseReady) {
    const email = (dom.loginEmail?.value || '').trim();
    const password = (dom.loginPassword?.value || '').trim();
    if (!email || !password) {
      showFormMessage(dom.loginMessage, 'Enter your email and password.');
      return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showFormMessage(dom.loginMessage, error.message || 'Unable to sign in.');
      return;
    }
    adminState.supabaseSession = data.session;
    toggleModal(dom.loginModal, false);
    await refreshProducts();
    await refreshEvents();
    syncAdminState();
    logEvent('admin.login', { email });
    toggleModal(dom.adminModal, true);
  } else {
    const passcode = (dom.loginPassword?.value || '').trim();
    if (passcode !== ADMIN_SECRET) {
      showFormMessage(dom.loginMessage, 'Incorrect passcode. Please try again.');
      return;
    }
    adminState.passcode = true;
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    toggleModal(dom.loginModal, false);
    syncAdminState();
    logEvent('admin.login', {});
    toggleModal(dom.adminModal, true);
  }
}

async function handleAdminLogout() {
  if (supabaseReady) {
    await supabaseClient.auth.signOut();
    adminState.supabaseSession = null;
    await refreshEvents();
  } else {
    adminState.passcode = false;
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }
  toggleModal(dom.adminModal, false);
  syncAdminState();
  logEvent('admin.logout', {});
  alert('You have signed out of the Children of Hope admin portal.');
}

function renderProducts() {
  if (!dom.productGrid) return;
  const products = applyFilters(getProducts(), getFilters());

  dom.productGrid.innerHTML = '';

  if (!products.length) {
    dom.emptyState?.removeAttribute('hidden');
    return;
  }
  dom.emptyState?.setAttribute('hidden', '');

  products.forEach((product) => {
    const card = createProductCard(product);
    dom.productGrid.appendChild(card);
  });
}

function renderAdminProducts() {
  if (!dom.adminProductList) return;
  const products = [...getProducts()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!products.length) {
    dom.adminProductList.innerHTML = '<div class=\"admin-event-empty\">No products yet. Publish your first piece to see it listed here.</div>';
    return;
  }

  dom.adminProductList.innerHTML = '';

  products.forEach((product) => {
    const row = document.createElement('article');
    row.className = 'admin-product-row';
    const featuredPill = product.featured ? '<span class=\"pill\">Featured</span>' : '';
    row.innerHTML = `
      <header>
        <h5>${product.name}</h5>
        ${featuredPill}
      </header>
      <div class=\"meta\">${product.category} • ${currencyFormatter.format(product.price)}</div>
      <div class=\"meta\">${product.media?.length || 0} media item${product.media?.length === 1 ? '' : 's'}</div>
      <div class=\"meta\">Published ${formatTimestamp(product.createdAt)}</div>
      <div class=\"admin-product-actions\">
        <button data-edit-product=\"${product.id}\">Edit</button>
        <button data-delete-product=\"${product.id}\">Remove</button>
      </div>
    `;

    row.querySelector('[data-edit-product]')?.addEventListener('click', () => handleEditProduct(product.id));
    row.querySelector('[data-delete-product]')?.addEventListener('click', () => {
      handleDeleteProduct(product.id).catch((error) => console.error('Failed to delete product', error));
    });

    dom.adminProductList.appendChild(row);
  });
}

function renderAdminEvents() {
  if (!dom.adminEventList || !dom.adminEventSummary) return;
  const events = getEventsList();
  if (!events.length) {
    dom.adminEventSummary.innerHTML = '<div class=\"admin-note\">No activity recorded yet. Shopper and inquiry events will appear here once your community interacts with the site.</div>';
    dom.adminEventList.innerHTML = '<div class=\"admin-event-empty\">No events logged.</div>';
    return;
  }

  const summary = summarizeEvents(events);
  dom.adminEventSummary.innerHTML = `
    <span><strong>${events.length}</strong> total events logged</span>
    <span><strong>${summary['product.viewImage'] || 0}</strong> gallery views</span>
    <span><strong>${summary['cart.add'] || 0}</strong> cart additions</span>
    <span><strong>${summary['checkout.start'] || 0}</strong> checkout attempts</span>
    <span><strong>${summary['contact.submit'] || 0}</strong> inquiries received</span>
  `;

  const recent = events.slice(0, 20);
  dom.adminEventList.innerHTML = '';

  recent.forEach((event) => {
    const row = document.createElement('article');
    row.className = 'admin-event-row';
    row.innerHTML = `
      <header>
        <h5>${formatEventLabel(event.type, event.detail)}</h5>
        <span class=\"pill\">${getEventCategory(event.type)}</span>
      </header>
      <div class=\"meta\">${formatTimestamp(event.createdAt)}</div>
      <div class=\"meta\">${formatEventDetail(event.type, event.detail)}</div>
    `;
    dom.adminEventList.appendChild(row);
  });
}

function handleEditProduct(id) {
  if (!dom.productForm || !isAdmin()) return;
  const product = getProducts().find((item) => item.id === id);
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
  if (dom.mediaFiles) {
    dom.mediaFiles.value = '';
  }

  if (dom.submitProduct) {
    dom.submitProduct.textContent = 'Update Product';
  }
  dom.cancelEdit?.removeAttribute('hidden');
  showFormMessage(dom.productMessage, 'Editing product. Update the details and click Update Product to save.');
  dom.productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDeleteProduct(id) {
  if (!isAdmin()) return;
  const target = getProducts().find((item) => item.id === id);
  if (!target) return;

  const confirmed = confirm(`Remove "${target.name}" from the collection?`);
  if (!confirmed) return;

  await dataProvider.deleteProduct(id);
  await refreshProducts();
  logEvent('product.delete', { id: target.id, name: target.name });
  showFormMessage(dom.productMessage, 'Product removed from the collection.');
  setTimeout(() => showFormMessage(dom.productMessage, ''), 3000);
}

function handleCancelEdit(silent = false) {
  if (!dom.productForm) return;
  editingProductId = null;
  dom.productForm.reset();
  const idField = dom.productForm.querySelector('input[name="productId"]');
  if (idField) idField.value = '';
  if (dom.mediaFiles) dom.mediaFiles.value = '';
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
  logEvent('product.viewImage', { id: product.id, name: product.name, mediaIndex: 0, mediaType: media[0]?.kind || 'image' });
}

async function refreshProducts() {
  productCache = await dataProvider.listProducts();
  renderProducts();
  hydrateCategories();
  hydrateFeatured();
  renderAdminProducts();
}

async function refreshEvents() {
  if (!dataProvider.listEvents) return;
  try {
    eventCache = await dataProvider.listEvents();
  } catch (error) {
    console.error('Failed to load events', error);
    eventCache = [];
  }
  renderAdminEvents();
}

function addToCart(product) {
  const existing = cartCache.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    const coverImage = getPrimaryImageUrl(getProductMedia(product));
    cartCache.push({ id: product.id, name: product.name, price: product.price, image: coverImage, quantity: 1 });
  }
  saveCart(cartCache);
  logEvent('cart.add', { id: product.id, name: product.name });
}

function removeCartItem(id) {
  const removed = cartCache.find((item) => item.id === id);
  cartCache = cartCache.filter((item) => item.id !== id);
  saveCart(cartCache);
  if (removed) {
    logEvent('cart.remove', { id: removed.id, name: removed.name });
  }
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

function getCart() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartUI(cart);
}

function getProducts() {
  return productCache;
}

function getEventsList() {
  return eventCache;
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
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return result;
}

function hydrateCategories() {
  if (!dom.filterForm) return;
  const select = dom.filterForm.querySelector('select[name="category"]');
  if (!select) return;

  const categories = Array.from(new Set(getProducts().map((item) => item.category))).sort();
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

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.productId = product.id;

  const media = getProductMedia(product);
  const coverMarkup = renderProductCover(media[0], product.name);

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

function getProductMedia(product) {
  if (product?.media && product.media.length) {
    return product.media.map(normalizeMediaItem).filter(Boolean);
  }
  const fallback = product?.image || FALLBACK_IMAGE;
  return [createMediaItem(fallback)];
}

function renderProductCover(media, alt) {
  const kind = media?.kind || 'image';
  const preview = getMediaPreview(media);
  const safeAlt = alt || 'Product media';
  const videoClass = kind === 'video' || kind === 'youtube' || kind === 'vimeo' ? ' video' : '';
  return `<div class="product-cover${videoClass}"><img src="${preview}" alt="${safeAlt}" onerror="this.src='${FALLBACK_IMAGE}';" /></div>`;
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

function renderGalleryStage() {
  if (!dom.modalStage || !currentGallery.media.length) return;
  const media = currentGallery.media[currentGallery.index];
  const productName = currentGallery.product?.name || 'Product';
  const mediaAlt = `${productName} media ${currentGallery.index + 1}`;

  let markup = '';
  switch (media.kind) {
    case 'image':
      markup = `<img src="${media.url}" alt="${mediaAlt}" onerror="this.src='${FALLBACK_IMAGE}';" />`;
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
          <img src="${preview}" alt="Thumbnail ${index + 1}" onerror="this.src='${FALLBACK_IMAGE}';" />
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
    const media = currentGallery.media[bounded];
    logEvent('product.viewImage', {
      id: currentGallery.product?.id,
      name: currentGallery.product?.name,
      mediaIndex: bounded,
      mediaType: media?.kind || 'image'
    });
  }
}

function stepGallery(delta) {
  if (!currentGallery.media.length) return;
  setGalleryIndex(currentGallery.index + delta, true);
}

async function logEvent(type, detail = {}) {
  if (!dataProvider.logEvent) return;
  try {
    const eventRecord = await dataProvider.logEvent(type, detail);
    if (eventRecord) {
      const normalized = normalizeEventRecord(eventRecord);
      eventCache = [normalized, ...eventCache].slice(0, MAX_EVENTS);
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
  return supabaseReady ? Boolean(adminState.supabaseSession) : Boolean(adminState.passcode);
}

function syncAdminState() {
  if (supabaseReady) {
    dom.logoutAdmin?.toggleAttribute('hidden', !adminState.supabaseSession);
  } else {
    dom.logoutAdmin?.toggleAttribute('hidden', !adminState.passcode);
  }
}

function createLocalProvider() {
  function ensureProducts() {
    const stored = safeParse(localStorage.getItem(STORAGE_KEYS.PRODUCTS));
    if (!stored || !stored.length) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalizeProducts(defaultProducts)));
    }
  }

  function ensureEvents() {
    const stored = safeParse(localStorage.getItem(STORAGE_KEYS.EVENTS));
    if (!Array.isArray(stored)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    }
  }

  function readProducts() {
    const stored = safeParse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
    return normalizeProducts(stored);
  }

  function saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  function readEvents() {
    const stored = safeParse(localStorage.getItem(STORAGE_KEYS.EVENTS)) || [];
    return stored.map(normalizeEventRecord);
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events.slice(0, MAX_EVENTS)));
  }

  return {
    async init() {
      ensureProducts();
      ensureEvents();
    },
    async listProducts() {
      return readProducts();
    },
    async createProduct(product) {
      const products = readProducts();
      products.push(product);
      saveProducts(products);
      return product;
    },
    async updateProduct(id, product) {
      const products = readProducts().map((item) => (item.id === id ? product : item));
      saveProducts(products);
      return product;
    },
    async deleteProduct(id) {
      const products = readProducts().filter((item) => item.id !== id);
      saveProducts(products);
    },
    async listEvents() {
      return readEvents();
    },
    async logEvent(type, detail) {
      const events = readEvents();
      const event = normalizeEventRecord({ id: createId(), type, detail, createdAt: Date.now() });
      events.unshift(event);
      saveEvents(events);
      return event;
    },
    uploadMedia: null
  };
}

function createSupabaseProvider() {
  async function initAuthListeners() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      adminState.supabaseSession = data?.session || null;
    } catch (error) {
      console.error('Unable to fetch Supabase session', error);
    }
    supabaseClient.auth.onAuthStateChange((event, session) => {
      adminState.supabaseSession = session;
      syncAdminState();
      if (session) {
        refreshProducts();
        refreshEvents();
      }
    });
  }

  return {
    async init() {
      await initAuthListeners();
    },
    async listProducts() {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return normalizeProducts(data || []);
    },
    async createProduct(product) {
      const prepared = prepareProductForSupabase(product);
      const { data, error } = await supabaseClient
        .from('products')
        .insert(prepared)
        .select()
        .single();
      if (error) throw error;
      return normalizeProduct(data);
    },
    async updateProduct(id, product) {
      const prepared = prepareProductForSupabase(product, true);
      const { data, error } = await supabaseClient
        .from('products')
        .update(prepared)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizeProduct(data);
    },
    async deleteProduct(id) {
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    async uploadMedia(productId, file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabaseClient.storage.from(storageBucket).upload(fileName, file, {
        cacheControl: '3600'
      });
      if (error) throw error;
      const { data } = supabaseClient.storage.from(storageBucket).getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;
      return {
        url: publicUrl,
        kind: detectMediaKind(fileName),
        storagePath: fileName
      };
    },
    async listEvents() {
      const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_EVENTS);
      if (error) throw error;
      return (data || []).map(normalizeEventRecord);
    },
    async logEvent(type, detail) {
      const payload = {
        id: createId(),
        type,
        detail,
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabaseClient
        .from('events')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return normalizeEventRecord(data);
    }
  };
}

function prepareProductForSupabase(product, isUpdate = false) {
  const record = {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
    image: product.image,
    media: product.media,
    featured: product.featured
  };
  if (!isUpdate) {
    record.created_at = new Date(product.createdAt || Date.now()).toISOString();
  }
  return record;
}

function normalizeProducts(products) {
  return (products || [])
    .map(normalizeProduct)
    .filter(Boolean);
}

function normalizeProduct(product) {
  if (!product) return null;
  const media = Array.isArray(product.media) ? product.media.map(normalizeMediaItem).filter(Boolean) : [];
  const createdAt = product.createdAt || product.timestamp || (product.created_at ? new Date(product.created_at).getTime() : Date.now());
  const image = product.image || getPrimaryImageUrl(media);
  return {
    ...product,
    id: product.id || createId(),
    image,
    media: media.length ? media : [createMediaItem(image)],
    createdAt
  };
}

function normalizeMediaItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return createMediaItem(item);
  }
  if (!item.url) return null;
  return {
    url: item.url,
    kind: item.kind || item.type || detectMediaKind(item.url),
    poster: item.poster || null,
    storagePath: item.storagePath || item.path || null
  };
}

function normalizeEventRecord(event) {
  if (!event) return null;
  return {
    id: event.id || createId(),
    type: event.type,
    detail: event.detail || {},
    createdAt: event.createdAt || event.timestamp || (event.created_at ? new Date(event.created_at).getTime() : Date.now())
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

  if (primary) push(primary);

  rawInput
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .forEach(push);

  return entries;
}

function createMediaItem(url, extra = {}) {
  return {
    url,
    kind: detectMediaKind(url),
    ...extra
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
