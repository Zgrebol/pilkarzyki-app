@AGENTS.md

## Stack

- **Next.js 16.2.6** (App Router, React 19, TypeScript 5)
- **Supabase** — baza danych (Postgres), auth, RLS
- **Tailwind CSS v4** (konfiguracja przez PostCSS, nie tailwind.config.js)
- **@supabase/ssr ^0.10** — klient SSR; `@supabase/supabase-js ^2`
- Brak state management (Redux/Zustand itp.) — dane w Server Components
- Brak bibliotek formularzy (react-hook-form itp.) — natywne FormData
- Motyw: ciemny (bg-gray-950/800), font Geist Sans + Geist Mono

## Struktura katalogów

```
app/                         # katalog App Routera Next.js
  layout.tsx                 # root layout: Navbar + <main>
  page.tsx                   # strona główna: lista lig
  globals.css
  components/
    navbar.tsx               # Server Component, czyta sesję z Supabase
  auth/
    actions.ts               # signOut (Server Action)
    callback/route.ts        # OAuth callback
    confirm/route.ts         # email confirm
  login/page.tsx             # 'use client', signInWithPassword + window.location.href
  signup/page.tsx
  profile/
    page.tsx                 # Server Component
    profile-form.tsx         # 'use client'
    actions.ts               # updateDisplayName
  leagues/
    new/
      page.tsx
      create-league-form.tsx  # 'use client'
      actions.ts             # createLeague
    [id]/
      page.tsx               # główna strona ligi (Server Component)
      league-actions.ts      # deleteLeague, restoreLeague
      moderation-actions.ts  # approveMember, rejectMember
      leave-league-actions.ts # leaveLeague
      role-actions.ts        # changeMemberRole
      edit/
        page.tsx
        edit-league-form.tsx  # 'use client'
        actions.ts
      join/
        page.tsx
        join-form.tsx         # 'use client'
        actions.ts
      delete-league-button.tsx   # 'use client'
      restore-league-button.tsx  # 'use client'
      leave-league-button.tsx    # 'use client'
      member-role-controls.tsx   # 'use client'
      pending-members-panel.tsx  # 'use client'
utils/supabase/
  server.ts      # createClient() — Server Components / Server Actions / Route Handlers
  client.ts      # createClient() — Client Components (browser)
  middleware.ts  # updateSession() — używana w middleware.ts (root)
```

## Baza danych (Supabase)

Główne tabele:

- **profiles** — `id` (= auth.users.id), `display_name`, `is_super_admin` (bool)
- **leagues** — `id`, `name`, `description`, `season_name`, `max_teams`, `is_public`,
  `created_by`, `created_at`, `status` (`'active'` | `'deleted'`)
- **league_members** — `id`, `league_id`, `user_id`, `role` (`'admin'`|`'mod'`|`'player'`),
  `status` (`'pending'`|`'active'`|`'left'`), `team_name`, `joined_at`, `left_at`

Triggery w bazie:
- `prevent_last_admin_removal` — rzuca `P0001` gdy próba odebrania ostatniemu adminowi

## Auth

- Sesja przez cookie (Supabase SSR)
- `middleware.ts` → `updateSession()` odświeża token na każdym requescie
- Logowanie: Client Component (`'use client'`), `signInWithPassword`, potem `window.location.href`
  (nie `router.push`) — jedyny sposób, żeby Server Components (Navbar) zobaczyły nową sesję
- Wylogowanie: Server Action (`signOut`), `redirect('/login')`
- Strony auth: `/login`, `/signup`, `/auth/callback`, `/auth/confirm`
- Obsługa `?next=` po zalogowaniu — tylko ścieżki zaczynające się od `/` (nie `//`)

## Konwencje kodu

### Server Actions
- Każdy plik akcji: `'use server'` na górze
- Sygnatura powrotu: `{ error: string } | { success: true }` lub `{ ok: boolean; error?: string }`
- Zawsze: weryfikacja sesji (`supabase.auth.getUser()`) → sprawdzenie uprawnień → operacja DB
- Prywatne helpery bramek (`requireSuperAdmin`, `checkModerationRights`, `getRoleManagementContext`)
  wywoływane na początku każdej akcji wymagającej autoryzacji
- Po mutacji: `revalidatePath()` dla dotkniętych tras

### Komponenty
- Domyślnie Server Component (brak `'use client'`)
- `'use client'` tylko gdy potrzebny stan, event handler lub hook (np. `useTransition`, `useSearchParams`)
- Nazwy plików: `kebab-case.tsx`; komponent eksportowany: `PascalCase`
- Przyciski akcji (delete/restore/leave) = osobne Client Components z `useTransition`
- Formularze w Server Components: `<form action={serverAction}>` bez JS
- Formularze wymagające stanu: osobny `*-form.tsx` jako `'use client'`

### Supabase client
- Server (Server Components, Server Actions, Route Handlers): `import { createClient } from '@/utils/supabase/server'`
- Client (Client Components): `import { createClient } from '@/utils/supabase/client'`
- Nigdy nie importuj server-side clienta w `'use client'`

### Path aliasy
- `@/` = root projektu (np. `@/utils/supabase/server`, `@/app/components/navbar`)
- W plikach głęboko zagnieżdżonych dopuszczalne ścieżki relatywne (`../../../utils/...`)

### Tailwind
- Wersja 4 — konfiguracja przez `postcss.config.mjs`, nie `tailwind.config.js`
- Paletka: `gray-950` (tło główne), `gray-900/800` (karty), `gray-700` (obramowania)
- Układ: `max-w-3xl` lub `max-w-4xl mx-auto px-4 py-8`

## Architektura — reguły, których NIE wolno naruszać
- Bramki uprawnień są w kodzie Server Actions, NIE w RLS (polityki UPDATE łączą
  się OR'em, więc RLS jest za szeroki — celowo). Nie przenoś logiki uprawnień do RLS.
- Role: gracz = baza, mod/admin = nakładki. Enum league_role (admin/mod/player)
  przeinterpretowany, bez migracji. Mod NIE zarządza rolami ani nie wyrzuca z ligi.
- Tylko super admin nadaje/odbiera admina i usuwa ligi. Wielu adminów na ligę OK,
  zero niedozwolone (trigger prevent_last_admin_removal).
- Usuwanie ligi = soft delete (leagues.status = 'deleted'), nie twardy DELETE.
- Logowanie: po signInWithPassword pełne przeładowanie (window.location.href),
  nie router.push — inaczej Navbar nie widzi sesji.
- Stack: Next.js 16 (App Router), Supabase, Tailwind. Server Components domyślnie.


