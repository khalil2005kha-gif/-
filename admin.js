// js/admin.js
// إدارة لوحة التحكم الخاصة بالإدارة

(function() {
    // مرجع للمتغيرات المؤقتة
    let currentEditProductId = null;
    let currentEditCategoryId = null;

    // تهيئة لوحة التحكم
    function init() {
        setupEventListeners();
    }

    // إعداد مستمعي الأحداث للوحة التحكم
    function setupEventListeners() {
        // إدارة رفع صورة منتج جديد (تحويل إلى Base64)
        const imageFileInput = document.getElementById('prod-image-file');
        const imagePreview = document.getElementById('prod-image-preview');
        const imageUrlInput = document.getElementById('prod-image-url');

        if (imageFileInput) {
            imageFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        imagePreview.src = event.target.result;
                        imagePreview.style.display = 'block';
                        document.querySelector('.image-preview-placeholder').style.display = 'none';
                        // تعيين قيمة حقل الرابط لتكون فارغة لتجنب التشويش
                        imageUrlInput.value = '';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // في حال إدخال رابط صورة مباشرة
        if (imageUrlInput) {
            imageUrlInput.addEventListener('input', function(e) {
                if (e.target.value.trim() !== '') {
                    imagePreview.src = e.target.value.trim();
                    imagePreview.style.display = 'block';
                    document.querySelector('.image-preview-placeholder').style.display = 'none';
                    // تفريغ حقل رفع الملف
                    if (imageFileInput) imageFileInput.value = '';
                }
            });
        }

        // نموذج إضافة/تعديل منتج
        const productForm = document.getElementById('admin-product-form');
        if (productForm) {
            productForm.addEventListener('submit', handleProductSubmit);
        }

        // نموذج إضافة/تعديل قسم
        const categoryForm = document.getElementById('admin-category-form');
        if (categoryForm) {
            categoryForm.addEventListener('submit', handleCategorySubmit);
        }
    }

    // التحقق من صلاحيات المدير
    function checkAdminAuth() {
        const user = window.db.getCurrentUser();
        if (!user || user.role !== 'admin') {
            alert("عذراً، لا تمتلك صلاحيات للوصول إلى لوحة التحكم.");
            window.location.hash = '#home';
            return false;
        }
        return true;
    }

    // عرض شاشات الإدارة الفرعية
    function renderAdminSubPage(subPage) {
        if (!checkAdminAuth()) return;

        // إخفاء كل الصفحات الفرعية وتنشيط الرابط المناسب
        document.querySelectorAll('.admin-sub-page').forEach(page => page.style.display = 'none');
        document.querySelectorAll('.admin-menu li').forEach(li => li.classList.remove('active'));

        const activePage = document.getElementById(`admin-page-${subPage}`);
        if (activePage) activePage.style.display = 'block';

        const activeLink = document.querySelector(`.admin-menu a[href="#admin-${subPage}"]`);
        if (activeLink) activeLink.parentElement.classList.add('active');

        // استدعاء دالة الرسم الخاصة بالصفحة الفرعية
        switch(subPage) {
            case 'overview':
                renderOverview();
                break;
            case 'products':
                renderProductsList();
                break;
            case 'categories':
                renderCategoriesList();
                break;
            case 'orders':
                renderOrdersList();
                break;
        }
    }

    // 1. رسم صفحة الإحصائيات العامة
    function renderOverview() {
        const products = window.db.getProducts();
        const orders = window.db.getOrders();
        const users = window.db.getUsers();

        // حساب قيم المؤشرات
        const customersCount = users.filter(u => u.role === 'customer').length;
        const totalProducts = products.length;
        const totalOrders = orders.length;

        // إجمالي المبيعات (الطلبات التي تم توصيلها أو شحنها، أو إجمالي كل الطلبات لتسهيل المحاكاة)
        const totalSales = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + o.total, 0);

        // تحديث الأرقام في الواجهة
        document.getElementById('stat-total-sales').textContent = totalSales.toLocaleString() + ' شيكل';
        document.getElementById('stat-total-orders').textContent = totalOrders;
        document.getElementById('stat-total-products').textContent = totalProducts;
        document.getElementById('stat-total-customers').textContent = customersCount;

        // رسم الرسم البياني باستخدام SVG أو أعمدة CSS ديناميكية لمبيعات آخر 5 طلبات
        renderSalesChart(orders);

        // عرض آخر 4 طلبات في الجدول الصغير
        const recentOrdersTable = document.getElementById('recent-orders-table-body');
        if (recentOrdersTable) {
            recentOrdersTable.innerHTML = '';
            const recentOrders = orders.slice(0, 4);

            if (recentOrders.length === 0) {
                recentOrdersTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">لا توجد طلبات بعد</td></tr>`;
            } else {
                recentOrders.forEach(o => {
                    const dateStr = new Date(o.date).toLocaleDateString('ar-SA');
                    const statusStr = getStatusArabic(o.status);
                    const statusClass = getStatusClass(o.status);

                    recentOrdersTable.innerHTML += `
                        <tr>
                            <td><strong>${o.orderNumber}</strong></td>
                            <td>${o.customerName}</td>
                            <td>${dateStr}</td>
                            <td>${o.total} شيكل</td>
                            <td><span class="order-status ${statusClass}">${statusStr}</span></td>
                        </tr>
                    `;
                });
            }
        }
    }

    // رسم بياني ذكي ومميز
    function renderSalesChart(orders) {
        const chartWrapper = document.getElementById('sales-chart-container');
        if (!chartWrapper) return;
        chartWrapper.innerHTML = '';

        // افتراض مبيعات افتراضية في حال عدم وجود طلبات
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
        let daySales = [1200, 3400, 2100, 4800, 3100]; // افتراضي

        if (orders.length > 0) {
            // حساب مبيعات آخر 5 أيام أو تصنيفها
            daySales = [0, 0, 0, 0, 0];
            const last5Orders = orders.slice(0, 5).reverse();
            last5Orders.forEach((o, i) => {
                daySales[i] = o.total;
                days[i] = o.orderNumber;
            });
        }

        const maxVal = Math.max(...daySales, 1000);

        daySales.forEach((sale, i) => {
            const pct = (sale / maxVal) * 80; // النسبة من الارتفاع الأقصى
            chartWrapper.innerHTML += `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height: ${pct}%" data-value="${sale} شيكل"></div>
                    <div class="chart-label">${days[i]}</div>
                </div>
            `;
        });
    }

    // 2. رسم وإدارة المنتجات
    function renderProductsList() {
        const products = window.db.getProducts();
        const categories = window.db.getCategories();
        const tbody = document.getElementById('admin-products-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">لا توجد منتجات حالياً. أضف منتجاً جديداً!</td></tr>`;
            return;
        }

        products.forEach(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            const catName = cat ? cat.name : 'بدون قسم';
            
            tbody.innerHTML += `
                <tr>
                    <td><img src="${p.image}" class="thumbnail-cell" alt="${p.name}" onerror="this.src='https://placehold.co/100x100?text=No+Image'"></td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.price} شيكل</td>
                    <td>${catName}</td>
                    <td>${p.stock || 0}</td>
                    <td><p style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.description}</p></td>
                    <td>
                        <div class="btn-action-group">
                            <button class="btn-table btn-table-edit" onclick="admin.openEditProductModal('${p.id}')">✏️ تعديل</button>
                            <button class="btn-table btn-table-delete" onclick="admin.deleteProduct('${p.id}')">🗑️ حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        // تحديث قائمة الأقسام المنسدلة في نموذج إضافة منتج
        const selectCat = document.getElementById('prod-category');
        if (selectCat) {
            selectCat.innerHTML = '<option value="">اختر القسم...</option>';
            categories.forEach(c => {
                selectCat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    }

    // فتح نافذة إضافة منتج جديد
    function openAddProductModal() {
        currentEditProductId = null;
        document.getElementById('modal-product-title').textContent = 'إضافة منتج جديد';
        document.getElementById('admin-product-form').reset();
        
        // إعادة تعيين معاينة الصورة
        const imagePreview = document.getElementById('prod-image-preview');
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        document.querySelector('.image-preview-placeholder').style.display = 'flex';

        document.getElementById('admin-product-modal').classList.add('active');
    }

    // فتح نافذة تعديل منتج
    function openEditProductModal(id) {
        currentEditProductId = id;
        const products = window.db.getProducts();
        const p = products.find(prod => prod.id === id);
        if (!p) return;

        document.getElementById('modal-product-title').textContent = 'تعديل بيانات المنتج';
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-category').value = p.categoryId || '';
        document.getElementById('prod-stock').value = p.stock || 0;
        document.getElementById('prod-desc').value = p.description || '';
        document.getElementById('prod-image-url').value = p.image.startsWith('data:') ? '' : p.image;

        const imagePreview = document.getElementById('prod-image-preview');
        imagePreview.src = p.image;
        imagePreview.style.display = 'block';
        document.querySelector('.image-preview-placeholder').style.display = 'none';

        document.getElementById('admin-product-modal').classList.add('active');
    }

    // حفظ أو تحديث المنتج
    function handleProductSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('prod-name').value.trim();
        const price = parseFloat(document.getElementById('prod-price').value);
        const categoryId = document.getElementById('prod-category').value;
        const stock = parseInt(document.getElementById('prod-stock').value) || 0;
        const description = document.getElementById('prod-desc').value.trim();
        const imageUrlVal = document.getElementById('prod-image-url').value.trim();
        const imagePreviewSrc = document.getElementById('prod-image-preview').src;

        if (!name || isNaN(price)) {
            alert('الرجاء تعبئة الحقول الأساسية بشكل صحيح.');
            return;
        }

        // اختيار الصورة: إما المرفوعة كملف (معاينة) أو الرابط المدخل
        let image = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'; // صورة افتراضية
        if (imagePreviewSrc && imagePreviewSrc.startsWith('data:')) {
            image = imagePreviewSrc;
        } else if (imageUrlVal !== '') {
            image = imageUrlVal;
        } else if (imagePreviewSrc !== '' && !imagePreviewSrc.includes('localhost') && !imagePreviewSrc.includes('127.0.0.1')) {
            image = imagePreviewSrc;
        }

        const productData = {
            name,
            price,
            categoryId,
            stock,
            description,
            image
        };

        if (currentEditProductId) {
            productData.id = currentEditProductId;
        }

        window.db.saveProduct(productData);
        closeProductModal();
        renderProductsList();
        
        // تحديث المتجر الخارجي فوراً
        if (window.storeApp && window.storeApp.renderCatalog) {
            window.storeApp.renderCatalog();
        }
    }

    function closeProductModal() {
        document.getElementById('admin-product-modal').classList.remove('active');
        currentEditProductId = null;
    }

    function deleteProduct(id) {
        if (confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج؟")) {
            window.db.deleteProduct(id);
            renderProductsList();
            
            // تحديث المتجر الخارجي
            if (window.storeApp && window.storeApp.renderCatalog) {
                window.storeApp.renderCatalog();
            }
        }
    }

    // 3. رسم وإدارة الأقسام
    function renderCategoriesList() {
        const categories = window.db.getCategories();
        const tbody = document.getElementById('admin-categories-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (categories.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">لا توجد أقسام حالياً.</td></tr>`;
            return;
        }

        categories.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td style="font-size: 24px;">${c.icon}</td>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.id}</td>
                    <td>
                        <div class="btn-action-group">
                            <button class="btn-table btn-table-edit" onclick="admin.openEditCategoryModal('${c.id}')">✏️ تعديل</button>
                            <button class="btn-table btn-table-delete" onclick="admin.deleteCategory('${c.id}')">🗑️ حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    function openAddCategoryModal() {
        currentEditCategoryId = null;
        document.getElementById('modal-category-title').textContent = 'إضافة قسم جديد';
        document.getElementById('admin-category-form').reset();
        document.getElementById('admin-category-modal').classList.add('active');
    }

    function openEditCategoryModal(id) {
        currentEditCategoryId = id;
        const categories = window.db.getCategories();
        const c = categories.find(cat => cat.id === id);
        if (!c) return;

        document.getElementById('modal-category-title').textContent = 'تعديل بيانات القسم';
        document.getElementById('cat-name').value = c.name;
        document.getElementById('cat-icon').value = c.icon;

        document.getElementById('admin-category-modal').classList.add('active');
    }

    function handleCategorySubmit(e) {
        e.preventDefault();
        const name = document.getElementById('cat-name').value.trim();
        const icon = document.getElementById('cat-icon').value.trim() || '📁';

        if (!name) {
            alert('الرجاء إدخال اسم القسم');
            return;
        }

        const categoryData = { name, icon };
        if (currentEditCategoryId) {
            categoryData.id = currentEditCategoryId;
        }

        window.db.saveCategory(categoryData);
        closeCategoryModal();
        renderCategoriesList();

        // تحديث قوائم وأقسام المتجر الخارجي
        if (window.storeApp && window.storeApp.renderCategories) {
            window.storeApp.renderCategories();
            window.storeApp.renderCatalog();
        }
    }

    function closeCategoryModal() {
        document.getElementById('admin-category-modal').classList.remove('active');
        currentEditCategoryId = null;
    }

    function deleteCategory(id) {
        if (confirm("هل أنت متأكد من حذف هذا القسم؟ سيتم إزالة القسم من جميع المنتجات المرتبطة به.")) {
            window.db.deleteCategory(id);
            renderCategoriesList();

            // تحديث المتجر الخارجي
            if (window.storeApp && window.storeApp.renderCategories) {
                window.storeApp.renderCategories();
                window.storeApp.renderCatalog();
            }
        }
    }

    // 4. رسم وإدارة الطلبات
    function renderOrdersList() {
        const orders = window.db.getOrders();
        const tbody = document.getElementById('admin-orders-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">لا توجد طلبات بعد.</td></tr>`;
            return;
        }

        orders.forEach(o => {
            const dateStr = new Date(o.date).toLocaleDateString('ar-SA') + ' ' + new Date(o.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'});
            const statusStr = getStatusArabic(o.status);
            const statusClass = getStatusClass(o.status);

            // إنشاء قائمة المنتجات المطلوبة مصغرة لعرضها في سطر الجدول
            const itemsStr = o.items.map(item => `${item.name} (${item.quantity})`).join('، ');

            tbody.innerHTML += `
                <tr>
                    <td><strong>${o.orderNumber}</strong></td>
                    <td>
                        <div style="font-weight: bold;">${o.customerName}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${o.phone}</div>
                    </td>
                    <td>${dateStr}</td>
                    <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsStr}">${itemsStr}</td>
                    <td><strong>${o.total} شيكل</strong></td>
                    <td>
                        <select class="filter-select" style="padding: 6px 12px; min-width: auto; font-size: 13px;" onchange="admin.changeOrderStatus('${o.id}', this.value)">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn-table" onclick="admin.openOrderDetailsModal('${o.id}')">👁️ تفاصيل</button>
                    </td>
                </tr>
            `;
        });
    }

    function changeOrderStatus(orderId, newStatus) {
        try {
            window.db.updateOrderStatus(orderId, newStatus);
            renderOrdersList();
            
            // تحديث الإحصائيات العامة والطلب حالاً
            if (window.storeApp && window.storeApp.renderAccountDashboard) {
                window.storeApp.renderAccountDashboard();
            }
        } catch (e) {
            alert(e.message);
        }
    }

    // فتح تفاصيل الطلب بالكامل
    function openOrderDetailsModal(id) {
        const orders = window.db.getOrders();
        const o = orders.find(ord => ord.id === id);
        if (!o) return;

        const dateStr = new Date(o.date).toLocaleDateString('ar-SA') + ' ' + new Date(o.date).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'});
        
        document.getElementById('modal-order-number').textContent = o.orderNumber;
        document.getElementById('modal-order-date').textContent = dateStr;
        document.getElementById('modal-order-status').textContent = getStatusArabic(o.status);
        document.getElementById('modal-order-status').className = `order-status ${getStatusClass(o.status)}`;

        // بيانات العميل
        document.getElementById('modal-cust-name').textContent = o.customerName;
        document.getElementById('modal-cust-phone').textContent = o.phone;
        document.getElementById('modal-cust-address').textContent = o.shippingAddress;

        // المنتجات المطلوبة
        const itemsList = document.getElementById('modal-order-items-list');
        itemsList.innerHTML = '';
        o.items.forEach(item => {
            itemsList.innerHTML += `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${item.name}</strong>
                        <span style="color: var(--text-muted); margin-right: 8px;">× ${item.quantity}</span>
                    </div>
                    <div>${(item.price * item.quantity)} شيكل</div>
                </div>
            `;
        });

        document.getElementById('modal-order-total').textContent = `${o.total} شيكل`;
        document.getElementById('admin-order-modal').classList.add('active');
    }

    function closeOrderModal() {
        document.getElementById('admin-order-modal').classList.remove('active');
    }

    // دوال مساعدة لترجمة وعرض حالات الطلبات
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

    // تصدير واجهة برمجية للوحة التحكم
    window.admin = {
        init,
        renderAdminSubPage,
        openAddProductModal,
        openEditProductModal,
        closeProductModal,
        deleteProduct,
        openAddCategoryModal,
        openEditCategoryModal,
        closeCategoryModal,
        deleteCategory,
        changeOrderStatus,
        openOrderDetailsModal,
        closeOrderModal
    };

    // تشغيل التهيئة عند تحميل السكربت
    init();
})();
