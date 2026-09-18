# Hotspot Chat 📶

A local group chat, private messaging, and image-sharing app that works over a mobile hotspot without requiring mobile data or internet access.

## How It Works

1. One person, the **host**, turns on their mobile hotspot.
2. Everyone else connects to the host's hotspot Wi-Fi. Internet access is not required; the hotspot acts as a local network.
3. The host runs this small server on their phone using Termux.
4. Other users open the host's local IP address in a browser such as Chrome.
5. All chat data stays inside the hotspot network, so the app does not use mobile data or the internet.

## Host Setup: Android + Termux

1. Install Termux from the Play Store or F-Droid. The F-Droid version is usually more up to date.
2. Open Termux and run:

   ```bash
   pkg update -y
   pkg install nodejs -y
   ```

3. Copy the project folder to the phone, for example to `/sdcard/hotspot-chat`, using Google Drive, USB, Bluetooth, or another method. Then run:

   ```bash
   termux-setup-storage
   cp -r /sdcard/hotspot-chat ~/hotspot-chat
   cd ~/hotspot-chat
   npm install
   ```

4. Turn on the mobile hotspot from **Settings > Hotspot & Tethering**.
5. Start the server:

   ```bash
   npm start
   ```

6. The terminal will display an address such as:

   ```text
   http://192.168.43.1:3000
   ```

   Share this address with the other users.

## How Other Users Join

1. Connect to the host's hotspot Wi-Fi.
2. Open Chrome, Firefox, or another browser.
3. Enter the address shown by the host, for example `http://192.168.43.1:3000`.
4. Enter a username and select **Join**.
5. Users can chat in the group, select another online user for a private conversation, and send images using the camera button.

## Features

- Group chat for everyone connected to the hotspot
- One-to-one private messaging
- Image sharing with automatic client-side resizing
- Live online-user list
- Typing indicators
- Fully local operation without internet or mobile data

## Limitations

- If the host turns off the hotspot or stops the server, the chat will stop.
- This is not a cloud service; it only works on the local network.
- Message history is stored only in the browser's memory. Refreshing the page clears the current history.
- The hotspot's device limit varies by phone, usually around 8–10 connected devices.
- Users may lose their connection when they move outside the hotspot's Wi-Fi range.
- There is currently no database or permanent message storage.

## Alternatives to Running Termux on the Host Phone

- Run the same server on an old laptop or desktop and use that computer as the hotspot.
- Build a native Android app in the future so users can chat without opening a browser or manually running Termux.

This version is intended as a lightweight prototype/MVP for testing local hotspot chat.
