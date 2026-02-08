from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
import io
import json
import base64
from datetime import datetime, date, timedelta
from typing import List, Optional
import secrets
import hashlib
import os
import random
import string
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import httpx

from database import get_db, Student, Attendance, Admin, Institute, DressCode, PasswordResetToken, Holiday

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://smart-attendance-system-cyan.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {"message": "OK"}

security = HTTPBasic()

# Configuration
OTP_EXPIRE_MINUTES = 10
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "ecommtest07@gmail.com")
SENDER_NAME = os.getenv("SENDER_NAME", "Smart Attendance System")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "https://unkillableronin-smart-attendance-ml.hf.space")

# ========== ML SERVICE CLIENT ==========

async def call_ml_service(endpoint: str, data: dict) -> dict:
    """Call ML service on Hugging Face"""
    try:
        print(f"[DEBUG] Calling ML service: {endpoint}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}{endpoint}",
                json=data
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"[DEBUG] ML service response: {result.get('status', 'unknown')}")
            return result
            
    except httpx.TimeoutException:
        print(f"[ERROR] ML service timeout")
        raise HTTPException(
            status_code=504,
            detail="ML service is taking too long. Please try again."
        )
    except httpx.HTTPError as e:
        print(f"[ERROR] ML service HTTP error: {e}")
        raise HTTPException(
            status_code=503,
            detail="ML service is currently unavailable. Please try again later."
        )
    except Exception as e:
        print(f"[ERROR] ML service error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"ML service error: {str(e)}"
        )

async def extract_face_encoding(image_bytes: bytes) -> str:
    """Extract face encoding via ML service"""
    try:
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        result = await call_ml_service("/extract-face", {
            "image_base64": image_base64
        })
        
        if result["status"] == "error":
            raise Exception(result["message"])
        
        return result["face_encoding"]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Face extraction failed: {str(e)}")
        raise Exception(f"Face detection failed: {str(e)}")

async def compare_faces(encoding1_str: str, encoding2_str: str, threshold: float = 0.6) -> tuple:
    """Compare two face encodings via ML service"""
    try:
        result = await call_ml_service("/compare-faces", {
            "encoding1": encoding1_str,
            "encoding2": encoding2_str,
            "threshold": threshold
        })
        
        if result["status"] == "error":
            return False, 999
        
        return result["is_match"], result["distance"]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Face comparison failed: {str(e)}")
        return False, 999

async def extract_clothing_features(image_bytes: bytes) -> dict:
    """Extract clothing features via ML service"""
    try:
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        result = await call_ml_service("/extract-clothing", {
            "image_base64": image_base64
        })
        
        if result["status"] == "error":
            raise Exception(result["message"])
        
        return result["features"]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Clothing extraction failed: {str(e)}")
        raise Exception(f"Clothing feature extraction failed: {str(e)}")

async def compare_clothing(student_features: dict, reference_features: dict, threshold: float = 0.6) -> tuple:
    """Compare clothing features via ML service"""
    try:
        result = await call_ml_service("/compare-clothing", {
            "student_features": student_features,
            "reference_features": reference_features,
            "threshold": threshold
        })
        
        if result["status"] == "error":
            return False, 0.0
        
        return result["is_match"], result["similarity"]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Clothing comparison failed: {str(e)}")
        return False, 0.0

async def verify_dress_code(student_photo_bytes: bytes, dress_codes, db: Session) -> tuple:
    """Verify dress code compliance via ML service"""
    try:
        if not dress_codes or len(dress_codes) == 0:
            print("[DEBUG] No dress codes defined - auto-passing")
            return True, {"message": "No dress code requirements", "items": []}
        
        print(f"[DEBUG] Checking {len(dress_codes)} dress code items")
        
        student_features = await extract_clothing_features(student_photo_bytes)
        
        verification_results = []
        all_matched = True
        
        for dress_code in dress_codes:
            reference_bytes = base64.b64decode(dress_code.image_data)
            reference_features = await extract_clothing_features(reference_bytes)
            
            is_match, similarity = await compare_clothing(student_features, reference_features, threshold=0.6)
            
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
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Dress code verification error: {str(e)}")
        return True, {"error": str(e), "message": "Dress code check skipped due to error"}

# ========== HELPER FUNCTIONS ==========

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email_via_brevo(to_email: str, otp: str, admin_name: str):
    """Send OTP email via Brevo API"""
    try:
        print(f"[DEBUG] Preparing to send OTP via Brevo API to: {to_email}")
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = BREVO_API_KEY
        
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
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
                    background: linear-gradient(135deg, #2d3d37 0%, #3a4a44 100%);
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
                    background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
                    border: 2px solid #3a4a44;
                    border-radius: 8px;
                    padding: 24px;
                    text-align: center;
                    margin: 24px 0;
                }}
                .otp-code {{
                    font-size: 36px;
                    font-weight: 700;
                    letter-spacing: 8px;
                    color: #2d3d37;
                    font-family: 'Courier New', monospace;
                }}
                .warning {{
                    background: #FFF4E6;
                    border: 1px solid #d4a574;
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
                    color: #d4a574;
                    font-weight: 600;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🎓 Smart Attendance</div>
                
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
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": admin_name}],
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            subject="Your Password Reset OTP - Smart Attendance System",
            html_content=html_content
        )
        
        print(f"[DEBUG] Sending email via Brevo API...")
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"[DEBUG] Brevo API Response: {api_response}")
        print(f"[DEBUG] OTP email sent successfully to {to_email}")
        
        return True
        
    except ApiException as e:
        print(f"[ERROR] Brevo API Exception: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to send OTP email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ========== API ENDPOINTS ==========

@app.get("/")
def read_root():
    return {
        "message": "Smart Attendance System Backend - Microservices Architecture",
        "version": "2.0",
        "ml_service": ML_SERVICE_URL
    }

@app.api_route("/test", methods=["GET", "HEAD"])
def test(request: Request):
    return {"status": "success", "data": "API connected successfully!"}

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
        print(f"[DEBUG] Name: {name}, Roll: {roll_number}")
        
        contents = await photo.read()
        
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            institute = Institute(name=institute_name)
            db.add(institute)
            db.commit()
            db.refresh(institute)
        
        existing = db.query(Student).filter(
            Student.roll_number == roll_number,
            Student.institute_id == institute.id
        ).first()
        if existing:
            return {
                "status": "error",
                "message": f"Student with roll number {roll_number} already exists!"
            }
        
        # Call ML service for face encoding
        face_encoding = await extract_face_encoding(contents)
        
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
        
        print(f"[DEBUG] Student registered successfully!")
        
        return {
            "status": "success",
            "message": "Student registered successfully!",
            "data": {
                "id": new_student.id,
                "name": name,
                "roll_number": roll_number
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Registration failed: {str(e)}")
        return {
            "status": "error",
            "message": f"Registration failed: {str(e)}"
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

# ========== OTP-BASED PASSWORD RESET ==========

@app.post("/admin/send-otp")
async def send_otp(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Send OTP to admin email via Brevo API"""
    try:
        print(f"\n[DEBUG] === SEND OTP REQUEST ===")
        print(f"[DEBUG] Email: {email}")
        
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            print(f"[DEBUG] Email not found (returning generic message)")
            return {
                "status": "success",
                "message": "If an account exists with this email, you will receive an OTP shortly."
            }
        
        print(f"[DEBUG] Admin found: {admin.name}")
        
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
        
        db.query(PasswordResetToken).filter(
            PasswordResetToken.admin_id == admin.id,
            PasswordResetToken.used == False
        ).delete()
        
        db_token = PasswordResetToken(
            admin_id=admin.id,
            token=otp,
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()
        
        print(f"[DEBUG] OTP: {otp}, expires: {expires_at}")
        
        email_sent = send_otp_email_via_brevo(email, otp, admin.name)
        
        if not email_sent:
            return {
                "status": "error",
                "message": "Failed to send OTP. Please try again later."
            }
        
        print(f"[DEBUG] === OTP SENT ===\n")
        
        return {
            "status": "success",
            "message": "OTP has been sent to your email address."
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Send OTP failed: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred. Please try again."
        }

@app.post("/admin/verify-otp")
async def verify_otp(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db)
):
    """Verify OTP"""
    try:
        print(f"\n[DEBUG] === VERIFY OTP ===")
        print(f"[DEBUG] Email: {email}, OTP: {otp}")
        
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            return {
                "status": "error",
                "message": "Invalid email or OTP!"
            }
        
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
        
        if datetime.utcnow() > db_token.expires_at:
            return {
                "status": "error",
                "message": "OTP has expired! Please request a new one."
            }
        
        print(f"[DEBUG] OTP verified")
        
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
            "message": "An error occurred."
        }

@app.post("/admin/reset-password-with-otp")
async def reset_password_with_otp(
    email: str = Form(...),
    otp: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Reset password using OTP"""
    try:
        print(f"\n[DEBUG] === RESET PASSWORD ===")
        
        admin = db.query(Admin).filter(Admin.email == email).first()
        
        if not admin:
            return {
                "status": "error",
                "message": "Invalid email or OTP!"
            }
        
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
        
        if datetime.utcnow() > db_token.expires_at:
            return {
                "status": "error",
                "message": "OTP has expired!"
            }
        
        if len(new_password) < 6:
            return {
                "status": "error",
                "message": "Password must be at least 6 characters!"
            }
        
        admin.password = hash_password(new_password)
        db_token.used = True
        
        db.commit()
        
        print(f"[DEBUG] Password reset successful")
        
        return {
            "status": "success",
            "message": "Password reset successful! You can now login."
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Password reset failed: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred."
        }

# ========== OTHER ENDPOINTS ==========

@app.get("/check-holiday/{institute_name}")
async def check_if_holiday(
    institute_name: str,
    db: Session = Depends(get_db)
):
    """Check if today is a holiday - FIXED VERSION"""
    try:
        today = date.today()
        day_of_week = today.weekday()
        
        print(f"\n[DEBUG] === CHECK HOLIDAY ===")
        print(f"[DEBUG] Institute name: '{institute_name}'")
        print(f"[DEBUG] Today: {today} ({['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day_of_week]})")
        
        # Find institute (case-insensitive)
        institute = db.query(Institute).filter(
            Institute.name.ilike(institute_name.strip())
        ).first()
        
        if not institute:
            print(f"[DEBUG] Institute not found - checking default weekend")
            is_weekend_default = day_of_week in [5, 6]
            return {
                "status": "success",
                "is_holiday": is_weekend_default,
                "reason": "Weekend" if is_weekend_default else "Working day",
                "date": today.isoformat(),
                "is_custom": False
            }
        
        print(f"[DEBUG] Institute found: ID={institute.id}, Name='{institute.name}'")
        
        # Check for custom holiday setting
        custom_holiday = db.query(Holiday).filter(
            Holiday.institute_id == institute.id,
            Holiday.date == today
        ).first()
        
        # FIXED: Custom override exists
        if custom_holiday:
            print(f"[DEBUG] Custom override found: is_holiday={custom_holiday.is_holiday}, reason={custom_holiday.reason}")
            
            # If custom says it's a working day (is_holiday=False)
            if not custom_holiday.is_holiday:
                # Check if it's actually a weekend being overridden
                if day_of_week in [5, 6]:
                    day_name = "Saturday" if day_of_week == 5 else "Sunday"
                    reason = custom_holiday.reason or f"Working Day (Weekend Override: {day_name})"
                else:
                    reason = custom_holiday.reason or "Working Day"
                
                return {
                    "status": "success",
                    "is_holiday": False,
                    "reason": reason,
                    "date": today.isoformat(),
                    "is_custom": True
                }
            
            # If custom says it's a holiday (is_holiday=True)
            else:
                reason = custom_holiday.reason or "Holiday"
                return {
                    "status": "success",
                    "is_holiday": True,
                    "reason": reason,
                    "date": today.isoformat(),
                    "is_custom": True
                }
        
        # No custom override - check if weekend
        if day_of_week in [5, 6]:
            day_name = "Saturday" if day_of_week == 5 else "Sunday"
            print(f"[DEBUG] Default weekend: {day_name}")
            return {
                "status": "success",
                "is_holiday": True,
                "reason": day_name,
                "date": today.isoformat(),
                "is_custom": False
            }
        
        # Regular working day
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
            "message": str(e),
            "is_holiday": False
        }

@app.get("/admin/students/{institute_id}")
async def get_students(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get all students"""
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
    """Get today's attendance"""
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
    """Upload dress code"""
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
    """Get dress codes"""
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
    """Delete dress code"""
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

@app.get("/holidays/{institute_id}")
async def get_holidays(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Get holidays"""
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
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/admin/toggle-holiday")
async def toggle_holiday(
    institute_id: int = Form(...),
    date: str = Form(...),
    is_holiday: bool = Form(...),
    reason: str = Form(None),
    db: Session = Depends(get_db)
):
    """Toggle holiday"""
    try:
        from datetime import datetime as dt
        date_obj = dt.strptime(date, "%Y-%m-%d").date()
        
        existing = db.query(Holiday).filter(
            Holiday.institute_id == institute_id,
            Holiday.date == date_obj
        ).first()
        
        if existing:
            existing.is_holiday = is_holiday
            if reason:
                existing.reason = reason
            message = f"Updated {date}"
        else:
            new_holiday = Holiday(
                institute_id=institute_id,
                date=date_obj,
                is_holiday=is_holiday,
                reason=reason
            )
            db.add(new_holiday)
            message = f"Marked {date}"
        
        db.commit()
        
        return {
            "status": "success",
            "message": message
        }
        
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/mark-attendance")
async def mark_attendance(
    institute_name: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Mark attendance - FIXED VERSION"""
    try:
        print(f"\n[DEBUG] === ATTENDANCE MARKING ===")
        print(f"[DEBUG] Institute name: '{institute_name}'")
        
        contents = await photo.read()
        
        # Find institute (case-insensitive)
        institute = db.query(Institute).filter(
            Institute.name.ilike(institute_name.strip())
        ).first()
        
        if not institute:
            print(f"[ERROR] Institute '{institute_name}' not found!")
            return {
                "status": "error",
                "message": f"Institute '{institute_name}' not found!"
            }
        
        print(f"[DEBUG] Institute found: ID={institute.id}, Name='{institute.name}'")
        
        # FIXED: Holiday check
        today = date.today()
        day_of_week = today.weekday()
        
        print(f"[DEBUG] Checking holiday for: {today} ({['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day_of_week]})")
        
        custom_holiday = db.query(Holiday).filter(
            Holiday.institute_id == institute.id,
            Holiday.date == today
        ).first()
        
        # If custom override exists
        if custom_holiday:
            print(f"[DEBUG] Custom holiday record found: is_holiday={custom_holiday.is_holiday}")
            # If it's marked as holiday
            if custom_holiday.is_holiday:
                reason = custom_holiday.reason or "Holiday"
                print(f"[ERROR] Today is a custom holiday: {reason}")
                return {
                    "status": "error",
                    "message": f"Today is a holiday ({reason}). Attendance marking is disabled."
                }
            else:
                # Custom says it's a working day - allow attendance even if weekend
                print(f"[DEBUG] Custom working day override - allowing attendance")
        else:
            # No custom record - check default weekend
            if day_of_week in [5, 6]:
                day_name = "Saturday" if day_of_week == 5 else "Sunday"
                print(f"[ERROR] Today is default weekend: {day_name}")
                return {
                    "status": "error",
                    "message": f"Today is {day_name}. Attendance marking is disabled."
                }
        
        print(f"[DEBUG] Holiday check passed - proceeding with attendance")
        
        # Face recognition via ML service
        current_encoding = await extract_face_encoding(contents)
        
        students = db.query(Student).filter(Student.institute_id == institute.id).all()
        
        matched_student = None
        best_match_distance = 999
        
        for student in students:
            is_match, distance = await compare_faces(student.face_encoding, current_encoding)
            
            if is_match and distance < best_match_distance:
                matched_student = student
                best_match_distance = distance
        
        if not matched_student:
            return {
                "status": "error",
                "message": "Face not recognized! Please register first."
            }
        
        # Check if already marked
        existing = db.query(Attendance).filter(
            Attendance.student_id == matched_student.id,
            Attendance.date == today
        ).first()
        
        if existing:
            return {
                "status": "warning",
                "message": f"Attendance already marked today!",
                "data": {
                    "student": matched_student.name,
                    "roll_number": matched_student.roll_number,
                    "time": existing.time.strftime("%H:%M:%S")
                }
            }
        
        # Dress code check via ML service
        dress_codes = db.query(DressCode).filter(DressCode.institute_id == institute.id).all()
        dress_code_compliant, dress_code_details = await verify_dress_code(contents, dress_codes, db)
        
        status = "Present" if dress_code_compliant else "Present - Dress Code Violation"
        
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
        
        return {
            "status": "success",
            "message": f"Attendance marked for {matched_student.name}!",
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
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Attendance failed: {str(e)}")
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
    """Export attendance to Excel"""
    try:
        institute = db.query(Institute).filter(Institute.id == institute_id).first()
        if not institute:
            raise HTTPException(status_code=404, detail="Institute not found")
        
        today = date.today()
        first_day_of_month = date(today.year, today.month, 1)
        
        students = db.query(Student).filter(Student.institute_id == institute_id).all()
        
        attendance_records = db.query(Attendance).join(Student).filter(
            Student.institute_id == institute_id,
            Attendance.date >= first_day_of_month,
            Attendance.date <= today
        ).order_by(Attendance.date.desc()).all()
        
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            workbook = writer.book
            
            # Sheet 1: Attendance Log
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
                df_attendance = pd.DataFrame(columns=[
                    'Date', 'Day', 'Student Name', 'Roll Number', 'Department', 
                    'Time', 'Status', 'Face Match', 'Dress Code'
                ])
            
            df_attendance.to_excel(writer, sheet_name='Attendance Log', index=False)
            
            worksheet1 = writer.sheets['Attendance Log']
            
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#3a4a44',
                'font_color': 'white',
                'border': 1,
                'align': 'center'
            })
            
            worksheet1.set_column('A:A', 12)
            worksheet1.set_column('B:B', 12)
            worksheet1.set_column('C:C', 20)
            worksheet1.set_column('D:D', 15)
            worksheet1.set_column('E:E', 15)
            worksheet1.set_column('F:F', 12)
            worksheet1.set_column('G:G', 25)
            worksheet1.set_column('H:H', 12)
            worksheet1.set_column('I:I', 15)
            
            for col_num, value in enumerate(df_attendance.columns.values):
                worksheet1.write(0, col_num, value, header_format)
            
            # Sheet 2: Student Summary
            student_summary = []
            unique_dates = len(set([r.date for r in attendance_records])) if attendance_records else 0
            
            for student in students:
                student_attendance = [r for r in attendance_records if r.student_id == student.id]
                total_present = len(student_attendance)
                compliant = len([r for r in student_attendance if r.dress_code_match])
                violations = total_present - compliant
                attendance_percentage = (total_present / unique_dates * 100) if unique_dates > 0 else 0
                
                student_summary.append({
                    'Roll Number': student.roll_number,
                    'Student Name': student.name,
                    'Department': student.department,
                    'Total Present': total_present,
                    'Compliant': compliant,
                    'Violations': violations,
                    'Attendance %': f"{attendance_percentage:.1f}%"
                })
            
            df_summary = pd.DataFrame(student_summary)
            df_summary.to_excel(writer, sheet_name='Student Summary', index=False)
            
            worksheet2 = writer.sheets['Student Summary']
            worksheet2.set_column('A:G', 15)
            
            for col_num, value in enumerate(df_summary.columns.values):
                worksheet2.write(0, col_num, value, header_format)
        
        output.seek(0)
        
        month_name = today.strftime('%B')
        filename = f"Attendance_{institute.name.replace(' ', '_')}_{month_name}_{today.year}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        print(f"[ERROR] Excel generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/attendance/{institute_id}/clear")
async def clear_all_attendance(
    institute_id: int,
    db: Session = Depends(get_db)
):
    """Clear all attendance"""
    try:
        students = db.query(Student).filter(Student.institute_id == institute_id).all()
        student_ids = [s.id for s in students]
        
        deleted_count = db.query(Attendance).filter(
            Attendance.student_id.in_(student_ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} records!"
        }
        
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)