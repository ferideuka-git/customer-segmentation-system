(function () {
  const { useEffect, useMemo, useState } = React;
  const h = React.createElement;
  const API_BASE = window.location.origin.startsWith("http") ? window.location.origin : "http://127.0.0.1:8000";

  const emptyPrediction = {
    recency: 30,
    frequency: 3,
    monetary: 750,
  };

  function fa(iconClass, extraProps = {}) {
    return h("i", { className: `fa-solid ${iconClass}`, "aria-hidden": "true", ...extraProps });
  }

  const adminNavItems = [
    ["overview", "fa-chart-pie", "Overview"],
    ["customers", "fa-users", "Customers"],
    ["segments", "fa-layer-group", "Segments"],
    ["recommendations", "fa-wand-magic-sparkles", "Recommendations"],
    ["prediction", "fa-brain", "Prediction"],
    ["orders", "fa-receipt", "Live Orders"],
  ];

  const fallbackProductImages = {
    "Accessories": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=95",
    "Bags & Totes": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=95",
    "Home Decor": "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
    "Kids & Gifts": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=95",
    "Kitchen & Tableware": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=95",
    "Lighting & Candles": "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=95",
    "Party & Seasonal": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=95",
    "Stationery & Crafts": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=95",
  };

  const categoryMeta = {
    "All": { faClass: "fa-border-all", label: "Të gjitha Koleksionet", desc: "Zgjidhni nga gjithsej 3,665 produkte unike të verifikuara në dataset-in Online Retail." },
    "Accessories": { faClass: "fa-gem", label: "Aksesorë Luksoz", desc: "Varëse, stoli, pasqyra dhe aksesorë stili me blerje të larta te klientët." },
    "Bags & Totes": { faClass: "fa-bag-shopping", label: "Çanta & Totes", desc: "Çanta pazari, tote bag pambuku dhe çanta udhëtimi me vlera të larta shitjeje." },
    "Home Decor": { faClass: "fa-house-chimney-window", label: "Dekor Shtëpie", desc: "Piktura, korniza fotosh, tabela memo dhe zbukurime elegante shtëpie." },
    "Kids & Gifts": { faClass: "fa-gift", label: "Lojëra & Dhurata", desc: "Lojëra fëmijësh, lepra pellushi, lodra druri dhe dhurata festive." },
    "Kitchen & Tableware": { faClass: "fa-utensils", label: "Kuzhinë & Pjata", desc: "Sete çaji Regency, gota çeliku, kuti ushqimi dhe pjata dekorative." },
    "Lighting & Candles": { faClass: "fa-lightbulb", label: "Ndriçim & Qirinj", desc: "Lantern vintage, qirinj me aromë, fenera varur dhe mbajtëse qirinjsh." },
    "Party & Seasonal": { faClass: "fa-cake-candles", label: "Festa & Sezonale", desc: "Zbukurime festash, dekorime Krishtlindjesh dhe letër mbështjellëse." },
    "Stationery & Crafts": { faClass: "fa-pen-ruler", label: "Kanceleri & Art", desc: "Bllok shënimesh, letër dore, shirita zbukurues dhe pajisje kancelerie." },
  };

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });
    } catch (err) {
      if (err.name === "TypeError" || (err.message && err.message.toLowerCase().includes("fetch"))) {
        throw new Error("Serveri nuk është aktiv! Ju lutem hapni 'run_web_app.bat' ose ekzekutoni: python -m uvicorn backend.main:app --reload");
      }
      throw err;
    }

    if (!response.ok) {
      let detail = "Request failed";
      try {
        detail = (await response.json()).detail || detail;
      } catch (error) {
        detail = await response.text();
      }
      throw new Error(detail || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  function loginUser(values) {
    return request("/api/login", {
      method: "POST",
      body: JSON.stringify(values),
    });
  }

  function registerUser(values) {
    return request("/api/register", {
      method: "POST",
      body: JSON.stringify(values),
    });
  }

  function getUserProfile(email) {
    return request(`/api/user/profile?email=${encodeURIComponent(email)}`);
  }

  function getSummary() {
    return request("/api/summary");
  }

  function getCountryAnalytics() {
    return request("/api/analytics/countries?limit=10");
  }

  function getSegmentMetrics() {
    return request("/api/segments/metrics");
  }

  function getOrders() {
    return request("/api/orders");
  }

  function getCustomers({ segment, query, limit = 20, offset = 0 }) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    if (segment) params.set("segment", segment);
    if (query) params.set("q", query);

    return request(`/api/customers?${params.toString()}`);
  }

  function getCustomer(customerId) {
    return request(`/api/customers/${customerId}`);
  }

  function getTopRecommendations(limit = 12) {
    return request(`/api/recommendations/top?limit=${limit}`);
  }

  function getProductCategories() {
    return request("/api/product-categories");
  }

  function getProducts({ query = "", category = "All", sortBy = "popular", limit = 12, offset = 0 }) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      sort_by: sortBy,
    });

    if (query) params.set("q", query);
    if (category && category !== "All") params.set("category", category);

    return request(`/api/products?${params.toString()}`);
  }

  function getSimilarProducts(stockCode) {
    return request(`/api/products-similar?stock_code=${encodeURIComponent(stockCode)}`);
  }

  function checkoutCart({ userEmail, items, name, phone, address, paymentMethod, notes }) {
    return request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        user_email: userEmail,
        name: name,
        phone: phone,
        address: address,
        payment_method: paymentMethod,
        notes: notes,
        items: items.map((item) => ({
          stock_code: item.stock_code,
          quantity: item.quantity,
        })),
      }),
    });
  }

  function predictSegment(values) {
    return request("/api/predict-segment", {
      method: "POST",
      body: JSON.stringify(values),
    });
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value || 0);
  }

  function productImage(product) {
    return product?.image_url || fallbackProductImages[product?.category] || fallbackProductImages.Accessories;
  }

  // Feature: PDF Invoice Generator
  function downloadInvoicePDF(order) {
    if (!order) return;
    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Ju lutem lejoni pop-up ikona në shfletues për të hapur faturën PDF.");
      return;
    }

    const itemsHtml = (order.items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${item.stock_code}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600;">${item.description || item.stock_code}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">£${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 700;">£${(item.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() + " " + new Date(order.created_at).toLocaleTimeString() : new Date().toLocaleDateString();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fatura ${order.order_id} - GiftShop Intelligence</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; padding: 40px; margin: 0; background: #ffffff; }
          .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .invoice-badge { font-size: 18px; font-weight: 700; color: #059669; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .meta-card { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-title { font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .total-box { text-align: right; font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 15px; }
          .footer-note { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <h1 class="brand-title">GiftShop Intelligence</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Faturë Zyrtare e Porosisë • Online Retail Dataset System</p>
          </div>
          <div style="text-align: right;">
            <div class="invoice-badge">FATURË: ${order.order_id}</div>
            <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Data: ${dateStr}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-title">Detajet e Blerësit</div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${order.customer_name || 'Klient i Nderuar'}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 2px;">Email: ${order.user_email}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 2px;">Tel: ${order.phone || 'N/A'}</div>
          </div>
          <div class="meta-card">
            <div class="meta-title">Adresa & Pagesa</div>
            <div style="font-size: 13px; color: #0f172a; font-weight: 600;">Adresa: ${order.address || 'Standard'}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 2px;">Mënyra e Pagesës: ${order.payment_method || 'Credit Card'}</div>
            <div style="font-size: 13px; color: #059669; font-weight: 700; margin-top: 2px;">Statusi: Konfirmuar & Paguar</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Kodi</th>
              <th>Përshkrimi i Produktit</th>
              <th style="text-align: center;">Sasia</th>
              <th style="text-align: right;">Çmimi Njesi</th>
              <th style="text-align: right;">Gjithsej</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          Gjithsej për të paguar: <span style="color: #059669;">£${(order.total || 0).toFixed(2)}</span>
        </div>

        <div class="footer-note">
          Faleminderit për blerjen në GiftShop Retail Intelligence! Ky dokument është faturë elektronike e konfirmuar automatikisht.
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  }

  function StatCard({ label, value, subtext, accent, faIcon }) {
    return h(
      "section",
      { className: "stat-card", style: { "--accent": accent } },
      h("div", { className: "stat-icon" }, fa(faIcon)),
      h("div", null,
        h("p", null, label),
        h("strong", null, value),
        subtext ? h("small", { className: "stat-subtext" }, subtext) : null
      )
    );
  }

  function SegmentPill({ segment }) {
    const className = `segment-pill ${(segment || "").toLowerCase().replaceAll(" ", "-")}`;
    return h("span", { className }, segment);
  }

  function ProductCardItem({ product, wishlist = [], onToggleWishlist, onAddToCart, onOpenModal, showAddToCart = true }) {
    const brandName = (product.category || "MYTHERESA SELECTION").toUpperCase();
    const isLiked = wishlist.some((item) => item.stock_code === product.stock_code);

    return h("article", {
      className: "mytheresa-product-card",
      key: product.stock_code,
      onClick: () => onOpenModal && onOpenModal(product)
    },
      h("div", { className: "mytheresa-image-wrapper" },
        h("img", { src: productImage(product), alt: product.description || "Product image", loading: "lazy" }),
        h("button", {
          className: `mytheresa-wishlist ${isLiked ? "active" : ""}`,
          type: "button",
          onClick: (e) => { e.stopPropagation(); onToggleWishlist && onToggleWishlist(product); },
          "aria-label": isLiked ? "Largo nga favoritet" : "Shto te favoritet",
          title: isLiked ? "Largo nga favoritet" : "Shto te favoritet"
        }, fa(isLiked ? "fa-heart" : "fa-heart-regular")),
        (product.customer_count > 500 || product.total_quantity > 10000) ? h("span", { className: "mytheresa-tag" }, "BESTSELLER") : null,
        showAddToCart ? h("button", {
          className: "mytheresa-quick-add",
          type: "button",
          onClick: (e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }
        }, fa("fa-bag-shopping"), " SHTO NË SHPORTË") : null
      ),
      h("div", { className: "mytheresa-details" },
        h("div", { className: "mytheresa-brand-wrap" },
          h("span", { className: "mytheresa-brand" }, brandName),
          h("span", { className: "mytheresa-stock-badge" }, fa("fa-cubes"), ` Stoku: ${formatNumber(product.total_quantity || 100)}`)
        ),
        h("h3", { className: "mytheresa-name", title: product.description }, product.description || "Luxury Product"),
        h("div", { className: "mytheresa-price-bar" },
          h("span", { className: "mytheresa-price" }, formatMoney(product.price)),
          h("span", { className: "mytheresa-code" }, `#${product.stock_code}`)
        )
      )
    );
  }

  function LoginScreen({ onLogin }) {
    const [tab, setTab] = useState("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function fillDemo(type) {
      setError("");
      setTab("signin");
      if (type === "admin") {
        setEmail("admin@giftshop.com");
        setPassword("admin123");
      } else {
        setEmail("user@giftshop.com");
        setPassword("user123");
      }
    }

    async function submit(event) {
      event.preventDefault();
      setLoading(true);
      setError("");
      try {
        if (tab === "register") {
          if (!name.trim()) {
            throw new Error("Please enter your full name");
          }
          const user = await registerUser({ name, email, password });
          onLogin(user);
        } else {
          const user = await loginUser({ email, password });
          onLogin(user);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    return h(
      "main",
      { className: "login-screen" },
      h(
        "section",
        { className: "login-brand" },
        h("span", { className: "brand-mark" }, "CI"),
        h("p", { className: "eyebrow" }, "Customer Intelligence Suite"),
        h("h1", null, "Executive retail analytics & luxury gift storefront"),
        h("p", null, "Powered by 392,692 transactions from the Online Retail dataset. Admins analyze RFM customer segments and collaborative filtering recommendations, while registered users shop from dataset products with live ML segment tracking.")
      ),
      h(
        "section",
        { className: "login-card" },
        h("h2", null, tab === "register" ? "Create Account" : "Sign In"),
        h("p", null, tab === "register" ? "Register a new customer account to browse products and track your RFM segment." : "Sign in to your account with your email and password."),
        h(
          "div",
          { className: "role-switch" },
          h("button", { className: tab === "signin" ? "active" : "", type: "button", onClick: () => { setTab("signin"); setError(""); } }, "Sign In"),
          h("button", { className: tab === "register" ? "active" : "", type: "button", onClick: () => { setTab("register"); setError(""); } }, "Create Account")
        ),
        error ? h("div", { className: "alert" }, error) : null,
        h(
          "form",
          { className: "login-form", onSubmit: submit },
          tab === "register" ? h("label", null, h("span", null, "Full Name"), h("input", { value: name, onChange: (e) => setName(e.target.value), type: "text", placeholder: "e.g. John Doe", required: true })) : null,
          h("label", null, h("span", null, "Email Address"), h("input", { value: email, onChange: (e) => setEmail(e.target.value), type: "email", placeholder: "name@example.com", required: true })),
          h("label", null, h("span", null, "Password"), h("input", { value: password, onChange: (e) => setPassword(e.target.value), type: "password", placeholder: "••••••••", required: true })),
          h("button", { className: "primary-button", type: "submit" }, loading ? (tab === "register" ? "Creating Account..." : "Signing in...") : (tab === "register" ? "Create Account & Sign In" : "Sign In"))
        ),
        tab === "signin" ? h("div", { className: "demo-note" },
          h("span", { style: { display: "block", marginBottom: "6px", fontWeight: "600" } }, "Or use Quick Demo Accounts:"),
          h("div", { style: { display: "flex", gap: "8px" } },
            h("button", { type: "button", className: "ghost-button", onClick: () => fillDemo("admin"), style: { padding: "4px 10px", fontSize: "0.8rem" } }, "Fill Admin Demo"),
            h("button", { type: "button", className: "ghost-button", onClick: () => fillDemo("user"), style: { padding: "4px 10px", fontSize: "0.8rem" } }, "Fill User Demo")
          )
        ) : null
      )
    );
  }

  function App() {
    const savedUser = sessionStorage.getItem("customer-intel-user");
    const [auth, setAuth] = useState(savedUser ? JSON.parse(savedUser) : null);
    const [activeView, setActiveView] = useState("overview");
    const [summary, setSummary] = useState(null);
    const [countryAnalytics, setCountryAnalytics] = useState([]);
    const [segmentMetrics, setSegmentMetrics] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [segment, setSegment] = useState("");
    const [query, setQuery] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [productQuery, setProductQuery] = useState("");
    const [topRecommendations, setTopRecommendations] = useState([]);
    const [predictionValues, setPredictionValues] = useState(emptyPrediction);
    const [prediction, setPrediction] = useState(null);
    const [orders, setOrders] = useState([]);
    const [ordersSummary, setOrdersSummary] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderQuery, setOrderQuery] = useState("");
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);

    // Feature: Live Floating Toast System
    const [toasts, setToasts] = useState([]);

    function addToast(msg, type = "success") {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, msg, type }]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 3500);
    }

    const [lastOrder, setLastOrder] = useState(null);

    // Feature: Price Range Filter
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    // 2-Step Checkout Form & Confirmation Modal State
    const [checkoutFormOpen, setCheckoutFormOpen] = useState(false);
    const [shippingName, setShippingName] = useState(auth?.name || "");
    const [shippingEmail, setShippingEmail] = useState(auth?.email || "");
    const [shippingPhone, setShippingPhone] = useState("+383 49 123 456");
    const [shippingAddress, setShippingAddress] = useState("Rr. Agim Ramadani, Nr. 12, Prishtinë");
    const [shippingPayment, setShippingPayment] = useState("Credit/Debit Card");
    const [shippingNotes, setShippingNotes] = useState("");

    const [orderSuccessModal, setOrderSuccessModal] = useState(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [sortBy, setSortBy] = useState("popular");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [similarLoading, setSimilarLoading] = useState(false);

    // Similarity search tool state in Recommendations view
    const [simSearchCode, setSimSearchCode] = useState("85123A");
    const [simSearchResults, setSimSearchResults] = useState([]);
    const [simSearchLoading, setSimSearchLoading] = useState(false);

    const [wishlist, setWishlist] = useState(() => {
      try {
        const saved = localStorage.getItem("giftshop_wishlist");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    });
    const [wishlistOpen, setWishlistOpen] = useState(false);

    useEffect(() => {
      try {
        localStorage.setItem("giftshop_wishlist", JSON.stringify(wishlist));
      } catch (e) {}
    }, [wishlist]);

    function toggleWishlist(product) {
      setWishlist((prev) => {
        const exists = prev.some((p) => p.stock_code === product.stock_code);
        if (exists) {
          addToast(`${product.description || product.stock_code} u hoq nga favoritet`, "info");
          return prev.filter((p) => p.stock_code !== product.stock_code);
        } else {
          addToast(`♥ ${product.description || product.stock_code} u ruajt te favoritet!`, "success");
          return [...prev, product];
        }
      });
    }

    const [myOrdersOpen, setMyOrdersOpen] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [secondaryLoading, setSecondaryLoading] = useState(false);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [error, setError] = useState("");

    const segments = useMemo(() => summary?.segment_counts || [], [summary]);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.quantity * (item.price || 0), 0);

    // Synchronize shipping details when auth changes
    useEffect(() => {
      if (auth?.name) setShippingName(auth.name);
      if (auth?.email) setShippingEmail(auth.email);
    }, [auth]);

    async function loadUserProfile(email) {
      if (!email) return;
      try {
        const data = await getUserProfile(email);
        setUserProfile(data);
      } catch (err) {
        console.error("Error loading user profile:", err);
      }
    }

    function handleLogin(user) {
      sessionStorage.setItem("customer-intel-user", JSON.stringify(user));
      setAuth(user);
      setActiveView("overview");
      setError("");
      addToast(`Mirë se vini, ${user.name || user.email}!`, "success");
      if (user.name) setShippingName(user.name);
      if (user.email) {
        setShippingEmail(user.email);
        loadUserProfile(user.email);
      }
    }

    function logout() {
      sessionStorage.removeItem("customer-intel-user");
      setAuth(null);
      setActiveView("overview");
      setCart([]);
      setCartOpen(false);
      setCheckoutFormOpen(false);
      setLastOrder(null);
      setOrderSuccessModal(null);
      setUserProfile(null);
    }

    async function loadSummaryData() {
      const data = await getSummary();
      setSummary(data);
      if (data.top_countries) setCountryAnalytics(data.top_countries);
      if (data.segment_metrics) setSegmentMetrics(data.segment_metrics);
    }

    async function selectCustomer(customerId) {
      setCustomerLoading(true);
      setError("");
      try {
        const data = await getCustomer(customerId);
        setSelectedCustomer(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCustomerLoading(false);
      }
    }

    async function loadCustomers(next = {}) {
      const data = await getCustomers({
        segment: next.segment ?? segment,
        query: next.query ?? query,
        limit: 20,
        offset: 0,
      });
      setCustomers(data.items);
      setTotalCustomers(data.total);

      const selectedIsVisible = data.items.some((item) => item.customer_id === selectedCustomer?.customer_id);
      if (data.items.length > 0 && !selectedIsVisible) {
        await selectCustomer(data.items[0].customer_id);
      } else if (data.items.length === 0) {
        setSelectedCustomer(null);
      }
    }

    async function loadProducts(next = {}) {
      setSecondaryLoading(true);
      setError("");
      try {
        const data = await getProducts({
          query: next.query ?? productQuery,
          category: next.category ?? selectedCategory,
          sortBy: next.sortBy ?? sortBy,
          limit: 12,
        });

        let filteredItems = data.items;
        if (minPrice !== "") {
          filteredItems = filteredItems.filter(p => (p.price || 0) >= Number(minPrice));
        }
        if (maxPrice !== "") {
          filteredItems = filteredItems.filter(p => (p.price || 0) <= Number(maxPrice));
        }

        setProducts(filteredItems);
        setTotalProducts(data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setSecondaryLoading(false);
      }
    }

    async function loadCategories() {
      const data = await getProductCategories();
      setCategories(data.items);
    }

    async function loadRecommendations() {
      setSecondaryLoading(true);
      setError("");
      try {
        const data = await getTopRecommendations(12);
        setTopRecommendations(data.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setSecondaryLoading(false);
      }
    }

    async function runSimilarityLookup(codeToSearch) {
      const target = codeToSearch || simSearchCode;
      if (!target) return;
      setSimSearchLoading(true);
      try {
        const res = await getSimilarProducts(target);
        setSimSearchResults(res.items || []);
      } catch (err) {
        console.error("Similarity search failed:", err);
      } finally {
        setSimSearchLoading(false);
      }
    }

    async function openProductModal(product) {
      setSelectedProduct(product);
      setSimilarProducts([]);
      setSimilarLoading(true);
      try {
        const res = await getSimilarProducts(product.stock_code);
        setSimilarProducts(res.items || []);
      } catch (err) {
        console.error("Error loading similar products:", err);
      } finally {
        setSimilarLoading(false);
      }
    }

    const userOrders = useMemo(() => {
      if (!auth?.email) return [];
      return orders.filter(o => o.user_email && o.user_email.toLowerCase() === auth.email.toLowerCase());
    }, [orders, auth]);

    async function loadOrders() {
      setSecondaryLoading(true);
      setError("");
      try {
        const data = await getOrders();
        setOrders(data.items || []);
        setOrdersSummary({
          total: data.total,
          total_revenue: data.total_revenue,
          total_items: data.total_items,
          average_order_value: data.average_order_value,
        });
        if (data.items?.length > 0 && !selectedOrder) {
          setSelectedOrder(data.items[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSecondaryLoading(false);
      }
    }

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        await loadSummaryData();
        await loadCustomers();
        await loadOrders();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    async function submitPrediction(event) {
      event.preventDefault();
      setError("");
      try {
        const data = await predictSegment({
          recency: Number(predictionValues.recency),
          frequency: Number(predictionValues.frequency),
          monetary: Number(predictionValues.monetary),
        });
        setPrediction(data);
        addToast(`Segmenti i parashikuar: ${data.segment}`, "info");
      } catch (err) {
        setError(err.message);
      }
    }

    function openSegmentCustomers(nextSegment) {
      setSegment(nextSegment);
      setActiveView("customers");
      loadCustomers({ segment: nextSegment }).catch((err) => setError(err.message));
    }

    function addToCart(product) {
      const maxStock = Number(product.total_quantity) || 10000;
      let stockExceeded = false;

      setCart((items) => {
        const existing = items.find((item) => item.stock_code === product.stock_code);
        const currentQty = existing ? existing.quantity : 0;
        if (currentQty + 1 > maxStock) {
          stockExceeded = true;
          return items;
        }
        if (existing) {
          return items.map((item) => item.stock_code === product.stock_code ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...items, { ...product, quantity: 1, total_quantity: maxStock }];
      });

      if (stockExceeded) {
        addToast(`❌ Sasia e porosisë tejkalon stokun në gjendje prej ${maxStock.toLocaleString()} copë!`, "warning");
      } else {
        setCartOpen(true);
        addToast(`${product.description || product.stock_code} u shtua në shportë`, "success");
      }
    }

    function updateCart(product, delta) {
      const maxStock = Number(product.total_quantity) || 10000;
      let stockWarn = false;

      setCart((items) => items
        .map((item) => {
          if (item.stock_code === product.stock_code) {
            const nextQty = item.quantity + delta;
            if (nextQty > maxStock) {
              stockWarn = true;
              return { ...item, quantity: maxStock };
            }
            return { ...item, quantity: Math.max(0, nextQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0));

      if (stockWarn) {
        addToast(`⚠️ Sasia u kufizua te stoku maksimal në gjendje prej ${maxStock.toLocaleString()} copë!`, "warning");
      }
    }

    function setCartItemQuantity(product, targetQty) {
      const maxStock = Number(product.total_quantity) || 10000;
      const parsedQty = parseInt(targetQty, 10) || 0;
      let stockWarn = false;

      if (parsedQty > maxStock) {
        stockWarn = true;
      }
      const validQty = Math.min(maxStock, Math.max(0, parsedQty));

      setCart((items) => items
        .map((item) => item.stock_code === product.stock_code ? { ...item, quantity: validQty } : item)
        .filter((item) => item.quantity > 0));

      if (stockWarn) {
        addToast(`⚠️ Sasia e kërkuar (${parsedQty.toLocaleString()}) u kufizua te stoku maksimal prej ${maxStock.toLocaleString()} copë!`, "warning");
      }
    }

    // Step 1: Open Shipping & Order Form Modal
    function proceedToCheckoutForm() {
      if (!cart.length) return;
      if (!shippingPhone) setShippingPhone("+383 49 123 456");
      if (!shippingAddress) setShippingAddress("Rr. Agim Ramadani, Nr. 12, Prishtinë");
      if (!shippingEmail) setShippingEmail(auth?.email || "klient@giftshop.com");
      if (!shippingName) setShippingName(auth?.name || "Blerës i Nderuar");
      setCartOpen(false);
      setCheckoutFormOpen(true);
    }

    // Step 2: Finalize Purchase & Submit Form
    async function submitCheckoutForm(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (!cart.length || checkoutLoading) return;

      const finalEmail = shippingEmail || auth?.email || "klient@giftshop.com";
      const finalName = shippingName || auth?.name || "Blerës i Nderuar";
      const finalPhone = shippingPhone || "+383 49 123 456";
      const finalAddress = shippingAddress || "Rr. Agim Ramadani, Nr. 12, Prishtinë";

      // Verify stock limit for each item in cart before network request
      const overStockItems = cart.filter(item => item.total_quantity && item.quantity > item.total_quantity);
      if (overStockItems.length > 0) {
        const itemNames = overStockItems.map(i => `'${i.description || i.stock_code}' (Kërkuar: ${i.quantity.toLocaleString()}, Në stok: ${i.total_quantity.toLocaleString()})`).join(", ");
        const errMsg = `Sasia e porosisë tejkalon stokun në gjendje! ${itemNames}`;
        setError(errMsg);
        addToast(`⚠️ Sasia tejkalon stokun e disponueshëm!`, "warning");
        return;
      }

      setCheckoutLoading(true);
      setError("");
      try {
        const order = await checkoutCart({
          userEmail: finalEmail,
          name: finalName,
          phone: finalPhone,
          address: finalAddress,
          paymentMethod: shippingPayment,
          notes: shippingNotes,
          items: cart,
        });
        setLastOrder(order);
        setOrderSuccessModal(order);
        setCart([]);
        setCheckoutFormOpen(false);
        addToast(`Porosia ${order.order_id} u konfirmua me sukses!`, "success");
        if (finalEmail) {
          loadUserProfile(finalEmail);
          loadOrders();
        }
      } catch (err) {
        console.error("Checkout failed:", err);
        setError(err.message || "Gabim gjatë procesimit të porosisë.");
        addToast(`❌ Gabim: ${err.message || "Dërgimi dështoi"}`, "warning");
      } finally {
        setCheckoutLoading(false);
      }
    }

    useEffect(() => {
      if (!auth) {
        setLoading(false);
        return;
      }

      if (auth.email) {
        loadUserProfile(auth.email);
      }

      if (auth.role === "admin") {
        loadDashboard();
      } else {
        setLoading(false);
        loadCategories().catch((err) => setError(err.message));
        loadProducts().catch((err) => setError(err.message));
      }
    }, [auth]);

    useEffect(() => {
      if (auth?.role === "admin" && !loading) {
        loadCustomers().catch((err) => setError(err.message));
      }
    }, [segment]);

    useEffect(() => {
      if (auth?.role === "admin" && activeView === "recommendations") {
        if (topRecommendations.length === 0) loadRecommendations().catch((err) => setError(err.message));
        if (simSearchResults.length === 0) runSimilarityLookup("85123A");
      }
    }, [activeView, auth]);

    useEffect(() => {
      if (auth?.role === "admin" && activeView === "orders") {
        loadOrders().catch((err) => setError(err.message));
      }
    }, [activeView, auth]);

    function renderToastContainer() {
      if (!toasts.length) return null;
      return h("div", { className: "toast-container" },
        toasts.map(t =>
          h("div", { key: t.id, className: `toast-item ${t.type}` },
            fa(t.type === "success" ? "fa-circle-check" : "fa-circle-info"),
            h("span", null, t.msg)
          )
        )
      );
    }

    function renderSidebar() {
      return h(
        "aside",
        { className: "sidebar" },
        h("div", { className: "sidebar-logo" }, h("span", { className: "brand-mark" }, "CI"), h("h1", null, "Customer Intelligence"), h("p", null, "Admin Suite")),
        h(
          "nav",
          { className: "sidebar-nav" },
          adminNavItems.map((item) =>
            h("button", { key: item[0], className: activeView === item[0] ? "active" : "", type: "button", onClick: () => setActiveView(item[0]) }, fa(item[1]), h("span", { style: { marginLeft: "8px" } }, item[2]))
          )
        ),
        h("div", { className: "sidebar-footer" }, h("span", null, "Signed in as"), h("strong", null, auth?.name || "Admin"), h("button", { className: "logout-link", type: "button", onClick: logout }, fa("fa-right-from-bracket"), " Log out"))
      );
    }

    function renderAdminTopbar() {
      return h(
        "header",
        { className: "topbar" },
        h("div", null, h("p", { className: "eyebrow" }, "Dataset Analytics Dashboard"), h("h1", null, "Customer Segmentation & RFM Intelligence")),
        h(
          "div",
          { className: "topbar-tools" },
          h(
            "form",
            { className: "global-search", onSubmit: (event) => { event.preventDefault(); setActiveView("customers"); loadCustomers().catch((err) => setError(err.message)); } },
            fa("fa-magnifying-glass"),
            h("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search Customer Name or ID..." })
          ),
          h("button", { className: "icon-button", type: "button", onClick: loadDashboard, title: "Refresh dashboard" }, fa("fa-rotate-right"), h("span", null, "Refresh")),
          h("div", { className: "admin-profile" }, h("span", { className: "avatar" }, "AD"), h("div", null, h("strong", null, auth?.name || "Admin"), h("small", null, "Customer Analytics")))
        )
      );
    }

    function renderStats() {
      return h(
        "section",
        { className: "stats-grid" },
        h(StatCard, { label: "Customers", value: formatNumber(summary?.total_customers), subtext: "4,338 dataset + live users", accent: "#12806a", faIcon: "fa-users" }),
        h(StatCard, { label: "Total Revenue", value: formatMoney(summary?.total_revenue), subtext: "392,692 transactions", accent: "#9b6d2f", faIcon: "fa-sack-dollar" }),
        h(StatCard, { label: "Avg Recency", value: `${summary?.average_recency || 0} days`, subtext: "Average days since last purchase", accent: "#6f5ebf", faIcon: "fa-calendar-check" }),
        h(StatCard, { label: "Recommendations", value: formatNumber(summary?.recommendation_count), subtext: "Collaborative filtering pairs", accent: "#b58a00", faIcon: "fa-wand-magic-sparkles" })
      );
    }

    function renderCustomerTable(title = "Customers", showSearch = true) {
      return h(
        "div",
        { className: "panel customer-panel" },
        h("div", { className: "panel-header" }, h("div", null, h("h2", null, title), h("p", null, `${formatNumber(totalCustomers)} matches`)), showSearch ? h("form", { className: "search-box", onSubmit: (event) => { event.preventDefault(); loadCustomers().catch((err) => setError(err.message)); } }, fa("fa-magnifying-glass"), h("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search Name or ID..." })) : h("button", { className: "ghost-button", type: "button", onClick: () => setActiveView("customers") }, "View All")),
        h("div", { className: "segment-tabs" }, h("button", { type: "button", className: !segment ? "active" : "", onClick: () => setSegment("") }, "All"), segments.map((item) => h("button", { type: "button", key: item.segment, className: segment === item.segment ? "active" : "", onClick: () => setSegment(item.segment) }, item.segment))),
        h(
          "div",
          { className: "table-wrap" },
          h("table", null,
            h("thead", null, h("tr", null, h("th", null, "ID"), h("th", null, "Emri i Klientit (Customer Name)"), h("th", null, "Segment"), h("th", null, "Recency"), h("th", null, "Frequency"), h("th", null, "Monetary"), h("th", null, ""))),
            h("tbody", null, customers.map((customer) => h("tr", { key: customer.customer_id, className: selectedCustomer?.customer_id === customer.customer_id ? "selected" : "" },
              h("td", null, h("strong", { className: "order-id-code" }, `#${customer.customer_id}`)),
              h("td", null, h("div", { style: { display: "flex", flexDirection: "column" } },
                h("strong", { style: { fontWeight: "600", color: "#0f172a" } }, customer.name || `Customer #${customer.customer_id}`),
                customer.user_email ? h("small", { className: "muted", style: { fontSize: "0.78rem" } }, customer.user_email) : null
              )),
              h("td", null, h(SegmentPill, { segment: customer.segment })),
              h("td", null, `${customer.recency}d`),
              h("td", null, customer.frequency),
              h("td", null, formatMoney(customer.monetary)),
              h("td", null, h("button", { className: "row-button", type: "button", onClick: () => selectCustomer(customer.customer_id), title: "Open customer" }, fa("fa-chevron-right")))
            )))
          )
        )
      );
    }

    function renderCustomerDetail() {
      return h(
        "aside",
        { className: "panel detail-panel" },
        h("div", { className: "panel-header" }, h("div", null, h("h2", null, selectedCustomer?.name || "Customer Profile"), h("p", null, selectedCustomer ? `ID: #${selectedCustomer.customer_id} ${selectedCustomer.user_email ? '• ' + selectedCustomer.user_email : ''}` : "Select a customer")), customerLoading ? h("span", { className: "loader-dot" }) : null),
        selectedCustomer ? h(React.Fragment, null,
          h("div", { className: "detail-summary" }, h(SegmentPill, { segment: selectedCustomer.segment }), h("strong", null, formatMoney(selectedCustomer.monetary)), h("span", null, selectedCustomer.country || "Unknown country")),
          selectedCustomer.action_strategy ? h("div", { className: "strategy-card strategy-action-box", style: { margin: "12px 0", background: "#fcf8f0", borderLeft: "3px solid #d97706", padding: "12px" } },
            h("strong", { style: { display: "block", color: "#b45309", marginBottom: "4px", fontSize: "0.88rem" } }, selectedCustomer.action_strategy.title),
            h("p", { style: { fontSize: "0.82rem", margin: 0, color: "#451a03" } }, selectedCustomer.action_strategy.action)
          ) : null,
          h("div", { className: "mini-grid" }, h("span", null, h("b", null, `${selectedCustomer.recency}d`), "Recency"), h("span", null, h("b", null, selectedCustomer.frequency), "Frequency"), h("span", null, h("b", null, formatNumber(selectedCustomer.total_quantity)), "Quantity")),
          h("section", { className: "subsection" }, h("h3", null, "Collaborative Recommendations"), h("div", { className: "recommendation-list" }, selectedCustomer.recommendations?.length ? selectedCustomer.recommendations.map((item) => h("article", { key: item.recommended_product || item.stock_code }, h("span", null, `#${item.rank || 1}`), h("div", null, h("strong", null, item.recommended_product || item.stock_code), h("p", null, item.description || "No description")))) : h("p", { className: "muted" }, "No recommendations found."))),
          h("section", { className: "subsection" }, h("h3", null, "Top Purchased Dataset Products"), h("div", { className: "compact-list" }, selectedCustomer.top_products?.map((item) => h("p", { key: item.stock_code }, h("b", null, item.stock_code), h("span", null, item.description || "No description")))))
        ) : h("p", { className: "muted" }, "No customer selected.")
      );
    }

    function renderSegmentMix() {
      return h("div", { className: "panel" },
        h("div", { className: "panel-header" }, h("div", null, h("h2", null, "Segment Distribution"), h("p", null, "Customer clustering output from K-Means"))),
        h("div", { className: "bars" }, segments.map((item) => {
          const total = summary?.total_customers || 1;
          const percent = ((item.count / total) * 100).toFixed(1);
          return h("button", { className: "bar-row bar-button", key: item.segment, type: "button", onClick: () => openSegmentCustomers(item.segment) },
            h("span", null, item.segment),
            h("div", null, h("i", { style: { width: `${percent}%` } })),
            h("b", null, `${formatNumber(item.count)} (${percent}%)`)
          );
        }))
      );
    }

    function renderCountryAnalytics() {
      return h("div", { className: "panel" },
        h("div", { className: "panel-header" },
          h("div", null,
            h("h2", null, "Top Country Sales (Dataset)"),
            h("p", null, "Revenue breakdown across 37+ countries")
          )
        ),
        h("div", { className: "table-wrap" },
          h("table", null,
            h("thead", null,
              h("tr", null,
                h("th", null, "Country"),
                h("th", null, "Customers"),
                h("th", null, "Share"),
                h("th", null, "Revenue")
              )
            ),
            h("tbody", null,
              countryAnalytics.slice(0, 5).map((c) =>
                h("tr", { key: c.Country },
                  h("td", null, h("strong", null, c.Country)),
                  h("td", null, formatNumber(c.customer_count)),
                  h("td", null, `${c.percentage}%`),
                  h("td", null, formatMoney(c.total_revenue))
                )
              )
            )
          )
        )
      );
    }

    function renderTopRecommendedProductsCard() {
      return h("div", { className: "panel full-panel" },
        h("div", { className: "panel-header" },
          h("div", null,
            h("h2", null, "Top Collaborative Filtering Recommendations"),
            h("p", null, "Most recommended dataset items derived from customer co-purchases")
          ),
          h("button", { className: "ghost-button", type: "button", onClick: () => setActiveView("recommendations") }, "View All")
        ),
        h("div", { className: "product-grid compact-products" },
          summary?.top_recommended_products?.length ? summary.top_recommended_products.slice(0, 4).map((item) =>
            h(ProductCardItem, { key: item.stock_code, product: item, onOpenModal: openProductModal, onAddToCart: addToCart, showAddToCart: false })
          ) : h("p", { className: "muted" }, "Loading top recommendations...")
        )
      );
    }

    function renderOverview() {
      return h("div", { className: "view-stack" },
        renderStats(),
        h("section", { className: "layout-grid" }, renderCustomerTable("High Value Customers", false), renderCustomerDetail()),
        renderTopRecommendedProductsCard(),
        h("section", { className: "bottom-grid" },
          renderSegmentMix(),
          renderCountryAnalytics()
        )
      );
    }

    function renderCustomersView() {
      return h("section", { className: "layout-grid" }, renderCustomerTable("Customer Management Directory", true), renderCustomerDetail());
    }

    function renderSegmentsView() {
      return h("div", { className: "view-stack" },
        h("section", { className: "stats-grid" },
          segments.map((item, index) => {
            const m = segmentMetrics.find(sm => sm.Segment === item.segment);
            return h(StatCard, {
              key: item.segment,
              label: item.segment,
              value: formatNumber(item.count),
              subtext: m ? `Avg R: ${m.avg_recency}d | F: ${m.avg_frequency} | M: ${formatMoney(m.avg_monetary)}` : "Dataset Segment",
              accent: ["#12806a", "#87351d", "#765311"][index % 3],
              faIcon: ["fa-user-check", "fa-user-clock", "fa-user-plus"][index % 3]
            });
          })
        ),
        h("section", { className: "bottom-grid" },
          renderSegmentMix(),
          h("div", { className: "panel" },
            h("div", { className: "panel-header" },
              h("div", null,
                h("h2", null, "Segment Benchmark Metrics & Strategy"),
                h("p", null, "Empirical dataset RFM averages and tailored business actions")
              )
            ),
            h("div", { className: "strategy-grid" },
              h("article", { className: "strategy-card" },
                h("strong", { style: { color: "#12806a" } }, "Loyal Customers"),
                h("p", { className: "muted", style: { fontSize: "0.8rem", margin: "4px 0 8px" } }, "Dataset Benchmarks: Avg Recency ~32d | Avg Freq ~6.4 orders | Avg Spend ~£2,800"),
                h("p", null, "VIP loyalty rewards, early access to new product arrivals, and double reward points.")
              ),
              h("article", { className: "strategy-card" },
                h("strong", { style: { color: "#87351d" } }, "At Risk Customers"),
                h("p", { className: "muted", style: { fontSize: "0.8rem", margin: "4px 0 8px" } }, "Dataset Benchmarks: Avg Recency ~247d | Avg Freq ~1.6 orders | Avg Spend ~£470"),
                h("p", null, "Automated win-back email flows with 20% discount coupons on top recommended items to prevent churn.")
              ),
              h("article", { className: "strategy-card" },
                h("strong", { style: { color: "#765311" } }, "Potential Customers"),
                h("p", { className: "muted", style: { fontSize: "0.8rem", margin: "4px 0 8px" } }, "Dataset Benchmarks: Avg Recency ~54d | Avg Freq ~2.1 orders | Avg Spend ~£650"),
                h("p", null, "Welcome series with 10% first-order discount and curated product starter bundles.")
              )
            )
          )
        )
      );
    }

    function renderRecommendationsView() {
      return h("div", { className: "view-stack" },
        h("section", { className: "panel full-panel" },
          h("div", { className: "panel-header" },
            h("div", null,
              h("h2", null, "Item-to-Item Similarity Matrix Finder"),
              h("p", null, "Compute Cosine Similarity across 392,692 transactions for any StockCode")
            )
          ),
          h("div", { className: "sim-search-bar" },
            h("form", { className: "sim-search-form", onSubmit: (e) => { e.preventDefault(); runSimilarityLookup(); } },
              h("div", { className: "sim-input-wrap" },
                fa("fa-magnifying-glass", { style: { color: "#64748b" } }),
                h("input", { value: simSearchCode, onChange: (e) => setSimSearchCode(e.target.value), placeholder: "Enter StockCode (e.g. 85123A, 22423, 47566)" })
              ),
              h("button", { className: "primary-button sim-submit-btn", type: "submit" }, "Find Similar Items")
            ),
            h("div", { className: "quick-picks" },
              h("span", { className: "muted" }, "Popular StockCodes:"),
              ["85123A", "22423", "47566", "84879", "20725"].map(code =>
                h("button", { key: code, className: "ghost-chip", type: "button", onClick: () => { setSimSearchCode(code); runSimilarityLookup(code); } }, code)
              )
            )
          ),
          simSearchLoading ? h("p", { className: "muted" }, "Calculating item similarity matrix...") : null,
          h("div", { className: "product-grid compact-products" },
            simSearchResults.length ? simSearchResults.map((sim) =>
              h(ProductCardItem, { key: sim.stock_code, product: sim, onOpenModal: openProductModal, onAddToCart: addToCart, showAddToCart: true })
            ) : (!simSearchLoading ? h("p", { className: "muted" }, "No similar items found for this StockCode.") : null)
          )
        ),
        h("section", { className: "panel full-panel" },
          h("div", { className: "panel-header" },
            h("div", null,
              h("h2", null, "Top Collaborative Recommendations Across All Customers"),
              h("p", null, "Most frequent product pairings recommended by the model")
            ),
            h("button", { className: "ghost-button", type: "button", onClick: loadRecommendations }, secondaryLoading ? "Loading..." : h(React.Fragment, null, fa("fa-rotate-right"), " Refresh"))
          ),
          h("div", { className: "product-grid compact-products" },
            topRecommendations.length ? topRecommendations.map((item) =>
              h(ProductCardItem, { key: item.stock_code, product: item, onOpenModal: openProductModal, onAddToCart: addToCart, showAddToCart: true })
            ) : h("p", { className: "muted" }, "Press Refresh to load recommendations.")
          )
        ),
        h("section", { className: "layout-grid" }, renderCustomerTable("Customer Recommendations Directory", true), renderCustomerDetail())
      );
    }

    function renderPredictionView() {
      return h("section", { className: "bottom-grid" },
        h("div", { className: "panel" },
          h("div", { className: "panel-header" },
            h("div", null,
              h("h2", null, "Predict Customer Segment (ML Simulator)"),
              h("p", null, "Enter RFM (Recency, Frequency, Monetary) parameters to run K-Means inference")
            ),
            fa("fa-brain", { style: { fontSize: "1.4rem", color: "#d97706" } })
          ),
          h("form", { className: "predict-form stacked-predict", onSubmit: submitPrediction },
            Object.keys(emptyPrediction).map((field) =>
              h("label", { key: field },
                h("span", null, field.charAt(0).toUpperCase() + field.slice(1)),
                h("input", {
                  type: "number",
                  min: "0",
                  step: "any",
                  value: predictionValues[field],
                  onChange: (event) => setPredictionValues((current) => ({ ...current, [field]: event.target.value }))
                })
              )
            ),
            h("button", { className: "primary-button", type: "submit", style: { marginTop: "12px", width: "100%" } }, fa("fa-calculator"), h("span", { style: { marginLeft: "8px" } }, "Predict Segment"))
          ),
          prediction ? h("div", { className: "prediction-result", style: { flexDirection: "column", alignItems: "flex-start", gap: "12px" } },
            h("div", { style: { display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" } },
              h("div", null,
                h("strong", null, `Predicted Cluster: ${prediction.cluster}`),
                h("p", { className: "muted" }, `Trained StandardScaler + K-Means model classification`)
              ),
              h(SegmentPill, { segment: prediction.segment })
            ),
            prediction.action_strategy ? h("div", { className: "strategy-card strategy-action-box", style: { width: "100%", background: "#fcf8f0", borderLeft: "3px solid #d97706", padding: "12px" } },
              h("strong", { style: { display: "block", color: "#b45309", marginBottom: "4px" } }, `AI Action: ${prediction.action_strategy.title}`),
              h("p", { style: { fontSize: "0.85rem", margin: 0, color: "#451a03" } }, prediction.action_strategy.action)
            ) : null
          ) : null
        ),
        h("div", { className: "panel" },
          h("div", { className: "panel-header" },
            h("div", null,
              h("h2", null, "Model Architecture Notes"),
              h("p", null, "Prediction uses pickled StandardScaler & K-Means (K=3)")
            )
          ),
          h("div", { className: "strategy-grid" },
            h("article", { className: "strategy-card" },
              h("strong", null, "Recency (Days)"),
              h("p", null, "Days since last transaction. Log-transformed before scaling. Lower values = recent buyers.")
            ),
            h("article", { className: "strategy-card" },
              h("strong", null, "Frequency (Invoices)"),
              h("p", null, "Number of distinct completed invoices. Log1p-transformed for Gaussian alignment.")
            ),
            h("article", { className: "strategy-card" },
              h("strong", null, "Monetary (GBP Total)"),
              h("p", null, "Total monetary value spent across all orders. Log1p-transformed for feature parity.")
            )
          )
        )
      );
    }

    function renderOrdersView() {
      const filteredOrders = orders.filter((o) =>
        !orderQuery ||
        (o.order_id && o.order_id.toLowerCase().includes(orderQuery.toLowerCase())) ||
        (o.user_email && o.user_email.toLowerCase().includes(orderQuery.toLowerCase()))
      );

      return h("div", { className: "view-stack" },
        h("section", { className: "stats-grid" },
          h(StatCard, { label: "Live Orders", value: formatNumber(ordersSummary?.total || orders.length), accent: "#12806a", faIcon: "fa-receipt" }),
          h(StatCard, { label: "Live Revenue", value: formatMoney(ordersSummary?.total_revenue), accent: "#9b6d2f", faIcon: "fa-sack-dollar" }),
          h(StatCard, { label: "Items Sold", value: formatNumber(ordersSummary?.total_items), accent: "#6f5ebf", faIcon: "fa-boxes-packing" }),
          h(StatCard, { label: "Avg Order Value", value: formatMoney(ordersSummary?.average_order_value), accent: "#b58a00", faIcon: "fa-chart-line" })
        ),
        h("section", { className: "layout-grid" },
          h("div", { className: "panel customer-panel" },
            h("div", { className: "panel-header" },
              h("div", null,
                h("h2", null, "Storefront Live Orders Log"),
                h("p", null, `${formatNumber(filteredOrders.length)} real checkouts recorded`)
              ),
              h("form", { className: "search-box", onSubmit: (e) => e.preventDefault() },
                fa("fa-magnifying-glass"),
                h("input", { value: orderQuery, onChange: (e) => setOrderQuery(e.target.value), placeholder: "Search Order ID / Email" })
              )
            ),
            h("div", { className: "table-wrap" },
              h("table", null,
                h("thead", null,
                  h("tr", null,
                    h("th", null, "Order ID"),
                    h("th", null, "Date"),
                    h("th", null, "Klienti (Emri & Email)"),
                    h("th", null, "Items"),
                    h("th", null, "Total"),
                    h("th", null, "Status"),
                    h("th", null, "")
                  )
                ),
                h("tbody", null,
                  filteredOrders.length ? filteredOrders.map((ord) =>
                    h("tr", { key: ord.order_id, className: selectedOrder?.order_id === ord.order_id ? "selected" : "" },
                      h("td", null, h("strong", { className: "order-id-code" }, ord.order_id)),
                      h("td", null, ord.created_at ? new Date(ord.created_at).toLocaleDateString() + " " + new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"),
                      h("td", null, h("div", { style: { display: "flex", flexDirection: "column" } },
                        h("strong", { style: { color: "#0f172a" } }, ord.customer_name || "GiftShop Customer"),
                        h("small", { className: "muted", style: { fontSize: "0.78rem" } }, ord.user_email || "Guest")
                      )),
                      h("td", null, ord.item_count),
                      h("td", null, formatMoney(ord.total)),
                      h("td", null, h("span", { className: "status-badge confirmed" }, ord.status || "confirmed")),
                      h("td", null, h("button", { className: "row-button", type: "button", onClick: () => setSelectedOrder(ord), title: "View Order Details" }, fa("fa-chevron-right")))
                    )
                  ) : h("tr", null, h("td", { colSpan: 7, className: "muted" }, "No live orders found."))
                )
              )
            )
          ),
          h("aside", { className: "panel detail-panel" },
            h("div", { className: "panel-header" },
              h("div", null,
                h("h2", null, "Order Details"),
                h("p", null, selectedOrder ? `Order ${selectedOrder.order_id}` : "Select an order")
              )
            ),
            selectedOrder ? h(React.Fragment, null,
              h("div", { className: "detail-summary" },
                h("span", { className: "status-badge confirmed" }, selectedOrder.status || "confirmed"),
                h("strong", null, formatMoney(selectedOrder.total)),
                h("span", null, selectedOrder.customer_name ? `${selectedOrder.customer_name} (${selectedOrder.user_email || ''})` : (selectedOrder.user_email || "Customer"))
              ),
              h("div", { className: "mini-grid" },
                h("span", null, h("b", null, selectedOrder.item_count), "Items"),
                h("span", null, h("b", null, selectedOrder.currency || "GBP"), "Currency"),
                h("span", null, h("b", null, selectedOrder.items?.length || 0), "Lines")
              ),
              h("section", { className: "subsection" },
                h("h3", null, "Purchased Dataset Items"),
                h("div", { className: "order-items-list" },
                  selectedOrder.items?.map((item, idx) =>
                    h("article", { key: `${item.stock_code}-${idx}`, className: "order-item-card" },
                      h("img", { src: productImage(item), alt: item.description || "Product" }),
                      h("div", null,
                        h("strong", null, item.description || item.stock_code),
                        h("p", null, `${item.stock_code} • ${item.category || "Product"}`),
                        h("span", null, `${item.quantity} × ${formatMoney(item.unit_price)} = ${formatMoney(item.line_total)}`)
                      )
                    )
                  )
                ),
                h("button", { className: "secondary-button", type: "button", onClick: () => downloadInvoicePDF(selectedOrder), style: { marginTop: "16px", width: "100%" } }, fa("fa-file-pdf"), " Shkarko Faturën PDF")
              )
            ) : h("p", { className: "muted" }, "No order selected.")
          )
        )
      );
    }

    function renderAdminView() {
      if (loading) return h("div", { className: "loading" }, h("span", { className: "loader-dot" }), "Loading dashboard analytics...");
      if (activeView === "customers") return renderCustomersView();
      if (activeView === "segments") return renderSegmentsView();
      if (activeView === "recommendations") return renderRecommendationsView();
      if (activeView === "prediction") return renderPredictionView();
      if (activeView === "orders") return renderOrdersView();
      return renderOverview();
    }

    function renderWishlistDrawer() {
      if (!wishlistOpen) return null;

      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setWishlistOpen(false), title: "Mbyll favoritet" }),
        h("aside", { className: "cart-drawer wishlist-drawer" },
          h("div", { className: "cart-header" },
            h("div", null,
              h("p", { className: "eyebrow" }, "Koleksioni Juaj i Preferuar"),
              h("h2", null, fa("fa-heart", { style: { color: "#e11d48", marginRight: "8px" } }), `${formatNumber(wishlist.length)} Produkte të Ruajtura`)
            ),
            h("button", { className: "ghost-button", type: "button", onClick: () => setWishlistOpen(false) }, "✕")
          ),
          h("div", { className: "cart-items" },
            wishlist.length ? wishlist.map((item) =>
              h("article", { className: "cart-item wishlist-drawer-item", key: item.stock_code, style: { display: "flex", gap: "12px", alignItems: "center" } },
                h("img", { src: productImage(item), alt: item.description || "Product image" }),
                h("div", { style: { flex: "1" } },
                  h("strong", null, item.description || item.stock_code),
                  h("span", { className: "wishlist-item-price", style: { display: "block", color: "#0f172a", fontWeight: "700" } }, formatMoney(item.price)),
                  h("small", { className: "cart-stock-tag", style: { display: "block", color: "#64748b", marginTop: "2px", fontWeight: "600" } }, fa("fa-cubes"), ` Stoku: ${formatNumber(item.total_quantity || 100)} copë`)
                ),
                h("div", { className: "wishlist-actions-col", style: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" } },
                  h("button", {
                    className: "primary-button",
                    type: "button",
                    style: { padding: "6px 12px", fontSize: "0.76rem" },
                    onClick: () => { addToCart(item); toggleWishlist(item); }
                  }, fa("fa-bag-shopping"), " Shto n'Shportë"),
                  h("button", {
                    className: "ghost-button",
                    type: "button",
                    style: { padding: "4px 8px", fontSize: "0.72rem", color: "#ef4444" },
                    onClick: () => toggleWishlist(item)
                  }, fa("fa-trash"), " Largo")
                )
              )
            ) : h("div", { className: "empty-wishlist-box", style: { padding: "40px 20px", textAlign: "center" } },
              fa("fa-heart-crack", { style: { fontSize: "2.5rem", color: "#cbd5e1", marginBottom: "12px" } }),
              h("p", { style: { fontWeight: "700", color: "#0f172a", marginBottom: "4px" } }, "Nuk keni asnjë produkt te favoritet ende"),
              h("p", { className: "muted", style: { fontSize: "0.86rem" } }, "Klikoni ikonën ♡ te produkteve në dyqan për t'i ruajtur këtu.")
            )
          ),
          h("div", { className: "cart-footer" },
            h("button", {
              className: "primary-button",
              type: "button",
              style: { width: "100%" },
              onClick: () => {
                wishlist.forEach(item => addToCart(item));
                addToast(`Të gjitha produktet e favoriteve u shtuan në shportë!`, "success");
                setWishlistOpen(false);
              },
              disabled: !wishlist.length
            }, fa("fa-cart-plus"), " Shto të Gjitha te Shporta")
          )
        )
      );
    }

    function renderCartDrawer() {
      if (!cartOpen) return null;
      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setCartOpen(false), title: "Mbyll shportën" }),
        h("aside", { className: "cart-drawer" },
          h("div", { className: "cart-header" },
            h("div", null,
              h("p", { className: "eyebrow" }, "Shporta Juaj"),
              h("h2", null, `${formatNumber(cartCount)} artikuj`)
            ),
            h("button", { className: "ghost-button", type: "button", onClick: () => setCartOpen(false) }, "✕")
          ),
          h("div", { className: "cart-items" },
            cart.length ? cart.map((item) =>
              h("article", { className: "cart-item", key: item.stock_code },
                h("img", { src: productImage(item), alt: item.image_alt || item.description || "Product image" }),
                h("div", null,
                  h("strong", null, item.description || item.stock_code),
                  h("span", null, `${formatMoney(item.price)} secili`),
                  h("small", { className: "cart-stock-tag", style: { display: "block", color: "#64748b", marginTop: "2px", fontWeight: "600" } }, fa("fa-cubes"), ` Në gjendje: ${formatNumber(item.total_quantity || 10000)} copë`)
                ),
                h("div", { className: "qty-control" },
                  h("button", { type: "button", onClick: () => updateCart(item, -1), disabled: checkoutLoading }, "-"),
                  h("input", {
                    type: "number",
                    min: "1",
                    max: String(item.total_quantity || 10000),
                    value: item.quantity,
                    onChange: (e) => setCartItemQuantity(item, e.target.value),
                    className: "cart-qty-input",
                    style: { width: "48px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "2px", fontWeight: "700" }
                  }),
                  h("button", { type: "button", onClick: () => updateCart(item, 1), disabled: checkoutLoading }, "+")
                )
              )
            ) : h("p", { className: "muted" }, "Shporta juaj është e zbrazët.")
          ),
          h("div", { className: "cart-footer" },
            h("div", null,
              h("span", null, "Shuma Totale:"),
              h("strong", null, formatMoney(cartTotal))
            ),
            h("button", { className: "primary-button", type: "button", onClick: proceedToCheckoutForm, disabled: !cart.length }, fa("fa-arrow-right"), h("span", { style: { marginLeft: "8px" } }, "Vazhdo te Porosia (Proceed)"))
          )
        )
      );
    }

    function renderCheckoutFormModal() {
      if (!checkoutFormOpen) return null;

      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setCheckoutFormOpen(false) }),
        h("aside", { className: "order-success-modal checkout-form-modal" },
          h("div", { className: "success-modal-header" },
            h("div", { className: "success-badge-icon checkout-form-icon" }, fa("fa-paper-plane")),
            h("h2", null, "Plotsoni Detajet e Dërgesës & Konfirmimit në Email"),
            h("p", { className: "muted" }, "Shkruani adresën dhe email-in ku dëshironi të merrni faturën dhe konfirmimin e porosisë.")
          ),
          h("form", { onSubmit: (e) => { e.preventDefault(); submitCheckoutForm(e); } },
            h("div", { className: "success-modal-body" },
              error ? h("div", { className: "alert", style: { marginBottom: "12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "6px", fontSize: "0.88rem", fontWeight: "600" } }, fa("fa-circle-exclamation"), ` ${error}`) : null,
              h("div", { className: "form-grid-2" },
                h("label", { className: "form-group" },
                  h("span", null, fa("fa-envelope"), " Email-i i Konfirmimit:"),
                  h("input", { type: "email", value: shippingEmail, onChange: (e) => setShippingEmail(e.target.value), required: true, placeholder: "email@example.com" })
                ),
                h("label", { className: "form-group" },
                  h("span", null, fa("fa-user"), " Emri & Mbiemri:"),
                  h("input", { type: "text", value: shippingName, onChange: (e) => setShippingName(e.target.value), required: true, placeholder: "Emri i plotë" })
                )
              ),
              h("div", { className: "form-grid-2" },
                h("label", { className: "form-group" },
                  h("span", null, fa("fa-phone"), " Numri i Telefonit:"),
                  h("input", { type: "tel", value: shippingPhone, onChange: (e) => setShippingPhone(e.target.value), required: true, placeholder: "+383 49 123 456" })
                ),
                h("label", { className: "form-group" },
                  h("span", null, fa("fa-credit-card"), " Mënyra e Pagesës:"),
                  h("select", { value: shippingPayment, onChange: (e) => setShippingPayment(e.target.value) },
                    h("option", { value: "Credit/Debit Card" }, "Me Kartë Bankare (Credit / Debit Card)"),
                    h("option", { value: "Cash on Delivery / Me para në dorë" }, "Me para në dorë gjatë dorëzimit (COD)"),
                    h("option", { value: "Bank Transfer" }, "Transfer Bankar Direkt")
                  )
                )
              ),
              h("label", { className: "form-group" },
                h("span", null, fa("fa-location-dot"), " Adresa e Plotë e Dërgesës:"),
                h("input", { type: "text", value: shippingAddress, onChange: (e) => setShippingAddress(e.target.value), required: true, placeholder: "Rr. Agim Ramadani, Nr. 12, Prishtinë, Kosovë" })
              ),
              h("label", { className: "form-group" },
                h("span", null, fa("fa-comment-dots"), " Shënime për transportin (Opsionale):"),
                h("textarea", { value: shippingNotes, onChange: (e) => setShippingNotes(e.target.value), rows: 2, placeholder: "psh. Thirrni para se të arrini..." })
              ),
              h("div", { className: "order-ref-card", style: { background: "#f8fafc", marginTop: "4px" } },
                h("div", { className: "ref-row" },
                  h("span", null, fa("fa-boxes-stacked"), " Gjithsej Artikuj:"),
                  h("strong", null, `${cartCount} produkte`)
                ),
                h("div", { className: "ref-row" },
                  h("span", null, fa("fa-receipt"), " Shuma Totale e Blerjes:"),
                  h("strong", { className: "ref-total-price" }, formatMoney(cartTotal))
                )
              )
            ),
            h("div", { className: "success-modal-footer" },
              h("button", { className: "secondary-button", type: "button", onClick: () => { setCheckoutFormOpen(false); setCartOpen(true); } }, fa("fa-arrow-left"), " Kthehu te Shporta"),
              h("button", { className: "primary-button", type: "submit", onClick: (e) => submitCheckoutForm(e), disabled: checkoutLoading }, checkoutLoading ? "Po konfirmohet..." : h(React.Fragment, null, fa("fa-paper-plane"), h("span", { style: { marginLeft: "8px" } }, "Konfirmo Porosinë & Dërgo Email")))
            )
          )
        )
      );
    }

    function renderProductModal() {
      if (!selectedProduct) return null;
      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setSelectedProduct(null) }),
        h("aside", { className: "product-modal" },
          h("div", { className: "modal-header" },
            h("div", null,
              h("span", { className: "category-pill" }, selectedProduct.category || "Product"),
              h("h2", null, selectedProduct.description || "Product Details")
            ),
            h("button", { className: "ghost-button", type: "button", onClick: () => setSelectedProduct(null) }, "✕")
          ),
          h("div", { className: "modal-body" },
            h("div", { className: "modal-main-grid" },
              h("div", { className: "modal-image-wrap" },
                h("img", { src: productImage(selectedProduct), alt: selectedProduct.description })
              ),
              h("div", { className: "modal-info-col" },
                h("div", { className: "modal-meta-row" },
                  h("span", { className: "product-code" }, `Code: ${selectedProduct.stock_code}`),
                  h("span", { className: "muted" }, `${formatNumber(selectedProduct.customer_count)} customers purchased`)
                ),
                h("strong", { className: "modal-price" }, formatMoney(selectedProduct.price)),
                h("p", { className: "modal-desc" }, `Verified dataset item in category "${selectedProduct.category || 'General'}". Total quantity sold in dataset: ${formatNumber(selectedProduct.total_quantity)}.`),
                h("button", { className: "primary-button modal-add-btn", type: "button", onClick: () => { addToCart(selectedProduct); setSelectedProduct(null); } }, fa("fa-cart-plus"), h("span", { style: { marginLeft: "8px" } }, "Add to Cart"))
              )
            ),
            h("section", { className: "similar-section" },
              h("h3", null, "AI Recommended Similar Products (Dataset Matrix)"),
              similarLoading ? h("p", { className: "muted" }, "Computing cosine similarity...") : null,
              h("div", { className: "similar-grid" },
                similarProducts.length ? similarProducts.map((sim) =>
                  h("article", { key: sim.stock_code, className: "similar-card", onClick: () => openProductModal(sim) },
                    h("img", { src: productImage(sim), alt: sim.description }),
                    h("div", null,
                      h("strong", null, sim.description || sim.stock_code),
                      h("span", null, formatMoney(sim.price))
                    )
                  )
                ) : (!similarLoading ? h("p", { className: "muted" }, "No similar items found.") : null)
              )
            )
          )
        )
      );
    }

    function renderOrderSuccessModal() {
      if (!orderSuccessModal) return null;
      const order = orderSuccessModal;

      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setOrderSuccessModal(null) }),
        h("aside", { className: "order-success-modal" },
          h("div", { className: "success-modal-header" },
            h("div", { className: "success-badge-icon" }, fa("fa-circle-check")),
            h("h2", null, "Porosia u Konfirmua me Sukses!"),
            h("p", { className: "email-sent-badge", style: { color: "#059669", fontWeight: "700", fontSize: "0.92rem", marginTop: "6px" } }, fa("fa-paper-plane"), ` Email-i i konfirmimit me faturën u dërgua te: ${order.user_email}`)
          ),
          h("div", { className: "success-modal-body" },
            h("div", { className: "order-ref-card" },
              h("div", { className: "ref-row" },
                h("span", null, fa("fa-barcode"), " Kodi i Porosisë:"),
                h("strong", { className: "order-id-code" }, order.order_id)
              ),
              h("div", { className: "ref-row" },
                h("span", null, fa("fa-user"), " Marrësi:"),
                h("span", null, `${order.customer_name || 'Klient'} (${order.phone || 'N/A'})`)
              ),
              h("div", { className: "ref-row" },
                h("span", null, fa("fa-location-dot"), " Adresa e Dërgesës:"),
                h("span", { style: { fontWeight: "600", color: "#1e293b" } }, order.address || "Standard")
              ),
              h("div", { className: "ref-row" },
                h("span", null, fa("fa-credit-card"), " Mënyra e Pagesës:"),
                h("span", null, order.payment_method || "Credit Card")
              ),
              h("div", { className: "ref-row" },
                h("span", null, fa("fa-sack-dollar"), " Shuma Totale:"),
                h("strong", { className: "ref-total-price" }, formatMoney(order.total))
              )
            ),

            h("div", { className: "ai-checkout-note" },
              h("div", { className: "note-title" }, fa("fa-wand-magic-sparkles"), " Përditësim i Kohës Reale me ML Customer Segmentation"),
              h("p", null, `Porosia juaj prej ${formatMoney(order.total)} u regjistrua me sukses në bazën e të dhënave. Rezultati juaj i RFM (Recency, Frequency, Monetary) u përditësua dhe rekomandimet tuaja personale janë gati te profili.`)
            ),

            h("section", { className: "order-items-summary" },
              h("h3", null, fa("fa-box-open"), ` Artikujt e Blerë (${order.items?.length || 0})`),
              h("div", { className: "order-items-list" },
                order.items?.map((item, idx) =>
                  h("article", { key: `${item.stock_code}-${idx}`, className: "order-item-card" },
                    h("img", { src: productImage(item), alt: item.description || "Product" }),
                    h("div", null,
                      h("strong", null, item.description || item.stock_code),
                      h("p", null, `${item.stock_code} • ${item.category || "Dataset Item"}`),
                      h("span", null, `${item.quantity} × ${formatMoney(item.unit_price)} = ${formatMoney(item.line_total)}`)
                    )
                  )
                )
              )
            )
          ),
          h("div", { className: "success-modal-footer" },
            h("button", { className: "secondary-button", type: "button", onClick: () => downloadInvoicePDF(order) }, fa("fa-file-pdf"), " Shkarko Faturën PDF"),
            h("button", { className: "secondary-button", type: "button", onClick: () => { setOrderSuccessModal(null); setMyOrdersOpen(true); } }, fa("fa-user-gear"), " Profilin RFM"),
            h("button", { className: "primary-button", type: "button", onClick: () => setOrderSuccessModal(null) }, fa("fa-bag-shopping"), " Vazhdo Blerjen")
          )
        )
      );
    }

    function renderMyOrdersDrawer() {
      if (!myOrdersOpen) return null;
      const userSegment = userProfile?.segment || "Potential Customers";
      const userRecency = userProfile?.recency ?? 30;
      const userFrequency = userProfile?.frequency ?? 0;
      const userMonetary = userProfile?.monetary ?? 0;
      const userRecs = userProfile?.recommendations || [];

      // Feature: Gamification Segment Goal Calculation
      const targetSpend = 1000;
      const spendProgressPercent = Math.min(100, Math.round((userMonetary / targetSpend) * 100));
      const remainingSpend = Math.max(0, targetSpend - userMonetary);

      return h(React.Fragment, null,
        h("button", { className: "cart-overlay", type: "button", onClick: () => setMyOrdersOpen(false) }),
        h("aside", { className: "cart-drawer customer-profile-drawer" },
          h("div", { className: "cart-header" },
            h("div", null,
              h("p", { className: "eyebrow" }, "Customer Profile & RFM Intelligence"),
              h("h2", null, auth?.name || auth?.email || "Customer Account")
            ),
            h("button", { className: "ghost-button", type: "button", onClick: () => setMyOrdersOpen(false) }, "Close")
          ),
          h("div", { className: "cart-items profile-drawer-content" },
            h("section", { className: "user-segment-box" },
              h("div", { className: "user-segment-head" },
                h("span", { className: "muted" }, "ML Customer Segment:"),
                SegmentPill({ segment: userSegment })
              ),
              h("p", { className: "user-email-text" }, auth?.email)
            ),

            // Feature: Gamification Target Progress Card
            h("section", { className: "segment-goal-card", style: { background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px", borderRadius: "12px", margin: "12px 0" } },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                h("strong", { style: { color: "#166534", fontSize: "0.86rem" } }, fa("fa-award"), " Targeti për Statusin VIP (Loyal)"),
                h("span", { style: { fontSize: "0.8rem", color: "#15803d", fontWeight: "700" } }, `${spendProgressPercent}%`)
              ),
              h("div", { style: { width: "100%", height: "8px", background: "#dcfce7", borderRadius: "4px", overflow: "hidden", marginBottom: "8px" } },
                h("div", { style: { width: `${spendProgressPercent}%`, height: "100%", background: "#16a34a", borderRadius: "4px" } })
              ),
              h("p", { style: { fontSize: "0.8rem", color: "#166534", margin: 0 } },
                userMonetary >= targetSpend ? "Urime! Ju keni arritur nivelin më të lartë VIP Loyal Customer!" : `Bëj edhe ${formatMoney(remainingSpend)} blerje për t'u bërë automatikisht Loyal Customer (VIP)!`
              )
            ),

            h("section", { className: "rfm-mini-grid" },
              h("div", { className: "rfm-mini-card" },
                h("span", { className: "rfm-label" }, "Recency"),
                h("strong", { className: "rfm-val" }, `${userRecency}d`),
                h("small", null, "Days since last order")
              ),
              h("div", { className: "rfm-mini-card" },
                h("span", { className: "rfm-label" }, "Frequency"),
                h("strong", { className: "rfm-val" }, userFrequency),
                h("small", null, "Completed orders")
              ),
              h("div", { className: "rfm-mini-card" },
                h("span", { className: "rfm-label" }, "Monetary"),
                h("strong", { className: "rfm-val" }, formatMoney(userMonetary)),
                h("small", null, "Total spent")
              )
            ),

            userRecs.length ? h("section", { className: "user-recs-section" },
              h("h3", { className: "section-subtitle" }, "AI Recommended For You"),
              h("div", { className: "user-recs-grid" },
                userRecs.map((rec) =>
                  h("article", { key: rec.stock_code, className: "user-rec-card", onClick: () => { setMyOrdersOpen(false); openProductModal(rec); } },
                    h("img", { src: rec.image_url || fallbackProductImages[rec.category], alt: rec.description || rec.stock_code }),
                    h("div", { className: "user-rec-info" },
                      h("strong", null, rec.description || rec.stock_code),
                      h("span", { className: "user-rec-price" }, formatMoney(rec.price))
                    )
                  )
                )
              )
            ) : null,

            h("section", { className: "my-orders-section" },
              h("h3", { className: "section-subtitle" }, `Order History (${userOrders.length})`),
              userOrders.length ? userOrders.map((ord) =>
                h("article", { key: ord.order_id, className: "my-order-card" },
                  h("div", { className: "my-order-head" },
                    h("strong", { className: "order-id-code" }, ord.order_id),
                    h("span", { className: "status-badge confirmed" }, ord.status || "confirmed")
                  ),
                  h("p", { className: "muted" }, `${ord.created_at ? new Date(ord.created_at).toLocaleDateString() : ''} • ${ord.item_count} items`),
                  h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" } },
                    h("b", { className: "my-order-total" }, formatMoney(ord.total)),
                    h("button", { className: "ghost-button", type: "button", onClick: () => downloadInvoicePDF(ord), style: { padding: "4px 8px", fontSize: "0.78rem" } }, fa("fa-file-pdf"), " PDF")
                  )
                )
              ) : h("p", { className: "muted" }, "You have not placed any completed orders yet.")
            )
          )
        )
      );
    }

    function renderStorefront() {
      return h(
        "main",
        { className: "store-layout" },
        h("header", { className: "store-topbar" },
          h("button", { className: "store-brand", type: "button", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
            h("span", { className: "brand-mark" }, "CI"),
            h("div", null, h("strong", null, "Gift Intelligence"), h("small", null, "Premium Store"))
          ),
          h("nav", null,
            h("button", { type: "button", onClick: () => { setSelectedCategory("All"); loadProducts({ category: "All" }); } }, fa("fa-store"), " Products"),
            h("button", { type: "button", onClick: () => setWishlistOpen(true) }, fa("fa-heart", { style: { color: wishlist.length > 0 ? "#e11d48" : "inherit" } }), ` Favoritet (${wishlist.length})`),
            h("button", { type: "button", onClick: () => { setMyOrdersOpen(true); loadOrders(); if (auth?.email) loadUserProfile(auth.email); } }, fa("fa-user-gear"), ` My Profile (${userOrders.length})`),
            h("button", { type: "button", onClick: () => setCartOpen(true) }, fa("fa-cart-shopping"), ` Cart (${cartCount})`),
            h("button", { type: "button", onClick: logout }, fa("fa-right-from-bracket"), " Log out")
          )
        ),
        error ? h("div", { className: "alert store-alert" }, error) : null,
        h("section", { className: "store-hero" },
          h("div", { className: "hero-copy" },
            h("p", { className: "eyebrow" }, fa("fa-wand-magic-sparkles"), " CURATED ONLINE RETAIL DATASET COLLECTION"),
            h("h2", null, "Thoughtful gifts, home pieces, and everyday luxury finds"),
            h("p", null, "Handpicked from 3,600+ authentic dataset items. Powered by real-time K-Means customer segmentation & collaborative filtering recommendations."),
            h("div", { className: "hero-badges-row" },
              h("span", { className: "hero-stat-badge" }, fa("fa-square-check", { style: { color: "#fbbf24" } }), h("b", null, `${formatNumber(totalProducts)}`), "Verified Products"),
              h("span", { className: "hero-stat-badge" }, fa("fa-receipt", { style: { color: "#fbbf24" } }), h("b", null, "392,692"), "Dataset Transactions"),
              h("span", { className: "hero-stat-badge" }, fa("fa-layer-group", { style: { color: "#fbbf24" } }), h("b", null, "3"), "Core Customer Segments")
            )
          ),
          h("form", { className: "store-search", onSubmit: (event) => { event.preventDefault(); loadProducts({ query: productQuery, sortBy }).catch((err) => setError(err.message)); } },
            fa("fa-magnifying-glass", { style: { color: "#64748b" } }),
            h("input", { value: productQuery, onChange: (event) => setProductQuery(event.target.value), placeholder: "Search collection by product name or code..." }),
            h("button", { className: "primary-button", type: "submit" }, fa("fa-magnifying-glass"), h("span", { style: { marginLeft: "6px" } }, "Search"))
          )
        ),
        h("section", { className: "store-shell" },
          h("div", { className: "category-section-wrapper" },
            h("div", { className: "category-section-head" },
              h("div", null,
                h("span", { className: "eyebrow" }, fa("fa-boxes-stacked"), " COLLECTION CATALOG"),
                h("h3", null, "Kategoritë e Produkteve të Dataset-it")
              ),
              h("span", { className: "category-counter-text" }, fa("fa-layer-group"), ` ${categories.length} Kategori Unike`)
            ),
            h("div", { className: "category-strip" },
              h("button", {
                className: selectedCategory === "All" ? "active" : "",
                type: "button",
                onClick: () => { setSelectedCategory("All"); loadProducts({ category: "All", sortBy }).catch((err) => setError(err.message)); }
              },
                fa(categoryMeta.All.faClass, { className: "cat-fa-icon" }),
                categoryMeta.All.label,
                h("span", { className: "cat-count" }, formatNumber(totalProducts))
              ),
              h("button", {
                className: selectedCategory === "Favorites" ? "active" : "",
                type: "button",
                onClick: () => setSelectedCategory("Favorites")
              },
                fa("fa-heart", { className: "cat-fa-icon", style: { color: "#e11d48" } }),
                "Favoritet e Ruajtura",
                h("span", { className: "cat-count", style: { background: "#ffe4e6", color: "#e11d48", fontWeight: "700" } }, formatNumber(wishlist.length))
              ),
              categories.map((item) => {
                const meta = categoryMeta[item.category] || { faClass: "fa-tag", label: item.category };
                return h("button", {
                  className: selectedCategory === item.category ? "active" : "",
                  key: item.category,
                  type: "button",
                  onClick: () => { setSelectedCategory(item.category); loadProducts({ category: item.category, sortBy }).catch((err) => setError(err.message)); }
                },
                  fa(meta.faClass, { className: "cat-fa-icon" }),
                  meta.label,
                  h("span", { className: "cat-count" }, formatNumber(item.count))
                );
              })
            ),
            h("div", { className: "category-spotlight-card" },
              h("div", { className: "spotlight-main" },
                h("span", { className: "spotlight-icon" }, fa(selectedCategory === "Favorites" ? "fa-heart" : ((categoryMeta[selectedCategory] || categoryMeta.All).faClass), { style: { color: selectedCategory === "Favorites" ? "#e11d48" : "#fbbf24" } })),
                h("div", null,
                  h("strong", null, selectedCategory === "Favorites" ? "Favoritet Juaja të Ruajtura" : (categoryMeta[selectedCategory] || { label: selectedCategory }).label),
                  h("p", null, selectedCategory === "Favorites" ? "Artikujt që keni ruajtur duke klikuar ikonën ♡ te produkteve." : (categoryMeta[selectedCategory] || categoryMeta.All).desc)
                )
              ),
              h("div", { className: "spotlight-metrics" },
                (() => {
                  if (selectedCategory === "Favorites") {
                    return h("div", { className: "spotlight-metric" }, h("span", null, "Favoritet:"), h("strong", null, `${wishlist.length} Produkte`));
                  }
                  const currCat = categories.find(c => c.category === selectedCategory);
                  if (currCat && currCat.revenue) {
                    return h(React.Fragment, null,
                      h("div", { className: "spotlight-metric" }, h("span", null, "Të Hyrat Dataset:"), h("strong", null, formatMoney(currCat.revenue))),
                      h("div", { className: "spotlight-metric" }, h("span", null, "Sasia e Shitur:"), h("strong", null, formatNumber(currCat.total_quantity)))
                    );
                  }
                  return h("div", { className: "spotlight-metric" }, h("span", null, "Koleksioni:"), h("strong", null, `${totalProducts} Produkte`));
                })(),
                selectedCategory !== "All" ? h("button", { className: "ghost-chip reset-cat-btn", type: "button", onClick: () => { setSelectedCategory("All"); loadProducts({ category: "All", sortBy }).catch((err) => setError(err.message)); } }, fa("fa-xmark"), " Shfaq të Gjitha") : null
              )
            )
          ),
          h("div", { className: "store-filter-bar" },
            h("div", { className: "sort-wrap", style: { width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" } },
              h("span", { className: "sort-label" }, `Shfaqen ${formatNumber((selectedCategory === "Favorites" ? wishlist : products).length)} produkte`),
              h("div", { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } },
                // Feature: Price Range Inputs
                h("div", { className: "price-filter-inputs", style: { display: "flex", alignItems: "center", gap: "6px" } },
                  h("span", { className: "sort-label" }, "Çmimi:"),
                  h("input", { type: "number", placeholder: "Min £", value: minPrice, onChange: (e) => setMinPrice(e.target.value), style: { width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" } }),
                  h("span", { className: "muted" }, "-"),
                  h("input", { type: "number", placeholder: "Max £", value: maxPrice, onChange: (e) => setMaxPrice(e.target.value), style: { width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" } }),
                  h("button", { className: "ghost-button", type: "button", onClick: () => loadProducts(), style: { padding: "4px 8px", fontSize: "0.8rem" } }, fa("fa-filter"))
                ),
                h("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
                  h("span", { className: "sort-label" }, "Sort:"),
                  h("select", { className: "sort-select", value: sortBy, onChange: (e) => { const next = e.target.value; setSortBy(next); loadProducts({ sortBy: next }).catch((err) => setError(err.message)); } },
                    h("option", { value: "popular" }, "Most Popular"),
                    h("option", { value: "price-asc" }, "Price: Low to High"),
                    h("option", { value: "price-desc" }, "Price: High to Low"),
                    h("option", { value: "name" }, "Name A-Z"),
                    h("option", { value: "revenue" }, "Dataset Revenue")
                  )
                )
              )
            )
          ),
          lastOrder ? h("div", { className: "order-summary" }, h("strong", null, `Latest order: ${lastOrder.order_id}`), h("span", null, `${formatNumber(lastOrder.item_count)} items confirmed`)) : null,
          h("div", { className: "product-grid" },
            (selectedCategory === "Favorites" ? wishlist : products).length ?
              (selectedCategory === "Favorites" ? wishlist : products).map((product) =>
                h(ProductCardItem, {
                  key: product.stock_code,
                  product,
                  wishlist,
                  onToggleWishlist: toggleWishlist,
                  onOpenModal: openProductModal,
                  onAddToCart: addToCart,
                  showAddToCart: true
                })
              )
            : h("div", { className: "empty-state" },
                selectedCategory === "Favorites"
                  ? "Nuk keni asnjë produkt te favoritet ende. Klikoni ikonën ♡ te produkteve në dyqan për t'i ruajtur këtu."
                  : (secondaryLoading ? "Loading products..." : "No products found.")
              )
          )
        ),
        renderToastContainer(),
        renderWishlistDrawer(),
        renderCartDrawer(),
        renderCheckoutFormModal(),
        renderProductModal(),
        renderMyOrdersDrawer(),
        renderOrderSuccessModal()
      );
    }

    if (!auth) return h(LoginScreen, { onLogin: handleLogin });
    if (auth.role === "user") return renderStorefront();

    return h("div", { className: "admin-layout" }, renderSidebar(), h("main", { className: "main-content" }, renderAdminTopbar(), error ? h("div", { className: "alert" }, error) : null, renderAdminView()));
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
