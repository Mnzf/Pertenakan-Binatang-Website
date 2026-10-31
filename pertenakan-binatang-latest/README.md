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
