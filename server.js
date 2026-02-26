import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { shopifyApp } from "@shopify/shopify-app-express";
import { BillingInterval } from "@shopify/shopify-api";

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

/* ------------------ SHOPIFY APP SETUP ------------------ */

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES.split(","),
    hostName: process.env.HOST.replace(/https?:\/\//, ""),
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  session: {
    storage: new shopify.session.MemorySessionStorage(),
  },
});

app.use(shopify.cspHeaders());
app.use(shopify.auth.begin());
app.use(shopify.auth.callback());
app.use(shopify.validateAuthenticatedSession());

/* ------------------ BILLING ------------------ */

const BILLING_PLAN = {
  name: "Starter Bundle Plan",
  amount: 5.0,
  currencyCode: "USD",
  interval: BillingInterval.Every30Days,
};

async function ensureBilling(session) {
  const hasPayment = await shopify.api.billing.check({
    session,
    plans: [BILLING_PLAN.name],
  });

  if (!hasPayment) {
    await shopify.api.billing.request({
      session,
      plan: BILLING_PLAN,
      isTest: true,
    });
    return false;
  }
  return true;
}

/* ------------------ API ROUTES ------------------ */

// Enforce billing for admin routes
app.use("/api", async (req, res, next) => {
  const session = res.locals.shopify.session;
  const paid = await ensureBilling(session);
  if (!paid) return;
  next();
});

/* ---- Bundles CRUD ---- */

// Create bundle
app.post("/api/bundles", async (req, res) => {
  const { title, products } = req.body;
  const shop = res.locals.shopify.session.shop;

  const bundle = await prisma.bundle.create({
    data: {
      shop,
      title,
      products: JSON.stringify(products),
    },
  });

  res.json(bundle);
});

// List bundles
app.get("/api/bundles", async (req, res) => {
  const shop = res.locals.shopify.session.shop;

  const bundles = await prisma.bundle.findMany({
    where: { shop },
  });

  res.json(bundles);
});

// Delete bundle
app.delete("/api/bundles/:id", async (req, res) => {
  await prisma.bundle.delete({
    where: { id: Number(req.params.id) },
  });

  res.json({ success: true });
});

/* ------------------ STOREFRONT API ------------------ */

// Public endpoint for theme extension
app.get("/bundle-data", async (req, res) => {
  const { shop } = req.query;

  const bundles = await prisma.bundle.findMany({
    where: { shop },
  });

  res.json(bundles);
});

/* ------------------ WEBHOOKS ------------------ */

app.post("/api/webhooks/app/uninstalled", async (req, res) => {
  const shop = req.headers["x-shopify-shop-domain"];

  await prisma.bundle.deleteMany({
    where: { shop },
  });

  res.sendStatus(200);
});

/* ------------------ FRONTEND FALLBACK ------------------ */

app.get("/*", shopify.ensureInstalledOnShop(), (req, res) => {
  res.sendFile(process.cwd() + "/frontend/index.html");
});

/* ------------------ START SERVER ------------------ */

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`🚀 Shopify app running on port ${PORT}`);
});
