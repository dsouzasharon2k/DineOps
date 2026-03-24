# Public Menu UI Stack

Technical overview of UI libraries, patterns, and components used in the public-facing menu and food cards.

---

## Core stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 |
| **Build** | Vite 7 |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router 7 |
| **Cart state** | Zustand (persisted to localStorage) |
| **HTTP** | Axios |
| **Real-time** | @stomp/stompjs + SockJS (WebSocket fallback) |

---

## Public menu page components

### Layout
- **PublicMenuPage** (`frontend/src/pages/menu/PublicMenuPage.tsx`)
  - Header: restaurant avatar, name, Open/Closed badge, address, star rating, operating hours, table number
  - Category tabs: horizontal scroll, sticky
  - Filters: All / Veg / Non-Veg / Vegan
  - Sort: Recommended, Price low-high, Price high-low, Most Loved
  - Allergy note banner
  - Item grid using **FoodItemCard**
  - Fixed bottom cart bar (sticky CTA)

### FoodItemCard (`frontend/src/components/FoodItemCard.tsx`)
- **Collapsed state**
  - FSSAI-style diet badge (veg / non-veg / vegan)
  - Name, price, 2-line description, serving size
  - Right-side image with gradient fallback
  - Add button: shows `+` when qty=0, shows `−` count `+` stepper when qty>0
- **Expanded bottom sheet**
  - Full image header with price chip
  - Sections: Flavour profile, Allergen declaration, Ingredients, Nutritional info
  - Sticky add bar with qty stepper

### Styling approach
- Tailwind utility classes
- Stone/neutral palette
- Orange (`#EA580C`) for primary actions and accents
- FSSAI colors: green (#22a45d) veg, red (#e63b3b) non-veg, dark green (#16803c) vegan

### Fonts
- System sans-serif (no custom font loaded for cards)
- Optional: DM Sans via Google Fonts (commented in original spec)

---

## Cart integration
- **Store**: `frontend/src/store/cartStore.ts` (Zustand + persist)
- **Hook**: `useCart(tenantId)` provides `addItem`, `removeItem`, `getQuantity`, `total`, `itemCount`
- **Sync**: Quantity comes from `getQuantity(item.id)`; card always reflects cart state

---

## Responsive behavior
- Mobile-first layout
- `max-w-2xl` for content
- Sticky header and category tabs
- Bottom sheet optimized for thumb reach
