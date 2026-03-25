# Authentication System Documentation

## Overview
A complete authentication system has been implemented for SyncFlow with login, registration, and session management using a local IndexedDB database.

## Features
- ✅ User Registration with email and password
- ✅ User Login with email and password
- ✅ Password hashing using bcrypt for security
- ✅ Local database storage using IndexedDB (via localforage)
- ✅ Session persistence (users stay logged in after page refresh)
- ✅ Protected routes - users must log in to access app features
- ✅ Logout functionality
- ✅ User info display in sidebar

## Files Created/Modified

### New Files:
1. **src/app/services/database.ts** - Local database service using IndexedDB
2. **src/app/services/authService.ts** - Authentication logic (login, register, session management)
3. **src/app/contexts/AuthContext.tsx** - React context for authentication state
4. **src/app/pages/Login.tsx** - Login page component
5. **src/app/pages/Register.tsx** - Registration page component

### Modified Files:
1. **src/app/App.tsx** - Added AuthProvider wrapper
2. **src/app/routes.ts** - Added login/register routes and protected all app routes
3. **src/app/components/ProtectedRoute.tsx** - Implemented route protection logic
4. **src/app/components/AppLayout.tsx** - Added user info display and logout button

## How It Works

### Database
- Uses **localforage** which wraps IndexedDB for reliable local storage
- Stores user accounts with hashed passwords
- Data persists across browser sessions

### Authentication Flow
1. **First Visit**: User is redirected to `/login`
2. **Registration**: New users can create an account at `/register`
3. **Login**: Users enter credentials to access the app
4. **Session**: Login state persists using localStorage
5. **Protected Routes**: All main app routes require authentication
6. **Logout**: Clears session and redirects to login

### Security
- Passwords are hashed using **bcrypt** (strength: 10 rounds)
- Passwords never stored in plain text
- Minimum password length: 6 characters
- Session data stored in localStorage (client-side only)

## Usage

### Running the App
```bash
npm run dev
```

### First Time Use
1. Navigate to the app in your browser
2. You'll be redirected to the login page
3. Click "Sign up" to create a new account
4. Fill in your details and register
5. You'll be automatically logged in and redirected to the dashboard

### Testing
- Try creating multiple accounts
- Test logout and login with different accounts
- Refresh the page - you should stay logged in
- Try accessing a protected route directly - you'll be redirected to login

## API Reference

### useAuth() Hook
```typescript
const { 
  user,              // Current user object or null
  isAuthenticated,   // Boolean - is user logged in?
  isLoading,         // Boolean - is auth state loading?
  login,             // Function - login with email/password
  register,          // Function - register new user
  logout             // Function - logout current user
} = useAuth();
```

### Example Usage
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Dependencies Added
- **localforage** ^1.10.0 - IndexedDB wrapper for local storage
- **bcryptjs** ^2.4.3 - Password hashing library
- **uuid** ^11.0.5 - Generate unique user IDs
- **@types/bcryptjs** - TypeScript types
- **@types/uuid** - TypeScript types

## Future Enhancements
- Password reset functionality
- Email verification
- OAuth/Social login integration
- Rate limiting for login attempts
- Session timeout
- Password strength requirements
- Two-factor authentication
