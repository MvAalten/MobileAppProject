# Start the app in Expo Go on your phone. Works on Linux, macOS and Windows.
#
#   make            cable if a phone is plugged in, otherwise Wi-Fi
#   make usb        USB cable (needs adb + USB debugging on)
#   make wifi       same Wi-Fi: scan the QR code in Expo Go
#   make tunnel     any network (school / guest Wi-Fi that blocks devices)
#   make web        open in a browser window
#
#   make wifi PHONE=192.168.2.14   also adb-connect that phone and auto-open Expo Go
#   make PORT=8082                 use another Metro port
#
# No make on Windows? Use the same modes via npm: npm run dev, npm run dev:usb, ...

PORT ?= 8081
export PORT
export PHONE

.DEFAULT_GOAL := start
.PHONY: start usb wifi tunnel web install

start: node_modules/.package-lock.json
	node scripts/dev.js auto

usb: node_modules/.package-lock.json
	node scripts/dev.js usb

wifi: node_modules/.package-lock.json
	node scripts/dev.js wifi

tunnel: node_modules/.package-lock.json
	node scripts/dev.js tunnel

web: node_modules/.package-lock.json
	npx expo start --web --port $(PORT)

node_modules/.package-lock.json: package.json
	npm install

install:
	npm install
