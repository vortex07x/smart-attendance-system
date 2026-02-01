# 🎓 Smart Attendance System

An AI-powered attendance management system with **face recognition** and **dress code verification** built for educational institutes.

## ✨ Features

- 🔐 **Face Recognition** - DeepFace with Facenet model for accurate student identification
- 👔 **Dress Code Verification** - ML-based clothing compliance checking
- 📅 **Calendar Management** - Admin-controlled holidays and working days
- 📊 **Excel Reports** - Monthly attendance reports with detailed analytics
- 🏢 **Multi-Institute Support** - Multiple institutes with data isolation
- 🔒 **Admin Authentication** - Secure login with password reset via OTP
- ⚡ **Real-time Processing** - Instant attendance marking with webcam

## 🛠️ Tech Stack

### Frontend
- React.js
- Axios
- react-webcam
- React Toastify

### Backend
- FastAPI (Python)
- DeepFace + Facenet
- TensorFlow
- OpenCV
- PostgreSQL (Supabase)

### ML/AI
- Face Recognition: DeepFace with Facenet
- Dress Code Detection: Color histogram + Edge detection + K-means clustering

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL database (or Supabase account)

### Backend Setup
```bash