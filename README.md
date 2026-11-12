# RAETE

**Which one wins for you?**

Set what matters. See which one comes out ahead, and why.

**Live demo:** https://raete-hub.replit.app/

## Overview

RAETE is a hackathon shopping-decision prototype. It helps shoppers compare real products against their own priorities instead of treating one product as universally right for everyone. Search for products, set Materials / Quality / Price / Longevity priorities, and inspect a transparent, deterministic ordering.

The canonical demo query is **`red leather shoulder bag`**. Live inventory and offers can change, so the demo does not guarantee a fixed winning product.

## Live product data from Channel3

The Express backend calls Channel3's search API and returns up to eight real products. Available Channel3 fields provide product names, brands, imagery, offers, merchant information, prices, currencies, and product links. Missing fields are not invented.

`CHANNEL3_API_KEY` is used only on the server. The browser never receives this API key. Product data comes from Channel3, not web scraping or static mockup products.

## Deterministic ranking

Products remain unranked until all four priorities are selected or a preset is chosen. Each priority uses the same weights: **Low = 1, Medium = 2, High = 3**.

| Preset | Materials | Quality | Price | Longevity |
| --- | --- | --- | --- | --- |
| Materials First | High | Medium | Low | Medium |
| Keep It Forever | Medium | High | Low | High |
| Price Conscious | Low | Medium | High | Low |

Dimension scores range from 0 to 100:

- **Materials, Quality, Longevity:** synthetic, deterministic Prototype signals derived from each product ID and dimension using a stable hash. These are not measured product properties.
- **Price:** a lower comparable Channel3 price scores higher using min–max normalization. All products must have valid selected-offer prices in the same currency; otherwise Price is excluded. Equal prices receive equal scores. There is no currency conversion. When comparable, Price contributes according to its selected weight, including weight 1 at Low.

The internal normalized score is the rounded weighted average of available dimensions. Higher scores sort first; ties retain Channel3's original order. Aggregate scores are not displayed in the UI.

The leading product receives the featured treatment. Deterministic explanations compare the leader with #2, prioritizing positive differences on higher-importance dimensions. A gap of fewer than five normalized points displays **No clear winner for your priorities**. **See why** shows dimension-level evidence and provenance. #2 and #3 are compact alternatives; remaining products are behind **Show more**.

## OpenAI explanation layer

The server uses OpenAI through Replit AI Integrations to explain the already-computed ranking and tradeoffs. **AI does not calculate scores, choose winners, or determine ranking.** Explanations reference the supplied ranking evidence; Materials, Quality, and Longevity references are explicitly labeled **Prototype**, with server-side label enforcement.

The current integration expects the Replit OpenAI-compatible API configuration; it is not a separate direct OpenAI-key setup.

## Prototype data disclosure

Channel3 product facts and synthetic signals are kept separate. Materials, Quality, and Longevity are **Prototype** demo attributes, not owner reports, verified ownership, real reviews, durability testing, or product reputation. The UI includes a **Prototype data** disclosure and provenance labels. Rankings are a demonstration of priority-weighted comparison, not an independent certification of product quality.

## PayPal Sandbox demo

RAETE uses the **PayPal JavaScript SDK v6** in the browser and **PayPal Orders API** on the server, with Sandbox endpoints only. The demo checkout follows selection of the #1 product and uses its live Channel3 price/currency only when safely usable; it does not invent a checkout price.

Current verification status:

- Sandbox OAuth works.
- Sandbox order creation works.
- PayPal Sandbox checkout launches.
- Cancellation works.
- Server-side capture code is implemented.
- **Buyer approval and a `COMPLETED` capture were not verified.** The test Sandbox buyer session remained associated with the merchant account.

**No real payment is made in this prototype.** This is a demo transaction, not a purchase from the external Channel3 retailer, and does not pay that retailer. PayPal never changes ranking or AI explanations and does not create ownership or reputation evidence.

The UI labels checkout **Pay with PayPal Sandbox** and **Sandbox · no real payment**. Test only with a Personal Sandbox buyer account separate from the merchant's Sandbox account. Do not use live PayPal credentials or real payment details.

## Tech stack

- Node.js 24, TypeScript, pnpm workspaces
- React, Vite, Tailwind CSS, Radix UI, TanStack Query
- Express, Zod validation, Pino logging, esbuild
- Shared OpenAPI-generated API client and validation packages
- Channel3 Search API, OpenAI through Replit AI Integrations, PayPal Sandbox

The RAETE product flow does not require a database or authentication. The workspace contains template/shared packages beyond the active product flow.

## Setup and run

1. Install Node.js 24 and pnpm, then run `pnpm install` at the repository root.
2. Configure the server environment using the variable names below. In Replit, use Secrets rather than placing credentials in source control.
3. In Replit, start the existing `artifacts/api-server: API Server` and `artifacts/raete: web` workflows. They provide the API and frontend routing.
4. Open the RAETE preview and search for `red leather shoulder bag`.

For development outside Replit, run these in separate terminals with the server credentials already exported:

```sh
# API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Frontend
PORT=18444 BASE_PATH=/ pnpm --filter @workspace/raete run dev
```

The frontend calls same-origin `/api` routes. Outside Replit, configure a local reverse proxy to route `/api` to the API server and `/` to Vite; the Vite configuration does not include an API proxy. Starting the two processes alone does not connect those routes.

### Required environment variable names

| Name | Purpose |
| --- | --- |
| `CHANNEL3_API_KEY` | Backend Channel3 product search |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Backend Replit AI Integrations authentication |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Backend Replit OpenAI-compatible API endpoint |
| `PAYPAL_CLIENT_ID` | Matching Sandbox REST app client ID; supplied to the SDK by the backend |
| `PAYPAL_CLIENT_SECRET` | Matching Sandbox REST app secret; server-side only |
| `PORT` | Per-service listening port |
| `BASE_PATH` | Frontend Vite base path |

`NODE_ENV` and `LOG_LEVEL` are optional runtime/logging configuration. No buyer password or payment data belongs in repository configuration. Never prefix server secrets with `VITE_` or otherwise expose them in the client bundle. The PayPal client ID is the SDK's public identifier; the client secret is never sent to the browser.

### Checks and builds

```sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/raete run typecheck
node --experimental-strip-types --test artifacts/api-server/src/lib/raete-provenance.test.mjs
pnpm --filter @workspace/api-server run build
PORT=18444 BASE_PATH=/ pnpm --filter @workspace/raete run build
```

These commands build/check the active RAETE services without requiring a database migration.

## Security and license

Do not commit API keys, access tokens, passwords, private keys, or environment files. `.gitignore` excludes `.env` variants and private key files, while permitting a value-free `.env.example`. Ignore rules do not remove files already present in Git history.

RAETE's source code is licensed under the [MIT License](LICENSE). Third-party product imagery, product data, trademarks, and service access remain subject to their respective owners' rights and terms.
