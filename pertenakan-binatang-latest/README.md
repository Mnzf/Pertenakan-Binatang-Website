# Kaznisah Farming Sdn Bhd website

Group project website for a livestock farm client.
Stack: HTML, CSS, JavaScript, JSON (sample data), Firebase (Auth, Firestore, Storage).

## Scope (team decisions)
- Focus on **animals** first. No products page.
- Buyers **send an inquiry to buy** and the owner contacts them. No cart, checkout or online payment.
- No newsletter.

## Pages
Public (shared header + footer):
| File | Purpose |
|---|---|
| index.html | Home |
| pages/about.html | About |
| pages/animals.html | Animal listing / categories |
| pages/animal-detail.html | Animal detail |
| pages/inquire.html | Send an inquiry to buy |
| pages/contact.html | Contact + visit |

Buyer:
| pages/buyer-login.html | Buyer login |
| pages/buyer-register.html | Buyer registration |
| pages/buyer-dashboard.html | Saved animals, inquiry status, messages |

Staff (herd management):
| pages/staff-login.html | Staff login |
| pages/staff-dashboard.html | Herd overview |
| pages/animal-records.html | Animal records |
| pages/animal-profile.html | Staff animal profile |

## Rules
- Semantic tags, a label on every input, alt text on every image.
- No inline `style=""`. Colours, fonts and spacing are CSS variables in `css/global.css`; use `var(--color-gold)` etc.
- Do not rename form `id`s or `name`s without telling the team (JS and Firebase use them).
- Work on your own branch, open a Pull Request, get a review before merging to `main`.

## Phase Javascript: JavaScript (how it fits together)

Open the site with the **Live Server** extension. The JS loads data with `fetch()`, which does not work when you double-click a file (`file://`).

### Phase Javascript rules
- Pages call `data.js`, `storage.js` and `auth.js`. Never call `localStorage` or `fetch` directly in a page script.
- Escape every value from data with `escapeHtml()` before putting it in `innerHTML`.
- Keep one page script per page; share code by putting it in a file in `js/`.
- Phase 4 TODOs are marked `TODO(Phase 4)` or `PHASE 4` in the code. Search for them.
