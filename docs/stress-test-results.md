# Stress test results

Five review agents attacked the plan (security, data integrity, food data/OCR, GPS/platform, product/scope). The plan holds up, but there are four real problems to fix before writing code: the **iOS label scanner would send telemetry**, the **encryption key can be lost**, **GPS runs can be lost mid-run**, and the **food data licences** add rules. Scope is the biggest risk overall: the full plan is roughly 31–49 weeks part-time for one person.

Some findings are verified against official docs (linked); others are the agents' own inference and are marked as such.

## Top 10 fixes

| # | Problem | Fix |
| --- | --- | --- |
| 1 | Google ML Kit sends diagnostics/usage data over HTTPS ([Android](https://developers.google.com/ml-kit/android-data-disclosure), [iOS](https://developers.google.com/ml-kit/ios-data-disclosure)); iOS has no internet permission to block it | Use Apple Vision for OCR on iOS; verify "no network" with mitmproxy and the iOS App Privacy Report before claiming it |
| 2 | Losing the encryption key = all data gone (reinstall, Android Auto Backup restoring the DB without its key, biometric changes invalidating keys) | Random 256-bit key in Keystore/Keychain, not tied to biometrics; on decrypt failure show "restore backup or start fresh" instead of crashing; backup reminders |
| 3 | iOS keychain survives uninstall and the default `WHEN_UNLOCKED` setting migrates with backups ([Expo docs](https://docs.expo.dev/versions/latest/sdk/securestore/)) | Use `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`; delete any leftover key on first launch |
| 4 | `allowBackup=false` does not block device-to-device transfer on Android 12+ ([Android docs](https://developer.android.com/identity/data/autobackup)) | Also add `dataExtractionRules` excluding cloud backup and device transfer |
| 5 | Route stored as one JSON blob: a crash or OS kill loses the whole run | `run_points` table, append every 5–10 s in WAL mode; resume unfinished runs on launch |
| 6 | Android OEMs (Samsung, Xiaomi) and Doze kill background tracking ([dontkillmyapp](https://dontkillmyapp.com/samsung)) | Battery-optimisation exemption prompt, SQLite as source of truth, restart task when app returns to foreground |
| 7 | Background location needs a Google Play declaration, video and prominent disclosure ([Play policy](https://support.google.com/googleplay/android-developer/answer/9799150)) | Build the disclosure screen, or distribute via F-Droid/sideload for v1 |
| 8 | NEVO licence: free use only, data unchanged, attribution text required, keep up to date ([RIVM terms](https://www.rivm.nl/sites/default/files/2025-11/Conditions-of-use-NEVO-online-2025-dataset_0.pdf)) | Keep the app free, store NEVO rows untouched in their own table, show "Based on data from NEVO online version 2025/9.0, RIVM, Bilthoven" |
| 9 | Open Food Facts is ODbL share-alike ([OFF data](https://nl-en.openfoodfacts.org/data)) | Separate DB file from NEVO, publish the NL filter script and resulting file under ODbL, attribution with links |
| 10 | Backups from a newer app version imported into an older one corrupt data | Backup header with schema version and checksum; refuse newer schemas; import into a temp DB, validate, then swap |

## Security and privacy

- **Export password can be brute-forced offline** once the file is in a cloud drive or chat. Use Argon2id + AES-GCM and require a long passphrase (or generate a 6-word one).
- **PIN lock only hides the UI**; on a rooted phone it can be bypassed. Fine for v1, but state that rooted/jailbroken devices are out of scope.
- **App-switcher screenshots** show your data. Use `expo-screen-capture` (FLAG\_SECURE) and cover the screen on iOS when the app goes inactive.
- **Camera temp files**: label photos land in the cache folder. Delete them in a `finally` block and clear the cache on launch.
- **CSV export** is plaintext and leaves a cached copy. Warn, delete the temp file, leave GPS out by default.
- **Logs and keyboard**: strip `console.log` from release builds; turn off autocorrect on password fields (inference).
- Crypto-shredding works for the encrypted DB; set `PRAGMA temp_store=MEMORY` so no plaintext temp files are written.

## Data integrity and backups

- **Migrations**: use `PRAGMA user_version`, one transaction per migration, copy the DB file first, test every version path.
- **Dates**: store UTC timestamp + time-zone offset + a `local_date` column, so 23:59 meals, DST and travel land on the right day.
- **Units**: store kg, grams and metres only; convert for display. Remember the entered unit to avoid rounding drift.
- **Reference IDs**: never link logs to reference-DB row ids; use NEVO code or barcode, and keep the copied values.
- **Copy from yesterday tapped twice** creates duplicates: add a copy batch id or undo.
- **Delete-all interrupted**: delete files first, key last; a missing DB means fresh start.
- **Dutch Excel** breaks comma CSV: use semicolons and UTF-8 with BOM.
- **Storage estimate was too low for running**: JSON at 1 point/s is about 250 KB/hour, so roughly 50 MB/year for 4 h running per week. Store points compactly and drop near-duplicate points.

## Food data, barcodes and label scanner

- **Micronutrients will mostly be unknown**: EU rules only allow vitamins/minerals on labels above 15% of the reference value per 100 g ([source](https://www.ruokavirasto.fi/en/foodstuffs/food-sector/food-information/labelling/nutrition-labelling/indication-of-vitamins-and-minerals/)). Show coverage per nutrient ("iron: 62% of logged grams known") instead of one "incomplete" flag.
- **Reference amounts**: use the Gezondheidsraad table by age and sex, mark adequate-intake values, never import a label's %RI column as an amount ([Voedingscentrum](https://voedingscentrum.nl/Assets/Uploads/voedingscentrum/Documents/Factsheet%20vitamines%20en%20mineralen2024.pdf)).
- **OFF data errors**: per serving vs per 100 g, prepared vs as sold, kJ in the kcal field, salt vs sodium, µg vs mg. Import only per-100 g "as sold" fields, recompute kcal from macros and flag >15% differences, reject impossible rows.
- **Barcodes**: normalise UPC-A, UPC-E, EAN-8 and EAN-13 to GTIN-14 with check digit. Allow several matches with a picker; custom foods win.
- **Weighed products** (codes starting 20–29, e.g. cheese at AH) contain price or weight and change per pack ([GS1](https://www.gs1.nl/en/barcodes/article-codes/variable-priceweight-code)). Never save them as a product barcode.
- **OCR layout**: ML Kit returns blocks, so columns can get mixed up. Match rows by position, pick the "per 100 g" column, treat "waarvan" lines as sub-rows, handle decimal commas, "<0,5 g" and "sporen", and multilingual NL/FR/DE labels ([ML Kit guide](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)).
- **Protein powder and gels** are labelled per scoop/sachet: store per 100 g plus named portion sizes.
- **Database size is unverified**: full OFF is about 9 GB uncompressed. Measure the NL subset after keeping only needed columns.

## GPS, running and platform

- **expo-location needs background permission on Android** for background updates ([Expo docs](https://docs.expo.dev/versions/latest/sdk/location.md)). Android 14+ also needs `foregroundServiceType="location"` and the service must start from a user tap ([Android docs](https://developer.android.com/develop/background-work/services/fg-service-types)).
- **iOS stops updates silently** unless the blue location bar is enabled and the user picked "Always". Detect it and send the user to Settings.
- **GPS drift ruins PRs**: drop fixes with accuracy worse than \~20–25 m or speed above \~7–8 m/s, auto-pause when standing still, mark tunnel gaps, only award 5K/10K PRs from clean segments.
- **Blocking INTERNET breaks development builds** (they load code from Metro). Remove it only in a release-only config.
- **Offline OpenStreetMap tiles are forbidden** from the standard tile servers ([OSM policy](https://operations.osmfoundation.org/policies/tiles/)). Use a Protomaps/OpenMapTiles extract (a few hundred MB for NL) or just draw the route with Skia.
- **Battery**: 1-second GPS uses about 8–15%/hour. Offer 1/3/5-second intervals and simplify routes before drawing.
- **App stores** still need a privacy policy, Play Data Safety form and Apple privacy labels, even with no network.

## Product and scope

- **Forgotten PIN must not mean lost data**: the PIN gates the UI only; warn "no recovery" before enabling.
- **Missing gym features users expect**: rest timer (lock-screen notification, vibration), warm-up/drop/failure sets, bodyweight and timed sets, supersets, "same as last time" button, screen kept awake.
- **Unfinished workouts** must survive the app being killed: save every set immediately and resume on launch.
- **Archive exercises instead of deleting** them, so history and PRs survive.
- **Empty states and onboarding**: seed exercise library and a sample template.
- **Accessibility**: text alternatives for graphs, screen-reader labels, Dynamic Type, never colour alone for over/under.
- **Old phones**: FlashList for long lists, cached graph queries, simplified GPS routes.
- Partial deletes can be simplified to "delete by date range" + "delete all".

## Suggested MVP and time estimate

Ship lifting first with the shared core; add food and running as later versions in the same app.

**MVP:** encrypted DB (key in Keystore), optional UI lock, versioned export/import, delete-all, exercises with archiving, templates, logging with last weight prefilled, rest timer, history and editing, PRs, one progress graph per exercise, kg/lb.

| Phase | Estimate (\~10 h/week) |
| --- | --- |
| 1. Database, encryption, lock, export/import, delete | 4–6 weeks |
| 2. Lifting incl. rest timer, set types, graphs, PRs | 6–10 weeks |
| 3. Food: DB import, search, logging, macros/micros | 8–12 weeks |
| 4. Barcode + label scanner | 3–5 weeks |
| 5. Running: background GPS, PRs, store compliance | 6–10 weeks |
| 6. Polish, accessibility, old-phone testing | 4–6 weeks |
| **Total** | **31–49 weeks (MVP: 12–18 weeks)** |

Double the estimates if SQLCipher or native modules are new to you.

## Test plan

### Data and backups

- Upgrade every old schema version to current with seeded data
- Import a newer-version backup (rejected), a truncated one, a wrong-password one: live DB unchanged
- Kill the app during import and during migration: old data still opens
- Simulate key loss and an Auto Backup restore: recovery screen, no crash
- Log at 23:59/00:01 across DST and a time-zone change
- kg → lb → kg round trip with no drift; copy-from-yesterday tapped twice
- Android backup restored on iOS and the other way round
- Seed 2 years of data and 500 runs: diary and history load in under 200 ms

### Food and scanning

- AH and Jumbo store brands, a Belgian NL/FR/DE label, a German-only product
- Protein powder (per scoop), energy gel (per sachet), a 330 ml can (per 100 ml)
- Labels with %RI columns, fortified cereal (µg vs mg), "waarvan" rows, "<0,5 g"/"sporen"
- Curved shiny bottle, small print, horizontal label
- UPC-A US import, EAN-8 small pack, UPC-E, weighed cheese with a 2x code scanned from two packs

### Running (field tests)

- Devices: a Samsung, a Xiaomi/Redmi, a Pixel, an iPhone, plus one old budget phone
- 5K on a measured athletics track (error under 2%)
- 10K with the screen locked in a pocket
- City centre with tall buildings and an underpass (e.g. Nijmegen station area)
- Intervals with five 60-second stops (no phantom distance)
- Start after 2+ days in airplane mode (time to first fix)
- Swipe the app away mid-run; 90 minutes with battery saver on; reboot right after a run
- Log raw GPS fixes to a debug export to replay and tune filters

### Privacy

- Run a release build through mitmproxy and check the iOS App Privacy Report: zero network calls
- Check the APK permission list with `aapt dump permissions`
- Check the cache folder after scanning a label: no photos left
