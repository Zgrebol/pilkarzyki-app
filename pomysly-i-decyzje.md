# Piłkarzyki — pomysły i decyzje

Plik żywy. Aktualizujemy w trakcie projektu.

## Decyzje produktowe (potwierdzone)

- **Platforma multi-tenant** — wiele lig na jednej stronie, każda osobna
- **Nazwa platformy:** Piłkarzyki (nazwy lig dowolne, definiowane przez admina)
- **Stos technologiczny:** Next.js + Supabase + Vercel + GitHub
- **Konto GitHub:** Zgrebol
- **Domena:** decyzja później (na razie darmowy adres Vercel)

## Strona główna (przed zalogowaniem)

- Logo + nazwa platformy
- Kafelki: ligi, do których user jest zapisany
- Jeśli nie jest zapisany do żadnej — kafelki lig publicznych z wolnymi miejscami
- Top strzelcy: **cross-league** (globalnie ze wszystkich lig na platformie)
- Inne statystyki, panel użytkownika, avatar

## Ligi

- **Typy:** publiczne (każdy zgłasza chęć) i prywatne (zaproszenie)
- **Dołączanie:** user zgłasza chęć → admin/mod akceptuje → user podaje nazwę zespołu
- **Limit miejsc:** każda liga ma swój
- **Regulamin:** wspólny dla wszystkich lig na razie

## Użytkownicy i role

- **Super admin:** Zgrebol (ja). Później można dodawać innych
- **Admin ligi:** twórca ligi
- **Mod ligi:** wyznaczony przez admina
- **Gracz:** ma jeden zespół w danej lidze
- **Gość:** przegląda publiczne ligi bez logowania

Jeden user może być w wielu ligach. W każdej ma maksymalnie jeden zespół.

## Transfery

- Wszystkie typy: 1 za 1, łączone (A+B za C+D), za wybory draftowe
- Cofnięcie: większością głosów modów (mod inicjuje, inni głosują)
- Składy aktualizują się automatycznie

## Puchar Piłkarzyków

- Wg nowej formuły z regulaminu (2024/25)
- Faza grupowa: 4 grupy po 9 graczy, jedna wspólna tabela
- Top 8 → 1/8 finału, miejsca 9-24 → rePPasaż, 25-36 → odpadają
- Realizujemy w fazie 4 (nie MVP)

## Roadmap (6 faz)

- **Faza 0:** Fundament (Next.js + Supabase + logowanie + wdrożenie)
- **Faza 1:** Ligi (tworzenie, dołączanie, role)
- **Faza 2:** Składy i terminarz
- **Faza 3:** Mecze, trójki, tabela
- **Faza 4:** Transfery, Puchar
- **Faza 5:** Drafty, ankiety, grafiki
- **Faza 6:** Design, API piłkarskie, powiadomienia

Pierwsza wersja online: realnie 4-5 miesięcy od dziś.

## Funkcje "miłe ale nie pilne"

- Ankiety w wątkach kolejek (mod tworzy)
- Grafiki w wątkach kolejek
- Podlinkowanie / widżet na forum
- Dark mode
- Logotypy / herby drużyn

## Inspiracje z FPL / Fantasy Ekstraklasa (do faz 2-5)

- **Klasyfikacje wielowymiarowe** — ranking strzelców cross-league, ranking wszech czasów, ranking sezonów, ranking transferów
- **Wiadomości / Skaut piłkarzyków** — sekcja, w której modzi piszą newsy, felietony, podsumowania
- **Strona piłkarza** — pełne statystyki: gole w sezonach, kto go miał, w ilu trójkach grał
- **Countdown** — widoczny licznik czasu do deadline trójek/transferów/draftu
- **Osiągnięcia / odznaki** — Mistrz Ligi, Zdobywca PP, 100 goli w sezonie, dla retencji
- **Galeria zwycięzców** — wirtualna sala sławy z mistrzami minionych sezonów

## Kierunek wizualny

- Wstępna preferencja: FM/FIFA — ciemne, menadżerskie, statystyki
- Otwarte — wracamy do tematu, gdy zobaczymy prawdziwe dane na stronie
- Cel: nie wyglądać jak generyczna AI-strona

## Backlog (wszystko, co przyjdzie do głowy w trakcie tygodnia)

-
-
## Postępy

- **Sesja 1 (data: 15.05.2026)** — fundament aplikacji
  - Next.js 16 z TypeScript + Tailwind
  - Supabase: projekt + tabela `leagues` (id, created_at, name, description,
    is_public, max_teams, season_name)
  - Połączenie aplikacja ↔ baza działa
  - Strona główna: "Piłkarzyki" + status połączenia + debug data


  przejrzeć politykę kluczy API Supabase — RLS i ograniczenia

  - **Sesja 2 (data: 15.05.2026)** — publikacja w internecie
  - GitHub repo: github.com/Zgrebol/pilkarzyki-app
  - Vercel projekt: pilkarzyki-app.vercel.app
  - Environment Variables ustawione (Supabase URL + Anon Key)
  - STRONA DZIAŁA W INTERNECIE 🎉
  - Lekcje: Root Directory, Production Overrides, Deployment Protection

  ## API piłkarskie (Faza 6, decyzja później)

- Cel: automatyczne zaczytywanie goli piłkarzy z prawdziwych meczów → 
  automatyczne wyniki piłkarzykowe → mniej pracy modów
- Kandydaci: API-Football ($19/mc, dobry start), Sportmonks 
  (droższy, bogatszy), Football-Data.org (najtaniej, mniej lig)
- Wybór: gdy będziemy w fazie 6, po przetestowaniu darmowych trialów
- Niezależnie od API: tabela ligowa liczy się automatycznie 
  z wyników już od Fazy 3

  ## Custom SMTP (przed pierwszą publiczną wersją)

- Wbudowany SMTP Supabase: 3 maile/h, "not for production"
- Polecany: Resend (darmowe 3k maili/mc, prosta integracja)
- Alternatywa: Brevo (300/dzień darmowo), SendGrid
- Wymaga: konto u dostawcy, klucz API, ustawić w 
  Supabase → Authentication → Emails → SMTP Settings
- Termin: zanim pojawią się pierwsi prawdziwi gracze

- **Sesja 3 (data: 17.05.2026)** — logowanie i rejestracja użytkowników
  - Supabase Auth: email + hasło, confirm email = ON
  - Strony: /signup, /login, /profile, wylogowanie
  - Token hash + verifyOtp dla maila aktywacyjnego (zamiast PKCE)
  - Browser Client w formularzach (PKCE w ciasteczku)
  - Server Component dla chronionej strony /profile
  - Proxy.ts (Next.js 16 zamiast middleware.ts) odświeżający sesję
  - Lekcje: Next.js 16 API zmiany (proxy.ts, await cookies(), 
    request.cookies.set 2-arg), PKCE z SSR nie działa, token_hash 
    jest właściwą ścieżką dla email verification
  - Działa: lokalnie i na pilkarzyki-app.vercel.app


  ## Custom SMTP (przed pierwszą publiczną wersją)
- Wbudowany SMTP Supabase: 3 maile/h, "not for production"
- Polecany: Resend (darmowe 3k maili/mc)
- Termin: zanim zaczniesz zapraszać prawdziwych graczy

## Polskie szablony maili (kosmetyka)
- Email Templates w Supabase domyślnie po angielsku
- Do przetłumaczenia: Confirm signup, Reset password, Magic link

## API piłkarskie (Faza 6)
- Cel: automatyczne zaczytywanie goli piłkarzy z prawdziwych meczów
- Kandydaci: API-Football ($19/mc), Sportmonks, Football-Data.org
- Decyzja: gdy będziemy w fazie 6

## Postępy


- **Sesja 4 (data: 18.05.2026)** — role, RLS, profil
  - Tabela `profiles` (display_name, is_super_admin, created_at) + trigger
    `handle_new_user` auto-tworzący profil po rejestracji
    (display_name = część maila przed @)
  - Tabela `league_members` (role: admin/mod/player, status: pending/active,
    team_name, unique (league_id, user_id))
  - Enumy SQL: `league_role`, `member_status`
  - `leagues.created_by` + trigger `handle_new_league` automatycznie 
    przypisujący twórcę jako admina ligi
  - `leagues.id` zmienione z bigint na uuid (lepsze przy multi-tenant, 
    niezgadywalne ID w URL-ach, spójne z resztą Supabase)
  - Helpery SQL `security definer`:
    - `is_super_admin(uid)` 
    - `is_league_member(uid, lid)`
    - `is_league_admin(uid, lid)`
    - `is_league_mod_or_admin(uid, lid)`
  - RLS włączony na 3 tabelach:
    - `profiles`: read all authenticated, update only own
    - `leagues`: select public dla wszystkich (też anon), select prywatnych 
      dla członków, insert tylko z created_by=self, update tylko admin/super,
      delete tylko super admin
    - `league_members`: select dla członków + każdy widzi członków lig 
      publicznych, self-insert tylko jako pending player do publicznej ligi,
      update tylko mod/admin ligi, delete dla admina/super/self
  - `/profile`: edycja display_name przez Server Action + Client Component 
    z useTransition, odznaka "🛡️ Super admin" dla super adminów
  - Super admin: sebastian.paterak9@gmail.com (display_name: Zgrebol)
  - Decyzje:
    - Super admin = boolean na profiles (nie osobna tabela app_roles) — 
      dorzucimy tabelę, gdy pojawi się druga globalna rola
    - Handle/@username odłożone do Fazy 5 (przy stronie piłkarza/forum)
    - Brak insert policy na profiles — insert robi tylko trigger 
      (security definer), is_super_admin zmienia się tylko przez SQL Editor
  - Lekcje:
    - SECURITY DEFINER konieczny dla helperów RLS — bez tego policy na 
      league_members sprawdzająca league_members wpada w nieskończoną rekurencję
    - Foreign key wymaga zgodności typów — leagues.id (bigint) ↔ 
      league_members.league_id (uuid) nie połączy się, trzeba ujednolicić
    - Po włączeniu trigerra na auth.users istniejących userów trzeba 
      backfillować ręcznie (insert into profiles select from auth.users)
  - Działa: lokalnie. Testy RLS przeszły: zwykły user nie widzi odznaki 
    super admin, edytuje tylko swój profil, niezalogowany jest redirectowany 
    na /login

## Backlog (świeże po sesji 4)
- Self-update team_name w league_members (sesja 5, przy join flow do ligi)
- Walidacja nazwy ligi (długość 3-50, unikalność per platforma do przemyślenia)
- Trigger zabraniający usunięcia ostatniego admina ligi (żeby liga 
  nie została bez właściciela)
- Push sesji 4 na GitHub + redeploy na Vercel + test super admina na produkcji

- **Sesja 5 (data: 18.05.2026)** — pierwsze ligi, lista i podgląd
  - `/leagues/new` — Server Action `createLeague` + Client Component 
    `CreateLeagueForm` (useTransition, walidacja klient + serwer)
  - Trigger `handle_new_league` z sesji 4 automatycznie przypisuje 
    twórcę jako admina — nic dodatkowego nie trzeba robić w app code
  - Strona główna `/` przerobiona z debug-view (raw JSON) na właściwy 
    widok: dwie sekcje kafelków (Twoje ligi + Inne ligi publiczne / 
    Ligi publiczne dla gości), przyciski Profil / Stwórz ligę / Wyloguj
  - `/leagues/[id]` — dynamic route, Server Component z dwoma 
    zapytaniami (liga + członkowie z embed profiles), notFound() 
    gdy RLS nie wpuszcza
  - Wylogowanie dostępne ze strony głównej (czerwony przycisk na pasku)
  - Link "Wróć na stronę główną" na /profile i /leagues/new
  - Banerka "🛡️ Wchodzisz jako super admin platformy" na stronach lig, 
    do których super admin nie należy formalnie
  
  ### Rozszerzenie uprawnień super admina (decyzja projektowa)
  - RLS poszerzone: super admin widzi wszystkie ligi (też prywatne) 
    i ich członków
  - Cel: moderacja platformy, reagowanie na zgłoszenia, audyt
  - NIE dotyczy: haseł, podszywania się pod userów (to wymagałoby 
    auth.admin API)
  - Polityki zmienione: 
    - `leagues select members or super` 
    - `league_members select` (z dodatkowym is_super_admin OR)
  
  ### Naprawiony FK
  - Dodany constraint `league_members_profile_fk` z user_id do 
    profiles.id (dodatkowy do istniejącego FK do auth.users)
  - Bez tego Postgrest embedded join `profiles(display_name)` 
    zwracał null i odsiewał wiersze z listy członków — wyglądało 
    jak problem RLS, było problemem schematu

  ### Lekcje
  - Postgrest do embedded join wymaga FK między tabelami; FK do 
    auth.users nie wystarcza dla joina z public.profiles, mimo że 
    profiles.id ma FK do auth.users
  - W Postgresie polityki RLS zmienia się przez drop + create, 
    nie ma "alter policy" do zmiany warunków
  - Server Action może zwrócić error LUB zrobić redirect — kod po 
    awaitcie nie wraca po redirect, więc `if (res?.error)` na froncie 
    sprawdzamy tylko branch błędu

## Backlog (świeże po sesji 5)
- Join flow: przycisk "Dołącz do ligi" w publicznej lidze dla 
  niezalogowanego/zalogowanego nie-członka → tworzy pending → 
  panel moda do akceptacji (sesja 6)
- Edycja ligi (formularz dla admina ligi, /leagues/[id]/edit)
- Usuwanie ligi (kosz z confirmem) — tylko super admin póki co
- Walidacja: nazwa ligi unikalna? po platformie czy nie? do decyzji
- Trigger zabraniający usunięcia ostatniego admina ligi (z poprzedniego backlogu)


## Monetyzacja / Premium (faza późniejsza, po testach z zaufanymi userami)

### Plany
- **Free:** 1 liga (rola nieważna — admin czy gracz, slot zajęty). 
  Czyli admin jednej ligi nie może dołączyć do drugiej, ani odwrotnie.
- **Premium:** bez limitu lig, tworzenie wielu, wszystkie funkcje 
  rozszerzone

### UX przy przekroczeniu
- Komunikat: "Aby dołączyć do tej ligi wyjdź z innej ligi lub 
  rozszerz konto do wersji premium."
- Force-leave dla istniejących userów przy włączeniu modelu — 
  user wybiera jedną ligę, reszta usunięta. Test na zaufanych 
  userach (bo to nieodwracalna decyzja po stronie usera).

### Co dodatkowo w premium (poza limitem lig)
- Tworzenie wielu lig (free = nie tworzy wcale lub tylko 1?)
- Statystyki rozszerzone, eksport do CSV
- Brak reklam (jeśli planujemy)
- Customowy avatar / motyw drużyny
- Ankiety w tematach kolejkowych (mod tworzy — premium feature?)
- Dodatkowe szaty graficzne
- Podsumowania (newslettery? maile?)
- Pełna lista do uściślenia przy implementacji

### Cena
- 20 zł/miesiąc na start
- Rynek lokalny (PL/PLN), możliwa ekspansja globalna (wtedy USD/EUR)
- Subskrypcja miesięczna (roczna opcjonalnie z rabatem? do decyzji)

### Płatności technicznie
- Stripe (globalnie, ma sub-management out of the box, ale 
  trzeba ogarnąć VAT-OSS i polski ULC)
- Przelewy24 / PayU (lokalnie często prościej dla PL, 
  BLIK, szybki przelew)
- Możliwy dual-setup: PL przez P24, zagranica przez Stripe

### Otwarte pytania (do rozstrzygnięcia przy implementacji)
- Czy super admin podlega limitowi? Najczystsze: nie, bo jest 
  "platforma-wszystko-widzi" i wchodzi w ligi przez RLS bez 
  bycia formalnym członkiem (mechanika z sesji 5)
- Czy free user może w ogóle tworzyć ligi (1 zamiast 0)?
- Co z istniejącymi userami w 2+ ligach po włączeniu modelu — 
  decyzja: force-leave z UI wyboru, testowane na zaufanych

### Zmiany w bazie (do zaplanowania)
- `profiles.plan` enum ('free', 'premium') + ewent. `premium_until` 
  timestamp
- Tabela `subscriptions` (provider, status, current_period_end...)
- Trigger / check constraint na `league_members` blokujący 
  insert gdy user free ma już 1 ligę


  ### Otwarte pytania (do rozstrzygnięcia przy implementacji)
- ~~Czy super admin podlega limitowi?~~
- **Super admin = automatycznie premium**, bez limitów. Decyzja podjęta 18.05.2026. 
  Powód: spójność (super admin ma wszystkie uprawnienia + wszystkie funkcje), 
  brak osobnego mechanizmu "user pominięty w limicie" w kodzie sprawdzającym slot.
- Czy free user może w ogóle tworzyć ligi (1 zamiast 0)?
- Co z istniejącymi userami w 2+ ligach po włączeniu modelu — 
  decyzja: force-leave z UI wyboru, testowane na zaufanych

  - **Super admin:** automatycznie premium, bez limitów (decyzja 18.05.2026)

  - **Sesja 6 (data: 18.05.2026)** — dołączanie do lig, panel moderatora, SMTP
  - **Etap 0: Custom SMTP (Resend)** — konfiguracja `smtp.resend.com:465`, 
    sender `onboarding@resend.dev`, 3000 maili/mc free. Ograniczenie: bez 
    własnej domeny wysyła tylko na adres właściciela konta Resend 
    (sebastian.paterak9). Do uruchomienia z prawdziwymi userami: 
    własna domena + weryfikacja DNS w Resend.
  - **Etap A: `?next=` parameter w loginie** — Client Component z 
    useSearchParams, walidacja `/...` ale nie `//...` (anti-phishing 
    open redirect), niebieska banerka "Zaloguj się, żeby kontynuować" 
    gdy next istnieje, link do /signup propaguje next przez encodeURIComponent
  - **Etap B: Przyciski akcji na stronie ligi** — 4 stany usera 
    rozróżnione zmienną `actionPanel`: 
    - `guest_join` — niebieski "Zaloguj się, żeby dołączyć" + link rejestracji
    - `logged_join` — zielony "Dołącz do ligi" prowadzący na /join
    - `pending` — żółta "⏳ Czekasz na akceptację"
    - null — aktywny członek (widzi swoją rolę) albo prywatna liga
    Edge case: `isFull` (members >= max_teams) → "Brak wolnych miejsc"
  - **Etap C: Formularz join + Server Action**
    - `/leagues/[id]/join` — guard clauses: niezalogowany → /login?next, 
      brak ligi → 404, prywatna → /leagues/[id], już członek → /leagues/[id]
    - Pole team_name (2-30 znaków, autoFocus)
    - 6-warstwowa walidacja w Server Action: zalogowany, liga istnieje, 
      publiczna, user nie jest jeszcze członkiem, nie pełna, nazwa unikalna 
      (ilike = case-insensitive)
    - Status pending → user widzi banerkę "Czekasz na akceptację"
  - **Etap D: Panel moderatora**
    - moderation-actions.ts: helper `checkModerationRights` 
      (zwraca {error, supabase, user}), approveMember, rejectMember
    - Race condition guards przy approve: powtórnie sprawdzane miejsce 
      i unikalność nazwy
    - PendingMembersPanel (Client Component): errorByMember jako obiekt 
      (nie pojedynczy string — żeby każdy wiersz miał swój błąd), 
      processingId (nie tylko boolean useTransition — chcemy wiedzieć 
      KTÓRY przycisk klikany), window.confirm przed Odrzuć (delete = 
      nieodwracalne), brak optimistic update (revalidatePath odświeża)
    - Sekcja widoczna tylko dla admin/mod/super admin — `canModerate` 
      sprawdzany ZANIM robimy zapytanie o pending (żeby zwykli userzy 
      nie widzieli pendingów nawet przez DevTools)
  
  ### Naprawki RLS (sesja 5 zostawiła luki)
  - `league_members update by mod or super` — sesja 5 poszerzała SELECT 
    o super admina, UPDATE/DELETE zostawione, niemożliwe było akceptowanie 
    przez super admina
  - `league_members delete by admin or super or self` — analogicznie
  - `profiles read all` — sesja 4 ograniczała do authenticated, anon 
    nie widział display_name w publicznych ligach, pokazywało się 
    "(usunięty profil)"
  
  ### Lekcje
  - Polityki RLS dla różnych operacji są niezależne — przy rozszerzaniu 
    uprawnień trzeba pokrywać SELECT, INSERT, UPDATE, DELETE osobno
  - Server Action zawsze zwraca HTTP 200, błąd w body — POST 200 ≠ sukces
  - RLS na profiles powinno obejmować anon dla publicznie dostępnych danych 
    (display_name), bo embedded join przez null wpływa na cały wiersz
  - Race condition guards w action są tanie (kilka extra zapytań) i 
    eliminują wiele kategorii potencjalnych bugów

## Backlog (świeże po sesji 6)
- Self-cancel pending zgłoszenia (przycisk "Anuluj zgłoszenie" w panelu 
  pending dla samego usera)
- Edycja ligi (formularz dla admin ligi/super admin)
- Usuwanie ligi (kosz z confirm, tylko super admin)
- Limit free vs premium (decyzja podjęta: free=1 liga, premium=bez limitu, 
  super admin=auto premium, force-leave dla istniejących userów przy 
  wprowadzeniu modelu)
- Promocja gracza do moderatora (admin ligi nadaje rolę 'mod' aktywnemu graczowi)
- Opuszczenie ligi przez gracza (przycisk "Wyjdź z ligi" + zabezpieczenie 
  że admin nie wyjdzie jako jedyny admin)
- Email notyfikacja przy akceptacji/odrzuceniu zgłoszenia (przez Resend)
- Własna domena + weryfikacja w Resend (warunek konieczny przed prawdziwymi userami)

- `useSearchParams` w Client Component wymaga opakowania w <Suspense> boundary 
  przy produkcyjnym buildzie Next.js. Lokalny `npm run dev` jest pobłażliwy, 
  ale `npm run build` (i Vercel) wymusza. Rozwiązanie: eksportowany default 
  to wrapper zwracający <Suspense>, właściwa logika w osobnym komponencie 
  wewnętrznym. Dobry test przed pushem: `npm run build` lokalnie — wychwyci 
  to samo, co Vercel.

  - Walidować lokalnie `npm run build` przed pushem do produkcji (oszczędza 
  cykl push → wait → fail na Vercelu). Można rozważyć git pre-push hook 
  uruchamiający build, ale na razie wystarczy nawyk.

  ### Auto-cleanup pending przy akceptacji (free plan)

Scenariusz: free user zgłasza się do 5 lig naraz. Mod ligi A akceptuje. 
Mod ligi B akceptuje sekundę później. User jest w 2 ligach jednocześnie 
— limit free omijany.

Rozwiązanie: gdy free user zostaje active w jakiejś lidze, wszystkie 
jego inne pending zgłoszenia są automatycznie usuwane. Premium user 
zachowuje pendingi, sam wybiera.

Implementacja: trigger after update on league_members, gdy status 
zmienia się z pending na active. Sprawdza plan, jeśli free → DELETE 
pozostałych pending dla tego usera.

Logika: "kto pierwszy akceptuje, ten zyskuje gracza." Reszta moderatorów 
zobaczy że pending zniknął z ich panelu (revalidatePath na wszystkich 
dotkniętych ligach).

Bonus: ten sam mechanizm działa dla scenariusza "user dostaje 
zaproszenie do prywatnej ligi i akceptuje" — jeśli kiedykolwiek 
dorobimy zaproszenia, też powinny czyścić pending.

## Wyjście z ligi:

User może wyjść w dowolnym momencie (soft delete: status='left')
Drużyna zostaje w tabeli, jej brak składu = walkower w danym meczu
Auto-fielding: system wystawia ostatnią znaną trójkę opuszczającego usera w meczach jego drużyny (Faza 3)
Brak powrotu w tym samym sezonie — wyjście jest na cały sezon (Faza 2, wymaga seasons)
Brak nowych zgłoszeń podczas trwania sezonu — okno rekrutacyjne tylko między sezonami (Faza 2)
Wyjątek: zaproszenie przez admina — admin może w trakcie sezonu zaprosić konkretnego usera (Faza 2, wymaga mechaniki invites)

## Architektura zespołów i sezonów (Faza 2):

Liczba zespołów w lidze = leagues.max_teams, ustalane przez admina (już istnieje)
Każdy zawodnik unikalny w lidze (nie może być w 2 zespołach)
User opuszczający ligę = jego zespół zostaje "bezpański" (nazwa + skład zachowane)
Nowy user dołączający w trakcie sezonu = przejmuje bezpański zespół, z opcją zmiany nazwy lub pozostania przy poprzedniej. Skład dziedziczy bez zmian.
Zmiana składu — tylko między sezonami, na drafcie
Sezony per liga, z datami pochodzącymi z kalendarza Ekstraklasy/innej ligi piłkarskiej (Faza 2)

Tabela seasons (league_id, name, starts_at, ends_at, status enum)
Tabela rounds (season_id, round_number, starts_at, ends_at)
Daty wpisuje admin ligi przy konfiguracji sezonu, bo zmieniają się co rok


Migracja z obecnego stanu: tabela teams powstanie w Fazie 2 z istniejących wierszy league_members (active → zajęte, left → bezpańskie). team_name z league_members migrowany do teams.name.

- **Sesja 7 (data: 19.05.2026)** — pełen cykl życia członkostwa, edycja ligi
  - **Etap A: Trigger ostatniego admina** — `prevent_last_admin_removal()` 
    blokuje DELETE i UPDATE prowadzące do "ligi bez aktywnego admina". 
    Pokrywa trzy scenariusze: wyrzucenie admina, demotion (admin→player/mod), 
    self-leave. Komunikat: "Liga musi mieć przynajmniej jednego aktywnego 
    admina" (P0001), z hintem o promocji następcy. Cascade-delete ligi 
    przepuszczany przez sprawdzenie `if not exists (select 1 from leagues...)`.
  - **Etap B: Wyjście z ligi + cancel pending** — Server Action 
    `leaveLeague(leagueId)` z dwoma branchami zależnymi od obecnego statusu:
    - `active` → soft delete (`status='left'`, `left_at=now()`, team_name 
      zachowany do migracji w Fazie 2)
    - `pending` → hard delete wiersza (user może się zgłosić ponownie)
    - Łapanie P0001 z triggera i zamiana na friendly message po polsku
    - `revalidatePath` na `/leagues/[id]` i `/` żeby home page też się odświeżyła
  - **Komponent `LeaveLeagueButton`** (Client) z props `mode='active'|'pending'`:
    - różny tekst confirm i label przycisku
    - czerwony dla `active`, szary dla `pending`
    - useTransition + error state pod przyciskiem
  - **Etap C: Edycja ligi** — `/leagues/[id]/edit` (Server Component → 
    Client Form → Server Action):
    - `updateLeague(leagueId, formData)` — leagueId z URL (nie z FormData,
      security-by-design), walidacja spójna z `createLeague` plus dodatkowo: 
      `maxTeams >= activeCount`
    - `.maybeSingle() + !updated check` jako trzecia warstwa obrony po RLS 
      i page guard
    - Pre-fill formularza z aktualnych wartości, niebieski submit (vs zielony 
      dla create — konwencja kolorystyczna)
    - Przycisk "✏️ Edytuj" w nagłówku ligi, widoczny dla admin/super admin
  
  ### Zmiany w schemie
  - `member_status` enum dodana wartość `'left'`
  - `league_members.left_at timestamptz` (nullable, ustawiane przy wyjściu)
  - Nowa polityka RLS: `league_members self leave or cancel` — pozwala user'owi 
    UPDATE własnego wiersza, ale tylko `status` z `'active'/'pending'` na `'left'`. 
    Inne pola (role, team_name) chronione przez fakt że Server Action robi 
    explicit `update set status='left', left_at=now()` — nie ma jak wstrzyknąć 
    innych pól z UI.
  
  ### Lekcje
  - **Dodanie wartości do enuma w osobnej transakcji** — `ALTER TYPE ADD VALUE` 
    nie pozwala użyć nowej wartości w tej samej transakcji. SQL Editor puszcza 
    każdy bloczek w osobnej transakcji, więc OK; ale uważać przy migracji.
  - **Helpery RLS z sesji 4 same filtrowały `status='active'`** — left user 
    automatycznie wypada z `is_league_member`, nie widzi prywatnych lig, nie 
    moderuje. Nie trzeba było ich ruszać.
  - **Polityki UPDATE w Postgres łączą się OR'em** — defense-in-depth musi być 
    w kodzie aplikacji, nie w samym RLS. Server Action zawsze updateuje 
    explicit pola.
  - **`set local request.jwt.claims` w SQL Editor** — symulacja zalogowanego 
    usera, wymusza RLS. `set local role authenticated` plus claims z `sub` 
    równym user_id. Test w transakcji + rollback nie zostawia śladów.
  - **`.next` to ukryty folder w Windows** (kropka na początku) — niewidoczny 
    w File Explorerze, ale PowerShell go widzi. `Remove-Item -Recurse -Force .next` 
    rozwiązuje "kod jest dobry ale efekt jakby nie był" — Turbopack potrafi 
    trzymać stary build.
  - **PowerShell vs unix `rm -rf`** — w PS to `Remove-Item -Recurse -Force <path>`. 
    Można zrobić alias, ale prościej zapamiętać natywną składnię.
  - **`git log --oneline -5`** przed commitem ratuje sytuację, gdy nie pamiętasz 
    co już jest na origin'ie. Pomaga dobrać sensowną nazwę commitu.

## Architektura zespołów i sezonów (Faza 2) — szkic, NIE wdrażamy w Fazie 1

Decyzje produktowe ustalone w sesji 7, do implementacji w Fazie 2:

- **Liczba zespołów w lidze = `leagues.max_teams`**, ustalane przez admina przy 
  tworzeniu / edycji (już istnieje, działa)
- **Każdy zawodnik unikalny w lidze** — Lewandowski może być tylko w jednym 
  zespole danej ligi
- **User opuszczający ligę = jego zespół zostaje "bezpański"** (nazwa + skład 
  zachowane, status na zespole np. `'orphaned'`)
- **Nowy user dołączający w trakcie sezonu = przejmuje bezpański zespół**:
  - dziedziczy skład (zawodników) bez zmian do końca sezonu
  - może zmienić nazwę zespołu (rename) albo zostawić poprzednią — wybór
- **Zmiana składu — tylko między sezonami, na drafcie**
- **Walkower** — jeśli zespół nie ma składu/użytkownika w dniu meczu, 
  przegrywa walkowerem (system wystawia ostatnią znaną trójkę 
  opuszczającego usera jako "auto-fielding")
- **Brak nowych zgłoszeń podczas trwania sezonu** — okno rekrutacji tylko 
  między sezonami; wyjątek: admin może zaprosić konkretnego usera 
  (wymaga mechaniki invites, jeszcze nie istnieje)
- **Brak powrotu w tym samym sezonie** dla user'a, który wyszedł — egzekwowane 
  przez status `'left'` na `league_members`, admin może zaprosić (Faza 2)

### Sezony per liga, oparte o kalendarz piłkarski

- **Tabela `seasons`** (Faza 2): id, league_id, name ("2025/26"), 
  starts_at date, ends_at date, status enum (`upcoming`/`running`/`finished`)
- **Tabela `rounds`** (Faza 2): id, season_id, round_number, starts_at, ends_at
- **Daty wpisuje admin ligi** przy konfiguracji sezonu, bo zmieniają się co rok 
  (terminarz Ekstraklasy/innej ligi piłkarskiej)
- **Tabela `teams`** powstanie w Fazie 2 — migracja z istniejących wierszy 
  `league_members`:
  - `active` → zespół zajęty (owner = ten user)
  - `left` → zespół bezpański (owner = null, do przejęcia)
  - `team_name` z `league_members` migrowany do `teams.name`

## Backlog (świeże po sesji 7)

- **Super admin widzi "Dołącz do ligi" na cudzej publicznej lidze** — drobny 
  bug/decyzja. Wynika z `!myMembership = true` dla super admina (nie jest 
  formalnym członkiem). Decyzja: czy super admin może świadomie dołączyć do 
  ligi, czy nie (spójność z banerką "Wchodzisz jako super admin platformy"). 
  Naprawka 2-3 linijek w `page.tsx`.
- **Promocja gracza do moderatora** (i symetrycznie demotion mod→player, 
  promote player→admin) — pełna sesja sama w sobie, dużo decyzji projektowych. 
  Sugerowane na sesję 8.
- **Usuwanie ligi** — kosz z confirm, tylko super admin, decyzje cascade 
  (co z left memberami i ich team_name)
- **Email notyfikacja przy akceptacji/odrzuceniu zgłoszenia** — wymaga własnej 
  domeny w Resend (warunek konieczny)
- **Limit free vs premium** — decyzje są, kod nie. Po zaufanych testerach.
- **Auto-cleanup pending przy akceptacji (free plan)** — zależne od limitu 
  free/premium.

## Decyzje produktowe potwierdzone w sesji 7

- **Edycja ligi: max_teams można zmieniać w dół, ale nie poniżej liczby active 
  członków** (komunikat: "Nie możesz ustawić limitu na X, w lidze jest już 
  Y zespołów")
- **Edycja ligi: is_public publiczna ↔ prywatna w dowolnym momencie**. 
  Pending zostają, nikt nie jest wyrzucany, po prostu nowi się nie zgłoszą 
  przy `is_public=false`.
- **Brak walidacji unikalności nazwy ligi po platformie** — ligi identyfikowane 
  przez UUID, nie po nazwie. Decyzję można wprowadzić później.
- **Brak audit log** zmian ligi (na MVP)
- **Wyjście z ligi = soft delete** (status='left'), team_name zachowany 
  do migracji w Fazie 2
- **Cancel pending = hard delete** (user może zgłosić się ponownie)
- **Wyjście jest finalne** — bez powrotu w tym samym sezonie, admin może 
  zaprosić w Fazie 2


  ## Decyzje produktowe — Globalna nawigacja (Faza 6 lub wcześniej)

- **Top bar** (nie sidebar), responsywny mobile-first
- **Logo + nazwa platformy** w lewym rogu → link do `/`
- **Wyszukiwarka lig** w środku top baru — autocomplete po nazwach lig 
  publicznych. Klik wyniku → `/leagues/<uuid>`. 
  Backend: na start prosty `ilike '%query%'` na `leagues.name`, w razie 
  potrzeby później `pg_trgm` lub `tsvector` dla lepszych wyników.
- **Kafelek "Przeglądaj ligi"** → osobna strona `/leagues` (do stworzenia) 
  z listą wszystkich publicznych lig + filtry: nazwa, sezon, status 
  (z wolnymi miejscami / pełne), liczba aktywnych członków. Zastąpi obecną 
  sekcję "Inne ligi publiczne" na home page.
- **Profil + Wyloguj/Zaloguj/Rejestracja** w prawym rogu

### Plan etapowy
- **Sesja 8 (planowana)**: minimal Navbar (Logo / Profil / Wyloguj) 
  jako warm-up, BEZ dropdownów i wyszukiwarki
- **Faza 6** (lub wcześniej): pełna wersja z wyszukiwarką, kafelkiem 
  "Przeglądaj ligi", `/leagues` strona z filtrami, responsywność mobile

### Decyzje do podjęcia przy implementacji
- Co z istniejącymi breadcrumbami "← Wróć" na podstronach po dodaniu 
  globalnej nawigacji? (zostawić / usunąć / zamienić na breadcrumby 
  hierarchiczne)
- Czy wyszukiwarka pokazuje też prywatne ligi, do których user należy? 
  (sugeruję: tak, ale z badge'iem 🔒)
- Mobilność: hamburger menu czy bottom nav?


- **Persystentna nawigacja** (top bar lub sidebar) — Logo, lista lig usera, 
  Profil, Wyloguj/Zaloguj/Rejestracja. Decyzje projektowe: top bar vs sidebar, 
  jak prezentować listę lig (dropdown? quick-switcher?), responsywność mobile, 
  co z breadcrumbami "Wróć" na stronach. Sugerowane: minimal Navbar w sesji 8 
  jako warm-up, pełna wersja w Fazie 6 (Design).
- **Redirect po loginie na `/` zamiast `/profile`** — z zachowaniem `?next=` 
  parameter (sesja 6). Drobiazg, 1-3 linijki.
- **Profil wygląda dziwnie** — kosmetyka, do Fazy 6 (Design) albo wcześniej 
  jeśli zbierze się więcej kosmetyki w backlogu.

  ### Lekcja: synchronizacja sesji Supabase po loginie (App Router + SSR)
  - **Problem:** po `signInWithPassword` (browser client) Navbar w root layoucie
    dalej pokazywał „Zaloguj", dopóki nie zrobiło się twardego refreshu. Występował
    na produkcji (Vercel), bo tam nie ma restartu dev-servera, który lokalnie maskował.
  - **Przyczyna:** sesja zapisana klientowo nie przechodzi przez `proxy.ts` przy
    nawigacji klienckiej (`router.push`/`router.refresh`), więc server-side render
    layoutu nie widzi nowego ciasteczka. NIE jest to problem odczytu sesji ani RLS.
  - **Co NIE zadziałało:** `router.refresh()` po loginie — miękki re-render Server
    Components nie wymusza synchronizacji ciasteczka przez middleware.
  - **Fix:** po udanym loginie `window.location.href = next ?? '/profile'` zamiast
    `router.push` — pełne przeładowanie przechodzi przez `proxy.ts`, sesja się
    synchronizuje, layout renderuje z aktualnym userem. Koszt (moment przeładowania)
    akceptowalny dla ekranu logowania.
  - **Signup:** NIE dotknięty — `confirm email = ON`, po rejestracji user nie jest
    zalogowany (widzi „sprawdź email"), sesja powstaje po aktywacji (ścieżka serwerowa).
  - **Logout:** Server Action + redirect (nawigacja serwerowa) — [potwierdzić na produkcji].

  - **Sesja 8 (data: 22.05.2026)** — globalny Navbar + zarządzanie rolami
  
  ### Etap warm-up: minimalny globalny Navbar
  - `components/navbar.tsx` (w `app/components/`) — Server Component w `layout.tsx`,
    sam czyta sesję (`getUser()`), bez prop-drillingu. Pojawia się na każdej stronie.
  - Logo „⚽ Piłkarzyki" → link na `/`; zalogowany: nick (z `profiles.display_name`,
    fallback na część maila) + czerwony „Wyloguj"; niezalogowany: „Zaloguj" + „Rejestracja"
  - `app/auth/actions.ts` — Server Action `signOut()` (signOut + redirect na `/login`),
    wylogowanie jako `<form action={signOut}>` (bez 'use client')
  - Wylogowanie + Profil usunięte z paska na home page (przejął Navbar);
    został tylko zielony „+ Stwórz ligę". Branch dla niezalogowanego (CTA Zaloguj/
    Zarejestruj) zostaje na landingu.
  - Linki „← Wróć na stronę główną" na podstronach NIE ruszane (decyzja na Fazę 6)
  - Pełna nawigacja (top bar + wyszukiwarka + kafelek „Przeglądaj ligi" + `/leagues`)
    nadal w backlogu na Fazę 6
  
  ### Główny temat: zarządzanie rolami (player / mod / admin)
  - `app/leagues/[id]/role-actions.ts` — Server Action `changeMemberRole(leagueId,
    memberId, newRole)`, zwykły UPDATE (bez RPC/transakcji)
  - `app/leagues/[id]/member-role-controls.tsx` — Client Component, przyciski przy
    liście członków (useTransition + error state pod przyciskiem, window.confirm)
  - `page.tsx`: `select` członków rozszerzony o `id, user_id`; flagi `iAmLeagueAdmin`
    i `canManageRoles` sterują widocznością; brak kontrolek na własnym wierszu (+ „(Ty)")
  
  ### Model ról (kluczowa decyzja produktowa)
  - **Gracz = baza** (każdy aktywny członek ma zespół); **mod i admin to NAKŁADKI**
    uprawnień na grającym członku. Nie ma admina-bez-zespołu ani moda-bez-zespołu.
  - Enum `league_role (admin/mod/player)` ZOSTAJE bez zmian — tylko przeinterpretowany:
    `player` = gracz bez funkcji, `mod` = gracz + moderacja, `admin` = gracz + zarządzanie.
    BEZ migracji schematu.
  - Role nadaje się WYŁĄCZNIE członkom `status='active'`. Nigdy pending, nigdy left.
  
  ### Reguły uprawnień
  - **Admin ligi**: zarządza tylko osią player ↔ mod. Nie tyka adminostwa (ani swojego).
  - **Super admin**: wszystko — nadaje/odbiera admina, player↔mod. Pełna kontrola.
  - **Mod**: grający członek z JEDNYM dodatkiem — akceptacja/odrzucanie zgłoszeń (sesja 6).
    NIE wyrzuca z ligi, NIE zarządza rolami, NIE tyka składów (reguła na Fazę 2/3).
  - Bramka dwupoziomowa w akcji: operacja DOTYKAJĄCA roli admin (nadanie LUB odebranie)
    → wymaga super admina; player↔mod → admin ligi lub super admin.
  
  ### Zmiany w bazie
  - **Wielu adminów na ligę DOZWOLONE** (1..N), zero niedozwolone.
    Index `one_admin_per_league` był założony i ZDJĘTY (`drop index`) — pierwotnie
    miał wymuszać max 1 admina, ale zmieniliśmy decyzję na „wielu adminów OK".
  - Trigger `prevent_last_admin_removal` z sesji 7 ZOSTAJE — blokuje zejście do
    ZERA adminów (degradacja/wyjście ostatniego). Przy wielu adminach degradacja
    jednego przechodzi, bo trigger liczy innych (`user_id <> old.user_id`).
  - To ŚWIADOME uproszczenie pod cel: 2 ligi + rozgrywki Pucharowe. Pełny model
    współwłasności ligi (founder vs admin, transfer, hierarchia) = przyszła przebudowa.
  
  ### Lekcje / dług techniczny (świadomy)
  - **Bramka ról żyje w kodzie akcji, NIE w RLS** — polityka `update by mod or super`
    (sesja 6) na poziomie bazy przepuści UPDATE roli zrobiony przez moda. Modowi
    tego zabrania kod `changeMemberRole`. Dopóki jedyną ścieżką zmiany roli jest ta
    akcja — bezpieczne. Inny endpoint ruszający `role` ominąłby tę bramkę.
  - **Łapanie błędu triggera po TREŚCI komunikatu** (`msg.includes('przynajmniej
    jednego aktywnego admina')`) — kruche. Zmiana treści `raise exception` w triggerze
    wymaga zmiany dopasowania w akcji. (Trigger rzuca domyślny errcode P0001, brak
    własnego kodu do złapania.)
  - **Transfer admina przy „max 1 admin" to pat** dwóch ograniczeń (unique index „nie
    dwóch" vs trigger „nie zero") — wymagałby DEFERRABLE constraint trigger albo RPC
    z flagą. Uniknięte przez decyzję „wielu adminów OK".
  - Navbar w layout.tsx + hot-reload: edycja layoutu przy działającym `npm run dev`
    może renderować stary odczyt sesji. Fix: restart `npm run dev` + twardy refresh.
  - `@theme`/`@import "tailwindcss"` w globals.css → fałszywy błąd wbudowanego CSS-lintera
    VS Code. Fix: `.vscode/settings.json` → `"css.lint.unknownAtRules": "ignore"`.
  
  ### To-do przed publikacją
  - Test braku uprawnień na DRUGIM koncie (zwykły gracz / mod nie widzi kontrolek ról)
    — jeśli nie zrobiony na żywo, sprawdzić przed wpuszczeniem realnych userów.
  - Sprawdzić Navbar + role na produkcji (pilkarzyki-app.vercel.app) po deployu.

## Backlog kosmetyczny (do mini-passa lub Fazy 6)
- Navbar: kolor „Wyloguj" (`bg-red-600/80`) — do dopracowania
- Navbar: nick bez obramowania, wygląda jak goły tekst obok przycisku

- **Sesja 9 (data: 22.05.2026)** — soft delete lig (domknięcie Fazy 1)
  
  ### Co zrobione
  - Kolumna `leagues.status text not null default 'active'` + check constraint
    `(status in ('active','deleted','finished'))`. 'finished' wpisane z góry pod
    Fazę 2 (zakończenie sezonu) — kolumna gotowa, mechanizmu jeszcze NIE ma.
  - `app/leagues/[id]/league-actions.ts` — `deleteLeague` / `restoreLeague` (soft,
    UPDATE status; guard is_super_admin; idempotencja przez .eq('status', ...)).
  - `delete-league-button.tsx` + `restore-league-button.tsx` (klienckie, confirm).
  - `page.tsx` (home): filtr `status='active'` w obu zapytaniach. Twoje ligi przez
    `.eq('leagues.status','active')` (zagnieżdżony filtr PostgREST) — przetestowane,
    znika z obu sekcji.
  - `leagues/[id]/page.tsx`: pobiera `status`; `isSuperAdmin` policzony WCZEŚNIE
    (przed decyzją o 404); usunięta liga → notFound() dla wszystkich poza super
    adminem; super admin widzi banerkę „usunięta" + Przywróć; przycisk Usuń w
    nagłówku (tylko super admin, tylko gdy nie deleted).
  
  ### Decyzje
  - Soft delete zamiast twardego — zachowuje dane pod przyszłe statystyki/historię.
  - Tylko super admin usuwa/przywraca ligi (admin ligi NIE).
  - Usunięta liga: 404 dla zwykłych userów, widoczna dla super admina (przywracanie).
  - Lista usuniętych lig („kosz") NIE robiona — super admin wchodzi bezpośrednim
    linkiem. Pełny panel usuniętych → przyszły panel super admina (Faza 6).
  - Bug „super admin widzi Dołącz" z sesji 7 SKREŚLONY — to nie bug. Super admin
    może dołączać i grać; banerka + panel Dołącz pokazują się celowo razem.
  
  ### Dług techniczny (świadomy)
  - deleteLeague: bramka is_super_admin w KODZIE, nie w RLS — polityka `leagues
    update admin` jest szeroka (admin ligi OR super admin), więc admin ligi mógłby
    technicznie zrobić UPDATE status przez RLS. Blokuje go tylko kod akcji.
  - Filtr `leagues.status` przy zagnieżdżonym zapytaniu (Twoje ligi) bywa kapryśny
    w PostgREST — zabezpieczony dodatkowo przez flatMap (odrzuca null leagues).
  
  ### Faza 1 — STATUS: ZAMKNIĘTA
  Pełny cykl życia ligi: twórz / dołącz / edytuj / wyjdź / role / usuń+przywróć.
  
  ### Backlog (Faza 2+)
  - Email-notyfikacje (wymaga własnej domeny w Resend — warunek konieczny)
  - Zakończenie ligi/sezonu (status 'finished') — Faza 2, po sezonach
  - Zespoły/sezony (teams, seasons, rounds) — Faza 2, główny temat
  - Draft room (pula zawodników, wybór po kolei, Realtime) — Faza 5, po Fazie 2
  - Kosmetyka: kolor Wyloguj, obramowanie nicku Navbar, redirect po loginie na /
  - Test braku uprawnień ról na drugim koncie (jeśli nie zrobiony)