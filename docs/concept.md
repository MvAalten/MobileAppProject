# Local-Only Fitness App – Concept

Nov 20, 2026 · @Simon

One free, open-source app for **weightlifting**, **food** and **running** that is **local-only**: no accounts, no servers, no cloud, no analytics and no internet access. Every bit of user data stays encrypted on the phone. Android ships first (Google-free, APKs, GrapheneOS-ready); iOS follows later. The developer can't know who uses it or how many people do, by design.

## Principles

- **Local-only:** the app never connects to the internet; the Android INTERNET permission is removed
- **No Google:** no Play Services, ML Kit, Firebase or Play Store
- **Encrypted:** all personal data in an encrypted database, protected by the phone's keystore
- **No tracking at all:** no analytics, no crash reporting, no user counts
- **Free forever:** no ads, no in-app purchases, no subscription; open source under Apache-2.0 or MIT
- **Your data is portable:** encrypted export file to move phones, delete-all in one tap

## Features

### Weightlifting

- Unlimited custom workouts (templates) and custom exercises, with a seeded exercise library
- Last weight and reps prefilled, plus a "same as last time" button
- Set types: normal, warm-up, drop, failure, bodyweight (± weight), timed and distance sets; supersets
- Rest timer that auto-starts after a set, vibrates and shows on the lock screen
- Every set saved immediately; an unfinished workout resumes after the app is killed
- History, editing past workouts, PRs and a progress graph per exercise
- Copy sets or a whole workout from a previous day
- Exercises are archived, never hard-deleted, so history survives

### Food

- Search the bundled offline food database, plus unlimited custom foods
- **Barcode scanner** (offline) matched against the database
- **Label scanner:** photograph the nutrition label, on-device OCR fills in a form you check and save; unknown barcodes open it automatically
- Meal presets added in one tap; portion sizes (scoop, sachet, piece) besides per 100 g
- **Copy button:** pick items from yesterday (or any day) and add them to today; long-press "Copy to today"
- Daily calorie goal with over/under view
- **Macro tracker** (protein, carbs, fat, fibre) and **micronutrient tracker** (vitamins and minerals) against Dutch recommended amounts by age and sex; both toggleable
- Coverage shown per nutrient ("iron: 62% of logged grams known") because most labels list no micronutrients

### Running

- GPS tracking with distance, pace and time; a "waiting for GPS" state before the start
- Auto-pause when standing still; drift and impossible speeds filtered out
- Best 5K, 10K and other milestones, awarded only from clean GPS segments
- Route drawn on a plain canvas (no online maps); optional offline map extract later
- GPS points saved every few seconds, so a crash or killed app doesn't lose the run

### Settings

- Start screen: Food, Gym or Running
- Show or hide the macro and micronutrient trackers and individual nutrients
- Goals, units (kg/lbs, km/miles), app lock on/off
- Backup reminder ("last export 30 days ago")

## Food and exercise data

All reference data is downloaded once during development, converted to SQLite and shipped inside the app. No APIs, so nothing is a black box.

| Source | Used for | Rules |
| --- | --- | --- |
| NEVO (RIVM) | \~2,300 basic foods with \~130 nutrients | Free to users, data kept unchanged, attribution "Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven", keep up to date |
| Open Food Facts (NL subset) | Branded and barcoded products, incl. protein powder, gels, bars | ODbL: attribution with links; publish the filter script and resulting file |
| free-exercise-db / wger | Exercise library | Text only |
| User entries | Anything missing | Custom foods, incl. label scans |

NEVO and Open Food Facts are kept in separate files and never merged. Import cleans OFF data: per-100 g "as sold" values only, kcal recomputed from macros, impossible rows rejected. Barcodes are normalised to GTIN-14; weighed-product codes (starting 20–29) are never saved as a product barcode.

## Privacy and security

- Personal database encrypted with SQLCipher using a random 256-bit key in the Android Keystore / iOS Keychain (`ThisDeviceOnly`), not tied to biometrics
- PIN or biometric lock gates the app; warning that a lost phone without export means lost data
- Android: INTERNET permission removed in release builds; cloud backup and device transfer excluded via `dataExtractionRules`
- App-switcher screenshots blocked; camera temp files deleted right after scanning; `temp_store=MEMORY`
- No `console.log` in release builds; autocorrect off on password fields
- Only permissions: camera (scanners) and location (running)
- Rooted or jailbroken phones are out of scope, and the docs say so

## Export, import and delete

1. **Export:** one encrypted backup file (Argon2id + AES-GCM) with a long passphrase, saved wherever the user picks.
2. The file has a header with format version, schema version and checksum, and works between Android and iOS.
3. **Import:** decrypted into a temporary database, validated, then swapped in. Backups from a newer app version are refused ("update the app first").
4. **Delete all:** confirmed with PIN + typing DELETE; wipes files, then the key. Also "delete by date range".
5. **CSV export** for spreadsheets, Dutch-Excel friendly, with a warning that it is not encrypted.

## Tech stack

| Part | Android | iOS (later) |
| --- | --- | --- |
| App | React Native, only open-source modules | Same shared code |
| Database | SQLite (`op-sqlite`) + SQLCipher | Same |
| Key storage | Android Keystore | Keychain |
| App lock | BiometricPrompt | Face ID / Touch ID |
| GPS | `LocationManager` + location foreground service | Core Location, "Always" + blue bar |
| Barcode | ZXing / zxing-cpp | AVFoundation / Vision |
| Label OCR | Tesseract | Apple Vision |
| Files | Storage Access Framework | Files / share sheet |

Platform-specific parts sit behind one small interface, so everything else is written once. A Python script builds the reference database.

## Data model

- **Lifting:** `exercises` (with archived flag), `workouts`, `workout_exercises`, `sets` (set type, weight in kg, entered unit)
- **Food:** `foods` (GTIN-14 barcode, source + external key, nullable micronutrients), `portions`, `meal_presets`, `meal_preset_items`, `meals` (with `copy_batch_id`), `nutrient_goals`
- **Running:** `runs` and `run_points` (one row per point batch, written as it arrives)
- **Settings:** start screen, toggles, hidden nutrients, units, last export date
- Every log stores a UTC timestamp, time-zone offset and `local_date`, so late-night meals and travel land on the right day
- Everything stored in kg, grams and metres; converted only for display
- Logs copy their values, so editing a preset or a reference-data update never changes history
- `PRAGMA user_version` + one transaction per migration, with a file copy before migrating

## Phone usage

| Part | Size |
| --- | --- |
| App itself | \~30–50 MB |
| Food database (NL) + Tesseract model | \~40–70 MB (to be measured) |
| Exercise database | \~1–2 MB |
| User data per year (heavy user incl. \~4 h running/week) | \~50–70 MB |

Battery use is near zero for lifting and food; GPS at 1 point per second uses about 8–15% per hour, with 3- and 5-second options to save battery.

## Distribution

1. **GitHub Releases:** signed APKs with checksums; auto-updates through Obtainium.
2. **IzzyOnDroid:** F-Droid-style repo that takes your own APKs; first store to aim for.
3. **Main F-Droid:** later, once the build is fully free software and reproducible.
4. **iOS:** App Store once the \~€99/year developer fee is covered by donations or paid yourself; free for users. Until then, sideload on your own iPhone.

The release signing key is stored offline with a backup; losing it breaks updates. Releases are checked with `aapt dump permissions` and an Exodus Privacy scan (0 trackers), and tested on GrapheneOS with the Network permission off.

## Upsides and downsides

| Upsides | Downsides |
| --- | --- |
| No server to hack, no account to steal | A lost phone without export means lost data |
| No running costs | No sync between devices |
| Works without signal | No social features |
| Strong open-source portfolio project | Food data limited to the bundled set; micronutrients often unknown |
| Fills a real gap: no app combines all three fully offline | Tesseract is less accurate than Google's OCR |
|  | iOS only later; App Store costs the developer money |

## Roadmap

| Phase | Content | Estimate (10 h/week, with Claude) |
| --- | --- | --- |
| 1. Core | Encrypted DB, key handling, app lock, export/import, delete, migrations | 3–4 weeks |
| 2. Lifting | Exercises, templates, set types, rest timer, history, PRs, graphs | 4–6 weeks |
| 3. First release | Signed APK on GitHub + Obtainium, GrapheneOS test, use it yourself | \~1 week |
| 4. Food | Data pipeline, search, custom foods, presets, copy, macros/micros | 5–8 weeks |
| 5. Scanners | ZXing barcodes, Tesseract label scanner | 3–5 weeks |
| 6. Running | GPS service, filtering, PRs, canvas routes, field tests | 5–8 weeks |
| 7. Stores and polish | IzzyOnDroid, F-Droid prep, settings, CSV, accessibility | 3–4 weeks |
| **Android total** |  | **\~24–36 weeks** |
| 8. iOS | Apple frameworks behind the shared interface, App Store | +4–8 weeks |

The MVP (phases 1–3) takes about 8–11 weeks. Aim to finish it before the eindstage starts in February 2027, then decide on food and running based on how people respond (stars, issues, forum replies), not on usage numbers.

## Success without tracking

The app never reports usage. Interest shows up outside it: GitHub release download totals, stars, issues, translations, pull requests, forum replies and donations.

Stress test findings and the full test plan: Stress test results
