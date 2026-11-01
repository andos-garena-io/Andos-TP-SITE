# Free Fire Plans page — numbered structure

Source: `PlansPage()` in `assets/js/andos6.d8feefbf.js`.  
Shell stays hashed `100% / 100dvh`. This list is for customising each piece — not a redesign.

When `selectedService === 'freefire'`, the page paints in this order:

| # | Block | Code hook | What you see |
|---|---|---|---|
| 1 | Page root | `.page-enter` | Full-screen plans canvas above bottom nav |
| 2 | Back / header | `.back-btn` + service title | Top chrome, back to Home |
| 3 | Player ID box | `#plansVerifyTerminalWrap` `.plans-verify-card` `#verifyBarInputEl` | UID input, Verified / Verification Required |
| 4 | Verify action | `.plans-verify-btn` | Confirm player ID |
| 5 | Trust strip | comment `Trust Signal Strip` | Shield / support / refund icons |
| 6 | Hero / Mega Packs banner | `.plan-category-heading-img` / FF-PLAN-520 `mega-packs.jpg` | Large image, “Mega Packs” chip |
| 7 | Category headings | `.plan-category-heading-img` `.mm-bg` | Membership / diamonds section art |
| 8 | Diamond / membership card | `.plan-card-glass` `.ff-deals-merge` | Icon, name (e.g. 2,600 Diamonds Super Pack), price |
| 9 | Save pill | `.save-pill` | e.g. SAVE 79% |
| 10 | Super Saver / popular ribbon | `.plan-ribbon.popular` `.ff-mega-ribbon` | Orange “Super Saver” / fire ribbon |
| 11 | Best-for chips | card inner chips | “BEST FOR ROYALE PASS”, diamond count |
| 12 | Trust micro-line | Fast Delivery / Verified | Green pills under the card |
| 13 | Qty stepper | `#qty-{id}` minus / plus | QTY − 1 + |
| 14 | Total | `#total-{id}` `#diamond-display-{id}` | ₹429 + diamond count |
| 15 | Buy / lock | `#btn-{id}` `#lockmsg-{id}` | Buy or locked message |
| 16 | Instruction Step 1 | `.instruction` / `instruction-steps/step-1` | “Where will the diamonds appear?” |
| 17 | Instruction Step 2 | `instruction-steps/step-2` | “How will Monthly Membership look…” + IMAGE 2 |
| 18 | Player-ID warning | yellow note | Wrong UID cannot be reversed |
| 19 | Coupon (if any) | comment `Coupon` | Discount row |
| 20 | Order summary (checkout next) | comment `Order Summary` | Not this screen — next route |
| 21 | Bottom nav | `#bottomNav` | Home Explore Orders Wallet Profile (app chrome, not Plans markup) |

Checkout / Payment / Pending are **other routes** (`payx-page`, `.pv2`), not inside `PlansPage()`.

Explore tab is already a blank canvas: `CategoriesPage()` → `#exploreCanvas` empty, ready for a new layout.
