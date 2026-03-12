# Healthcare Appointment Booking System - Backend

A robust REST API for managing healthcare appointments with role-based authentication (Patient & Staff).

## 🚀 Features

- **User Authentication**
  - JWT-based authentication
  - Role-based access control (Patient/Staff)
  - Secure password hashing with bcrypt

- **Patient Features**
  - Register and login
  - Book appointments
  - View personal appointments
  - Cancel appointments

- **Staff Features**
  - Login
  - View all appointments
  - Update appointment status (pending → confirmed → completed)
  - Filter appointments by status

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**

   The `.env` file is already created with default values. Update these before production:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/healthcare
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:8081,http://localhost:19006
   ```

3. **Start MongoDB:**

   Make sure MongoDB is running on your system:
   ```bash
   # On Windows (if MongoDB is installed as a service)
   net start MongoDB

   # On macOS/Linux
   mongod
   ```

4. **Create a staff user (for testing):**
   ```bash
   node scripts/seedStaff.js
   ```

   This creates a staff account:
   - Email: `staff@healthcare.com`
   - Password: `staff123`

## 🎯 Running the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. Register Patient
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65f1234567890abcdef12345",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "patient"
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff@healthcare.com",
  "password": "staff123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65f1234567890abcdef12345",
    "fullName": "Healthcare Staff",
    "email": "staff@healthcare.com",
    "phone": "+1234567890",
    "role": "staff"
  }
}
```

#### 3. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Appointment Endpoints

#### 1. Create Appointment (Patient Only)
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorName": "Dr. Sarah Wilson",
  "specialty": "Cardiology",
  "date": "2025-03-20",
  "time": "10:00",
  "reason": "Annual heart checkup"
}
```

#### 2. Get My Appointments (Patient Only)
```http
GET /api/appointments/my
Authorization: Bearer <token>
```

#### 3. Get All Appointments (Staff Only)
```http
GET /api/appointments
Authorization: Bearer <token>

# Optional: Filter by status
GET /api/appointments?status=pending
```

#### 4. Update Appointment Status (Staff Only)
```http
PATCH /api/appointments/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

Valid statuses: `pending`, `confirmed`, `completed`, `cancelled`

#### 5. Cancel Appointment
```http
DELETE /api/appointments/:id
Authorization: Bearer <token>
```

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The token is returned after successful login or registration.

## 👥 User Roles

### Patient
- Can register new accounts
- Can book appointments
- Can view their own appointments
- Can cancel their own appointments

### Staff
- Cannot register (created manually/seeded)
- Can view all appointments
- Can update appointment statuses
- Can filter appointments by status

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── appointmentController.js  # Appointment logic
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User model
│   └── Appointment.js       # Appointment model
├── routes/
│   ├── auth.js              # Auth routes
│   └── appointments.js      # Appointment routes
├── scripts/
│   └── seedStaff.js         # Create test staff user
├── .env                     # Environment variables
├── server.js                # Main application file
└── package.json             # Dependencies
```

## 🧪 Testing

You can test the API using:
- Postman
- Thunder Client (VS Code extension)
- curl
- Your frontend application

### Sample Test Flow:

1. **Register a patient:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"fullName":"Test Patient","email":"test@example.com","phone":"1234567890","password":"test123"}'
   ```

2. **Login as patient:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

3. **Book an appointment (use token from login):**
   ```bash
   curl -X POST http://localhost:3000/api/appointments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"doctorName":"Dr. Smith","specialty":"General","date":"2025-03-20","time":"10:00","reason":"Checkup"}'
   ```

## 🔧 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check the `MONGODB_URI` in `.env`
- Verify MongoDB is accessible on the specified port

### Port Already in Use
- Change the `PORT` in `.env`
- Kill the process using port 3000:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F

  # macOS/Linux
  lsof -ti:3000 | xargs kill
  ```

### CORS Errors
- Update `CORS_ORIGIN` in `.env` with your frontend URL
- Ensure frontend is making requests to `http://localhost:3000`

## 📝 Notes

- Change `JWT_SECRET` before deploying to production
- Update default staff password after first login
- Enable MongoDB authentication in production
- Use environment-specific `.env` files

## 🚀 Recent Enhancements (v1.0.0)

### Security Improvements ✅
- **Strong JWT Secret**: Generated 128-character cryptographically secure secret
- **Environment Validation**: Server validates all required env vars on startup
- **Rate Limiting**: Three-tier protection (General: 100/15min, Auth: 10/15min, OTP: 3/min)
- **Token Expiration**: Automatic logout on expired tokens
- **Date Validation**: Only future dates allowed for appointments
- **Profile Requirement**: Users must complete profile before booking

### Performance Enhancements ✅
- **Database Indexes**: 5 compound indexes for faster queries (10-100x improvement)
- **Connection Retry**: 5 attempts with 5-second delays on MongoDB failure
- **TTL Index**: Automatic cleanup of expired OTP records

### New Features ✅
- **Health Check Endpoint**: `GET /health` for monitoring
- **Centralized Constants**: `config/constants.js` for app-wide values
- **Environment Template**: `.env.example` for easy setup

### Files Created
- `config/validateEnv.js` - Validates environment variables
- `config/constants.js` - Centralized configuration
- `middleware/rateLimiter.js` - Rate limiting middleware
- `.env.example` - Environment template
- `../ENHANCEMENTS.md` - Detailed documentation
- `../FIXES_SUMMARY.md` - Quick fixes summary

### New API Endpoint
```http
GET /health
# Returns server status, uptime, and database connection state
```

### Breaking Changes ⚠️
- **JWT_SECRET Changed**: Existing tokens invalidated (users must re-login)
- **Past Dates Rejected**: Appointments can only be created for today or future
- **Profile Required**: Users must complete profile before booking appointments

For complete details, see:
- `../ENHANCEMENTS.md` - Comprehensive list of all improvements
- `../FIXES_SUMMARY.md` - Quick summary of fixes

## 🤝 Support

For issues or questions, please check the main project README or contact the development team.
