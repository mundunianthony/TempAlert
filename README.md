# TempAlert

A cross-platform temperature monitoring and alerting application for storerooms, built with React Native (Expo) and TypeScript. TempAlert provides real-time monitoring, alerting, and management features for both regular users and administrators.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Scripts](#scripts)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview
TempAlert enables organizations to monitor the temperature of storerooms in real time, receive alerts for anomalies, and manage users, rooms, and thresholds. The app supports both real sensor data and simulated (dummy) data for demonstration and testing purposes.

## Features
- **Authentication:** Secure login, registration, and role-based access (user/admin).
- **Dashboard:** Real-time overview of storerooms, current temperatures, and status indicators.
- **Alerts:** Visual and persistent alert logs for temperature anomalies, with severity levels and time-ago formatting.
- **Admin Panel:** User, room, and threshold management, with CRUD operations and role assignment.
- **Dummy Data:** Simulated data for demo/testing, with realistic temperature variations and history.
- **Navigation:** Stack-based navigation with custom Navbar and theming (light/dark mode).
- **Responsive UI:** Mobile-first design, with support for web via Expo.

## Architecture
- **Frontend:** React Native (Expo) with TypeScript.

- **API:** Communicates with a RESTful API (`https://tempalert.onensensy.com/api`).
- **State Management:** React Context for authentication and user state.
- **Storage:** AsyncStorage for persistent local data (user session, dummy data, thresholds, etc.).
- **Testing:** Jest for unit testing.

## Directory Structure
```
TA/
  ├── app/                # Main entry points, navigation, and screens
  │   └── screens/        # User and admin screens (dashboard, alerts, admin panels)
  ├── src/
  │   ├── components/     # Reusable UI components
  │   ├── context/        # Context providers (e.g., AuthContext)
  │   ├── hooks/          # Custom React hooks
  │   ├── utils/          # Utility modules (data fetching, dummy data, thresholds)
  │   └── constants/      # App-wide constants (e.g., color palette)
  ├── functions/          # Firebase Cloud Functions
  ├── scripts/            # Project setup and admin utility scripts
  ├── assets/             # Fonts and images
  ├── package.json        # Project metadata and dependencies
  ├── README.md           # Project documentation
  └── ...
```

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Yarn](https://yarnpkg.com/) or npm

### Installation
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd TA
   ```
2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```
3. **Start the Expo development server:**
   ```sh
   npm start
   # or
   yarn start
   ```
4. **Run on your device or emulator:**
   - For Android: `npm run android`
   - For iOS: `npm run ios`
   - For Web: `npm run web`

### Environment Variables
- The app uses a remote API and may require environment variables for advanced configuration. See `.env.example` if provided, or configure directly in the code as needed.

## Usage
- **Login/Register:** Start the app and log in or register a new account.
- **Dashboard:** View storeroom temperatures and statuses.
- **Alerts:** Monitor active and historical alerts.
- **Admin Panel:** (Admins only) Manage users, rooms, and thresholds.
- **Dummy Data:** The app supports demo rooms with simulated data for testing.

## Scripts
- `npm start` / `yarn start`: Start the Expo development server.
- `npm run android` / `yarn android`: Run the app on Android.
- `npm run ios` / `yarn ios`: Run the app on iOS.
- `npm run web` / `yarn web`: Run the app in the browser.
- `npm run reset-project`: Reset the project state using the provided script.
- `npm run test`: Run unit tests with Jest.
- `npm run lint`: Lint the codebase.

## Testing
- **Jest** is configured for unit testing.
- To run tests:
  ```sh
  npm run test
  # or
  yarn test
  ```

## Contributing
1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with clear messages.
4. Push to your fork and submit a pull request.
5. Ensure your code passes linting and tests.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**TempAlert** — Real-time temperature monitoring and alerting for storerooms.
