const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const http = require("http");
const { Server } = require("socket.io");
const catchAsyncErrors = require("./catchAsyncErrors");
const app = express();
const cors = require("cors");
const connectDatabase = require("./Database/database");
const server = http.createServer(app);
const Shop = require("./model/shop");
const io = new Server(server, {
  cors: {
    origin: [
      "https://www.ninetyone.co.ke",
      "https://ninetyone.co.ke",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.use(express.json());

connectDatabase();
app.use(
  cors({
    origin: [
      "https://www.ninetyone.co.ke",
      "https://ninetyone.co.ke",
      "http://localhost:3000",
    ], //this one
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Origin",
    ],
    credentials: true, // email data change
  })
);

let qrCodeData;
let isClientReady = false;

async function sendOrderNotification(shopPhoneNumber, shopName) {
  const message = `Hello ${shopName}, You have a new order Order Number: click on these link below to check\nhttps://ninetyone.co.ke/dashboard-orders`;

  try {
    console.log("Attempting to send message to:", `${shopPhoneNumber}@c.us`);
    await client.sendMessage(`${shopPhoneNumber}@c.us`, message);
    console.log("Order notification sent successfully.");
  } catch (error) {
    console.error("Error sending order notification:", error);
  }
}

// const client = new Client({ authStrategy: new LocalAuth() });
const client = new Client();

client.on("qr", (qr) => {
  qrCodeData = qr;
  console.log("Scan the QR code to log in:", qr);
});

client.on("ready", () => {
  console.log("WhatsApp Client is ready.");
  isClientReady = true;
});

client
  .initialize()
  .then(() => {
    console.log("WhatsApp Client initialized successfully.");

    const shopPhoneNumber = 25472632;
    const shopName = "craaaaig";

    sendOrderNotification(shopPhoneNumber, shopName);
  })
  .catch((error) => {
    console.error("Error initializing WhatsApp Client:", error);
  });

app.get("/client-status", function (req, res) {
  res.json({ isClientReady });
});

app.get("/", function (req, res) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`${qrCodeData}`);
});

app.get("/qr-code", function (req, res) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`${qrCodeData}`);
});

// announcements to subscribers via whatsapp
app.post(
  "/send-ads",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { message } = req.body;

      // Fetch all shops from the database
      const shops = await Subscriber.find().sort({
        createdAt: -1,
      });

      for (const shop of shops) {
        let { name, phoneNumber } = shop;

        // Check if the phoneNumber starts with "07"
        if (phoneNumber.startsWith("07")) {
          // If true, add "254" at the beginning to convert it to the Kenyan format
          phoneNumber = "254" + phoneNumber.slice(1);
        }

        await client.sendMessage(
          `${phoneNumber}@c.us`,
          `Hello ${name}, ${message}`
        );
        // await client.sendMessage(
        //   "254721315398@c.us",
        //   `Hello There, ${message}`
        // );

        console.log("SMS sent successfully to:", phoneNumber);
      }

      res
        .status(200)
        .json({ success: true, message: "Messages sent successfully" });
    } catch (error) {
      console.error(error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// announcements to sellers via whatsapp
app.post(
  "/send-messages",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { message } = req.body;

      // Fetch all shops from the database
      const shops = await Shop.find().sort({
        createdAt: -1,
      });

      for (const shop of shops) {
        let { name, phoneNumber } = shop;

        // Check if the phoneNumber starts with "07"
        if (phoneNumber.startsWith("07")) {
          // If true, add "254" at the beginning to convert it to the Kenyan format
          phoneNumber = "254" + phoneNumber.slice(1);
        }

        await client.sendMessage(
          `${phoneNumber}@c.us`,
          `Hello ${name}, ${message}`
        );
        // await client.sendMessage(
        //   "254721315398@c.us",
        //   `Hello There, ${message}`
        // );

        console.log("SMS sent successfully to:", phoneNumber);
      }

      res
        .status(200)
        .json({ success: true, message: "Messages sent successfully" });
    } catch (error) {
      console.error(error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// whatsapp order notification
app.post(
  "/sendmyorder",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        cart,
        shippingAddress,
        user,
        totalPrice,
        paymentInfo,
        shippingPrice,
        discount,
      } = req.body;

      const shopItemsMap = new Map();
      const shopEmailsMap = new Map();
      const order = req.body;

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);

        if (!shopEmailsMap.has(shopId)) {
          const shop = await Shop.findById(shopId);
          if (shop) {
            shopEmailsMap.set(shopId, shop.email);
          }
        }
      }

      for (const [shopId, items] of shopItemsMap) {
        try {
          const shop = await Shop.findById(shopId);

          if (shop) {
            const shopEmail = shop.email;
            let shopPhoneNumber = shop.phoneNumber || 254726327352;
            const shopName = shop.name || craig;

            // Check if the phone number starts with "07" and replace it with "2547"
            if (shopPhoneNumber.startsWith("07")) {
              shopPhoneNumber = "2547" + shopPhoneNumber.slice(2);
            }

            console.log("Sending SMS to:", shopPhoneNumber);
            console.log("this is", shopName);

            // Sending WhatsApp message
            await client.sendMessage(
              `${shopPhoneNumber}@c.us`,
              `Hello ${shopName}, You have a new order Order Number:${order.orderNo} click on these link below to check
               https://ninetyone.co.ke/dashboard-orders`
            );

            console.log("SMS sent successfully to:", shopPhoneNumber);
          }
        } catch (error) {
          console.error(
            `Error fetching shop details for shopId ${shopId}: ${error}`
          );
        }
      }

      res.status(201).json({
        success: true,
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
