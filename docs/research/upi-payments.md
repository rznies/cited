# UPI / PhonePe for `cited` ($29 one-time audit) — research findings

Date: 2026-09-03. Context: solo Indian founder (has PhonePe app personally), Next.js single-page app,
$29 USD one-time digital audit, buyers worldwide (mostly US/EU/India). Question: can buyers pay via PhonePe/UPI?

## TL;DR

- Yes, a website can accept UPI via API — but UPI is **India-domestic only**. US/EU cardholders **cannot** pay through UPI/PhonePe-UPI.
- PG settlement **always lands in a registered Indian bank account** (T+1/T+2/T+7), never directly in the PhonePe consumer-app balance. You can *then* spend it via the PhonePe app because the app is linked to that bank account — two separate steps.
- Fastest single-setup answer for `cited`: **one Razorpay account = UPI + domestic cards/netbanking + international cards in one checkout, settled in INR to your Indian bank**. Keep existing Stripe only if the account is already active (new Stripe-India accounts are invite-only). PhonePe PG is an India-only complement, not a global solution.

## 1. Can a website accept UPI via API? What PhonePe's PG actually gives you

**Yes.** All Indian gateways expose UPI as: Intent (app switch on mobile), Collect (enter VPA, approve in app), QR (scan). PhonePe PG's Standard Checkout API supports all three plus cards/netbanking/EMI/wallets, with per-order control via `paymentModeConfig` (e.g. allow `UPI: INTENT + apps [phonepe, gpay]`, allow `CARD: CREDIT_CARD + VISA/MASTER_CARD + DOMESTIC`).

What PhonePe PG provides developers (primary source: developer.phonepe.com):

- **Checkout integration:** REST API (`POST .../checkout/v2/pay` → redirect/iframe PayPage) + backend SDKs (Node.js, Java, Python, PHP, .NET) + mobile SDKs (Android, iOS, Flutter, React Native, Ionic) + no-code plugins (Shopify, WooCommerce, Magento) + Payment Links API.
- **Dashboard:** register at `business.phonepe.com`, centralised reports/settlements/disputes.
- **Test mode:** dashboard **Test Mode toggle ON = Sandbox, OFF = Production**. Separate webhook config per environment; UAT checklist before go-live.
- **API keys / auth:** OAuth `O-Bearer <token>` for checkout APIs; per-webhook **Checksum Secret Key + Webhook ID** (HMAC) or username/password hash (SHA) for callbacks.
- **Webhooks:** configure in Developer Settings → Webhook tab (HTTPS only, 2xx within 3–5s, idempotent handling, IP whitelist published). Events: `checkout.order.completed`, `checkout.order.failed`, `pg.refund.completed`, `pg.refund.failed`. Rule: trust only root `payload.state`; fall back to **Order Status API** if webhook missed.
- **Settlement:** to the **registered merchant bank account** — typically **UPI T+1, cards T+2** (varies by agreement; weekend/holiday batches to next working day, credited ~before noon). Tracked under dashboard Settlements/Reports.

PhonePe PG pricing (primary source: phonepe.com/business-solutions/payment-gateway/pricing): **zero setup / zero AMC, headline ~1.99% with a limited-period "FREE*" offer (T&C apply)** — confirm live quote during onboarding; effective rate is method- and volume-specific (UPI vs cards differ) and GST applies on the fee.

PhonePe KYC (standard RBI norms; exact list at onboarding): PAN + authorised-signatory address proof (Aadhaar/Passport/Voter ID) + bank account/IFSC (+ cancelled cheque/verification on failure) + business proof (GST/MSME-Udyam/Shop & Establishment/COI depending on entity). Basic QR onboarding can be lighter; **full PG access normally expects GST/business proof**. Approval typically 1–3 working days.

## 2. Razorpay vs PhonePe PG vs Cashfree vs Stripe-India (for this use case)

| Dimension | Razorpay | PhonePe PG | Cashfree | Stripe-India |
|---|---|---|---|---|
| One checkout covers | 100+ methods: UPI, domestic + **international cards** (separate activation), netbanking, wallets, EMI, Payment Links/Pages | UPI + domestic cards/netbanking/EMI/wallets. International-card coverage is **not** its differentiator | 180+ modes: UPI, cards, netbanking, wallets, EMI/BNPL, **international in 140+ currencies → settle INR** | Cards (global) + **UPI supported** (INR presentment, India customers) via Payment Element/Checkout |
| KYC / onboarding | Fully digital. 2026 Master-KYC via **CKYC auto-fetch** (Business PAN + DOI, or Personal PAN + linked-mobile OTP); fallback uploads. Individuals/unregistered: PAN + address + bank/IFSC. Proprietorship: 2× business proof (MSME/GST/Shop/IEC/mobile bill) + PAN + address + bank. Pvt Ltd: COI + CIN + MOA + AOA + Business PAN + bank + UBO declaration (>10%) + signatory BR/POA. Live mode after activation; often same-day | Structured KYC as above (PAN + address + bank + business proof; GST typically for PG). 1–3 days | Paperless, **~24 working hrs** after docs; same doc family (PAN/bank/GST). Licensed Payment Aggregator | **Invite-only since May 2024** — no self-serve signup; request invite, limited approvals focused on cross-border. Verification when approved: PAN, address, MCA/GST docs (companies), URL, product description, support phone, external bank account |
| Test mode | **Test/Live toggle** on dashboard; separate key sets. Test UPI IDs `success@razorpay` / `failure@razorpay`; official international test cards. Live keys only after KYC | **Test toggle ON/OFF**; sandbox UAT then go-live | **Sandbox mirrors prod** (cards/netbanking/UPI VPAs e.g. `testsuccess@gocash`, EMI/paylater; PayPal + bank-transfer not in sandbox) | Standard `sk_test/pk_test` + test clocks; UPI testable per docs — **moot if you can't get an account** |
| One-time link/checkout + Next.js webhook | Orders API + Checkout.js, or **Payment Links/Pages (no-code, free)**. Webhooks at Dashboard → Settings → Webhooks, **HMAC-SHA256 verify raw body** in `app/api/webhooks/*/route.ts` (`await request.text()`, never `request.json()` first); subscribe `payment.captured/failed`, `refund.*`; always reconcile with Orders/Status API, return 2xx fast, dedupe | Create Payment → redirect/iframe → webhook (`checkout.order.completed/failed`) with **HMAC checksum (`x-phonepe-checksum-key-id/signature`) or SHA** verify; same Next.js raw-body pattern; Order Status API fallback | Orders/Links API + Checkout; signed webhooks, same Next.js pattern; Payouts/Refunds APIs separate | Checkout Sessions / Payment Links; `stripe.webhooks.constructEvent(rawBody, sig, secret)`; events `checkout.session.completed`, `invoice.*`. Cleanest DX — **if** you have an account |
| Settlement | **All in INR to Indian bank.** Domestic **T+2** standard; international **T+7** typical (viewable on dashboard). Instant-settlement add-on mostly domestic | To Indian bank. **UPI T+1, cards T+2** typical | To Indian bank. Domestic fast; international collected in 140+ currencies, **settled INR** (FX + timelines per corridor) | Payouts to Indian bank, **~2 days** for UPI-class rails; global payouts per country |
| Headline fees (ex-GST; **+18% GST on the fee only**) | Standard: **domestic most methods 2%** (incl. UPI — platform fee, not bank MDR), EMI/premium 3%, **international cards 3%** (+1% optional chargeback cover), intl bank-transfer 1%, intl wallets/local 3.5%. No setup/AMC. On $29 (~₹2,500): domestic ≈ ₹50 fee + ₹9 GST; intl card ≈ ₹75 + ₹13.5 GST | **~1.99% headline, FREE* promo (T&C)**; zero setup/AMC. Method-specific; confirm quote + GST treatment in writing | Standard ≈ **1.95–2% domestic, ~2.99% intl cards**, Amex 2.95%, EMI +, virtual-account ₹20 flat. **Festive 0% to ₹20L GMV** (new merchants, 21 Jul 2026–31 Mar 2027, **domestic only; GST still on 1.95%; excludes IPG/Amex/EMI/premium ≥3%; 60% credit-card fair-use cap**). No setup/AMC; Links/Forms/softPOS free | India pricing per stripe.com/pricing (check live); UPI marketed as lower-than-cards. Global-card TDR + FX where applicable. Getting an account is the blocker, not the rate card |

KYC gotcha for a solo founder: all three Indian gateways onboard **individuals/unregistered businesses** (PAN + Aadhaar + bank), so you can start without a Pvt Ltd. But **international-card activation** (Razorpay/Cashfree) is a second approval (dashboard request + banking-partner review); physical-goods export needs IEC, digital/service export doesn't strictly but IEC + FIRA/e-FIRC paperwork matters for GST/FX compliance.

## 3. The critical constraint: US/EU buyers CANNOT pay via UPI

- UPI moves **only INR between Indian bank accounts** (NPCI/RBI rails). A US Visa/Mastercard or US bank account **cannot** be linked to domestic UPI or pay a UPI QR/collect/intent. NRI exceptions prove the rule: NRIs in ~12 country codes can use UPI **only by debiting an Indian NRE/NRO account** (foreign number linked at an Indian bank); bilateral corridors (e.g. UPI–PayNow Singapore) and tourist pilots (7 countries, merchant-dependent) are narrow remittance/acceptance pilots — not a US-card-to-your-checkout path.
- So: **UPI = Indian buyers. Cards = global buyers.** Practical combos:
  - **A (recommended): single Razorpay account** — one integration, buyer auto-picks UPI (India) or card (anywhere); enable International Payments in dashboard. One settlement account, one reconciliation.
  - **B: single Cashfree account** — same shape (domestic + IPG), pick if its quote/promo beats Razorpay.
  - **C: Stripe (global cards, if account already active) + Razorpay/Cashfree/PhonePe (India UPI)** — two dashboards, two settlements, currency/UX split. Only worth it if Stripe is already live grandfathered; do not chase a new Stripe-India invite as the critical path.
  - PhonePe PG alone does **not** solve the global half.

## 4. Can money land so you "use it in PhonePe"?

Explicit, because founders confuse this:

- **No gateway settles into your PhonePe consumer-app/wallet balance.** Razorpay, PhonePe PG, Cashfree, and Stripe all settle **only to the registered bank account** (via NEFT/IMPS rails with UTR refs; T+1/T+2/T+7 above).
- **But yes, you can spend it via the PhonePe app afterwards:** link that *same* bank account in the PhonePe (or GPay/Paytm/BHIM) app → settled funds are spendable via UPI QR/send/bills. Flow is always **buyer → gateway → your bank (settlement) → your UPI app (spend)**. Merchant-dashboard "balance" and consumer-app balance are different things; "Payouts to UPI ID" products move money *out* over bank rails, they don't shortcut settlement into a wallet.

## 5. Recommendation for `cited` + first 3 setup steps

**Recommendation:** use **Razorpay as the single gateway** for v1: charge **$29 in USD** (let Razorpay handle FX → INR settlement), which gives Indian buyers UPI + cards/netbanking and US/EU buyers Visa/Mastercard/Amex in one Checkout/Payment-Link. Runner-up: Cashfree if its live quote or festive-0% works out cheaper for your mix. Keep Stripe only as a later/global duplicate if your existing account is already active — **do not block launch on a new Stripe-India invite**. Add PhonePe PG later only if UPI success-rate/cost data justifies a second India rail.

**First 3 setup steps (exact):**

1. **Create + verify Razorpay, get keys.** Sign up → complete KYC as Individual/Sole-prop (PAN + Aadhaar + bank/IFSC; add GST/MSME if asked) → Dashboard toggle **Test Mode ON** → Settings → API Keys → generate **test** keys (`rzp_test_*`). Build now; generate **live** keys (`rzp_live_*`) only after activation, never ship test keys.
2. **Integrate one-time checkout + webhook in Next.js.** Server creates an **Order** (amount in paise/smallest unit, currency USD or INR per pricing decision, `receipt` = audit ID) → open Razorpay Checkout (or no-code **Payment Link** for fastest v0) → implement `POST /api/webhooks/razorpay` verifying **HMAC-SHA256 signature on the raw body**, handling `payment.captured` (fulfil audit) / `payment.failed` / `refund.*`, 2xx fast + dedupe + **Order Status API fallback** (never fulfil on redirect URL alone).
3. **Enable global + prove money moves.** Dashboard → request **International Payments** activation → run end-to-end tests (test UPI IDs + intl test cards; then a **₹1–₹100 live** UPI + domestic-card + real US-card payment) → confirm **settlement to your Indian bank (T+2 domestic / T+7 intl)** → link that bank in your PhonePe app to spend. Price display: $29 USD primary; show approximate INR only as reference.

## Sources (primary, checked 2026-09-03)

- PhonePe PG dev portal + website integration: https://developer.phonepe.com/payment-gateway
- PhonePe payment-mode config (UPI INTENT/COLLECT/QR, CARD geoScopes): https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment/configure-payment-modes
- PhonePe webhook handling (HMAC/SHA, events, Test toggle, IP list): https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook
- PhonePe PG pricing (1.99% FREE* / zero setup-AMC): https://www.phonepe.com/business-solutions/payment-gateway/pricing/ and https://business.phonepe.com/payment-gateway
- Razorpay Test/Live modes (separate keys): https://razorpay.com/docs/payments/dashboard/test-live-modes
- Razorpay test UPI IDs: https://razorpay.com/docs/payments/payments/test-upi-details ; test cards: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/payments/test-card-upi-details/
- Razorpay KYC documents (2026 Master KYC / CKYC / per-entity lists): https://razorpay.com/docs/payments/business-types-kyc-documents?preferred-country=IN
- Razorpay international payments (dashboard request + bank approval): https://d6xcmfyh68wv8.cloudfront.net/docs/payments/payments/international-payments/
- Razorpay settlements (domestic T+2 / intl per law, all INR): https://razorpay.com/docs/payments/settlements
- Razorpay pricing explained (domestic 2%, intl 3%, +18% GST on fee, no setup/AMC): https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/
- Cashfree docs + sandbox (test VPAs/cards): https://www.cashfree.com/docs and https://www.cashfree.com/docs/payments/online/resources/sandbox-environment
- Cashfree pricing (1.95–2% domestic, ~2.99% intl, ₹20 VA, festive 0% T&C): https://www.cashfree.com/payment-gateway-charges/ and https://www.cashfree.com/docs/help/account/pricing
- Stripe UPI (INR presentment, India customers, 2-day payout): https://stripe.com/payment-method/upi and https://docs.stripe.com/payments/upi ; API changelog 2026-03-25 (UPI method): https://docs.stripe.com/changelog/dahlia/2026-03-25/adds-support-for-the-upi-payment-method
- Stripe India invite-only: https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india and https://support.stripe.com/questions/india-faq
- Stripe India verification (PAN/MCA/GST/bank/URL): https://support.stripe.com/questions/onboarding-requirements-for-stripe-connect-in-india
- UPI is domestic-only / NRE-NRO requirement: https://www.npci.org.in/product/upi/all-members ; RBI 08-Feb-2023 (foreign nationals/NRIs visiting India): https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12452 ; NRI-on-foreign-number guide (12 codes, NRE/NRO mandatory): https://www.nrifinancialservices.com/guides/banking/nri-upi-access-from-abroad
