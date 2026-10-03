const express = require("express");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount =
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

const app = express();

const PORT = process.env.PORT || 3000;

const SHIPROCKET_BASE_URL =
    "https://apiv2.shiprocket.in/v1/external";

const ADMIN_UID =
    "G9UtDi2O8ObKiWZJdgYl8rYPE4K3";

app.use(cors());
app.use(express.json());


// ==========================================
// SHIPROCKET TOKEN CACHE
// ==========================================

let shiprocketToken = null;
let tokenCreatedAt = 0;

const TOKEN_VALIDITY =
    240 * 60 * 60 * 1000;

const TOKEN_SAFETY_MARGIN =
    60 * 60 * 1000;


// ==========================================
// GET SHIPROCKET TOKEN
// ==========================================

async function getShiprocketToken() {

    const now = Date.now();

    if (
        shiprocketToken &&
        (now - tokenCreatedAt) <
        (TOKEN_VALIDITY - TOKEN_SAFETY_MARGIN)
    ) {
        return shiprocketToken;
    }

    const email =
        process.env.SHIPROCKET_EMAIL;

    const password =
        process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "Shiprocket credentials missing in .env"
        );
    }

    const response =
        await fetch(
            `${SHIPROCKET_BASE_URL}/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        console.error(
            "Shiprocket login error:",
            data
        );

        throw new Error(
            data.message ||
            "Shiprocket authentication failed"
        );
    }

    if (!data.token) {
        throw new Error(
            "Shiprocket token not received"
        );
    }

    shiprocketToken =
        data.token;

    tokenCreatedAt =
        Date.now();

    return shiprocketToken;
}


// ==========================================
// FIREBASE ADMIN AUTH CHECK
// ==========================================

async function verifyAdmin(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const idToken =
            authHeader.substring(7);

        const decodedToken =
            await admin.auth().verifyIdToken(idToken);

        if (decodedToken.uid !== ADMIN_UID) {

            return res.status(403).json({
                success: false,
                message: "Admin access denied."
            });
        }

        req.adminUid =
            decodedToken.uid;

        next();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        return res.status(401).json({
            success: false,
            message: "Invalid admin authentication."
        });
    }
}


// ==========================================
// BASIC BACKEND TEST
// ==========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "VEDICARE backend is running"
    });

});


// ==========================================
// SHIPROCKET AUTH TEST
// ==========================================

app.get(
    "/api/shiprocket/test",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            res.json({

                success: true,

                message:
                    "Shiprocket authentication successful",

                tokenReceived:
                    !!token

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// COURIER SERVICEABILITY
// ==========================================

app.get(
    "/api/shiprocket/serviceability",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            const {
                pickup_postcode,
                delivery_postcode,
                weight,
                cod
            } = req.query;

            if (
                !pickup_postcode ||
                !delivery_postcode ||
                !weight
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "pickup_postcode, delivery_postcode and weight are required"

                });

            }

            const params =
                new URLSearchParams({

                    pickup_postcode:
                        pickup_postcode,

                    delivery_postcode:
                        delivery_postcode,

                    weight:
                        weight,

                    cod:
                        cod || "0"

                });

            const response =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/courier/serviceability/?${params.toString()}`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await response.json();

            res.status(
                response.status
            ).json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// CREATE SHIPROCKET ORDER
// ==========================================

app.post(
    "/api/shiprocket/orders/create",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            const response =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify(
                                req.body
                            )

                    }
                );

            const data =
                await response.json();

            res.status(
                response.status
            ).json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// ASSIGN AWB
// ==========================================

app.post(
    "/api/shiprocket/awb",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            const response =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/courier/assign/awb`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify(
                                req.body
                            )

                    }
                );

            const data =
                await response.json();

            res.status(
                response.status
            ).json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// GENERATE PICKUP
// ==========================================

app.post(
    "/api/shiprocket/pickup",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            const response =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/courier/generate/pickup`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify(
                                req.body
                            )

                    }
                );

            const data =
                await response.json();

            res.status(
                response.status
            ).json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// TRACK AWB
// ==========================================

app.get(
    "/api/shiprocket/track/:awb",
    async (req, res) => {

        try {

            const token =
                await getShiprocketToken();

            const awb =
                encodeURIComponent(
                    req.params.awb
                );

            const response =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/courier/track/awb/${awb}`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await response.json();

            res.status(
                response.status
            ).json(data);

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }
);


// ==========================================
// AUTOMATIC SHIPROCKET PROCESS
//
// ACCEPTED
//     ↓
// CREATE ORDER
//     ↓
// ASSIGN AWB
//     ↓
// GENERATE PICKUP
// ==========================================

app.post(
    "/api/shiprocket/process-order",
    verifyAdmin,
    async (req, res) => {

        try {

            const {
                orderId
            } = req.body;

            if (!orderId) {

                return res.status(400).json({
                    success: false,
                    message: "Order ID required."
                });

            }


            // --------------------------------------
            // GET FIRESTORE ORDER
            // --------------------------------------

            const orderRef =
                firestore
                    .collection("orders")
                    .doc(orderId);

            const orderSnapshot =
                await orderRef.get();

            if (!orderSnapshot.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });

            }

            const order =
                orderSnapshot.data();


            // --------------------------------------
            // BASIC VALIDATION
            // --------------------------------------

            if (!order.customer) {

                return res.status(400).json({
                    success: false,
                    message: "Customer information missing."
                });

            }

            if (
                !order.items ||
                !Array.isArray(order.items) ||
                order.items.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Order items missing."
                });

            }


            // --------------------------------------
            // PREVENT DUPLICATE PROCESSING
            // --------------------------------------

            if (
                order.awb &&
                order.shiprocketOrderId &&
                order.shipmentId
            ) {

                return res.json({

                    success: true,

                    alreadyProcessed: true,

                    message:
                        "Shipment already processed.",

                    order: {
                        orderNumber:
                            order.orderNumber || "",

                        shiprocketOrderId:
                            order.shiprocketOrderId || "",

                        shipmentId:
                            order.shipmentId || "",

                        awb:
                            order.awb || "",

                        courier:
                            order.courierName || "",

                        trackingUrl:
                            order.trackingUrl || ""
                    }

                });

            }


            const token =
                await getShiprocketToken();


            // ======================================
            // CALCULATE TOTAL WEIGHT
            // ======================================

            let totalWeight =
                0;

            const orderItems =
                order.items.map((item) => {

                    const quantity =
                        Number(item.quantity || 1);

                    const unitWeight =
                        Number(item.weight || 0);

                    totalWeight +=
                        (unitWeight * quantity);

                    return {

                        name:
                            item.name || "Product",

                        sku:
                            item.id ||
                            item.sku ||
                            `SKU-${Date.now()}`,

                        units:
                            quantity,

                        selling_price:
                            Number(
                                item.price || 0
                            ),

                        discount:
                            "",

                        tax:
                            "",

                        hsn:
                            item.hsn || ""

                    };

                });


            // --------------------------------------
            // WEIGHT
            //
            // Product weight is assumed grams.
            // Shiprocket needs kilograms.
            // --------------------------------------

            totalWeight =
                totalWeight / 1000;


            // Safety fallback
            if (
                !totalWeight ||
                totalWeight <= 0
            ) {

                totalWeight = 0.5;

            }


            // ======================================
            // CREATE SHIPROCKET ORDER
            // ======================================

            let shiprocketOrderId =
                order.shiprocketOrderId || null;

            let shipmentId =
                order.shipmentId || null;


            if (
                !shiprocketOrderId ||
                !shipmentId
            ) {

                const createPayload = {

                    order_id:
                        order.orderNumber ||
                        orderId,

                    order_date:
                        new Date().toISOString(),

                    pickup_location:
                        "Home",

                    billing_customer_name:
                        order.customer.name ||
                        "Customer",

                    billing_last_name:
                        "",

                    billing_address:
                        order.customer.address ||
                        "",

                    billing_address_2:
                        "",

                    billing_city:
                        order.customer.city ||
                        "Bharatpur",

                    billing_pincode:
                        String(
                            order.customer.pincode ||
                            "321303"
                        ),

                    billing_state:
                        order.customer.state ||
                        "Rajasthan",

                    billing_country:
                        "India",

                    billing_email:
                        order.customer.email ||
                        "",

                    billing_phone:
                        String(
                            order.customer.phone ||
                            ""
                        ),

                    shipping_is_billing:
                        true,

                    order_items:
                        orderItems,

                    payment_method:
                        "COD",

                    shipping_charges:
                        Number(
                            order.shipping || 0
                        ),

                    giftwrap_charges:
                        0,

                    transaction_charges:
                        0,

                    total_discount:
                        0,

                    sub_total:
                        Number(
                            order.subtotal || 0
                        ),

                    length:
                        20,

                    breadth:
                        15,

                    height:
                        10,

                    weight:
                        totalWeight

                };


                console.log(
                    "Creating Shiprocket order:",
                    order.orderNumber
                );


                const createResponse =
                    await fetch(
                        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify(
                                    createPayload
                                )

                        }
                    );


                const createData =
                    await createResponse.json();


                if (
                    !createResponse.ok ||
                    !createData.order_id ||
                    !createData.shipment_id
                ) {

                    console.error(
                        "Shiprocket create order error:",
                        createData
                    );

                    return res.status(
                        createResponse.status || 500
                    ).json({

                        success: false,

                        step:
                            "create_order",

                        message:
                            createData.message ||
                            "Shiprocket order create failed.",

                        shiprocket:
                            createData

                    });

                }


                shiprocketOrderId =
                    createData.order_id;

                shipmentId =
                    createData.shipment_id;


                await orderRef.update({

                    shiprocketOrderId:
                        String(
                            shiprocketOrderId
                        ),

                    shipmentId:
                        String(
                            shipmentId
                        ),

                    status:
                        "Accepted"

                });

            }


            // ======================================
            // ASSIGN AWB
            // ======================================

            let awb =
                order.awb || null;

            let courierName =
                order.courierName || "";


            if (!awb) {

                console.log(
                    "Assigning AWB for:",
                    shipmentId
                );


                const awbResponse =
                    await fetch(
                        `${SHIPROCKET_BASE_URL}/courier/assign/awb`,
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify({
                                    shipment_id:
                                        Number(
                                            shipmentId
                                        )
                                })

                        }
                    );


                const awbData =
                    await awbResponse.json();


                const awbSuccess =
                    awbResponse.ok &&
                    Number(
                        awbData.status_code
                    ) === 200 &&
                    Number(
                        awbData.response?.data
                            ?.awb_assign_status
                    ) === 1;


                if (!awbSuccess) {

                    console.error(
                        "AWB assignment error:",
                        awbData
                    );


                    return res.status(
                        402
                    ).json({

                        success: false,

                        step:
                            "assign_awb",

                        message:
                            awbData.response?.data
                                ?.awb_assign_error ||
                            awbData.message ||
                            "AWB assignment failed.",

                        shiprocket:
                            awbData,

                        shiprocketOrderId:
                            String(
                                shiprocketOrderId
                            ),

                        shipmentId:
                            String(
                                shipmentId
                            )

                    });

                }


                awb =
                    awbData.response.data.awb_code ||
                    "";

                courierName =
                    awbData.response.data.courier_name ||
                    "";


                if (!awb) {

                    return res.status(500).json({

                        success: false,

                        step:
                            "assign_awb",

                        message:
                            "Shiprocket assigned AWB but AWB number was not received."

                    });

                }


                await orderRef.update({

                    awb:
                        String(awb),

                    courierName:
                        courierName,

                    trackingUrl:
                        `https://www.shiprocket.in/shipment-tracking/${encodeURIComponent(
                            awb
                        )}`,

                    status:
                        "Shipment Requested"

                });

            }


            // ======================================
            // GENERATE PICKUP
            // ======================================

            console.log(
                "Generating pickup for:",
                shipmentId
            );


            const pickupResponse =
                await fetch(
                    `${SHIPROCKET_BASE_URL}/courier/generate/pickup`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify({

                                shipment_id:
                                    Number(
                                        shipmentId
                                    )

                            })

                    }
                );


            const pickupData =
                await pickupResponse.json();


            if (!pickupResponse.ok) {

                console.error(
                    "Pickup generation error:",
                    pickupData
                );


                return res.status(
                    pickupResponse.status
                ).json({

                    success: false,

                    step:
                        "generate_pickup",

                    message:
                        pickupData.message ||
                        "Pickup generation failed.",

                    shiprocket:
                        pickupData,

                    awb:
                        awb,

                    courier:
                        courierName

                });

            }


            // ======================================
            // FINAL FIRESTORE UPDATE
            // ======================================

            await orderRef.update({

                shiprocketOrderId:
                    String(
                        shiprocketOrderId
                    ),

                shipmentId:
                    String(
                        shipmentId
                    ),

                awb:
                    String(awb),

                courierName:
                    courierName,

                trackingUrl:
                    `https://www.shiprocket.in/shipment-tracking/${encodeURIComponent(
                        awb
                    )}`,

                status:
                    "Shipment Requested",

                shipmentRequestedAt:
                    admin.firestore.FieldValue.serverTimestamp()

            });


            // ======================================
            // SUCCESS
            // ======================================

            res.json({

                success: true,

                message:
                    "Order created, AWB assigned and pickup requested successfully.",

                order: {

                    orderNumber:
                        order.orderNumber || "",

                    shiprocketOrderId:
                        String(
                            shiprocketOrderId
                        ),

                    shipmentId:
                        String(
                            shipmentId
                        ),

                    awb:
                        String(awb),

                    courier:
                        courierName,

                    status:
                        "Shipment Requested",

                    trackingUrl:
                        `https://www.shiprocket.in/shipment-tracking/${encodeURIComponent(
                            awb
                        )}`

                },

                pickup:
                    pickupData

            });


        } catch (error) {

            console.error(
                "Automatic Shiprocket process error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Automatic shipment process failed."

            });

        }

    }
);


// ==========================================
// CUSTOMER ORDER TRACKING
// ==========================================

app.post(
    "/api/order/track",
    async (req, res) => {

        try {

            const {
                orderNumber,
                phone
            } = req.body;

            if (!orderNumber || !phone) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Order Number aur Mobile Number required hai."
                });

            }

            const snapshot =
                await firestore
                    .collection("orders")
                    .where(
                        "orderNumber",
                        "==",
                        orderNumber.trim()
                    )
                    .where(
                        "customer.phone",
                        "==",
                        phone.trim()
                    )
                    .limit(1)
                    .get();

            if (snapshot.empty) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Order Number ya Mobile Number match nahi hua."
                });

            }

            const doc =
                snapshot.docs[0];

            const order =
                doc.data();

            res.json({

                success: true,

                order: {

                    orderNumber:
                        order.orderNumber || "",

                    status:
                        order.status || "New",

                    courier:
                        order.courierName || "",

                    awb:
                        order.awb || "",

                    trackingUrl:
                        order.trackingUrl || "",

                    estimatedDays:
                        order.estimatedDays || "",

                    createdAt:
                        order.createdAt || null

                }

            });

        } catch (error) {

            console.error(
                "Order tracking error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Order tracking mein error aaya."

            });

        }

    }
);


// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `VEDICARE backend running on port ${PORT}`
        );

    }
);
