# Study Together

A collaborative study accountability app built with React Native and Expo. Study solo or with friends while tracking focus and minimizing phone distractions.

## Features

- 📚 Create study sessions (solo or with study partners)
- ⏱️ Real-time session timer with progress tracking
- 📱 Self-reporting system for phone usage violations
- 🏆 MVP awards for most focused participants
- 📊 Session reports with violation breakdowns
- 📈 User statistics tracking (total hours, sessions, violations)
- 🔥 Real-time sync across all participants

## Tech Stack

- **Framework**: React Native with Expo Router
- **Backend**: Firebase (Authentication & Firestore)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks + Firebase real-time listeners

## Get started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase credentials from [Firebase Console](https://console.firebase.google.com):
   - Go to Project Settings → General
   - Scroll down to "Your apps" section
   - Copy your Firebase config values

3. Update `.env` with your Firebase credentials:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   ```

### 3. Start the app

```bash
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project Structure

```
app/
├── _layout.tsx              # Root layout with auth guard
├── (auth)/
│   └── login.tsx           # Login/signup screen
├── (tabs)/
│   ├── _layout.tsx         # Tab navigation layout
│   ├── HomeScreen.js       # Dashboard with session list
│   ├── CreateSessionScreen.tsx
│   ├── ActiveSessionScreen.js
│   └── SessionReportScreen.js
├── components/             # Reusable components
└── services/
    └── firebase.js         # Firebase configuration & functions
```

## Security

**IMPORTANT**: Never commit your `.env` file to version control!

- `.env` is already in `.gitignore`
- Firebase credentials are loaded from environment variables
- Use `.env.example` as a template for new installations
- Each developer/deployment needs their own `.env` file

## Firestore Database Structure

### Collections

**users**
```javascript
{
  username: string,
  email: string,
  totalHours: number,
  violations: number,
  sessionsCompleted: number,
  createdAt: timestamp
}
```

**sessions**
```javascript
{
  hostId: string,
  participants: [userId1, userId2],
  status: "pending" | "active" | "ended",
  duration: number,  // minutes
  violations: [
    { userId: string, timestamp: string, type: string }
  ],
  startTime: timestamp,
  endTime: timestamp
}
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
