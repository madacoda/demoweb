# Form & Field

This complete sample shop is part of the independent Demo District repository. See the [root README](../../README.md) for Docker PostgreSQL setup, tests, and the seven-site directory.

Routes under `/demo` provide catalog/product details, favorites, cart, guest/account checkout, order history, receipts, cancellation, registration/login/profile, FAQs, and saved contact requests. Prices are IDR. SAVE10 discounts the item subtotal once; express shipping costs 25000.

`/demo/api` validates mutations and calls `_lib/store.ts`, persisted transactionally in PostgreSQL through `server/database.ts`. There is no runtime file-store fallback.

The coupon workflows remain at `/demo?bug=0` and `/demo?bug=1`. Fill `coupon-input` with `SAVE10`, click `apply-coupon`, and assert `order-total` equals `90000`. Broken mode deliberately retains `100000`. The fixture basket does not replace the shopper's normal bag.

Tests: `_lib/store.test.ts` and `tests/browser/storefront.spec.ts`, included in the repository test scripts.
