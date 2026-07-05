// js/app.js
// إدارة واجهة الزبائن، السلة، تسجيل الدخول، والطلبات

(function() {
    // حالة التطبيق المحلية (State)
    let cart = [];
    let selectedCategory = 'all';
    let searchTerm = '';
    let sortBy = 'default';

    // حالة استعادة كلمة المرور
    let recoveryEmail = '';
    let recoveryCode = '';

    // حالة الدفع والتحويل
    let selectedPaymentMethod = 'jawwal-pay';
    let receiptImageBase64 = '';

    // تهيئة التطبيق
    function init() {
        loadCart();
        setupRouting();
        setupEventListeners();
        renderHeader();
        renderCategories();
        renderCatalog();
        
        // التحقق من الجلسة الحالية وإظهار الشاشة الافتراضية
        handleHashChange();
    }

    // التحميل من الذاكرة المحلية
    function loadCart() {
        const localCart = localStorage.getItem('store_cart');
        if (localCart) {
            try { cart = JSON.parse(localCart); } catch(e) { cart = []; }
        }
        updateCartBadge();
    }

    function saveCart() {
        localStorage.setItem('store_cart', JSON.stringify(cart));
        updateCartBadge();
        renderCartDrawer();
    }

    // إعداد التوجيه (Routing) بناءً على الهاش (#)
    function setupRouting() {
        window.addEventListener('hashchange', handleHashChange);
    }

    function handleHashChange() {
        const hash = window.location.hash || '#home';
        
        // إخفاء كافة الشاشات الرئيسية
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        
        // تنشيط الروابط في القائمة العلوية
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));

        if (hash === '#home') {
            document.getElementById('home-screen').classList.add('active');
            document.querySelector('.nav-links a[href="#home"]').parentElement.classList.add('active');
            renderCatalog();
        } else if (hash === '#shop') {
            document.getElementById('home-screen').classList.add('active');
            document.querySelector('.nav-links a[href="#shop"]').parentElement.classList.add('active');
            // التمرير إلى قسم المنتجات
            const catalogSec = document.getElementById('catalog-section');
            if (catalogSec) catalogSec.scrollIntoView({ behavior: 'smooth' });
        } else if (hash === '#auth') {
            const user = window.db.getCurrentUser();
            if (user) {
                window.location.hash = user.role === 'admin' ? '#admin-overview' : '#account-dashboard';
                return;
            }
            document.getElementById('auth-screen').classList.add('active');
            showAuthTab('login');
        } else if (hash === '#checkout') {
            const user = window.db.getCurrentUser();
            if (!user) {
                alert("الرجاء تسجيل الدخول أولاً لإتمام الشراء.");
                window.location.hash = '#auth';
                return;
            }
            if (cart.length === 0) {
                alert("سلتك فارغة حالياً!");
                window.location.hash = '#home';
                return;
            }
            document.getElementById('checkout-screen').classList.add('active');
            renderCheckoutPage();
        } else if (hash === '#account-dashboard') {
            const user = window.db.getCurrentUser();
            if (!user) {
                window.location.hash = '#auth';
                return;
            }
            document.getElementById('customer-dashboard-screen').classList.add('active');
            renderAccountDashboard();
        } else if (hash.startsWith('#admin')) {
            const user = window.db.getCurrentUser();
            if (!user || user.role !== 'admin') {
                alert("غير مصرح لك بالوصول.");
                window.location.hash = '#home';
                return;
            }
            document.getElementById('admin-dashboard-screen').classList.add('active');
            
            // تحديد الصفحة الفرعية للإدارة
            const subPage = hash.split('-')[1] || 'overview';
            if (window.admin && window.admin.renderAdminSubPage) {
                window.admin.renderAdminSubPage(subPage);
            }
        }
        
        renderHeader();
    }

    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        // زر فتح/إغلاق سلة المشتريات
        const btnCart = document.getElementById('btn-cart');
        const cartDrawer = document.getElementById('cart-drawer');
        const cartOverlay = document.getElementById('cart-drawer-overlay');
        const btnCloseCart = document.getElementById('btn-close-cart');

        if (btnCart && cartDrawer && cartOverlay) {
            btnCart.addEventListener('click', () => {
                cartDrawer.classList.add('active');
                cartOverlay.classList.add('active');
                renderCartDrawer();
            });
        }

        const closeCart = () => {
            cartDrawer.classList.remove('active');
            cartOverlay.classList.remove('active');
        };

        if (btnCloseCart) btnCloseCart.addEventListener('click', closeCart);
        if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

        // شريط البحث وتصفية المنتجات
        const searchInput = document.getElementById('search-products');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                renderCatalog();
            });
        }

        const sortSelect = document.getElementById('sort-products');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                sortBy = e.target.value;
                renderCatalog();
            });
        }

        // تبديل تبويبات تسجيل الدخول وإنشاء الحساب
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        if (tabLogin && tabRegister) {
            tabLogin.addEventListener('click', () => showAuthTab('login'));
            tabRegister.addEventListener('click', () => showAuthTab('register'));
        }

        // معالجة نموذج تسجيل الدخول للزبون
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLoginSubmit);
        }

        // معالجة نموذج تسجيل حساب جديد للزبون
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegisterSubmit);
        }

        // نموذج إتمام الطلب (Checkout Form)
        const checkoutForm = document.getElementById('checkout-form-el');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleCheckoutSubmit);
        }

        // معالجة رفع ومعاينة وصل الدفع
        const receiptInput = document.getElementById('receipt-file');
        const receiptPreview = document.getElementById('receipt-image-preview');
        const receiptPlaceholder = document.getElementById('receipt-placeholder');
        if (receiptInput) {
            receiptInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        receiptImageBase64 = event.target.result;
                        if (receiptPreview) {
                            receiptPreview.src = receiptImageBase64;
                            receiptPreview.style.display = 'block';
                        }
                        if (receiptPlaceholder) {
                            receiptPlaceholder.style.display = 'none';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // تحديث الهيدر بناءً على حالة تسجيل الدخول
    function renderHeader() {
        const user = window.db.getCurrentUser();
        const authActionContainer = document.getElementById('auth-action-container');
        if (!authActionContainer) return;

        if (user) {
            if (user.role === 'admin') {
                authActionContainer.innerHTML = `
                    <a href="#admin-overview" class="btn-primary-header" style="background: linear-gradient(135deg, #10b981, #059669);">
                        🛠️ لوحة التحكم
                    </a>
                    <button class="btn-icon" onclick="storeApp.logoutUser()" title="تسجيل الخروج">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                            <path d="M10 4h9v16h-9M14 12H3M7 8l-5 4 5 4" />
                        </svg>
                    </button>
                `;
            } else {
                authActionContainer.innerHTML = `
                    <a href="#account-dashboard" class="btn-primary-header">
                        👤 حسابي
                    </a>
                    <button class="btn-icon" onclick="storeApp.logoutUser()" title="تسجيل الخروج">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                            <path d="M10 4h9v16h-9M14 12H3M7 8l-5 4 5 4" />
                        </svg>
                    </button>
                `;
            }
        } else {
            authActionContainer.innerHTML = `
                <a href="#auth" class="btn-primary-header">
                    🔑 تسجيل الدخول
                </a>
            `;
        }
    }

    // تسجيل الخروج
    function logoutUser() {
        window.db.logout();
        cart = [];
        saveCart();
        window.location.hash = '#home';
        renderHeader();
        alert("تم تسجيل الخروج بنجاح.");
    }

    // 1. رسم الأقسام (Categories Tabs)
    function renderCategories() {
        const categories = window.db.getCategories();
        const categoriesContainer = document.getElementById('categories-container');
        if (!categoriesContainer) return;

        categoriesContainer.innerHTML = `
            <div class="category-card ${selectedCategory === 'all' ? 'active' : ''}" onclick="storeApp.selectCategory('all')">
                <span class="category-icon">🛍️</span>
                <span class="category-name">الكل</span>
            </div>
        `;

        categories.forEach(c => {
            categoriesContainer.innerHTML += `
                <div class="category-card ${selectedCategory === c.id ? 'active' : ''}" onclick="storeApp.selectCategory('${c.id}')">
                    <span class="category-icon">${c.icon}</span>
                    <span class="category-name">${c.name}</span>
                </div>
            `;
        });
    }

    function selectCategory(catId) {
        selectedCategory = catId;
        renderCategories();
        renderCatalog();
    }

    // 2. رسم كتالوج المنتجات
    function renderCatalog() {
        const products = window.db.getProducts();
        const categories = window.db.getCategories();
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // تصفية المنتجات
        let filtered = products.filter(p => {
            const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm) || 
                                 (p.description && p.description.toLowerCase().includes(searchTerm));
            return matchesCategory && matchesSearch;
        });

        // ترتيب المنتجات
        if (sortBy === 'price-asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-desc') {
            filtered.sort((a, b) => b.price - a.price);
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 16px;">لا توجد منتجات مطابقة لخيارات البحث.</div>`;
            return;
        }

        filtered.forEach(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            const catName = cat ? cat.name : 'متنوع';
            
            grid.innerHTML += `
                <div class="product-card" onclick="storeApp.openProductDetails('${p.id}', event)">
                    <span class="product-badge">جديد</span>
                    <div class="product-img-container">
                        <img src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/300x250?text=No+Image'">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${catName}</span>
                        <h3 class="product-name">${p.name}</h3>
                        <p class="product-description">${p.description || ''}</p>
                        <div class="product-meta">
                            <span class="product-price">${p.price} <span>شيكل</span></span>
                            <button class="btn-add-cart" onclick="storeApp.addToCart('${p.id}', 1, event)" title="أضف إلى السلة">
                                🛒
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // 3. فتح تفاصيل المنتج في مودال
    function openProductDetails(id, event) {
        // منع الفتح في حال الضغط على زر السلة
        if (event && event.target.closest('.btn-add-cart')) return;

        const products = window.db.getProducts();
        const p = products.find(prod => prod.id === id);
        if (!p) return;

        document.getElementById('modal-detail-img').src = p.image;
        document.getElementById('modal-detail-name').textContent = p.name;
        document.getElementById('modal-detail-desc').textContent = p.description || 'لا يوجد وصف لهذا المنتج.';
        document.getElementById('modal-detail-price').innerHTML = `${p.price} <span>شيكل</span>`;
        
        // إعداد زر الإضافة مع الكمية
        const qtyInput = document.getElementById('detail-qty');
        if (qtyInput) qtyInput.value = 1;

        const btnAdd = document.getElementById('btn-modal-add-cart');
        if (btnAdd) {
            btnAdd.onclick = () => {
                const qty = parseInt(qtyInput.value) || 1;
                addToCart(p.id, qty);
                closeProductDetails();
            };
        }

        document.getElementById('product-detail-modal').classList.add('active');
    }

    function closeProductDetails() {
        document.getElementById('product-detail-modal').classList.remove('active');
    }

    // 4. نظام سلة المشتريات
    function addToCart(productId, quantity = 1, event) {
        if (event) {
            event.stopPropagation();
        }

        const products = window.db.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existing = cart.find(item => item.productId === productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({ productId, quantity });
        }

        saveCart();

        // إشعار بسيط للمستخدم (Micro-interaction)
        alert(`تمت إضافة "${product.name}" إلى السلة بنجاح!`);
    }

    function changeCartItemQty(productId, amount) {
        const item = cart.find(i => i.productId === productId);
        if (!item) return;

        item.quantity += amount;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.productId !== productId);
        }
        saveCart();
    }

    function removeCartItem(productId) {
        cart = cart.filter(i => i.productId !== productId);
        saveCart();
    }

    function updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    function renderCartDrawer() {
        const list = document.getElementById('cart-items-list');
        const summary = document.getElementById('cart-subtotal');
        if (!list || !summary) return;

        list.innerHTML = '';
        
        if (cart.length === 0) {
            list.innerHTML = `
                <div class="cart-empty-message">
                    <span style="font-size: 48px;">🛒</span>
                    <p>سلتك فارغة تماماً</p>
                    <a href="#shop" onclick="document.getElementById('cart-drawer').classList.remove('active'); document.getElementById('cart-drawer-overlay').classList.remove('active');" style="color: var(--primary); font-weight: bold; text-decoration: underline;">تسوّق الآن</a>
                </div>
            `;
            summary.textContent = '0 شيكل';
            return;
        }

        const products = window.db.getProducts();
        let subtotal = 0;

        cart.forEach(item => {
            const p = products.find(prod => prod.id === item.productId);
            if (!p) return;

            const itemTotal = p.price * item.quantity;
            subtotal += itemTotal;

            list.innerHTML += `
                <div class="cart-item">
                    <img src="${p.image}" class="cart-item-img" alt="${p.name}" onerror="this.src='https://placehold.co/100x100?text=No+Image'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${p.name}</div>
                        <div class="cart-item-price">${p.price} شيكل</div>
                        <div class="cart-item-qty-control">
                            <button class="cart-qty-btn" onclick="storeApp.changeCartItemQty('${p.id}', -1)">-</button>
                            <span class="cart-qty-val">${item.quantity}</span>
                            <button class="cart-qty-btn" onclick="storeApp.changeCartItemQty('${p.id}', 1)">+</button>
                        </div>
                    </div>
                    <button class="btn-remove-item" onclick="storeApp.removeCartItem('${p.id}')" title="إزالة">🗑️</button>
                </div>
            `;
        });

        summary.textContent = `${subtotal} شيكل`;
    }

    // 5. نظام تسجيل الدخول وإنشاء حساب
    function showAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');

        // إخفاء رسائل التنبيه
        document.getElementById('login-alert').style.display = 'none';
        document.getElementById('register-alert').style.display = 'none';
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const alertBox = document.getElementById('login-alert');

        try {
            const user = window.db.login(username, password);
            alertBox.style.display = 'none';
            renderHeader();
            
            if (user.role === 'admin') {
                window.location.hash = '#admin-overview';
            } else {
                window.location.hash = '#account-dashboard';
            }
            
            // تفريغ النموذج
            e.target.reset();
        } catch (err) {
            alertBox.textContent = err.message;
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
        }
    }

    function handleRegisterSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const phone = document.getElementById('reg-phone').value.trim();
        const address = document.getElementById('reg-address').value.trim();
        const alertBox = document.getElementById('register-alert');

        if (!name || !username || !email || !password) {
            alertBox.textContent = "الرجاء ملء جميع الحقول المطلوبة (*).";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
            return;
        }

        try {
            window.db.registerUser({
                name,
                username,
                email,
                password,
                phone,
                address,
                role: 'customer'
            });

            alertBox.textContent = "تم تسجيل الحساب بنجاح! جاري تحويلك لتسجيل الدخول...";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-success';

            setTimeout(() => {
                showAuthTab('login');
                document.getElementById('login-username').value = username;
            }, 1500);

            e.target.reset();
        } catch (err) {
            alertBox.textContent = err.message;
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
        }
    }

    // 6. شاشة الدفع والطلب
    function renderCheckoutPage() {
        const user = window.db.getCurrentUser();
        if (!user) return;

        // تعبئة النموذج ببيانات العميل
        document.getElementById('cust-name').value = user.name || '';
        document.getElementById('cust-phone').value = user.phone || '';
        document.getElementById('cust-address').value = user.address || '';

        // تصفية وعرض المنتجات وسعرها الكلي
        const listContainer = document.getElementById('checkout-items-list');
        const totalContainer = document.getElementById('checkout-total-price');
        
        listContainer.innerHTML = '';
        const products = window.db.getProducts();
        let total = 0;

        cart.forEach(item => {
            const p = products.find(prod => prod.id === item.productId);
            if (!p) return;
            const itemTotal = p.price * item.quantity;
            total += itemTotal;

            listContainer.innerHTML += `
                <div class="checkout-item">
                    <span class="checkout-item-name">${p.name} <span class="checkout-item-qty">× ${item.quantity}</span></span>
                    <span class="checkout-item-price">${itemTotal} شيكل</span>
                </div>
            `;
        });

        totalContainer.textContent = `${total} شيكل`;
    }

    function handleCheckoutSubmit(e) {
        e.preventDefault();
        const user = window.db.getCurrentUser();
        if (!user) return;

        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const address = document.getElementById('cust-address').value.trim();

        if (!name || !phone || !address) {
            alert("الرجاء إدخال كافة تفاصيل الشحن والاتصال.");
            return;
        }

        if (!receiptImageBase64) {
            alert("الرجاء إرفاق صورة وصل التحويل المالي (الدفعة) لإتمام الطلب بنجاح.");
            return;
        }

        const products = window.db.getProducts();
        let total = 0;
        const items = cart.map(item => {
            const p = products.find(prod => prod.id === item.productId);
            total += p.price * item.quantity;
            return {
                productId: item.productId,
                name: p.name,
                price: p.price,
                quantity: item.quantity
            };
        });

        const newOrder = {
            customerId: user.id,
            customerName: name,
            phone: phone,
            shippingAddress: address,
            items: items,
            total: total,
            paymentMethod: selectedPaymentMethod,
            receiptImage: receiptImageBase64
        };

        // حفظ الطلب
        const savedOrder = window.db.saveOrder(newOrder);

        // صياغة اسم طريقة الدفع للواتساب
        let payMethodStr = "جوّال بي (Jawwal Pay)";
        if (selectedPaymentMethod === 'palpay') payMethodStr = "بال بي (PalPay)";
        else if (selectedPaymentMethod === 'bank') payMethodStr = "محفظة البنك (BoP)";

        // إنشاء نص رسالة الواتساب للتواصل المباشر مع البائع
        let messageText = `*طلب جديد من متجر فيكسو (Vexo) 💎*\n\n`;
        messageText += `*رقم الطلب:* ${savedOrder.orderNumber}\n`;
        messageText += `*الاسم:* ${savedOrder.customerName}\n`;
        messageText += `*الجوال:* ${savedOrder.phone}\n`;
        messageText += `*العنوان:* ${savedOrder.shippingAddress}\n\n`;
        messageText += `*طريقة الدفع:* ${payMethodStr}\n`;
        messageText += `*حالة الوصل:* مرفق (تم حفظه في لوحة التحكم)\n\n`;
        messageText += `*المنتجات المطلوبة:*\n`;
        
        savedOrder.items.forEach((item, idx) => {
            messageText += `${idx + 1}. ${item.name} (الكمية: ${item.quantity}) - السعر: ${item.price * item.quantity} شيكل\n`;
        });
        
        messageText += `\n*إجمالي المبلغ:* ${savedOrder.total} شيكل\n\n`;
        messageText += `*يرجى تزويد البائع بصورة وصل الدفع المرفقة لإثبات وتأكيد عملية التحويل.*`;

        // رقم الهاتف المستهدف للواتساب
        const whatsappNumber = '972593425031';
        const waUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(messageText)}`;
        
        // فتح الواتساب في نافذة جديدة لإرسال الرسالة
        window.open(waUrl, '_blank');

        // إعادة ضبط السلة والدفع
        cart = [];
        saveCart();
        receiptImageBase64 = '';
        selectedPaymentMethod = 'jawwal-pay';
        
        // إعادة ضبط نموذج الرفع
        const receiptPreview = document.getElementById('receipt-image-preview');
        const receiptPlaceholder = document.getElementById('receipt-placeholder');
        if (receiptPreview) receiptPreview.style.display = 'none';
        if (receiptPlaceholder) receiptPlaceholder.style.display = 'flex';
        
        const formEl = document.getElementById('checkout-form-el');
        if (formEl) formEl.reset();

        alert("تم إرسال طلبك بنجاح! تم حفظ الطلب وجاري تحويلك لواتساب لتأكيد الطلب وإرسال صورة الوصل للبائع.");
        window.location.hash = '#account-dashboard';
    }

    function selectPaymentMethod(method) {
        selectedPaymentMethod = method;
        document.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
        
        let cardId = 'pay-card-jawwal';
        if (method === 'palpay') cardId = 'pay-card-palpay';
        else if (method === 'bank') cardId = 'pay-card-bank';
        
        const activeCard = document.getElementById(cardId);
        if (activeCard) activeCard.classList.add('active');
    }

    // 7. لوحة تحكم حساب العميل
    function renderAccountDashboard() {
        const user = window.db.getCurrentUser();
        if (!user) return;

        // تعبئة البيانات الشخصية
        document.getElementById('lbl-user-name').textContent = user.name;
        document.getElementById('lbl-user-email').textContent = user.email;
        document.getElementById('lbl-user-phone').textContent = user.phone || 'غير مسجل';
        document.getElementById('lbl-user-address').textContent = user.address || 'غير مسجل';

        // عرض الطلبات الخاصة بالعميل
        const orders = window.db.getOrders();
        const userOrders = orders.filter(o => o.customerId === user.id);
        const container = document.getElementById('customer-orders-container');

        container.innerHTML = '';

        if (userOrders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); color: var(--text-muted);">
                    <p style="font-size: 40px; margin-bottom: 12px;">📦</p>
                    <p>ليس لديك أي طلبات سابقة بعد.</p>
                </div>
            `;
            return;
        }

        userOrders.forEach(o => {
            const dateStr = new Date(o.date).toLocaleDateString('ar-SA');
            
            // إنشاء جدول الطلبات الصغير
            let itemsHtml = '';
            o.items.forEach(item => {
                itemsHtml += `
                    <div class="order-item-row">
                        <span>${item.name} <strong>× ${item.quantity}</strong></span>
                        <span>${(item.price * item.quantity)} شيكل</span>
                    </div>
                `;
            });

            container.innerHTML += `
                <div class="order-card">
                    <div class="order-card-header">
                        <div>
                            <span class="order-number">رقم الطلب: ${o.orderNumber}</span>
                            <span class="order-date" style="margin-right: 12px;">التاريخ: ${dateStr}</span>
                        </div>
                        <span class="order-status ${getStatusClass(o.status)}">${getStatusArabic(o.status)}</span>
                    </div>
                    <div class="order-items-summary">
                        ${itemsHtml}
                    </div>
                    <div class="order-total-row">
                        <span>الإجمالي</span>
                        <span>${o.total} شيكل</span>
                    </div>
                </div>
            `;
        });
    }

    function getStatusArabic(status) {
        switch(status) {
            case 'pending': return 'قيد الانتظار';
            case 'shipped': return 'تم الشحن';
            case 'delivered': return 'تم التوصيل';
            default: return status;
        }
    }

    function getStatusClass(status) {
        switch(status) {
            case 'pending': return 'status-pending';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            default: return '';
        }
    }

    // --- نظام استعادة كلمة المرور ---
    function showForgotPasswordForm(e) {
        if (e) e.preventDefault();
        
        // إلغاء تفعيل التبويبات والصفحات الأخرى
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        // إظهار صفحة نسيت كلمة المرور
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) forgotForm.classList.add('active');
        
        const forgotAlert = document.getElementById('forgot-alert');
        if (forgotAlert) forgotAlert.style.display = 'none';

        const step1 = document.getElementById('forgot-step-1');
        const step2 = document.getElementById('forgot-step-2');
        const step3 = document.getElementById('forgot-step-3');
        if (step1) step1.style.display = 'flex';
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';
    }

    function sendResetCode() {
        const emailInput = document.getElementById('forgot-email');
        const alertBox = document.getElementById('forgot-alert');
        if (!emailInput || !alertBox) return;

        const email = emailInput.value.trim();
        if (!email) {
            alertBox.textContent = "الرجاء إدخال البريد الإلكتروني المسجل.";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
            return;
        }

        // البحث عن المستخدم في قاعدة البيانات المحلية
        const users = window.db.getUsers();
        const user = users.find(u => u.email === email);
        if (!user) {
            alertBox.textContent = "عذراً، هذا البريد الإلكتروني غير مرتبط بأي حساب لدينا.";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
            return;
        }

        // حفظ البريد وإنشاء رمز عشوائي من 6 أرقام
        recoveryEmail = email;
        recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

        // إظهار الرمز في الواجهة للمحاكاة والتسهيل
        const simulatedCodeEl = document.getElementById('forgot-simulated-code');
        if (simulatedCodeEl) simulatedCodeEl.textContent = recoveryCode;

        // فتح جيميل لإنشاء مسودة بالرمز وإرسالها للعميل نفسه
        const subject = encodeURIComponent("رمز استعادة كلمة المرور - فيكسو (Vexo)");
        const body = encodeURIComponent(`مرحباً،\n\nلقد طلبت استعادة كلمة المرور لمتجر فيكسو (Vexo).\nرمز التحقق الخاص بك هو: ${recoveryCode}\n\nيرجى إدخال هذا الرمز في الموقع للمتابعة وتعيين كلمة مرور جديدة.`);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
        
        // فتح جيميل في علامة تبويب جديدة
        window.open(gmailUrl, '_blank');

        // الانتقال للخطوة التالية
        alertBox.style.display = 'none';
        const step1 = document.getElementById('forgot-step-1');
        const step2 = document.getElementById('forgot-step-2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'flex';
    }

    function verifyResetCode() {
        const codeInput = document.getElementById('forgot-code');
        const alertBox = document.getElementById('forgot-alert');
        if (!codeInput || !alertBox) return;

        const code = codeInput.value.trim();
        if (code === recoveryCode) {
            alertBox.style.display = 'none';
            const step2 = document.getElementById('forgot-step-2');
            const step3 = document.getElementById('forgot-step-3');
            if (step2) step2.style.display = 'none';
            if (step3) step3.style.display = 'flex';
        } else {
            alertBox.textContent = "الرمز غير صحيح، يرجى مراجعة الرمز وإعادة المحاولة.";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
        }
    }

    function resetPassword() {
        const passwordInput = document.getElementById('forgot-new-password');
        const alertBox = document.getElementById('forgot-alert');
        if (!passwordInput || !alertBox) return;

        const newPassword = passwordInput.value;
        if (newPassword.length < 6) {
            alertBox.textContent = "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف/أرقام على الأقل.";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
            return;
        }

        // تحديث كلمة المرور في قاعدة البيانات
        const users = window.db.getUsers();
        const user = users.find(u => u.email === recoveryEmail);
        if (user) {
            user.password = newPassword;
            
            // حفظ التغييرات في localStorage
            localStorage.setItem('store_users', JSON.stringify(users));
            
            alertBox.textContent = "تم تحديث كلمة المرور بنجاح! جاري تحويلك لتسجيل الدخول...";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-success';

            // تفريغ البيانات المؤقتة
            recoveryEmail = '';
            recoveryCode = '';

            setTimeout(() => {
                showAuthTab('login');
                const usernameEl = document.getElementById('login-username');
                if (usernameEl) usernameEl.value = user.username;
            }, 2000);
        } else {
            alertBox.textContent = "حدث خطأ غير متوقع، يرجى إعادة المحاولة من البداية.";
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger';
        }
    }

    // تصدير واجهة برمجية للمتجر
    window.storeApp = {
        init,
        selectCategory,
        addToCart,
        changeCartItemQty,
        removeCartItem,
        logoutUser,
        openProductDetails,
        closeProductDetails,
        renderCatalog,
        renderCategories,
        renderAccountDashboard,
        showAuthTab,
        showForgotPasswordForm,
        sendResetCode,
        verifyResetCode,
        resetPassword,
        selectPaymentMethod
    };

    // تشغيل التطبيق بعد تحميل الدوم
    document.addEventListener('DOMContentLoaded', init);
})();
