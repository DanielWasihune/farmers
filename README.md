# 🌾 AgriAdvisor Backend

AgriAdvisor is a robust, feature-rich backend API built with **Node.js** and **Express.js** to support farmers through data-driven tools, real-time communication, and personalized user experiences. This backend enables farmers to access market prices, and chat with each other securely in real time.

## 🚀 Features

- 🔐 **Secure Authentication System**
  - JWT-based authentication
  - Email-based OTP verification on signup
  - Email welcome message after verification
  - Password reset via OTP or security question
  - Change password functionality

- 📈 **Crop Market Prices**
  - Daily and weekly crop prices
  - Admin-managed crop pricing system
  - Clone prices from previous dates

- 💬 **Real-time Farmer Chat System**
  - Socket.io-powered real-time messaging
  - Online/offline and typing status indicators
  - Profile picture support and user updates

- 👤 **User Profile Management**
  - Upload and update profile information and pictures
  - View user directory (protected)

- 📬 **Feedback System**
  - Collect feedback from users to improve services

## 📦 Tech Stack

- **Node.js + Express.js** – Server framework
- **MongoDB + Mongoose** – Database and ODM
- **Socket.io** – Real-time communication
- **JWT** – Authentication
- **Nodemailer** – Email/OTP delivery
- **Multer** – File uploads (profile pictures)

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone  https://github.com/Daniel-wasihun/ethiopian-farmers
cd ethiopian-farmers
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a .env file in the root directory and configure:

```bash
PORT=8000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PW=your_email_password
```
### 4. Run the App

```bash
nodemon server.js
```
---
## 📡 API Endpoints
### 🧑‍🌾 Auth & Profile
| Endpoint                           | Method | Description                          |
| ---------------------------------- | ------ | ------------------------------------ |
| `/api/auth/signup`                 | POST   | Register a new user                  |
| `/api/auth/verify-otp`             | POST   | Verify email using OTP               |
| `/api/auth/resend-otp`             | POST   | Resend OTP for verification          |
| `/api/auth/signin`                 | POST   | Login with email and password        |
| `/api/auth/change-password`        | POST   | Change password (authenticated)      |
| `/api/auth/reset-password`         | POST   | Reset password using OTP             |
| `/api/auth/request-password-reset` | POST   | Send OTP to email for password reset |
| `/api/auth/verify-security-answer` | POST   | Reset password via security question |
| `/api/auth/set-security-question`  | POST   | Set or update security question      |
| `/api/update-profile`              | POST   | Update user profile and picture      |
| `/api/users`                       | GET    | Get all users (authenticated)        |

### 💬 Messaging
| Endpoint        | Method | Description                                |
| --------------- | ------ | ------------------------------------------ |
| `/api/messages` | GET    | Get messages between two users (real-time) |


### 📈 Crop Prices
| Endpoint                   | Method | Description                          |
| -------------------------- | ------ | ------------------------------------ |
| `/api/prices`              | GET    | Get all crop prices with filters     |
| `/api/prices/crops`        | GET    | Get list of available crops          |
| `/api/prices`              | POST   | Insert new crop price                |
| `/api/prices/batch`        | POST   | Batch insert prices                  |
| `/api/prices/:id`          | PUT    | Update existing price                |
| `/api/prices/:id`          | DELETE | Delete a price                       |
| `/api/prices/delete-batch` | POST   | Delete multiple prices               |
| `/api/prices/clone`        | POST   | Clone prices from one day to another |


### 📢 Feedback
| Endpoint        | Method | Description                      |
| --------------- | ------ | -------------------------------- |
| `/api/feedback` | POST   | Submit user feedback (protected) |

---

## 🧪 Testing
You can test the API using tools like:


- Postman
- Insomnia

## 👨‍💻 Admin Capabilities

- Add, update, or delete crop prices
- Clone previous market price data to new dates
- Moderate feedback and manage users (if extended)

---

### 📬 Contact

Created by **Daniel Wasihun**

- 📧 Email: daniwzgeta@gmail.com 
- 🌐 Website: https://github.com/Daniel-wasihun

---
