// js/db.js
// إدارة قاعدة البيانات المحلية باستخدام localStorage

(function() {
    // المفاتيح المستخدمة في localStorage
    const KEYS = {
        PRODUCTS: 'store_products',
        CATEGORIES: 'store_categories',
        USERS: 'store_users',
        ORDERS: 'store_orders',
        SESSION: 'store_session'
    };

    // البيانات الافتراضية للتشغيل الأول (Seeding)
    const DEFAULT_CATEGORIES = [
        { id: "cat-1", name: "إلكترونيات", icon: "💻" },
        { id: "cat-2", name: "ساعات واكسسوارات", icon: "⌚" },
        { id: "cat-3", name: "أحذية وملابس", icon: "👟" },
        { id: "cat-4", name: "عطور ومستحضرات", icon: "🧴" }
    ];

    const DEFAULT_PRODUCTS = [
        {
            id: "prod-1",
            name: "آيفون 15 برو ماكس 256 جيجا",
            price: 4999,
            categoryId: "cat-1",
            description: "هاتف آيفون 15 برو ماكس الجديد كلياً بهيكل من التيتانيوم القوي والخفيف، مع معالج A17 Pro الخارق وكاميرا احترافية بدقة 48 ميجابكسل وتقريب بصري 5x.",
            image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600",
            stock: 12
        },
        {
            id: "prod-2",
            name: "ماك بوك إير 13 بوصة معالج M2",
            price: 5299,
            categoryId: "cat-1",
            description: "لابتوب أبل ماك بوك إير النحيف والأنيق، مدعوم بمعالج Apple M2 القوي، مع ذاكرة رام 8 جيجابايت وقرص تخزين SSD سعة 256 جيجابايت، وبطارية تدوم حتى 18 ساعة.",
            image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
            stock: 8
        },
        {
            id: "prod-3",
            name: "ساعة رولكس ديت جست إطار ذهبي",
            price: 14500,
            categoryId: "cat-2",
            description: "ساعة رولكس كلاسيكية فاخرة للرجال، مصنوعة من الفولاذ المقاوم للصدأ والذهب الأصفر عيار 18 قيراط، تتميز بمينا فضي أنيق وتصميم تاريخ ديت جست الأيقوني.",
            image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600",
            stock: 3
        },
        {
            id: "prod-4",
            name: "حذاء ألترا بوست الرياضي للجري",
            price: 680,
            categoryId: "cat-3",
            description: "حذاء رياضي متطور يوفر أقصى درجات الراحة واستجابة الطاقة أثناء الجري، مزود بنعل أوسط بتقنية Boost الشهيرة وجزء علوي من نسيج Primeknit المرن والمقاوم للتعرق.",
            image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
            stock: 25
        },
        {
            id: "prod-5",
            name: "عطر سوفاج ديور للرجال - 100 مل",
            price: 550,
            categoryId: "cat-4",
            description: "عطر ديور سوفاج الرجالي الشهير بتركيز أو دو برفيوم، يجمع بين نفحات البرغموت المنعشة وخلاصة الفانيليا الغامضة والدافئة ليعطي رائحة خشبية شرقية جذابة تدوم طويلاً.",
            image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=600",
            stock: 15
        }
    ];

    const DEFAULT_USERS = [
        {
            id: "user-admin",
            username: "2005",
            password: "2005",
            email: "admin@store.com",
            role: "admin",
            name: "مدير المتجر",
            phone: "0500000000",
            address: "الرياض، المملكة العربية السعودية"
        },
        {
            id: "user-customer",
            username: "customer",
            password: "user123",
            email: "customer@gmail.com",
            role: "customer",
            name: "عبد الرحمن التميمي",
            phone: "0555555555",
            address: "شارع التخصصي، الرياض، السعودية"
        }
    ];

    // دوال مساعدة للتعامل مع localStorage
    function get(key, defaultValue) {
        const val = localStorage.getItem(key);
        if (val === null) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
            return defaultValue;
        }
        try {
            return JSON.parse(val);
        } catch (e) {
            console.error("Error parsing localStorage key: " + key, e);
            return defaultValue;
        }
    }

    function set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // تهيئة البيانات عند أول تشغيل للموقع
    function initDB() {
        get(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
        get(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
        
        // جلب المستخدمين وتحديثهم لضمان وجود حساب المدير 2005 وإزالة admin
        let users = get(KEYS.USERS, DEFAULT_USERS);
        // إزالة الحساب القديم 'admin' إذا كان موجوداً
        users = users.filter(u => u.username !== 'admin');
        // التأكد من وجود الحساب الجديد '2005'
        if (!users.some(u => u.username === '2005')) {
            users.push({
                id: "user-admin",
                username: "2005",
                password: "2005",
                email: "admin@store.com",
                role: "admin",
                name: "مدير المتجر",
                phone: "0500000000",
                address: "الرياض، المملكة العربية السعودية"
            });
        }
        set(KEYS.USERS, users);

        get(KEYS.ORDERS, []);
        get(KEYS.SESSION, null);
    }

    // تصدير واجهة برمجية للتعامل مع البيانات
    window.db = {
        init: initDB,

        // --- إدارة المنتجات ---
        getProducts: () => get(KEYS.PRODUCTS, DEFAULT_PRODUCTS),
        saveProduct: (product) => {
            const products = window.db.getProducts();
            if (product.id) {
                const idx = products.findIndex(p => p.id === product.id);
                if (idx !== -1) {
                    products[idx] = { ...products[idx], ...product };
                }
            } else {
                product.id = 'prod-' + Date.now();
                products.push(product);
            }
            set(KEYS.PRODUCTS, products);
            return product;
        },
        deleteProduct: (id) => {
            const products = window.db.getProducts();
            const filtered = products.filter(p => p.id !== id);
            set(KEYS.PRODUCTS, filtered);
        },

        // --- إدارة الأقسام ---
        getCategories: () => get(KEYS.CATEGORIES, DEFAULT_CATEGORIES),
        saveCategory: (category) => {
            const categories = window.db.getCategories();
            if (category.id) {
                const idx = categories.findIndex(c => c.id === category.id);
                if (idx !== -1) {
                    categories[idx] = { ...categories[idx], ...category };
                }
            } else {
                category.id = 'cat-' + Date.now();
                categories.push(category);
            }
            set(KEYS.CATEGORIES, categories);
            return category;
        },
        deleteCategory: (id) => {
            const categories = window.db.getCategories();
            const filtered = categories.filter(c => c.id !== id);
            set(KEYS.CATEGORIES, filtered);
            
            // إزالة المنتجات المرتبطة بهذا القسم أو تعيين قسمها ليكون فارغاً
            const products = window.db.getProducts();
            const updatedProducts = products.map(p => p.categoryId === id ? { ...p, categoryId: '' } : p);
            set(KEYS.PRODUCTS, updatedProducts);
        },

        // --- إدارة المستخدمين والجلسات ---
        getUsers: () => get(KEYS.USERS, DEFAULT_USERS),
        registerUser: (user) => {
            const users = window.db.getUsers();
            if (users.some(u => u.username === user.username)) {
                throw new Error("اسم المستخدم مسجل مسبقاً");
            }
            if (users.some(u => u.email === user.email)) {
                throw new Error("البريد الإلكتروني مسجل مسبقاً");
            }
            user.id = 'user-' + Date.now();
            user.role = user.role || 'customer';
            users.push(user);
            set(KEYS.USERS, users);
            return user;
        },
        login: (username, password) => {
            const users = window.db.getUsers();
            const user = users.find(u => u.username === username && u.password === password);
            if (!user) {
                throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
            }
            const sessionData = { userId: user.id, role: user.role, name: user.name };
            set(KEYS.SESSION, sessionData);
            return user;
        },
        logout: () => {
            set(KEYS.SESSION, null);
        },
        getCurrentUser: () => {
            const session = get(KEYS.SESSION, null);
            if (!session) return null;
            const users = window.db.getUsers();
            return users.find(u => u.id === session.userId) || null;
        },

        // --- إدارة الطلبات ---
        getOrders: () => get(KEYS.ORDERS, []),
        saveOrder: (order) => {
            const orders = window.db.getOrders();
            order.id = 'order-' + Date.now();
            order.orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            order.date = new Date().toISOString();
            order.status = 'pending'; // pending, shipped, delivered
            orders.unshift(order); // إضافة الطلب الجديد في البداية
            set(KEYS.ORDERS, orders);
            return order;
        },
        updateOrderStatus: (id, status) => {
            const orders = window.db.getOrders();
            const idx = orders.findIndex(o => o.id === id);
            if (idx !== -1) {
                orders[idx].status = status;
                set(KEYS.ORDERS, orders);
                return orders[idx];
            }
            throw new Error("الطلب غير موجود");
        }
    };

    // تشغيل التهيئة
    window.db.init();
})();
