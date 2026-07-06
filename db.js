// js/db.js
// إدارة قاعدة البيانات المحلية باستخدام localStorage مع دعم المزامنة السحابية Firebase Firestore

(function() {
    // إعدادات قاعدة البيانات السحابية Firebase (Firestore)
    // قم بتبديل القيم أدناه بالقيم الخاصة بمشروعك في Firebase لتفعيل المزامنة السحابية فوراً.
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    let fs = null;
    
    // محاولة تهيئة Firebase
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            firebase.initializeApp(firebaseConfig);
            fs = firebase.firestore();
            console.log("Firebase Firestore initialized successfully.");
        } catch (err) {
            console.error("Failed to initialize Firebase:", err);
        }
    }

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
        
        let users = get(KEYS.USERS, DEFAULT_USERS);
        users = users.filter(u => u.username !== 'admin');
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

        // إعداد المزامنة السحابية الحية في حال تفعيل Firebase
        if (fs) {
            setupFirebaseSync();
        }
    }

    // مزامنة البيانات بالوقت الفعلي مع Firebase Firestore
    function setupFirebaseSync() {
        // 1. مزامنة المنتجات
        fs.collection('products').onSnapshot(snapshot => {
            let products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            if (products.length > 0) {
                set(KEYS.PRODUCTS, products);
                if (window.storeApp && window.storeApp.renderCatalog) {
                    window.storeApp.renderCatalog();
                }
            }
        });

        // 2. مزامنة الأقسام
        fs.collection('categories').onSnapshot(snapshot => {
            let categories = [];
            snapshot.forEach(doc => {
                categories.push({ id: doc.id, ...doc.data() });
            });
            if (categories.length > 0) {
                set(KEYS.CATEGORIES, categories);
                if (window.storeApp && window.storeApp.renderCategories) {
                    window.storeApp.renderCategories();
                }
            }
        });

        // 3. مزامنة الطلبات
        fs.collection('orders').onSnapshot(snapshot => {
            let orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            orders.sort((a, b) => new Date(b.date) - new Date(a.date));
            set(KEYS.ORDERS, orders);
            if (window.admin && window.admin.renderAdminSubPage) {
                const hash = window.location.hash || '#home';
                const subPage = hash.split('-')[1] || 'overview';
                if (subPage === 'orders' || subPage === 'overview') {
                    window.admin.renderAdminSubPage(subPage);
                }
            }
        });

        // 4. مزامنة المستخدمين
        fs.collection('users').onSnapshot(snapshot => {
            let users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            if (users.length > 0) {
                set(KEYS.USERS, users);
            }
        });

        // 5. رفع البيانات الافتراضية إذا كانت السحابة فارغة تماماً (تشغيل أول مرة)
        fs.collection('products').get().then(snap => {
            if (snap.empty) {
                const products = get(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
                products.forEach(p => {
                    fs.collection('products').doc(p.id).set(p);
                });
            }
        });

        fs.collection('categories').get().then(snap => {
            if (snap.empty) {
                const categories = get(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
                categories.forEach(c => {
                    fs.collection('categories').doc(c.id).set(c);
                });
            }
        });

        fs.collection('users').get().then(snap => {
            if (snap.empty) {
                const users = get(KEYS.USERS, DEFAULT_USERS);
                users.forEach(u => {
                    fs.collection('users').doc(u.id).set(u);
                });
            }
        });
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

            // حفظ في السحابة Firebase
            if (fs) {
                fs.collection('products').doc(product.id).set(product, { merge: true });
            }

            return product;
        },
        deleteProduct: (id) => {
            const products = window.db.getProducts();
            const filtered = products.filter(p => p.id !== id);
            set(KEYS.PRODUCTS, filtered);

            // حذف من السحابة Firebase
            if (fs) {
                fs.collection('products').doc(id).delete();
            }
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

            // حفظ في السحابة Firebase
            if (fs) {
                fs.collection('categories').doc(category.id).set(category, { merge: true });
            }

            return category;
        },
        deleteCategory: (id) => {
            const categories = window.db.getCategories();
            const filtered = categories.filter(c => c.id !== id);
            set(KEYS.CATEGORIES, filtered);
            
            const products = window.db.getProducts();
            const updatedProducts = products.map(p => p.categoryId === id ? { ...p, categoryId: '' } : p);
            set(KEYS.PRODUCTS, updatedProducts);

            // حذف من السحابة Firebase
            if (fs) {
                fs.collection('categories').doc(id).delete();
                // تحديث مرجع الأقسام في المنتجات سحابياً
                products.forEach(p => {
                    if (p.categoryId === id) {
                        fs.collection('products').doc(p.id).update({ categoryId: '' });
                    }
                });
            }
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

            // حفظ في السحابة Firebase
            if (fs) {
                fs.collection('users').doc(user.id).set(user);
            }

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
            orders.unshift(order);
            set(KEYS.ORDERS, orders);

            // حفظ في السحابة Firebase
            if (fs) {
                fs.collection('orders').doc(order.id).set(order);
            }

            return order;
        },
        updateOrderStatus: (id, status) => {
            const orders = window.db.getOrders();
            const idx = orders.findIndex(o => o.id === id);
            if (idx !== -1) {
                orders[idx].status = status;
                set(KEYS.ORDERS, orders);

                // تحديث في السحابة Firebase
                if (fs) {
                    fs.collection('orders').doc(id).update({ status: status });
                }

                return orders[idx];
            }
            throw new Error("الطلب غير موجود");
        }
    };

    // تشغيل التهيئة
    window.db.init();
})();
