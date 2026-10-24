# [Ranch Name] website

Group project website for a livestock and fruit farm client.
Stack: HTML, CSS, JavaScript, JSON (sample data), Firebase (Auth, Firestore, Storage).

## Pages (from the Figma wireframe)

Public (shared header + footer):
| File | Wireframe screen |
|---|---|
| index.html | Home |
| pages/about.html | About |
| pages/animals.html | Animal listing / category |
| pages/animal-detail.html | Animal detail |
| pages/products.html | Product listing |
| pages/product-detail.html | Product detail |
| pages/checkout.html | Cart + checkout + confirmation |
| pages/contact.html | Contact + visit |

Buyer:
| pages/buyer-login.html | Buyer login |
| pages/buyer-register.html | Buyer registration |
| pages/buyer-dashboard.html | Buyer portal |

Staff (herd management):
| pages/staff-login.html | Herd management login |
| pages/staff-dashboard.html | Herd overview |
| pages/animal-records.html | Animal records |
| pages/animal-profile.html | Staff animal profile |

## Rules
- Phase 1: HTML only. Semantic tags, a label on every input, alt text on every image.
- No inline `style=""`. All styling goes in `css/`.
- Do not rename form `id`s or `name`s without telling the team (JS and Firebase use them).
- Work on your own branch, open a Pull Request, get a review before merging to `main`.
