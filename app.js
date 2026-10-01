// ================================
// VEDICARE - FIREBASE PRODUCTS
// ================================

let products = [];


// ================================
// CART
// ================================

let cart = [];


// ================================
// LOAD PRODUCTS FROM FIREBASE
// ================================

async function loadProducts() {
    const productList = document.getElementById("product-list");

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
                name: data.name || "Unnamed Product",
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                image: data.image || "",
                description: data.description || ""
            });
        });

        displayProducts();

    } catch (error) {
        console.error("Products load error:", error);

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

        productCard.className = "product-card";


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
        products.find(item => item.id === productId);

    if (!product) return;


    if (product.stock <= 0) {

        alert("This product is out of stock.");

        return;
    }


    const existingItem =
        cart.find(item => item.id === productId);


    if (existingItem) {

        if (existingItem.quantity >= product.stock) {

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


    updateCart();


    document
        .getElementById("cart")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// ================================
// UPDATE CART
// ================================

function updateCart() {

    const cartItems =
        document.getElementById("cart-items");

    const subtotalElement =
        document.getElementById("subtotal");

    const shippingElement =
        document.getElementById("shipping");

    const totalElement =
        document.getElementById("total");


    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p class="empty-cart">
                Your cart is empty.
            </p>
        `;

        subtotalElement.textContent = "₹0";
        shippingElement.textContent = "₹0";
        totalElement.textContent = "₹0";

        return;
    }


    cartItems.innerHTML = "";

    let subtotal = 0;


    cart.forEach(item => {

        subtotal +=
            item.price * item.quantity;


        const cartItem =
            document.createElement("div");

        cartItem.className = "cart-item";


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
                ₹${item.price * item.quantity}
            </strong>

        `;


        cartItems.appendChild(cartItem);

    });


    // ================================
    // TEMPORARY SHIPPING RULE
    // Later replace with courier API
    // ================================

    let shipping = 0;

    if (subtotal > 0 && subtotal < 499) {
        shipping = 60;
    }


    const total =
        subtotal + shipping;


    subtotalElement.textContent =
        `₹${subtotal}`;

    shippingElement.textContent =
        shipping === 0
            ? "FREE"
            : `₹${shipping}`;

    totalElement.textContent =
        `₹${total}`;
}


// ================================
// CHANGE QUANTITY
// ================================

function changeQuantity(productId, change) {

    const item =
        cart.find(product => product.id === productId);

    if (!item) return;


    if (change > 0) {

        if (item.quantity >= item.stock) {

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
                product => product.id !== productId
            );

    }


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
        .getElementById("checkout-form")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// ================================
// PLACE ORDER
// ================================

async function placeOrder() {

    if (cart.length === 0) {

        alert("Your cart is empty.");

        return;
    }


    const name =
        document
            .getElementById("customer-name")
            .value
            .trim();


    const phone =
        document
            .getElementById("customer-phone")
            .value
            .trim();


    const address =
        document
            .getElementById("customer-address")
            .value
            .trim();


    const pincode =
        document
            .getElementById("customer-pincode")
            .value
            .trim();


    const state =
        document
            .getElementById("customer-state")
            .value
            .trim();


    // ================================
    // VALIDATION
    // ================================

    if (!name || !phone || !address || !pincode || !state) {

        alert(
            "Please fill all delivery details."
        );

        return;
    }


    if (!/^[0-9]{10}$/.test(phone)) {

        alert(
            "Please enter a valid 10-digit mobile number."
        );

        return;
    }


    if (!/^[0-9]{6}$/.test(pincode)) {

        alert(
            "Please enter a valid 6-digit PIN code."
        );

        return;
    }


    // ================================
    // CALCULATE TOTAL
    // ================================

    let subtotal = 0;


    const orderItems =
        cart.map(item => {

            const itemTotal =
                item.price * item.quantity;


            subtotal += itemTotal;


            return {

                productId: item.id,

                name: item.name,

                price: item.price,

                quantity: item.quantity,

                total: itemTotal

            };

        });


    let shipping = 0;


    if (subtotal > 0 && subtotal < 499) {
        shipping = 60;
    }


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

        orderNumber: orderNumber,

        customer: {

            name: name,

            phone: phone,

            address: address,

            pincode: pincode,

            state: state

        },

        items: orderItems,

        subtotal: subtotal,

        shipping: shipping,

        total: total,

        status: "New",

        paymentStatus: "Pending",

        createdAt:
            firebase.firestore.FieldValue.serverTimestamp()

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
            `Order placed successfully!\n\nOrder Number: ${orderNumber}`
        );


        // ================================
        // CLEAR CART
        // ================================

        cart = [];

        updateCart();


        // ================================
        // CLEAR FORM
        // ================================

        document
            .getElementById("customer-name")
            .value = "";

        document
            .getElementById("customer-phone")
            .value = "";

        document
            .getElementById("customer-address")
            .value = "";

        document
            .getElementById("customer-pincode")
            .value = "";

        document
            .getElementById("customer-state")
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
            "Order save nahi hua.\n\nFirebase rules check karni hongi."
        );

    }

}


// ================================
// SHOP NOW
// ================================

function scrollToProducts() {

    document
        .getElementById("products")
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ================================
// START WEBSITE
// ================================

// Firebase products load karo
loadProducts();

// Cart initialize karo
updateCart();