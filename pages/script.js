// E-commerce functionality for Mithila Chitrakala (Frontend Only)

// Global state management
let products = [];
let cart = JSON.parse(localStorage.getItem('mithila-cart') || '[]');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load products
        await loadProducts();

        // Update cart count
        updateCartCount();

        // Initialize page-specific functionality
        const currentPage = getCurrentPage();
        switch (currentPage) {
            case 'home':
                initializeHomePage();
                break;
            case 'products':
                initializeProductsPage();
                break;
            case 'product':
                await initializeProductPage();
                break;
            case 'cart':
                initializeCartPage();
                break;
            case 'checkout':
                initializeCheckoutPage();
                break;
        }

        // Initialize common functionality
        initializeCommonFeatures();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showErrorMessage('Failed to load application. Please refresh the page.');
    }
}

// Utility functions
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('index.html')) return 'home';
    if (path.endsWith('products.html')) return 'products';
    if (path.endsWith('product.html')) return 'product';
    if (path.endsWith('cart.html')) return 'cart';
    if (path.endsWith('checkout.html')) return 'checkout';
    return 'unknown';
}

function showErrorMessage(message) {
    console.error(message);
    alert(message);
}

function showSuccessMessage(message) {
    console.log(message);
    alert(message);
}

// Load products (from API, fallback to static JSON)
async function loadProducts() {
    try {
        // Try API first
        let response;
        try {
            response = await fetch('/api/products');
            if (!response.ok) throw new Error('API products fetch failed');
            products = await response.json();
            return products;
        } catch (apiErr) {
            console.warn('API unavailable, falling back to static JSON:', apiErr.message);
        }

    // Fallback to local file (useful during development without server)
    response = await fetch('server/products.json');
        if (!response.ok) throw new Error('Failed to fetch products');
        products = await response.json();
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        throw error;
    }
}

// Get single product by slug (from already loaded list)
async function getProduct(slug) {
    if (!products.length) {
        await loadProducts();
    }
    return products.find(p => p.slug === slug) || null;
}

// Submit order to backend API (falls back to localStorage if API unavailable)
async function submitOrder(orderData) {
    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!res.ok) {
            // if server returns error, fallback to local storage
            throw new Error('Server rejected order');
        }

        const json = await res.json();
        return { orderId: json.orderId };
    } catch (err) {
        console.warn('Order API unavailable, saving order locally:', err.message);
        // Local fallback: keep existing behavior
        let orders = JSON.parse(localStorage.getItem('mithila-orders') || '[]');
        const orderId = 'ORD-' + Date.now();
        orders.push({ ...orderData, orderId });
        localStorage.setItem('mithila-orders', JSON.stringify(orders));
        return { orderId };
    }
}

// Cart management functions
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showErrorMessage('Product not found');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            slug: product.slug,
            quantity: quantity
        });
    }
    
    saveCart();
    updateCartCount();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    
    // Refresh cart page if we're on it
    if (getCurrentPage() === 'cart') {
        renderCartItems();
    }
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            saveCart();
            updateCartCount();
            
            // Update cart page if we're on it
            if (getCurrentPage() === 'cart') {
                renderCartItems();
            }
        }
    }
}

function saveCart() {
    localStorage.setItem('mithila-cart', JSON.stringify(cart));
}

function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity), 0);

    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}


function calculateCartTotal() {
    return cart.reduce((total, item) => {
        const price = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
        return total + (price * item.quantity);
    }, 0);
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartCount();
}

// Rendering functions
function renderProductCard(product, container = null) {
    const badge = `<div class="product-badge">${product.badge}</div>`;

    const productHTML = `
        <div class="product-card" data-testid="card-product-${product.id}">
            <a href="product.html?slug=${product.slug}" class="product-link">
                <div class="product-image">
                    ${badge}
                    <img src="${product.image}" alt="${product.name}" />
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">रु${product.price}</div>
                </div>
            </a>
            <div class="product-actions">
                <button class="add-to-cart" onclick="addToCart('${product.id}')"><i class="fa-solid fa-cart-arrow-down"></i> Add to Cart</button>
            </div>
        </div>
    `;

    if (container) {
        container.insertAdjacentHTML('beforeend', productHTML);
    }
    return productHTML;
}

// ✅ NEW: Render Cart Page
function renderCartItems() {
    const cartContainer = document.getElementById('cart-items');
    const totalContainer = document.getElementById('cart-total');
    const subtotalContainer = document.getElementById('cart-subtotal')
    const shippingFeeContainer = document.getElementById('shipping-fee')


    if (!cartContainer || !totalContainer) return;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty</p>';
        totalContainer.textContent = 'रु0';
        return;
    }

    cart.forEach(item => {
        // FIXED: Parse price correctly by removing non-numeric characters first
        // OLD: const price = Number(item.price); // This was wrong because item.price includes "रु"
        const price = parseFloat(item.price.replace(/[^0-9.-]+/g, '')); 
        const quantity = Number(item.quantity);
        const itemTotal = price * quantity;

        cartContainer.innerHTML += `
            <div class="cart-item" data-testid="item-cart-${item.id}">
                <img src="${item.image}" alt="${item.name}" data-testid="img-cart-${item.id}" />
                <div class="cart-item-info">
                    <h3 data-testid="text-cart-name-${item.id}">${item.name}</h3>
                    <!-- FIXED: Show proper price formatting -->
                    <p data-testid="text-cart-price-${item.id}">रु${price} x ${item.quantity} = रु${itemTotal}</p>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})" data-testid="button-decrease-${item.id}">-</button>
                    <span data-testid="text-quantity-${item.id}">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})" data-testid="button-increase-${item.id}">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')" data-testid="button-remove-${item.id}">Remove</button>
            </div>
        `;
    });

    // Delivery charge logic
    let subtotal = calculateCartTotal();
    let deliveryCharge;
    let total;

    if (subtotal >= 4000) {
        deliveryCharge = 'FREE';
        total = subtotal;
    } else {
        deliveryCharge = 100;
        total = subtotal + deliveryCharge;
    }

    // FIXED: Format delivery charge display consistently
    shippingFeeContainer.textContent = deliveryCharge === 'FREE' ? deliveryCharge : 'रु' + deliveryCharge;
    subtotalContainer.textContent = 'रु' + subtotal;
    totalContainer.textContent = `रु ${total}`;
}

// ✅ NEW: Render Checkout Page
function renderOrderItems() {
    const orderItemsContainer = document.getElementById('order-items');
    const orderTotalContainer = document.getElementById('order-total');
    const subtotalContainer = document.getElementById('order-subtotal')
    const shippingFeeContainer = document.getElementById('shipping-fee')

    if (!orderItemsContainer || !orderTotalContainer) return;

    orderItemsContainer.innerHTML = '';
    cart.forEach(item => {
        const price = parseFloat(item.price.replace(/[^0-9.-]+/g, '')); // Fix price parsing
        const quantity = Number(item.quantity);
        const itemTotal = price * quantity;

        orderItemsContainer.innerHTML += `
            <div class="order-item" data-testid="item-order-${item.id}">
                <img src="${item.image}" alt="${item.name}" data-testid="img-order-${item.id}" />
                <div class="order-item-info">
                    <h4 data-testid="text-order-name-${item.id}">${item.name}</h4>
                    <p data-testid="text-order-details-${item.id}">Qty: ${item.quantity} × रु${price} = रु${itemTotal}</p>
                </div>
            </div>
        `;
    });

    // Delivery charge logic
    let subtotal = calculateCartTotal();
    let deliveryCharge;
    let total;

    if (subtotal >= 4000) {
        deliveryCharge = 'FREE';
        total = subtotal;
    } else {
        deliveryCharge = 100;
        total = subtotal + deliveryCharge;
    }

    shippingFeeContainer.textContent = deliveryCharge === 'FREE' ? deliveryCharge : 'रु' + deliveryCharge;
    subtotalContainer.textContent = 'रु' + subtotal;
    orderTotalContainer.textContent = `रु ${total}`;
}

// Page initialization functions
function initializeHomePage() {
    const featuredContainer = document.getElementById('featured-products');
    if (featuredContainer) {
        const featuredProducts = products.filter(product => product.featured).slice(0, 9);
        featuredProducts.forEach(product => {
            renderProductCard(product, featuredContainer);
        });
    }

    // initialize partner stores marquee if present
    if (document.querySelector('.partner-marquee-outer')) {
        loadPartnerStores();
    }
}

function initializeProductsPage() {
    const productsContainer = document.getElementById('all-products');
    const loadingElement = document.getElementById('loading');
    const emptyElement = document.getElementById('empty-state');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (!productsContainer) return;
    
    function renderProducts(productsToRender = products) {
        productsContainer.innerHTML = '';
        loadingElement.style.display = 'none';
        
        if (productsToRender.length === 0) {
            emptyElement.style.display = 'block';
            return;
        }
        
        emptyElement.style.display = 'none';
        productsToRender.forEach(product => {
            renderProductCard(product, productsContainer);
        });
    }
    
    function filterAndSortProducts() {
        let filteredProducts = [...products];
        
        // Apply category filter
        const selectedCategory = categoryFilter.value;
        if (selectedCategory) {
            filteredProducts = filteredProducts.filter(product => 
                product.category === selectedCategory
            );
        }
        
        // Apply sorting
        const sortBy = sortFilter.value;
        switch (sortBy) {
            case 'name':
                filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-low':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''));
                    return priceA - priceB;
                });
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''));
                    return priceB - priceA;
                });
                break;
        }
        
        renderProducts(filteredProducts);
    }
    
    // Add event listeners for filters
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndSortProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterAndSortProducts);
    }
    
    // Check URL parameters for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && categoryFilter) {
        categoryFilter.value = categoryParam;
    }
    
    // Initial render
    filterAndSortProducts();
}

async function initializeProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const product = await getProduct(slug);

    if (!product) {
        showErrorMessage('Product not found');
        return;
    }

    const productContainer = document.getElementById('product-detail');
    if (productContainer) {
        productContainer.innerHTML = `
            <div class="product-detail">
                <img src="${product.image}" alt="${product.name}" />
                <h2>${product.name}</h2>
                <p>${product.description}</p>
                <div class="product-price">रु${product.price}</div>
                <button onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        `;
    }
}

function initializeCartPage() {
    renderCartItems();
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            if (cart.length === 0) {
                showErrorMessage('Your cart is empty');
                return;
            }
            window.location.href = 'checkout.html';
        });
    }
}

function initializeCheckoutPage() {
    if (cart.length === 0) {
        showErrorMessage('Your cart is empty');
        window.location.href = 'cart.html';
        return;
    }
  
    renderOrderItems();

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
}

// ---- Checkout ----
async function handleCheckoutSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitButton = document.getElementById('place-order-button');

    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    try {
                
             
        const formData = new FormData(form);
        const orderData = {
            name: formData.get('name'),
            email: formData.get('email'),
            address: formData.get('address'),
            phone: formData.get('phone') || '',
            items: cart,
            total: calculateCartTotal()
        };

        const response = await submitOrder(orderData);

        // --- Build WhatsApp Message ---
        let subtotal = calculateCartTotal();
        let deliveryCharge
        let total
    
        if (subtotal >= 4000 ){
        deliveryCharge = 'FREE';
        total = subtotal ;
      
    }
    else {
        deliveryCharge = 100;
        total = subtotal + deliveryCharge;
    };

        let itemsText = orderData.items.map(item => 
            `${item.name} (x${item.quantity}) - रु${item.price}`
        ).join('\n');

        let message = `🛒 New Order!\n\n` +
                      `👤 Name: ${orderData.name}\n` +
                      `📧 Email: ${orderData.email}\n` +
                      `📍 Address: ${orderData.address}\n` +
                      `📞 Phone: ${orderData.phone}\n\n` +
                      `🛍️ Items: \n${itemsText}\n\n` +
                      `🛍️ SubTotal:रु${subtotal}\n\n` +
                      `🛍️ Delivery:रु${deliveryCharge}\n\n` +
                      `💰 Total: रु${total}\n` +
                      `✅ Order ID: ${response.orderId}`;

        // Open WhatsApp with pre-filled message
        const whatsappURL = `https://wa.me/9766115626?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, "_blank");

        showSuccessMessage(`Order placed successfully! Order ID: ${response.orderId}`);
        clearCart();
        window.location.href = 'index.html';

    } catch (error) {
        showErrorMessage('Failed to place order. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
    }
}


// Share functionality
      window.shareProduct = function(name, description, url) {
        const shareData = { title: name, text: description, url };
        if (navigator.share) {
          navigator.share(shareData).catch(() => fallbackShare(url));
        } else {
          fallbackShare(url);
        }
      }

            function fallbackShare(url) {
                // Create a small mobile-friendly modal (bottom sheet style) to show share options
                // If clipboard is available, enable copy; always provide WhatsApp and Close options.
                const existing = document.getElementById('mc-share-modal');
                if (existing) return; // already open

                const overlay = document.createElement('div');
                overlay.id = 'mc-share-modal';
                overlay.style.position = 'fixed';
                overlay.style.left = '0';
                overlay.style.right = '0';
                overlay.style.top = '0';
                overlay.style.bottom = '0';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'flex-end';
                overlay.style.background = 'rgba(0,0,0,0.35)';
                overlay.style.zIndex = '12000';

                const sheet = document.createElement('div');
                sheet.style.width = '100%';
                sheet.style.maxWidth = '600px';
                sheet.style.borderTopLeftRadius = '12px';
                sheet.style.borderTopRightRadius = '12px';
                sheet.style.background = '#fff';
                sheet.style.padding = '14px';
                sheet.style.boxShadow = '0 -8px 30px rgba(0,0,0,0.2)';
                sheet.style.fontFamily = 'inherit';

                const title = document.createElement('div');
                title.textContent = 'Share product';
                title.style.fontWeight = '700';
                title.style.marginBottom = '8px';

                const urlBox = document.createElement('input');
                urlBox.type = 'text';
                urlBox.value = url;
                urlBox.readOnly = true;
                urlBox.style.width = '100%';
                urlBox.style.padding = '10px';
                urlBox.style.border = '1px solid #e5e7eb';
                urlBox.style.borderRadius = '8px';
                urlBox.style.marginBottom = '10px';

                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.gap = '8px';

                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy link';
                copyBtn.style.flex = '1';
                copyBtn.style.padding = '10px';
                copyBtn.style.border = 'none';
                copyBtn.style.borderRadius = '8px';
                copyBtn.style.background = 'linear-gradient(90deg,#ef4444,#fb923c)';
                copyBtn.style.color = 'white';
                copyBtn.style.fontWeight = '600';

                const waBtn = document.createElement('button');
                waBtn.textContent = 'WhatsApp';
                waBtn.style.flex = '1';
                waBtn.style.padding = '10px';
                waBtn.style.border = 'none';
                waBtn.style.borderRadius = '8px';
                waBtn.style.background = '#25D366';
                waBtn.style.color = 'white';
                waBtn.style.fontWeight = '600';

                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Close';
                closeBtn.style.width = '100%';
                closeBtn.style.marginTop = '10px';
                closeBtn.style.padding = '10px';
                closeBtn.style.border = '1px solid #e5e7eb';
                closeBtn.style.borderRadius = '8px';
                closeBtn.style.background = '#fff';
                closeBtn.style.fontWeight = '600';

                actions.appendChild(copyBtn);
                actions.appendChild(waBtn);

                sheet.appendChild(title);
                sheet.appendChild(urlBox);
                sheet.appendChild(actions);
                sheet.appendChild(closeBtn);
                overlay.appendChild(sheet);
                document.body.appendChild(overlay);

                // Event handlers
                copyBtn.addEventListener('click', async () => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        try {
                            await navigator.clipboard.writeText(url);
                            copyBtn.textContent = 'Copied';
                            setTimeout(() => copyBtn.textContent = 'Copy link', 2000);
                        } catch (e) {
                            // fallback to select + execCommand
                            urlBox.select();
                            document.execCommand('copy');
                            copyBtn.textContent = 'Copied';
                            setTimeout(() => copyBtn.textContent = 'Copy link', 2000);
                        }
                    } else {
                        urlBox.select();
                        document.execCommand('copy');
                        copyBtn.textContent = 'Copied';
                        setTimeout(() => copyBtn.textContent = 'Copy link', 2000);
                    }
                });

                waBtn.addEventListener('click', () => {
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(url)}`;
                    window.open(waUrl, '_blank');
                });

                function closeModal() {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }

                closeBtn.addEventListener('click', closeModal);
                overlay.addEventListener('click', (ev) => {
                    if (ev.target === overlay) closeModal();
                });
            }

// ---- Common ----
function initializeCommonFeatures() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
    }

    if (mobileMenuToggle && navLinks && overlay) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            navLinks.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Newsletter
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
}

function handleNewsletterSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const emailInput = form.querySelector('.newsletter-input');
      const email = emailInput.value;

      if (!email || !email.includes('@')) {
        showErrorMessage('Please enter a valid email address');
        return;
      }

      showSuccessMessage('Thank you for subscribing!');
      form.reset();
    }

    function showSuccessMessage(message) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.8)';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '1000';

      // Create modal box
      const modal = document.createElement('div');
      modal.style.background = '#fafafaff';
      modal.style.border = 'none';
      modal.style.borderRadius = '10px';
      modal.style.padding = '30px';
      modal.style.textAlign = 'center';
      modal.style.width = '300px';

      // Title
      const title = document.createElement('h2');
      title.innerText = 'Success!';
      title.style.color = 'hsl(210, 29%, 24%)';

      // Message
      const msg = document.createElement('p');
      msg.innerText = message;

      // Close button
      const btn = document.createElement('button');
      btn.innerText = 'OK';
      btn.style.marginTop = '20px';
      btn.style.background = 'hsla(0, 81%, 58%, 1.00)';
      btn.style.color = 'hsla(0, 0%, 94%, 1.00)';
      btn.style.border = 'none';
      btn.style.padding = '10px 15px';
      btn.style.borderRadius = '5px';
      btn.style.fontSize = '1rem';
      btn.style.cursor = 'pointer';

      btn.onclick = () => document.body.removeChild(overlay);

      // Assemble modal
      modal.appendChild(title);
      modal.appendChild(msg);
      modal.appendChild(btn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    }

    function showErrorMessage(message) {
      alert(message); // still using alert for error
    }


// Partner stores marquee — seamless, card-by-card loop
async function loadPartnerStores() {
    const outer = document.querySelector('.partner-marquee-outer');
    const inner = document.querySelector('.partner-marquee-inner');
    if (!outer || !inner) return;
    try {
    const res = await fetch('/api/partners');
        if (!res.ok) throw new Error('Failed to fetch partner-store.json');
        let stores = await res.json();

        // keep unique stores by id (in case JSON has duplicates)
        const seen = new Set();
        stores = stores.filter(s => {
            if (!s || !s.id) return false;
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });

        // render cards
        inner.innerHTML = stores.map(store => `
            <div class="partner-card" aria-label="${store.name}">
                <img src="${store.logo}" alt="${store.name} Logo" class="partner-card-logo" />
                <div class="partner-card-name">${store.name}</div>
                <div class="partner-card-location"><i class="fa-solid fa-location-dot"></i> ${store.location}</div>
                <div class="partner-card-contact"><i class="fa-solid fa-phone"></i> ${store.contact}</div>
                <a href="${store.website}" class="partner-card-website" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe"></i> Website</a>
            </div>
        `).join('');

        // ensure no CSS transition interferes
        inner.style.transition = 'none';
        inner.style.willChange = 'transform';

        // compute gap (flex gap)
        const gapStr = getComputedStyle(inner).gap || '0px';
        const gap = parseFloat(gapStr) || 0;

        let translate = 0;             // total pixels scrolled
        let lastTimestamp = null;
        const speed = 80;              // pixels per second — adjust for desired speed
        let running = true;

        // optional: pause on hover to improve UX
        outer.addEventListener('mouseenter', () => running = false);
        outer.addEventListener('mouseleave', () => running = true);

        function step(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const delta = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            if (running) {
                translate += speed * delta;

                // If first card scrolled past fully, move it to the end and subtract its width from translate
                const first = inner.firstElementChild;
                if (first) {
                    const firstWidth = first.offsetWidth + gap;
                    if (translate >= firstWidth) {
                        // move one or more cards if translate advanced more than one card width
                        // use loop to handle large delta safely
                        let moved = 0;
                        while (translate >= firstWidth && inner.children.length > 0) {
                            const node = inner.firstElementChild;
                            // re-calc width for node before moving (widths can differ)
                            const w = node.offsetWidth + gap;
                            translate -= w;
                            inner.appendChild(node);
                            moved++;
                            // update firstWidth for next potential loop iteration
                            if (!inner.firstElementChild) break;
                        }
                    }
                }

                inner.style.transform = `translateX(-${translate}px)`;
            }

            requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    } catch (err) {
        console.error('Partner stores load error:', err);
        inner.innerHTML = '<div style="padding:1rem;color:#b00">Unable to load partner stores.</div>';
    }
}

// Page init: call marquee loader on home page
function initializeHomePage() {
    const featuredContainer = document.getElementById('featured-products');
    if (featuredContainer) {
        const featuredProducts = products.filter(product => product.featured).slice(0, 12);
        featuredProducts.forEach(product => {
            renderProductCard(product, featuredContainer);
        });
    }

    // initialize partner stores marquee if present
    if (document.querySelector('.partner-marquee-outer')) {
        loadPartnerStores();
    }
}

function initializeProductsPage() {
    const productsContainer = document.getElementById('all-products');
    const loadingElement = document.getElementById('loading');
    const emptyElement = document.getElementById('empty-state');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (!productsContainer) return;
    
    function renderProducts(productsToRender = products) {
        productsContainer.innerHTML = '';
        loadingElement.style.display = 'none';
        
        if (productsToRender.length === 0) {
            emptyElement.style.display = 'block';
            return;
        }
        
        emptyElement.style.display = 'none';
        productsToRender.forEach(product => {
            renderProductCard(product, productsContainer);
        });
    }
    
    function filterAndSortProducts() {
        let filteredProducts = [...products];
        
        // Apply category filter
        const selectedCategory = categoryFilter.value;
        if (selectedCategory) {
            filteredProducts = filteredProducts.filter(product => 
                product.category === selectedCategory
            );
        }
        
        // Apply sorting
        const sortBy = sortFilter.value;
        switch (sortBy) {
            case 'name':
                filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-low':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''));
                    return priceA - priceB;
                });
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''));
                    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''));
                    return priceB - priceA;
                });
                break;
        }
        
        renderProducts(filteredProducts);
    }
    
    // Add event listeners for filters
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAndSortProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterAndSortProducts);
    }
    
    // Check URL parameters for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && categoryFilter) {
        categoryFilter.value = categoryParam;
    }
    
    // Initial render
    filterAndSortProducts();
}

async function initializeProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const product = await getProduct(slug);

    if (!product) {
        showErrorMessage('Product not found');
        return;
    }

    const productContainer = document.getElementById('product-detail');
    if (productContainer) {
        productContainer.innerHTML = `
            <div class="product-detail">
                <img src="${product.image}" alt="${product.name}" />
                <h2>${product.name}</h2>
                <p>${product.description}</p>
                <div class="product-price">रु${product.price}</div>
                <button onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        `;
    }
}

function initializeCartPage() {
    renderCartItems();
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            if (cart.length === 0) {
                showErrorMessage('Your cart is empty');
                return;
            }
            window.location.href = 'checkout.html';
        });
    }
}

function initializeCheckoutPage() {
    if (cart.length === 0) {
        showErrorMessage('Your cart is empty');
        window.location.href = 'cart.html';
        return;
    }
  
    renderOrderItems();

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
}


// ---- Common ----
function initializeCommonFeatures() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
    }

    if (mobileMenuToggle && navLinks && overlay) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            navLinks.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Newsletter
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
}

function handleNewsletterSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const emailInput = form.querySelector('.newsletter-input');
      const email = emailInput.value;

      if (!email || !email.includes('@')) {
        showErrorMessage('Please enter a valid email address');
        return;
      }

      showSuccessMessage('Thank you for subscribing!');
      form.reset();
    }

    function showSuccessMessage(message) {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.8)';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '1000';

      // Create modal box
      const modal = document.createElement('div');
      modal.style.background = '#fafafaff';
      modal.style.border = 'none';
      modal.style.borderRadius = '10px';
      modal.style.padding = '30px';
      modal.style.textAlign = 'center';
      modal.style.width = '300px';

      // Title
      const title = document.createElement('h2');
      title.innerText = 'Success!';
      title.style.color = 'hsl(210, 29%, 24%)';

      // Message
      const msg = document.createElement('p');
      msg.innerText = message;

      // Close button
      const btn = document.createElement('button');
      btn.innerText = 'OK';
      btn.style.marginTop = '20px';
      btn.style.background = 'hsla(0, 81%, 58%, 1.00)';
      btn.style.color = 'hsla(0, 0%, 94%, 1.00)';
      btn.style.border = 'none';
      btn.style.padding = '10px 15px';
      btn.style.borderRadius = '5px';
      btn.style.fontSize = '1rem';
      btn.style.cursor = 'pointer';

      btn.onclick = () => document.body.removeChild(overlay);

      // Assemble modal
      modal.appendChild(title);
      modal.appendChild(msg);
      modal.appendChild(btn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    }

    function showErrorMessage(message) {
      alert(message); // still using alert for error
    }

// SITE LOADER: remove overlay only after full window load (images/CSS fetched).
(function () {
  const loader = document.getElementById('site-loader');
  if (!loader) return;

  // ensure loader is visible immediately on DOM ready
  document.documentElement.classList.add('has-site-loader');

  const minVisibleMs = 500; // minimum time loader stays visible for smooth UX
  const t0 = Date.now();

  // When everything finishes loading (images, styles, subresources)
  window.addEventListener('load', () => {
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, minVisibleMs - elapsed);

    // small wait then fade out
    setTimeout(() => {
      // add class that transitions opacity -> CSS will hide it
      loader.classList.add('site-loader--hide');
      loader.setAttribute('aria-hidden', 'true');

      // remove from DOM after transition ends to avoid occupying z-index
      setTimeout(() => {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 600); // match CSS transition duration
    }, 80 + wait);
  });

  // Optional: if page becomes interactive but load hangs, allow escape via click (dev convenience)
  loader.addEventListener('click', () => {
    loader.classList.add('site-loader--hide');
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 600);
  });
})();

// Export global functions
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.shareProduct = window.shareProduct;

async function loadPartnerStores() {
    const outer = document.querySelector('.partner-marquee-outer');
    const inner = document.querySelector('.partner-marquee-inner');
    if (!outer || !inner) return;

    try {
    const res = await fetch('/api/partners');
        if (!res.ok) throw new Error('Failed to fetch partner-store.json');
        let stores = await res.json();

        // keep unique stores by id
        const seen = new Set();
        stores = stores.filter(s => s && s.id && !seen.has(s.id) && seen.add(s.id));

        if (stores.length === 0) {
            inner.innerHTML = '<div style="padding:1rem;color:#b00">No partner stores found.</div>';
            return;
        }

        // render cards (single set)
        inner.innerHTML = stores.map(store => `
            <div class="partner-card" aria-label="${store.name}">
                <img src="${store.logo}" alt="${store.name} Logo" class="partner-card-logo" />
                <div class="partner-card-name">${store.name}</div>
                <div class="partner-card-location"><i class="fa-solid fa-location-dot"></i> ${store.location}</div>
                <div class="partner-card-contact"><i class="fa-solid fa-phone"></i> ${store.contact}</div>
                <a href="${store.website}" class="partner-card-website" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe"></i> Website</a>
            </div>
        `).join('');

        // Make marquee-like continuous scroll by duplicating content until wide enough
        // (this mirrors <marquee> by having repeating content)
        // Ensure layout styles for smooth horizontal flow
        inner.style.display = 'flex';
        inner.style.flexWrap = 'nowrap';
        inner.style.alignItems = 'center';
        inner.style.willChange = 'transform';
        inner.style.gap = getComputedStyle(inner).gap || '16px';
        inner.style.transition = 'none';
        inner.style.padding = '0';

        // Duplicate the content so it can scroll seamlessly
        const originalHTML = inner.innerHTML;
        // Keep duplicating up to safety limit until inner.scrollWidth is at least twice outer width
        let safety = 0;
        while (inner.scrollWidth < outer.offsetWidth * 2 && safety < 6) {
            inner.innerHTML += originalHTML;
            safety++;
        }

        // animation state
        let px = 0;
        const speed = 60; // pixels per second (adjust to taste)
        let lastTimestamp = performance.now();
        let running = true;

        // pause on hover like marquee pauseOnHover
        outer.addEventListener('mouseenter', () => (running = false));
        outer.addEventListener('mouseleave', () => (running = true));

        function step(ts) {
            const dt = (ts - lastTimestamp) / 1000;
            lastTimestamp = ts;
            if (running) {
                px += speed * dt;
                // when we've scrolled one full original set, reset px to 0 for seamless loop
                const resetAt = inner.scrollWidth / 2; // because we duplicated content
                if (px >= resetAt) px = px - resetAt;
                inner.style.transform = `translateX(-${px}px)`;
            }
            requestAnimationFrame(step);
        }

        // Start animation
        requestAnimationFrame(step);

        // Recompute sizes on resize (keeps duplication adequate)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // if not wide enough, append another copy (bounded)
                if (inner.scrollWidth < outer.offsetWidth * 2 && safety < 10) {
                    inner.innerHTML += originalHTML;
                    safety++;
                }
            }, 150);
        });
    } catch (err) {
        console.error('Partner stores load error:', err);
        inner.innerHTML = '<div style="padding:1rem;color:#b00">Unable to load partner stores.</div>';
    }
}

// block mouse right-click
// document.addEventListener('contextmenu', e => e.preventDefault());

// // block common keyboard shortcuts (Ctrl/Cmd + U/S, Ctrl/Cmd+Shift+I/J/C, F12, Shift+F10, ContextMenu key)
// document.addEventListener('keydown', function (e) {
//     const k = (e.key || '').toLowerCase();
//     const modifier = e.ctrlKey || e.metaKey; // include Cmd on macOS

//     // F12
//     if (k === 'f12') { e.preventDefault(); return; }

//     // Shift+F10 (opens context menu)
//     if (e.shiftKey && k === 'f10') { e.preventDefault(); return; }

//     // ContextMenu key (some keyboards) or legacy keyCode 93
//     if (k === 'contextmenu' || e.keyCode === 93) { e.preventDefault(); return; }

//     // Ctrl/Cmd + U (view source), Ctrl/Cmd + S (save)
//     if (modifier && (k === 'u' || k === 's')) { e.preventDefault(); return; }

//     // Ctrl/Cmd + Shift + I/J/C (devtools / inspect / console / inspect element)
//     if (modifier && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); return; }
// });

// End of script.js