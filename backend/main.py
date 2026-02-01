from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from PIL import Image
import io
import json
import base64
from datetime import datetime, date, timedelta
from typing import List, Optional
import numpy as np
import cv2
import secrets
import hashlib
import os
import tempfile
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from database import get_db, Student, Attendance, Admin, Institute, DressCode, PasswordResetToken, Holiday
from deepface import DeepFace

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://smart-attendance-system-cyan.vercel.app",
        # "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBasic()

# OTP Configuration
OTP_EXPIRE_MINUTES = 10  # OTP expires in 10 minutes

# SMTP Configuration (Brevo)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_LOGIN = os.getenv("SMTP_LOGIN")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_NAME = os.getenv("SENDER_NAME", "Smart Attendance System")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Helper Functions
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(to_email: str, otp: str, admin_name: str):
    """Send OTP email via SMTP"""
    try:
        print(f"[DEBUG] Preparing to send OTP to: {to_email}")
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Your Password Reset OTP - Smart Attendance System"
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = to_email
        
        # HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #1A1A1A;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background: #FFFFFF;
                    border: 1px solid #D1D1D1;
                    border-radius: 8px;
                    padding: 40px;
                    margin: 20px 0;
                }}
                .logo {{
                    background: #0056D2;
                    color: white;
                    padding: 12px 24px;
                    font-size: 18px;
                    font-weight: 600;
                    display: inline-block;
                    margin-bottom: 24px;
                    border-radius: 6px;
                }}
                h1 {{
                    color: #1A1A1A;
                    font-size: 24px;
                    margin-bottom: 16px;
                }}
                .otp-box {{
                    background: #F0F7FF;
                    border: 2px solid #0056D2;
                    border-radius: 8px;
                    padding: 24px;
                    text-align: center;
                    margin: 24px 0;
                }}
                .otp-code {{
                    font-size: 36px;
                    font-weight: 700;
                    letter-spacing: 8px;
                    color: #0056D2;
                    font-family: 'Courier New', monospace;
                }}
                .warning {{
                    background: #FFF4E6;
                    border: 1px solid #FF8C00;
                    padding: 16px;
                    border-radius: 6px;
                    margin: 24px 0;
                    font-size: 14px;
                }}
                .footer {{
                    color: #8A8A8A;
                    font-size: 13px;
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid #D1D1D1;
                }}
                .highlight {{
                    color: #0056D2;
                    font-weight: 600;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Smart Attendance</div>
                
                <h1>Password Reset OTP</h1>
                
                <p>Hello <strong>{admin_name}</strong>,</p>
                
                <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                
                <div class="otp-box">
                    <div style="color: #666; font-size: 14px; margin-bottom: 8px;">Your OTP Code</div>
                    <div class="otp-code">{otp}</div>
                </div>
                
                <p>Enter this code in the password reset form to create a new password.</p>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    • This OTP will expire in <span class="highlight">10 minutes</span><br>
                    • If you didn't request this reset, please ignore this email<br>
                    • Never share this OTP with anyone<br>
                    • This is a one-time code
                </div>
                
                <div class="footer">
                    <p>This is an automated email from Smart Attendance System.</p>
                    <p>If you have any questions, please contact your system administrator.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Connect to SMTP server and send email
        print(f"[DEBUG] Connecting to SMTP server: {SMTP_SERVER}:{SMTP_PORT}")
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            print(f"[DEBUG] Logging in as: {SMTP_LOGIN}")
            server.login(SMTP_LOGIN, SMTP_PASSWORD)
            
            print(f"[DEBUG] Sending OTP email...")
            server.send_message(message)
        
        print(f"[DEBUG] OTP email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to send OTP email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# [Keep all your existing helper functions: extract_face_encoding, compare_faces, etc.]
def extract_face_encoding(image_bytes):
    """Extract face encoding using DeepFace"""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        print(f"[DEBUG] Image shape: {img.shape}")
        
        embedding = DeepFace.represent(
            img_path=img,
            model_name="Facenet",
            enforce_detection=True
        )
        
        print(f"[DEBUG] Face encoding extracted successfully, length: {len(embedding[0]['embedding'])}")
        
        return json.dumps(embedding[0]["embedding"])
    except Exception as e:
        print(f"[ERROR] Face detection failed: {str(e)}")
        raise Exception(f"Face detection failed: {str(e)}")

def compare_faces(encoding1_str, encoding2_str, threshold=0.6):
    """Compare two face encodings using COSINE SIMILARITY"""
    try:
        enc1 = np.array(json.loads(encoding1_str))
        enc2 = np.array(json.loads(encoding2_str))
        
        from numpy.linalg import norm
        
        cosine_similarity = np.dot(enc1, enc2) / (norm(enc1) * norm(enc2))
        cosine_distance = 1 - cosine_similarity
        
        print(f"[DEBUG] Face comparison - Cosine Distance: {cosine_distance:.4f}, Cosine Similarity: {cosine_similarity:.4f}, Threshold: {threshold}")
        
        is_match = cosine_distance < threshold
        
        return is_match, cosine_distance
    except Exception as e:
        print(f"[ERROR] Face comparison failed: {str(e)}")
        return False, 999

def extract_clothing_features(image_bytes):
    """Extract clothing features using color histograms"""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        img = cv2.resize(img, (224, 224))
        height = img.shape[0]
        upper_body = img[0:int(height * 0.6), :]
        
        hsv = cv2.cvtColor(upper_body, cv2.COLOR_BGR2HSV)
        
        hist_h = cv2.calcHist([hsv], [0], None, [180], [0, 180])
        hist_s = cv2.calcHist([hsv], [1], None, [256], [0, 256])
        hist_v = cv2.calcHist([hsv], [2], None, [256], [0, 256])
        
        hist_h = cv2.normalize(hist_h, hist_h).flatten()
        hist_s = cv2.normalize(hist_s, hist_s).flatten()
        hist_v = cv2.normalize(hist_v, hist_v).flatten()
        
        color_features = np.concatenate([hist_h, hist_s, hist_v])
        
        gray = cv2.cvtColor(upper_body, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges) / edges.size
        
        pixels = upper_body.reshape(-1, 3)
        pixels = np.float32(pixels)
        
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        k = 3
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        
        dominant_colors = centers.astype(int)
        
        return {
            'color_histogram': color_features.tolist(),
            'edge_density': float(edge_density),
            'dominant_colors': dominant_colors.tolist()
        }
        
    except Exception as e:
        print(f"[ERROR] Clothing feature extraction failed: {str(e)}")
        raise Exception(f"Clothing feature extraction failed: {str(e)}")

def compare_clothing(student_features, reference_features, threshold=0.6):
    """Compare clothing features"""
    try:
        student_hist = np.array(student_features['color_histogram'])
        reference_hist = np.array(reference_features['color_histogram'])
        
        color_similarity = cv2.compareHist(
            student_hist.astype(np.float32).reshape(-1, 1),
            reference_hist.astype(np.float32).reshape(-1, 1),
            cv2.HISTCMP_CORREL
        )
        
        color_similarity = (color_similarity + 1) / 2
        
        student_colors = np.array(student_features['dominant_colors'])
        reference_colors = np.array(reference_features['dominant_colors'])
        
        color_distances = []
        for sc in student_colors:
            min_dist = min([np.linalg.norm(sc - rc) for rc in reference_colors])
            color_distances.append(min_dist)
        
        avg_color_distance = np.mean(color_distances) / 255.0
        color_match = 1 - min(avg_color_distance, 1.0)
        
        edge_diff = abs(student_features['edge_density'] - reference_features['edge_density'])
        edge_similarity = 1 - min(edge_diff, 1.0)
        
        overall_similarity = (
            color_similarity * 0.5 +
            color_match * 0.4 +
            edge_similarity * 0.1
        )
        
        is_match = overall_similarity >= threshold
        
        print(f"[DEBUG] Dress code comparison - Similarity: {overall_similarity:.4f}, Threshold: {threshold}")
        
        return is_match, overall_similarity
        
    except Exception as e:
        print(f"[ERROR] Clothing comparison error: {str(e)}")
        return False, 0.0

def verify_dress_code(student_photo_bytes, dress_codes, db: Session):
    """Verify dress code compliance"""
    try:
        if not dress_codes or len(dress_codes) == 0:
            print("[DEBUG] No dress codes defined - auto-passing")
            return True, {"message": "No dress code requirements", "items": []}
        
        print(f"[DEBUG] Checking {len(dress_codes)} dress code items")
        
        student_features = extract_clothing_features(student_photo_bytes)
        
        verification_results = []
        all_matched = True
        
        for dress_code in dress_codes:
            reference_bytes = base64.b64decode(dress_code.image_data)
            reference_features = extract_clothing_features(reference_bytes)
            
            is_match, similarity = compare_clothing(student_features, reference_features, threshold=0.6)
            
            verification_results.append({
                "dress_type": dress_code.dress_type,
                "matched": bool(is_match),
                "confidence": f"{similarity * 100:.1f}%",
                "similarity_score": float(similarity)
            })
            
            if not is_match:
                all_matched = False
        
        return all_matched, {
            "all_items_matched": all_matched,
            "items": verification_results,
            "total_items": len(dress_codes),
            "matched_items": sum(1 for item in verification_results if item["matched"])
        }
        
    except Exception as e:
        print(f"[ERROR] Dress code verification error: {str(e)}")
        return True, {"error": str(e), "message": "Dress code check skipped due to error"}

# API Endpoints

@app.get("/")
def read_root():
    return {"message": "Smart Attendance System Backend with OTP-based Password Reset"}

@app.get("/test")
def test():
    return {"status": "success", "data": "API connected successfully!"}

# [Keep all your existing endpoints: /register-student, /mark-attendance, /admin/register, /admin/login]

@app.post("/register-student")
async def register_student(
    name: str = Form(...),
    roll_number: str = Form(...),
    department: str = Form(...),
    institute_name: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Register a new student"""
    try:
        print(f"\n[DEBUG] === STUDENT REGISTRATION START ===")
        print(f"[DEBUG] Name: {name}, Roll: {roll_number}, Institute: {institute_name}")
        
        contents = await photo.read()
        
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            print(f"[DEBUG] Creating new institute: {institute_name}")
            institute = Institute(name=institute_name)
            db.add(institute)
            db.commit()
            db.refresh(institute)
        
        print(f"[DEBUG] Institute ID: {institute.id}")
        
        existing = db.query(Student).filter(
            Student.roll_number == roll_number,
            Student.institute_id == institute.id
        ).first()
        if existing:
            print(f"[DEBUG] Student already exists!")
            return {
                "status": "error",
                "message": f"Student with roll number {roll_number} already exists!"
            }
        
        print(f"[DEBUG] Extracting face encoding...")
        face_encoding = extract_face_encoding(contents)
        
        new_student = Student(
            name=name,
            roll_number=roll_number,
            department=department,
            institute_id=institute.id,
            face_encoding=face_encoding
        )
        
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        
        print(f"[DEBUG] Student registered successfully! ID: {new_student.id}")
        print(f"[DEBUG] === REGISTRATION COMPLETE ===\n")
        
        return {
            "status": "success",
            "message": "Student registered successfully!",
            "data": {
                "id": new_student.id,
                "name": name,
                "roll_number": roll_number,
                "department": department,
                "institute": institute_name
            }
        }
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Registration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Registration failed: {str(e)}"
        }

@app.get("/check-holiday/{institute_name}")
async def check_if_holiday(
    institute_name: str,
    db: Session = Depends(get_db)
):
    """Check if today is a holiday for given institute"""
    try:
        from datetime import datetime as dt, date as date_type
        
        today = date_type.today()
        day_of_week = today.weekday()  # Monday=0, Sunday=6
        
        # Find institute first
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            return {
                "status": "success",
                "is_holiday": False,
                "reason": "Institute not found, assuming working day",
                "date": today.isoformat(),
                "is_custom": False
            }
        
        # PRIORITY 1: Check if admin has set a custom status for today
        custom_holiday = db.query(Holiday).filter(
            Holiday.institute_id == institute.id,
            Holiday.date == today
        ).first()
        
        if custom_holiday:
            # Admin has overridden default behavior
            print(f"[DEBUG] Custom holiday status found: is_holiday={custom_holiday.is_holiday}, reason={custom_holiday.reason}")
            return {
                "status": "success",
                "is_holiday": custom_holiday.is_holiday,
                "reason": custom_holiday.reason or ("Holiday" if custom_holiday.is_holiday else "Working Day"),
                "date": today.isoformat(),
                "is_custom": True
            }
        
        # PRIORITY 2: Default weekend check (no custom override exists)
        if day_of_week in [5, 6]:  # Saturday=5, Sunday=6
            day_name = "Saturday" if day_of_week == 5 else "Sunday"
            print(f"[DEBUG] Default weekend detected: {day_name}")
            return {
                "status": "success",
                "is_holiday": True,
                "reason": f"Weekend ({day_name})",
                "date": today.isoformat(),
                "is_custom": False
            }
        
        # PRIORITY 3: Regular working day (not weekend, no custom holiday)
        print(f"[DEBUG] Regular working day")
        return {
            "status": "success",
            "is_holiday": False,
            "reason": "Working day",
            "date": today.isoformat(),
            "is_custom": False
        }
        
    except Exception as e:
        print(f"[ERROR] Check holiday failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/admin/register")
async def register_admin(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    institute_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Register a new admin"""
    try:
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            return {
                "status": "error",
                "message": "Admin with this email already exists!"
            }
        
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            institute = Institute(name=institute_name)
            db.add(institute)
            db.commit()
            db.refresh(institute)
        
        new_admin = Admin(
            name=name,
            email=email,
            password=hash_password(password),
            institute_id=institute.id
        )
        
        db.add(new_admin)
        db.commit()
        
        return {
            "status": "success",
            "message": "Admin registered successfully!"
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": f"Registration failed: {str(e)}"
        }

@app.post("/admin/login")
async def admin_login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Admin login"""
    admin = db.query(Admin).filter(Admin.email == email).first()
    
    if not admin or admin.password != hash_password(password):
        return {
            "status": "error",
            "message": "Invalid email or password!"
        }
    
    institute = db.query(Institute).filter(Institute.id == admin.institute_id).first()
    
    return {
        "status": "success",
        "message": "Login successful!",
        "data": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "institute_id": admin.institute_id,
            "institute_name": institute.name if institute else ""
        }
    }

# NEW OTP-BASED PASSWORD RESET ENDPOINTS

@app.post("/admin/send-otp")
async def send_otp(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Send OTP to admin email for password reset"""
    try:
        print(f"\n[DEBUG] === SEND OTP REQUEST ===")
        print(f"[DEBUG] Email: {email}")
        
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            print(f"[DEBUG] Email not found, but returning success message (security)")
            return {
                "status": "success",
                "message": "If an account exists with this email, you will receive an OTP shortly."
            }
        
        print(f"[DEBUG] Admin found: {admin.name}")
        
        # Generate 6-digit OTP
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
        
        # Store OTP in database (reuse PasswordResetToken table, token field stores OTP)
        # Delete any existing unused tokens for this admin
        db.query(PasswordResetToken).filter(
            PasswordResetToken.admin_id == admin.id,
            PasswordResetToken.used == False
        ).delete()
        
        db_token = PasswordResetToken(
            admin_id=admin.id,
            token=otp,  # Store OTP in token field
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()
        
        print(f"[DEBUG] OTP generated: {otp}, expires at: {expires_at}")
        
        # Send OTP via email
        email_sent = send_otp_email(email, otp, admin.name)
        
        if not email_sent:
            print(f"[ERROR] Failed to send OTP email")
            return {
                "status": "error",
                "message": "Failed to send OTP. Please try again later."
            }
        
        print(f"[DEBUG] === OTP SENT SUCCESSFULLY ===\n")
        
        return {
            "status": "success",
            "message": "OTP has been sent to your email address."
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Send OTP failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": "An error occurred. Please try again later."
        }

@app.post("/admin/verify-otp")
async def verify_otp(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    """Verify OTP entered by user"""
    try:
        print(f"\n[DEBUG] === VERIFY OTP ===")
        print(f"[DEBUG] Email: {email}, OTP: {otp}")
        
        # Find admin
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            return {
                "status": "error",
                "message": "Invalid email or OTP!"
            }
        
        # Find OTP token
        db_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.admin_id == admin.id,
            PasswordResetToken.token == otp,
            PasswordResetToken.used == False
        ).first()
        
        if not db_token:
            print(f"[DEBUG] OTP not found or already used")
            return {
                "status": "error",
                "message": "Invalid or expired OTP!"
            }
        
        # Check if OTP is expired
        if datetime.utcnow() > db_token.expires_at:
            print(f"[DEBUG] OTP expired")
            return {
                "status": "error",
                "message": "OTP has expired! Please request a new one."
            }
        
        print(f"[DEBUG] OTP verified successfully")
        print(f"[DEBUG] === OTP VALID ===\n")
        
        return {
            "status": "success",
            "message": "OTP verified successfully!",
            "data": {
                "email": admin.email,
                "name": admin.name
            }
        }
        
    except Exception as e:
        print(f"[ERROR] OTP verification failed: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred. Please try again."
        }

@app.post("/admin/reset-password-with-otp")
async def reset_password_with_otp(
    email: str = Form(...),
    otp: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Reset password using verified OTP"""
    try:
        print(f"\n[DEBUG] === RESET PASSWORD WITH OTP ===")
        print(f"[DEBUG] Email: {email}")
        
        # Find admin
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            return {
                "status": "error",
                "message": "Invalid email or OTP!"
            }
        
        # Find and verify OTP
        db_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.admin_id == admin.id,
            PasswordResetToken.token == otp,
            PasswordResetToken.used == False
        ).first()
        
        if not db_token:
            return {
                "status": "error",
                "message": "Invalid or expired OTP!"
            }
        
        # Check if OTP is expired
        if datetime.utcnow() > db_token.expires_at:
            return {
                "status": "error",
                "message": "OTP has expired! Please request a new one."
            }
        
        # Validate new password
        if len(new_password) < 6:
            return {
                "status": "error",
                "message": "Password must be at least 6 characters long!"
            }
        
        print(f"[DEBUG] Updating password for: {admin.email}")
        
        # Update password
        admin.password = hash_password(new_password)
        
        # Mark OTP as used
        db_token.used = True
        
        db.commit()
        
        print(f"[DEBUG] Password updated successfully")
        print(f"[DEBUG] === PASSWORD RESET COMPLETE ===\n")
        
        return {
            "status": "success",
            "message": "Password reset successful! You can now login with your new password."
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Password reset failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": "An error occurred. Please try again."
        }

# [Keep all other endpoints: /admin/students, /admin/attendance, /admin/dress-code, etc.]

@app.get("/admin/students/{institute_id}")
async def get_students(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get all students for an institute"""
    students = db.query(Student).filter(Student.institute_id == institute_id).all()
    
    return {
        "status": "success",
        "data": [
            {
                "id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "department": s.department
            }
            for s in students
        ]
    }

@app.get("/admin/attendance/{institute_id}/today")
async def get_today_attendance(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get today's attendance for an institute"""
    today = date.today()
    
    attendance_records = db.query(Attendance).join(Student).filter(
        Student.institute_id == institute_id,
        Attendance.date == today
    ).all()
    
    return {
        "status": "success",
        "data": [
            {
                "id": a.id,
                "student_name": a.student.name,
                "roll_number": a.student.roll_number,
                "department": a.student.department,
                "time": a.time.strftime("%H:%M:%S"),
                "status": a.status
            }
            for a in attendance_records
        ]
    }

@app.post("/admin/dress-code/upload")
async def upload_dress_code(
    institute_id: int = Form(...),
    dress_type: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload dress code reference image"""
    try:
        contents = await photo.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        new_dress_code = DressCode(
            institute_id=institute_id,
            dress_type=dress_type,
            image_data=image_base64
        )
        
        db.add(new_dress_code)
        db.commit()
        
        return {
            "status": "success",
            "message": "Dress code uploaded successfully!"
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": f"Upload failed: {str(e)}"
        }

@app.get("/admin/dress-codes/{institute_id}")
async def get_dress_codes(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get all dress codes for an institute"""
    dress_codes = db.query(DressCode).filter(DressCode.institute_id == institute_id).all()
    
    return {
        "status": "success",
        "data": [
            {
                "id": dc.id,
                "dress_type": dc.dress_type,
                "image_data": dc.image_data
            }
            for dc in dress_codes
        ]
    }

@app.delete("/admin/dress-code/{id}")
async def delete_dress_code(
    id: int,
    db: Session = Depends(get_db)
):
    """Delete a dress code"""
    dress_code = db.query(DressCode).filter(DressCode.id == id).first()
    
    if not dress_code:
        return {
            "status": "error",
            "message": "Dress code not found!"
        }
    
    db.delete(dress_code)
    db.commit()
    
    return {
        "status": "success",
        "message": "Dress code deleted successfully!"
    }

# ========== CALENDAR / HOLIDAY MANAGEMENT ==========

@app.get("/holidays/{institute_id}")
async def get_holidays(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get all holidays for an institute"""
    try:
        holidays = db.query(Holiday).filter(Holiday.institute_id == institute_id).all()
        
        return {
            "status": "success",
            "data": [
                {
                    "id": h.id,
                    "date": h.date.isoformat(),
                    "is_holiday": h.is_holiday,
                    "reason": h.reason
                }
                for h in holidays
            ]
        }
    except Exception as e:
        print(f"[ERROR] Get holidays failed: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to fetch holidays: {str(e)}"
        }

@app.post("/admin/toggle-holiday")
async def toggle_holiday(
    institute_id: int = Form(...),
    date: str = Form(...),  # Format: YYYY-MM-DD
    is_holiday: bool = Form(...),
    reason: str = Form(None),
    db: Session = Depends(get_db)
):
    """Toggle a date as holiday/working day"""
    try:
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d").date()
        
        # Check if entry exists
        existing = db.query(Holiday).filter(
            Holiday.institute_id == institute_id,
            Holiday.date == date_obj
        ).first()
        
        if existing:
            # Update existing
            existing.is_holiday = is_holiday
            if reason:
                existing.reason = reason
            message = f"Updated {date} as {'holiday' if is_holiday else 'working day'}"
        else:
            # Create new
            new_holiday = Holiday(
                institute_id=institute_id,
                date=date_obj,
                is_holiday=is_holiday,
                reason=reason
            )
            db.add(new_holiday)
            message = f"Marked {date} as {'holiday' if is_holiday else 'working day'}"
        
        db.commit()
        
        print(f"[DEBUG] {message}")
        
        return {
            "status": "success",
            "message": message
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Toggle holiday failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Failed to update holiday: {str(e)}"
        }

@app.post("/mark-attendance")
async def mark_attendance(
    institute_name: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Mark attendance using face verification"""
    try:
        print(f"\n[DEBUG] === ATTENDANCE MARKING START ===")
        print(f"[DEBUG] Institute: {institute_name}")
        
        contents = await photo.read()
        
        # Find institute
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            print(f"[DEBUG] Institute not found!")
            return {
                "status": "error",
                "message": f"Institute '{institute_name}' not found!"
            }
        
        # ===== PRIORITY-BASED HOLIDAY CHECK =====
        today = date.today()
        day_of_week = today.weekday()  # Monday=0, Sunday=6
        
        print(f"[DEBUG] Today: {today}, Day of week: {day_of_week}")
        
        # PRIORITY 1: Check if admin has set a custom status for today
        custom_holiday = db.query(Holiday).filter(
            Holiday.institute_id == institute.id,
            Holiday.date == today
        ).first()
        
        if custom_holiday:
            # Admin has overridden default behavior
            print(f"[DEBUG] Custom holiday entry found: is_holiday={custom_holiday.is_holiday}")
            
            if custom_holiday.is_holiday:
                # Admin explicitly marked this as a holiday
                reason = custom_holiday.reason or "Holiday"
                print(f"[DEBUG] Attendance blocked - Custom holiday: {reason}")
                return {
                    "status": "error",
                    "message": f"Today is a holiday ({reason}). Attendance marking is disabled."
                }
            else:
                # Admin explicitly marked this as a working day (overrides weekend)
                print(f"[DEBUG] Custom working day - Attendance allowed (weekend override)")
                # Continue to face recognition below
        else:
            # PRIORITY 2: No custom override - apply default weekend rules
            if day_of_week in [5, 6]:  # Saturday=5, Sunday=6
                day_name = "Saturday" if day_of_week == 5 else "Sunday"
                print(f"[DEBUG] Attendance blocked - Default weekend: {day_name}")
                return {
                    "status": "error",
                    "message": f"Today is {day_name}. Attendance marking is disabled on weekends."
                }
            # If not weekend and no custom holiday, continue to face recognition
            print(f"[DEBUG] Regular working day - Attendance allowed")
        
        # ===== END HOLIDAY CHECK =====
        
        print(f"[DEBUG] Extracting face encoding from photo...")
        current_encoding = extract_face_encoding(contents)
        
        students = db.query(Student).filter(Student.institute_id == institute.id).all()
        print(f"[DEBUG] Comparing against {len(students)} registered students...")
        
        matched_student = None
        best_match_distance = 999
        
        for student in students:
            is_match, distance = compare_faces(student.face_encoding, current_encoding)
            
            if is_match and distance < best_match_distance:
                matched_student = student
                best_match_distance = distance
        
        if not matched_student:
            print(f"[DEBUG] No face match found!")
            return {
                "status": "error",
                "message": "Face not recognized! Please register first."
            }
        
        print(f"[DEBUG] Face matched: {matched_student.name} (Distance: {best_match_distance:.4f})")
        
        # Check dress code
        dress_codes = db.query(DressCode).filter(DressCode.institute_id == institute.id).all()
        dress_code_compliant, dress_code_details = verify_dress_code(contents, dress_codes, db)
        
        # Check if already marked today
        existing_attendance = db.query(Attendance).filter(
            Attendance.student_id == matched_student.id,
            Attendance.date == today
        ).first()
        
        if existing_attendance:
            print(f"[DEBUG] Attendance already marked today!")
            return {
                "status": "warning",
                "message": f"Attendance already marked for {matched_student.name} today!",
                "data": {
                    "student": matched_student.name,
                    "roll_number": matched_student.roll_number,
                    "department": matched_student.department,
                    "time": existing_attendance.time.strftime("%H:%M:%S"),
                    "status": existing_attendance.status
                }
            }
        
        # Determine attendance status
        if dress_code_compliant:
            status = "Present"
        else:
            status = "Present - Dress Code Violation"
        
        # Mark attendance
        new_attendance = Attendance(
            student_id=matched_student.id,
            date=today,
            time=datetime.now().time(),
            status=status,
            face_match=True,
            dress_code_match=dress_code_compliant
        )
        
        db.add(new_attendance)
        db.commit()
        
        print(f"[DEBUG] Attendance marked successfully: {status}")
        print(f"[DEBUG] === ATTENDANCE MARKING COMPLETE ===\n")
        
        return {
            "status": "success",
            "message": f"Attendance marked successfully for {matched_student.name}!",
            "data": {
                "student": matched_student.name,
                "roll_number": matched_student.roll_number,
                "department": matched_student.department,
                "match_confidence": f"{(1 - best_match_distance) * 100:.2f}%",
                "status": status,
                "dress_code_compliant": dress_code_compliant,
                "dress_code_details": dress_code_details
            }
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Attendance marking failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Attendance marking failed: {str(e)}"
        }

@app.get("/admin/export-attendance/{institute_id}")
async def export_attendance_excel(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Generate and download Excel attendance report for current month"""
    try:
        print(f"\n[DEBUG] === GENERATING EXCEL REPORT ===")
        print(f"[DEBUG] Institute ID: {institute_id}")
        
        # Get institute name
        institute = db.query(Institute).filter(Institute.id == institute_id).first()
        if not institute:
            raise HTTPException(status_code=404, detail="Institute not found")
        
        # Calculate current month date range
        today = date.today()
        first_day_of_month = date(today.year, today.month, 1)
        
        print(f"[DEBUG] Date range: {first_day_of_month} to {today}")
        
        # Get all students from this institute
        students = db.query(Student).filter(Student.institute_id == institute_id).all()
        
        # Get attendance records for CURRENT MONTH ONLY
        attendance_records = db.query(Attendance).join(Student).filter(
            Student.institute_id == institute_id,
            Attendance.date >= first_day_of_month,
            Attendance.date <= today
        ).order_by(Attendance.date.desc(), Attendance.time.desc()).all()
        
        print(f"[DEBUG] Found {len(students)} students and {len(attendance_records)} attendance records for current month")
        
        # Create Excel file in memory
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            workbook = writer.book
            
            # ===== SHEET 1: FULL ATTENDANCE LOG =====
            if attendance_records:
                attendance_data = []
                for record in attendance_records:
                    attendance_data.append({
                        'Date': record.date.strftime('%Y-%m-%d'),
                        'Day': record.date.strftime('%A'),
                        'Student Name': record.student.name,
                        'Roll Number': record.student.roll_number,
                        'Department': record.student.department,
                        'Time': record.time.strftime('%H:%M:%S'),
                        'Status': record.status,
                        'Face Match': 'Yes' if record.face_match else 'No',
                        'Dress Code': 'Compliant' if record.dress_code_match else 'Violation'
                    })
                
                df_attendance = pd.DataFrame(attendance_data)
            else:
                # Empty dataframe if no records
                df_attendance = pd.DataFrame(columns=[
                    'Date', 'Day', 'Student Name', 'Roll Number', 'Department', 
                    'Time', 'Status', 'Face Match', 'Dress Code'
                ])
            
            df_attendance.to_excel(writer, sheet_name='Attendance Log', index=False)
            
            # Format Sheet 1
            worksheet1 = writer.sheets['Attendance Log']
            
            # Header format
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#3a4a44',
                'font_color': 'white',
                'border': 1,
                'align': 'center',
                'valign': 'vcenter'
            })
            
            # Status formats
            present_format = workbook.add_format({'bg_color': '#c6efce', 'font_color': '#006100'})
            violation_format = workbook.add_format({'bg_color': '#ffc7ce', 'font_color': '#9c0006'})
            
            # Set column widths
            worksheet1.set_column('A:A', 12)  # Date
            worksheet1.set_column('B:B', 12)  # Day
            worksheet1.set_column('C:C', 20)  # Name
            worksheet1.set_column('D:D', 15)  # Roll Number
            worksheet1.set_column('E:E', 15)  # Department
            worksheet1.set_column('F:F', 12)  # Time
            worksheet1.set_column('G:G', 25)  # Status
            worksheet1.set_column('H:H', 12)  # Face Match
            worksheet1.set_column('I:I', 15)  # Dress Code
            
            # Apply header format
            for col_num, value in enumerate(df_attendance.columns.values):
                worksheet1.write(0, col_num, value, header_format)
            
            # ===== SHEET 2: STUDENT SUMMARY (CURRENT MONTH) =====
            student_summary = []
            
            # Get unique working dates in current month from attendance records
            unique_dates = len(set([r.date for r in attendance_records])) if attendance_records else 0
            
            for student in students:
                # Count attendance for this student in current month
                student_attendance = [r for r in attendance_records if r.student_id == student.id]
                total_present = len(student_attendance)
                
                # Count compliant vs violation
                compliant = len([r for r in student_attendance if r.dress_code_match])
                violations = total_present - compliant
                
                # Calculate percentage based on unique working dates
                attendance_percentage = (total_present / unique_dates * 100) if unique_dates > 0 else 0
                
                student_summary.append({
                    'Roll Number': student.roll_number,
                    'Student Name': student.name,
                    'Department': student.department,
                    'Total Present': total_present,
                    'Dress Code Compliant': compliant,
                    'Dress Code Violations': violations,
                    'Attendance %': f"{attendance_percentage:.1f}%"
                })
            
            df_summary = pd.DataFrame(student_summary)
            df_summary.to_excel(writer, sheet_name='Student Summary', index=False)
            
            # Format Sheet 2
            worksheet2 = writer.sheets['Student Summary']
            worksheet2.set_column('A:A', 15)  # Roll Number
            worksheet2.set_column('B:B', 20)  # Name
            worksheet2.set_column('C:C', 15)  # Department
            worksheet2.set_column('D:D', 15)  # Total Present
            worksheet2.set_column('E:E', 20)  # Compliant
            worksheet2.set_column('F:F', 20)  # Violations
            worksheet2.set_column('G:G', 15)  # Percentage
            
            for col_num, value in enumerate(df_summary.columns.values):
                worksheet2.write(0, col_num, value, header_format)
            
            # ===== SHEET 3: DATE-WISE SUMMARY (CURRENT MONTH) =====
            if attendance_records:
                date_summary = {}
                for record in attendance_records:
                    date_str = record.date.strftime('%Y-%m-%d')
                    if date_str not in date_summary:
                        date_summary[date_str] = {
                            'date': record.date,
                            'present': 0,
                            'violations': 0
                        }
                    date_summary[date_str]['present'] += 1
                    if not record.dress_code_match:
                        date_summary[date_str]['violations'] += 1
                
                daily_data = []
                for date_str, data in sorted(date_summary.items(), reverse=True):
                    daily_data.append({
                        'Date': data['date'].strftime('%Y-%m-%d'),
                        'Day': data['date'].strftime('%A'),
                        'Total Present': data['present'],
                        'Dress Code Violations': data['violations'],
                        'Compliant': data['present'] - data['violations']
                    })
                
                df_daily = pd.DataFrame(daily_data)
            else:
                df_daily = pd.DataFrame(columns=['Date', 'Day', 'Total Present', 'Dress Code Violations', 'Compliant'])
            
            df_daily.to_excel(writer, sheet_name='Daily Summary', index=False)
            
            # Format Sheet 3
            worksheet3 = writer.sheets['Daily Summary']
            worksheet3.set_column('A:A', 12)
            worksheet3.set_column('B:B', 12)
            worksheet3.set_column('C:C', 15)
            worksheet3.set_column('D:D', 22)
            worksheet3.set_column('E:E', 15)
            
            for col_num, value in enumerate(df_daily.columns.values):
                worksheet3.write(0, col_num, value, header_format)
        
        # Prepare file for download
        output.seek(0)
        
        # Generate filename with institute name, month, and year
        month_name = today.strftime('%B')  # e.g., "February"
        filename = f"Attendance_{institute.name.replace(' ', '_')}_{month_name}_{today.year}.xlsx"
        
        print(f"[DEBUG] Excel file generated: {filename}")
        print(f"[DEBUG] Date range: {first_day_of_month} to {today}")
        print(f"[DEBUG] === REPORT GENERATION COMPLETE ===\n")
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        print(f"[ERROR] Excel generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
    
@app.delete("/admin/attendance/{institute_id}/clear")
async def clear_all_attendance(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Delete all attendance records for an institute"""
    try:
        print(f"\n[DEBUG] === CLEARING ALL ATTENDANCE ===")
        print(f"[DEBUG] Institute ID: {institute_id}")
        
        # Get all students from this institute
        students = db.query(Student).filter(Student.institute_id == institute_id).all()
        student_ids = [s.id for s in students]
        
        # Delete all attendance records for these students
        deleted_count = db.query(Attendance).filter(
            Attendance.student_id.in_(student_ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        
        print(f"[DEBUG] Deleted {deleted_count} attendance records")
        print(f"[DEBUG] === CLEAR COMPLETE ===\n")
        
        return {
            "status": "success",
            "message": f"Successfully deleted {deleted_count} attendance records!"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Clear attendance failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Failed to clear attendance: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))  # Render provides PORT env variable
    uvicorn.run(app, host="0.0.0.0", port=port)