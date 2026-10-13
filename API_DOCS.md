# 📖 Backend API Documentation

આ પ્રોજેક્ટની તમામ API માટેનું સત્તાવાર ડોક્યુમેન્ટેશન. તમારી React Native એપ્લિકેશન (`D:\RNApp`) ની તમામ સ્ક્રીન્સ, હેલ્પ/સપોર્ટ અને પુશ નોટિફિકેશન માટેની સંપૂર્ણ APIs અહીં ઉપલબ્ધ છે.

---

## 🌐 Environment & Base URL

* **Development Base URL:** `http://localhost:5000`
* **Default Port:** `5000` (અથવા `.env` ફાઈલમાં દર્શાવેલ પોર્ટ)
* **Default Content-Type:** `application/json`

---

## 📑 API Index

| Category | Method | Endpoint | Screen / Purpose | Status |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | સર્વર & MongoDB Atlas હેલ્થ ચેક | ✅ Active |
| **Auth** | `POST` | `/api/auth/register` | નવું એકાઉન્ટ રજીસ્ટર કરવા (SignupScreen) | ✅ Active |
| **Auth** | `POST` | `/api/auth/login` | યુઝર લોગિન કરવા (LoginScreen) | ✅ Active |
| **Auth** | `POST` | `/api/auth/change-password` | પાસવર્ડ બદલવા (ChangePasswordScreen) | ✅ Active |
| **Auth** | `POST` | `/api/auth/forgot-password` | પાસવર્ડ રીસેટ OTP મેળવવા (ForgotPasswordScreen) | ✅ Active |
| **Auth** | `POST` | `/api/auth/reset-password` | OTP વેરિફાય કરી નવો પાસવર્ડ સેટ કરવા | ✅ Active |
| **User** | `GET` | `/api/user/profile/:userId` | પ્રોફાઇલ ડેટા મેળવવા (ProfileScreen, HomeScreen) | ✅ Active |
| **User** | `PUT` | `/api/user/profile/:userId` | પ્રોફાઇલ એડિટ કરવા (Edit Profile Modal) | ✅ Active |
| **User** | `DELETE` | `/api/user/profile/:userId` | એકાઉન્ટ & ડેટા કાયમી ડિલીટ કરવા (Google Play Compliance) | ✅ Active |
| **User** | `POST` | `/api/user/delete-account-request` | વેબસાઇટ પોર્ટલ પરથી એકાઉન્ટ ડિલીટ રિક્વેસ્ટ | ✅ Active |
| **User** | `GET` | `/api/user/progress/:userId` | લર્નિંગ પ્રોગ્રેસ & ડેઇલી સ્ટ્રીક ફેચ કરવા | ✅ Active |
| **User** | `PUT` | `/api/user/progress/:userId` | કમ્પોનન્ટ કમ્પ્લીશન & સ્ટ્રીક સેવ કરવા | ✅ Active |
| **Quiz** | `POST` | `/api/quiz/result` | પ્રેક્ટિસ ક્વિઝ સ્કોર સેવ કરવા (QuizContext) | ✅ Active |
| **Quiz** | `GET` | `/api/quiz/history/:userId` | સ્કોર હિસ્ટ્રી & એચિવમેન્ટ્સ (AchievementsScreen) | ✅ Active |
| **Support** | `POST` | `/api/support/feedback` | ફીડબેક / સંપર્ક મેસેજ મોકલવા (HelpSupportScreen) | ✅ Active |
| **Support** | `GET` | `/api/support/feedback` | તમામ ફીડબેક લિસ્ટ જોવા (Admin / Support) | ✅ Active |
| **Notification** | `POST` | `/api/notifications/register-token` | મોબાઇલ FCM પુશ ટોકન રજીસ્ટર કરવા | ✅ Active |
| **Notification** | `POST` | `/api/notifications/send` | યુઝરને નોટિફિકેશન મોકલવા / સેવ કરવા | ✅ Active |
| **Notification** | `GET` | `/api/notifications/:userId` | યુઝરના નોટિફિકેશન્સ ફેચ કરવા | ✅ Active |
| **Notification** | `PUT` | `/api/notifications/mark-read/:id` | નોટિફિકેશન રીડ માર્ક કરવા | ✅ Active |
| **Admin** | `GET` | `/api/auth/users` | તમામ યુઝર્સનું લિસ્ટ જોવા | ✅ Active |
| **Web Policy** | `GET` | `/privacy-policy` | પ્રાઇવસી પોલિસી વેબપેજ (Google Play) | ✅ Active |
| **Web Portal** | `GET` | `/delete-account` | એકાઉન્ટ ડિલીશન વેબ પોર્ટલ (Google Play) | ✅ Active |

---

## 🚀 Endpoints Detail

---

### 1. Health Check API
* **Method:** `GET`
* **Endpoint:** `/api/health`
* **Full URL:** `http://localhost:5000/api/health`

#### 🟢 Success Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Backend API is running!",
  "mongodbStatus": "Connected to MongoDB Atlas"
}
```

---

### 2. User Register (SignupScreen)
* **Method:** `POST`
* **Endpoint:** `/api/auth/register`
* **Full URL:** `http://localhost:5000/api/auth/register`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "name": "Alex Patel",
  "email": "alex@example.com",
  "password": "Password123"
}
```

#### 🟢 Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "User registered successfully!",
  "user": {
    "id": "670275819abc1234567890ef",
    "name": "Alex Patel",
    "email": "alex@example.com",
    "createdAt": "2026-10-06T04:10:00.000Z"
  }
}
```

---

### 3. User Login (LoginScreen)
* **Method:** `POST`
* **Endpoint:** `/api/auth/login`
* **Full URL:** `http://localhost:5000/api/auth/login`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "email": "alex@example.com",
  "password": "Password123"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful!",
  "user": {
    "id": "670275819abc1234567890ef",
    "name": "Alex Patel",
    "email": "alex@example.com"
  }
}
```

---

### 4. Change Password (ChangePasswordScreen)
* **Method:** `POST`
* **Endpoint:** `/api/auth/change-password`
* **Full URL:** `http://localhost:5000/api/auth/change-password`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "userId": "670275819abc1234567890ef",
  "oldPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword456"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Password changed successfully!"
}
```

---

### 5. Forgot Password (ForgotPasswordScreen)
* **Method:** `POST`
* **Endpoint:** `/api/auth/forgot-password`
* **Full URL:** `http://localhost:5000/api/auth/forgot-password`

#### 📤 Request Body
```json
{
  "email": "alex@example.com"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Password reset code has been generated.",
  "otp": "489201",
  "expiresIn": "15 minutes"
}
```

---

### 6. Reset Password (નવો પાસવર્ડ સેટ કરવા)
* **Method:** `POST`
* **Endpoint:** `/api/auth/reset-password`
* **Full URL:** `http://localhost:5000/api/auth/reset-password`

#### 📤 Request Body
```json
{
  "email": "alex@example.com",
  "otp": "489201",
  "newPassword": "BrandNewPassword123"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

---

### 7. Get User Profile (ProfileScreen & HomeScreen)
* **Method:** `GET`
* **Endpoint:** `/api/user/profile/:userId`
* **Full URL:** `http://localhost:5000/api/user/profile/670275819abc1234567890ef`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "id": "670275819abc1234567890ef",
    "name": "Alex Patel",
    "email": "alex@example.com",
    "userTitle": "React Native Developer",
    "avatarColor": "#007AFF",
    "streak": 5,
    "completedComponentsCount": 12,
    "completedComponents": ["View", "Text", "FlatList"],
    "createdAt": "2026-10-06T04:10:00.000Z"
  }
}
```

---

### 8. Update User Profile (Edit Profile Modal)
* **Method:** `PUT`
* **Endpoint:** `/api/user/profile/:userId`
* **Full URL:** `http://localhost:5000/api/user/profile/670275819abc1234567890ef`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "name": "Alex Patel",
  "userTitle": "Lead Mobile Architect",
  "avatarColor": "#10B981"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Profile updated successfully!",
  "user": {
    "id": "670275819abc1234567890ef",
    "name": "Alex Patel",
    "email": "alex@example.com",
    "userTitle": "Lead Mobile Architect",
    "avatarColor": "#10B981",
    "streak": 5,
    "completedComponentsCount": 12
  }
}
```

---

### 9. Get Learning Progress & Streak (HomeScreen)
* **Method:** `GET`
* **Endpoint:** `/api/user/progress/:userId`
* **Full URL:** `http://localhost:5000/api/user/progress/670275819abc1234567890ef`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "progress": {
    "streak": 5,
    "lastActiveDate": "2026-10-06",
    "completedCount": 12,
    "completedComponents": ["View", "Text", "FlatList"]
  }
}
```

---

### 10. Update Learning Progress & Streak
* **Method:** `PUT`
* **Endpoint:** `/api/user/progress/:userId`
* **Full URL:** `http://localhost:5000/api/user/progress/670275819abc1234567890ef`

#### 📤 Request Body
```json
{
  "componentName": "Animatedview",
  "streak": 6,
  "lastActiveDate": "2026-10-06"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Progress updated successfully!",
  "progress": {
    "streak": 6,
    "lastActiveDate": "2026-10-06",
    "completedCount": 13,
    "completedComponents": ["View", "Text", "FlatList", "Animatedview"]
  }
}
```

---

### 11. Submit Quiz Result (QuizContext)
* **Method:** `POST`
* **Endpoint:** `/api/quiz/result`
* **Full URL:** `http://localhost:5000/api/quiz/result`

#### 📤 Request Body
```json
{
  "userId": "670275819abc1234567890ef",
  "score": 9,
  "total": 10,
  "topic": "React Native Hooks"
}
```

#### 🟢 Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Quiz result saved successfully!",
  "result": {
    "id": "670281b29abc9876543210ab",
    "score": 9,
    "total": 10,
    "percentage": "90%",
    "topic": "React Native Hooks",
    "date": "2026-10-06T04:45:00.000Z"
  }
}
```

---

### 12. Get Quiz History & Achievements (AchievementsScreen)
* **Method:** `GET`
* **Endpoint:** `/api/quiz/history/:userId`
* **Full URL:** `http://localhost:5000/api/quiz/history/670275819abc1234567890ef`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "summary": {
    "totalQuizzes": 4,
    "bestScore": "100%",
    "averageScore": "88%",
    "unlockedAchievementsCount": 2
  },
  "achievements": [
    {
      "id": "first_quiz",
      "title": "Quiz Starter",
      "description": "Complete your first practice quiz",
      "unlocked": true,
      "icon": "emoji-events"
    }
  ],
  "quizHistory": [
    {
      "_id": "670281b29abc9876543210ab",
      "score": 10,
      "total": 10,
      "topic": "React Native Basics",
      "date": "2026-10-06T04:45:00.000Z"
    }
  ]
}
```

---

### 13. Submit Support & Feedback (HelpSupportScreen)
યુઝર હેલ્પ & સપોર્ટ સ્ક્રીનમાંથી મેસેજ અથવા સજેશન સબમિટ કરે તે સેવ કરવા.

* **Method:** `POST`
* **Endpoint:** `/api/support/feedback`
* **Full URL:** `http://localhost:5000/api/support/feedback`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "userId": "670275819abc1234567890ef",
  "name": "Alex Patel",
  "email": "alex@example.com",
  "subject": "App Query / Suggestion",
  "message": "I really love the React Native course! Could you add more animation tutorials?"
}
```

#### 🟢 Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Feedback submitted successfully! Our team will get back to you soon.",
  "feedbackId": "670295abc1234567890fa123",
  "createdAt": "2026-10-06T05:25:00.000Z"
}
```

---

### 14. Get All Feedbacks (Admin / Support View)
* **Method:** `GET`
* **Endpoint:** `/api/support/feedback`
* **Full URL:** `http://localhost:5000/api/support/feedback`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "totalFeedback": 1,
  "feedbacks": [
    {
      "_id": "670295abc1234567890fa123",
      "name": "Alex Patel",
      "email": "alex@example.com",
      "subject": "App Query / Suggestion",
      "message": "I really love the React Native course!",
      "status": "pending",
      "createdAt": "2026-10-06T05:25:00.000Z"
    }
  ]
}
```

---

### 15. Register Push Notification FCM Device Token
યુઝરના મોબાઇલ ડિવાઇસનો FCM Push Token સેવ કરવા.

* **Method:** `POST`
* **Endpoint:** `/api/notifications/register-token`
* **Full URL:** `http://localhost:5000/api/notifications/register-token`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "userId": "670275819abc1234567890ef",
  "fcmToken": "fcm_device_token_xyz_sample_token_here_12345"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "FCM push device token registered successfully!"
}
```

---

### 16. Send Notification / Reminder
યુઝરને નોટિફિકેશન મોકલવા અને ઇન-એપ સેવ કરવા (દા.ત. Streak Reminder, Achievement).

* **Method:** `POST`
* **Endpoint:** `/api/notifications/send`
* **Full URL:** `http://localhost:5000/api/notifications/send`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body (Single User)
```json
{
  "userId": "670275819abc1234567890ef",
  "title": "🔥 Maintain Your Streak!",
  "message": "You are on a 5-day streak! Complete today's quiz to keep it going.",
  "type": "streak"
}
```
*(નોંધ: જો `userId` ન મોકલો તો આ નોટિફિકેશન બધા યુઝર્સને બ્રોડકાસ્ટ થઈ જશે).*

#### 🟢 Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Notification sent successfully!",
  "hasFcmToken": true,
  "notification": {
    "_id": "670299abc1234567890fa789",
    "userId": "670275819abc1234567890ef",
    "title": "🔥 Maintain Your Streak!",
    "message": "You are on a 5-day streak! Complete today's quiz to keep it going.",
    "type": "streak",
    "isRead": false,
    "createdAt": "2026-10-06T05:27:00.000Z"
  }
}
```

---

### 17. Get User Notifications
યુઝરના તમામ નોટિફિકેશન્સ અને ન વાંચેલા નોટિફિકેશન્સની સંખ્યા મેળવવા.

* **Method:** `GET`
* **Endpoint:** `/api/notifications/:userId`
* **Full URL:** `http://localhost:5000/api/notifications/670275819abc1234567890ef`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "unreadCount": 1,
  "totalCount": 1,
  "notifications": [
    {
      "_id": "670299abc1234567890fa789",
      "title": "🔥 Maintain Your Streak!",
      "message": "You are on a 5-day streak! Complete today's quiz to keep it going.",
      "type": "streak",
      "isRead": false,
      "createdAt": "2026-10-06T05:27:00.000Z"
    }
  ]
}
```

---

### 18. Mark Notification as Read
* **Method:** `PUT`
* **Endpoint:** `/api/notifications/mark-read/:notificationId`
* **Full URL:** `http://localhost:5000/api/notifications/mark-read/670299abc1234567890fa789`

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Notification marked as read.",
  "notification": {
    "_id": "670299abc1234567890fa789",
    "isRead": true
  }
}
```

---

### 19. Hard Delete User Account & All Associated Data (Google Play Compliance)
* **Method:** `DELETE`
* **Endpoint:** `/api/user/profile/:userId`
* **Full URL:** `http://localhost:5000/api/user/profile/670275819abc1234567890ef`
* **Description:** વપરાશકર્તાનું એકાઉન્ટ, લર્નિંગ પ્રોગ્રેસ (completedComponents, streak, screenTime), ક્વિઝ હિસ્ટ્રી, નોટિફિકેશન્સ અને પ્રોફાઇલ ફોટો સર્વર અને ડેટાબેઝમાંથી કાયમ માટે (Hard Delete) ડિલીટ કરે છે.

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Account, learning progress, quiz history, and profile photo have been permanently deleted from our servers.",
  "details": {
    "userId": "670275819abc1234567890ef",
    "email": "alex@example.com",
    "deletedFromDatabase": true,
    "deletedFromLocalStorage": true,
    "cleanedData": [
      "User credentials & profile data",
      "Completed component progress & streaks",
      "Practice quiz results & achievements",
      "Screen time analytics",
      "Device push notification tokens",
      "Profile picture & avatar preferences"
    ]
  }
}
```

---

### 20. Web Account Deletion Request
* **Method:** `POST`
* **Endpoint:** `/api/user/delete-account-request`
* **Full URL:** `http://localhost:5000/api/user/delete-account-request`
* **Headers:** `Content-Type: application/json`

#### 📤 Request Body
```json
{
  "email": "alex@example.com",
  "reason": "Completed the course"
}
```

#### 🟢 Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Your RN Master Class account and all associated data have been permanently deleted from our servers.",
  "email": "alex@example.com",
  "deleted": true
}
```

---

### 21. Web Compliance Pages
* **Privacy Policy:** `http://localhost:5000/privacy-policy` (અથવા `https://rnmasterclass.pages.dev/privacy-policy`)
* **Delete Account Portal:** `http://localhost:5000/delete-account` (અથવા `https://rnmasterclass.pages.dev/delete-account`)

