// ================================
// VEDICARE - FIREBASE PRODUCTS
// + SHIPROCKET LIVE SHIPPING
// ================================

let products = [];
let cart = [];


// ================================
// SHIPROCKET BACKEND
// ================================

// Abhi local testing ke liye
const BACKEND_URL = "https://vedicare-backend.onrender.com";


// ================================
// LIVE SHIPPING STATE
// ================================

let liveShipping = null;
let shippingLoading = false;
let selectedCourierDetails = null;


// ================================
// LOAD PRODUCTS FROM FIREBASE
// ================================

async function loadProducts() {

    const productList =
        document.getElementById("product-list");

    productList.innerHTML = `
        <p style="text-align:center; grid-column:1/-1;">
            Loading products...
        </p>
    `;

    try {

        const snapshot = await db
            .collection("products")
            .orderBy("createdAt", "desc")
            .get();

        products = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            products.push({

                id: doc.id,

                name:
                    data.name || "Unnamed Product",

                price:
                    Number(data.price) || 0,

                stock:
                    Number(data.stock) || 0,

                image:
                    data.image || "",

                description:
                    data.description || "",

                // Product weight in KG
                weight:
                    Number(data.weight) || 0

            });

        });

        displayProducts();

    } catch (error) {

        console.error(
            "Products load error:",
            error
        );

        productList.innerHTML = `
            <p style="text-align:center; grid-column:1/-1;">
                Products load nahi ho rahe.
            </p>
        `;
    }
}


// ================================
// SHOW PRODUCTS
// ================================

function displayProducts() {

    const productList =
        document.getElementById("product-list");

    productList.innerHTML = "";

    if (products.length === 0) {

        productList.innerHTML = `
            <p style="text-align:center; grid-column:1/-1;">
                No products available.
            </p>
        `;

        return;
    }

    products.forEach(product => {

        const productCard =
            document.createElement("div");

        productCard.className =
            "product-card";

        const outOfStock =
            product.stock <= 0;

        productCard.innerHTML = `

            <div class="product-image">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                    onerror="this.src='https://via.placeholder.com/600x600?text=VEDICARE'"
                >

            </div>

            <div class="product-info">

                <h3>${product.name}</h3>

                <p>${product.description}</p>

                <div class="product-price">
                    ₹${product.price}
                </div>

                ${
                    outOfStock
                    ? `
                        <p style="color:#b00020;font-weight:600;">
                            OUT OF STOCK
                        </p>

                        <button
                            class="add-cart"
                            disabled
                            style="opacity:0.5;cursor:not-allowed;"
                        >
                            OUT OF STOCK
                        </button>
                    `
                    : `
                        <p style="font-size:13px;color:#666;">
                            ${product.stock} available
                        </p>

                        <button
                            class="add-cart"
                            onclick="addToCart('${product.id}')"
                        >
                            ADD TO CART
                        </button>
                    `
                }

            </div>
        `;

        productList.appendChild(productCard);

    });
}


// ================================
// ADD TO CART
// ================================

function addToCart(productId) {

    const product =
        products.find(
            item => item.id === productId
        );

    if (!product) return;

    if (product.stock <= 0) {

        alert(
            "This product is out of stock."
        );

        return;
    }

    const existingItem =
        cart.find(
            item => item.id === productId
        );

    if (existingItem) {

        if (
            existingItem.quantity >=
            product.stock
        ) {

            alert(
                `Only ${product.stock} units available.`
            );

            return;
        }

        existingItem.quantity++;

    } else {

        cart.push({

            ...product,

            quantity: 1

        });

    }

    // Shipping rate old ho gaya
    liveShipping = null;

    updateCart();

    document
        .getElementById("cart")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// ================================
// GET CART SUBTOTAL
// ================================

function getCartSubtotal() {

    return cart.reduce(
        (total, item) =>
            total +
            (item.price * item.quantity),
        0
    );
}


// ================================
// GET TOTAL CART WEIGHT
// ================================

function getCartWeight() {

    let totalWeightGrams = 0;

    cart.forEach(item => {

        const weight =
            Number(item.weight) || 0;

        totalWeightGrams +=
            weight * item.quantity;

    });

    // Admin panel weight = grams
    // Shiprocket weight = kg
    return totalWeightGrams / 1000;
}


// ================================
// UPDATE CART
// ================================

function updateCart() {

    const cartItems =
        document.getElementById(
            "cart-items"
        );

    const subtotalElement =
        document.getElementById(
            "subtotal"
        );

    const shippingElement =
        document.getElementById(
            "shipping"
        );

    const totalElement =
        document.getElementById(
            "total"
        );

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p class="empty-cart">
                Your cart is empty.
            </p>
        `;

        subtotalElement.textContent =
            "₹0";

        shippingElement.textContent =
            "₹0";

        totalElement.textContent =
            "₹0";

        liveShipping = null;

        return;
    }

    cartItems.innerHTML = "";

    let subtotal = 0;

    cart.forEach(item => {

        const itemTotal =
            item.price *
            item.quantity;

        subtotal += itemTotal;

        const cartItem =
            document.createElement(
                "div"
            );

        cartItem.className =
            "cart-item";

        cartItem.innerHTML = `

            <div>

                <h3>${item.name}</h3>

                <p>
                    ₹${item.price} × ${item.quantity}
                </p>

            </div>

            <div class="quantity-controls">

                <button
                    onclick="changeQuantity('${item.id}', -1)"
                >
                    −
                </button>

                <span>
                    ${item.quantity}
                </span>

                <button
                    onclick="changeQuantity('${item.id}', 1)"
                >
                    +
                </button>

            </div>

            <strong>
                ₹${itemTotal}
            </strong>

        `;

        cartItems.appendChild(
            cartItem
        );

    });

    subtotalElement.textContent =
        `₹${subtotal}`;

    // ================================
    // LIVE SHIPPING DISPLAY
    // ================================

    if (shippingLoading) {

        shippingElement.textContent =
            "Calculating...";

        totalElement.textContent =
            "Calculating...";

        return;
    }

    if (liveShipping !== null) {

        shippingElement.textContent =
            `₹${liveShipping}`;

        totalElement.textContent =
            `₹${subtotal + liveShipping}`;

    } else {

        shippingElement.textContent =
            "Enter PIN to calculate";

        totalElement.textContent =
            `₹${subtotal}`;

    }
}


// ================================
// CALCULATE LIVE SHIPPING
// ================================

async function calculateLiveShipping() {

    if (cart.length === 0) {

        liveShipping = null;

        updateCart();

        return null;
    }

    const pincodeElement =
        document.getElementById(
            "customer-pincode"
        );

    if (!pincodeElement) {
        return null;
    }

    const pincode =
        pincodeElement.value.trim();

    if (!/^[0-9]{6}$/.test(pincode)) {

        liveShipping = null;

        updateCart();

        return null;
    }

    const weight =
        getCartWeight();

    if (weight <= 0) {

        alert(
            "Product weight admin panel me add nahi hai."
        );

        return null;
    }

    shippingLoading = true;

    updateCart();

    try {

        const url =
            `${BACKEND_URL}/api/shiprocket/serviceability` +
            `?pickup_postcode=321303` +
            `&delivery_postcode=${encodeURIComponent(pincode)}` +
            `&weight=${encodeURIComponent(weight)}` +
            `&cod=1`;

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Shipping calculation failed"
            );
        }

        const couriers =
            data?.data?.available_courier_companies || [];

        if (couriers.length === 0) {

            throw new Error(
                "Is PIN code ke liye courier available nahi hai."
            );
        }

        /*
         * Shiprocket response me recommended courier
         * diya gaya hai.
         */

        const recommendedId =
            data?.data?.recommended_courier_company_id;

        let selectedCourier =
            couriers.find(
                courier =>
                    courier.courier_company_id ===
                    recommendedId
            );

        // Agar recommended courier na mile,
        // first available courier use hoga.
        if (!selectedCourier) {
            selectedCourier =
                couriers[0];
        }

        const rate =
            Number(selectedCourier.rate) || 0;

        if (rate <= 0) {

            throw new Error(
                "Valid shipping rate nahi mila."
            );
        }
        selectedCourierDetails = {
    courier: selectedCourier.courier_name || "",
    courierId: selectedCourier.courier_company_id || "",
    estimatedDays: selectedCourier.estimated_delivery_days || "",
    etd: selectedCourier.etd || ""
};

        liveShipping =
            Math.round(rate * 100) / 100;

        shippingLoading = false;

        updateCart();
        const shippingInfo =
    document.getElementById("shipping-info");

const shippingCourier =
    document.getElementById("shipping-courier");

const shippingEta =
    document.getElementById("shipping-eta");
console.log("SELECTED COURIER DATA:", selectedCourier);
console.log("SHIPPING INFO:", shippingInfo);
if (shippingInfo) {

    shippingInfo.style.display = "block";

    if (shippingCourier) {

        shippingCourier.textContent =
            "Courier: " +
            (selectedCourier.courier_name || "Available Courier");

    }

    if (shippingEta) {

        shippingEta.textContent =
            "Estimated delivery: " +
            (
                selectedCourier.estimated_delivery_days ||
                "N/A"
            ) +
            " days" +
            (
                selectedCourier.etd
                    ? " • Expected by " + selectedCourier.etd
                    : ""
            );

    }
}

        console.log(
            "Shiprocket shipping:",
            {
                courier:
                    selectedCourier.courier_name,

                rate:
                    selectedCourier.rate,

                freight:
                    selectedCourier.freight_charge,

                codCharges:
                    selectedCourier.cod_charges,

                estimatedDays:
                    selectedCourier.estimated_delivery_days,

                etd:
                    selectedCourier.etd,

                weight:
                    weight,

                pincode:
                    pincode
            }
        );

        return {
            shipping:
                liveShipping,

            courier:
                selectedCourier.courier_name,

            courierId:
                selectedCourier.courier_company_id,

            estimatedDays:
                selectedCourier.estimated_delivery_days,

            etd:
                selectedCourier.etd,

            weight:
                weight
        };

    } catch (error) {

        console.error(
            "Shipping calculation error:",
            error
        );

        liveShipping = null;

        shippingLoading = false;

        updateCart();

        alert(
            "Shipping calculate nahi ho paaya.\n\n" +
            error.message
        );

        return null;
    }
}


// ================================
// CHANGE QUANTITY
// ================================

function changeQuantity(
    productId,
    change
) {

    const item =
        cart.find(
            product =>
                product.id === productId
        );

    if (!item) return;

    if (change > 0) {

        if (
            item.quantity >=
            item.stock
        ) {

            alert(
                `Only ${item.stock} units available.`
            );

            return;
        }
    }

    item.quantity += change;

    if (item.quantity <= 0) {

        cart =
            cart.filter(
                product =>
                    product.id !== productId
            );
    }

    // Quantity change hone par
    // purana shipping rate invalid ho jayega.
    liveShipping = null;

    updateCart();
}


// ================================
// GO TO CHECKOUT
// ================================

function checkout() {

    if (cart.length === 0) {

        alert(
            "Your cart is empty. Please add a product first."
        );

        return;
    }

    document
        .getElementById(
            "checkout-form"
        )
        .scrollIntoView({
            behavior: "smooth"
        });
}


// ================================
// PLACE ORDER
// ================================

async function placeOrder() {

    if (cart.length === 0) {

        alert(
            "Your cart is empty."
        );

        return;
    }

    const name =
        document
            .getElementById(
                "customer-name"
            )
            .value
            .trim();

    const phone =
        document
            .getElementById(
                "customer-phone"
            )
            .value
            .trim();

    const address =
        document
            .getElementById(
                "customer-address"
            )
            .value
            .trim();

    const pincode =
        document
            .getElementById(
                "customer-pincode"
            )
            .value
            .trim();

    const state =
        document
            .getElementById(
                "customer-state"
            )
            .value
            .trim();


    // ================================
    // VALIDATION
    // ================================

    if (
        !name ||
        !phone ||
        !address ||
        !pincode ||
        !state
    ) {

        alert(
            "Please fill all delivery details."
        );

        return;
    }

    if (
        !/^[0-9]{10}$/.test(phone)
    ) {

        alert(
            "Please enter a valid 10-digit mobile number."
        );

        return;
    }

    if (
        !/^[0-9]{6}$/.test(pincode)
    ) {

        alert(
            "Please enter a valid 6-digit PIN code."
        );

        return;
    }


    // ================================
    // CALCULATE SUBTOTAL
    // ================================

    let subtotal = 0;

    const orderItems =
        cart.map(item => {

            const itemTotal =
                item.price *
                item.quantity;

            subtotal +=
                itemTotal;

            return {

                productId:
                    item.id,

                name:
                    item.name,

                price:
                    item.price,

                quantity:
                    item.quantity,

                total:
                    itemTotal,

                weight:
                    Number(item.weight) || 0

            };

        });


    // ================================
    // GET LIVE SHIPPING
    // ================================

    let shipping =
        liveShipping;

    /*
     * Agar PIN enter karne ke baad
     * rate calculate nahi hua hai,
     * to order place karne se pehle
     * automatically calculate hoga.
     */

    if (shipping === null) {

        const shippingResult =
            await calculateLiveShipping();

        if (!shippingResult) {

            alert(
                "Please wait for shipping calculation and try again."
            );

            return;
        }

        shipping =
            shippingResult.shipping;
    }


    // ================================
    // FINAL TOTAL
    // ================================

    const total =
        subtotal + shipping;


    // ================================
    // CREATE ORDER NUMBER
    // ================================

    const orderNumber =
        "#VC" +
        Date.now()
            .toString()
            .slice(-6);


    // ================================
    // ORDER DATA
    // ================================

    const orderData = {

        orderNumber:

            orderNumber,

        customer: {

            name:
                name,

            phone:
                phone,

            address:
                address,

            pincode:
                pincode,

            state:
                state

        },

        items:
            orderItems,

        subtotal:
            subtotal,

        shipping:
            shipping,

        total:
            total,

        shippingMethod:
            "Shiprocket Live Rate",

        status:
            "New",

        paymentStatus:
            "Pending",

        createdAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    };


    try {

        // ================================
        // SAVE ORDER TO FIRESTORE
        // ================================

        const orderRef =
            await db
                .collection("orders")
                .add(orderData);

        console.log(
            "Order saved:",
            orderRef.id
        );


        alert(
    `Order placed successfully!\n\n` +
    `Order Number: ${orderNumber}\n` +
    `Shipping: ₹${shipping}\n` +
    `Courier: ${selectedCourierDetails?.courier || "N/A"}\n` +
    `Estimated delivery: ${
        selectedCourierDetails?.estimatedDays || "N/A"
    } days\n` +
    `Total: ₹${total}`
);


        // ================================
        // CLEAR CART
        // ================================

        cart = [];

        liveShipping = null;

        updateCart();


        // ================================
        // CLEAR FORM
        // ================================

        document
            .getElementById(
                "customer-name"
            )
            .value = "";

        document
            .getElementById(
                "customer-phone"
            )
            .value = "";

        document
            .getElementById(
                "customer-address"
            )
            .value = "";

        document
            .getElementById(
                "customer-pincode"
            )
            .value = "";

        document
            .getElementById(
                "customer-state"
            )
            .value = "";


        // ================================
        // GO TO TOP
        // ================================

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });


    } catch (error) {

        console.error(
            "Order save error:",
            error
        );

        alert(
            "Order save nahi hua.\n\n" +
            "Firebase rules check karni hongi."
        );

    }
}


// ================================
// PINCODE CHANGE
// ================================

function setupPincodeShipping() {

    const pincodeInput =
        document.getElementById(
            "customer-pincode"
        );

    if (!pincodeInput) {
        return;
    }

    /*
     * PIN complete hone par
     * live shipping calculate hogi.
     */

    pincodeInput.addEventListener(
        "input",
        function () {

            const pincode =
                this.value.trim();

            if (
                /^[0-9]{6}$/.test(
                    pincode
                )
            ) {

                calculateLiveShipping();

            } else {

                liveShipping = null;

                updateCart();

            }

        }
    );
}


// ================================
// SHOP NOW
// ================================

function scrollToProducts() {

    document
        .getElementById(
            "products"
        )
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ================================
// START WEBSITE
// ================================

loadProducts();

updateCart();

setupPincodeShipping();
async function trackMyOrder() {

    const orderNumber =
        document
            .getElementById("trackOrderNumber")
            .value
            .trim();

    const phone =
        document
            .getElementById("trackPhone")
            .value
            .trim();

    const result =
        document.getElementById(
            "orderTrackingResult"
        );

    if (!orderNumber || !phone) {

        result.innerHTML =
            "<p>Please enter Order Number and Mobile Number.</p>";

        return;
    }

    result.innerHTML =
        "<p>🔄 Order checking...</p>";

    try {

        const response =
            await fetch(
                `${BACKEND_URL}/api/order/track`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        orderNumber:
                            orderNumber,

                        phone:
                            phone
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Order nahi mila."
            );

        }

        const order =
            data.order;

        result.innerHTML = `

            <div class="order-tracking-card">

                <h3>📦 Order Details</h3>

                <p>
                    <strong>Order Number:</strong>
                    ${order.orderNumber || "N/A"}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${order.status || "N/A"}
                </p>

                <p>
                    <strong>Courier:</strong>
                    ${order.courier || "Not assigned yet"}
                </p>

                <p>
                    <strong>AWB:</strong>
                    ${order.awb || "Not assigned yet"}
                </p>

                ${
                    order.trackingUrl
                        ? `
                        <p>
                            <a
                                href="${order.trackingUrl}"
                                target="_blank"
                            >
                                🔎 Track Shipment
                            </a>
                        </p>
                        `
                        : ""
                }

                ${
                    order.estimatedDays
                        ? `
                        <p>
                            <strong>Estimated Delivery:</strong>
                            ${order.estimatedDays} days
                        </p>
                        `
                        : ""
                }

            </div>

        `;

    } catch (error) {

        console.error(
            "Order tracking error:",
            error
        );

        result.innerHTML = `
            <p>
                ❌ ${error.message}
            </p>
        `;

    }

}
