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

app.use(cors());
app.use(express.json());


// ==========================================
// SHIPROCKET TOKEN CACHE
// ==========================================

let shiprocketToken = null;
let tokenCreatedAt = 0;


// Token 10 days ke liye valid hota hai.
// Hum thoda safety margin rakhenge.
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
            `VEDICARE backend running on http://localhost:${PORT}`
        );

    }
);
