from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, Date, Time, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "connect_timeout": 10,
        "options": "-c timezone=utc"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Institute(Base):
    __tablename__ = "institutes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    admins = relationship("Admin", back_populates="institute")
    students = relationship("Student", back_populates="institute")
    dress_codes = relationship("DressCode", back_populates="institute")
    holidays = relationship("Holiday", foreign_keys="Holiday.institute_id")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    institute_id = Column(Integer, ForeignKey('institutes.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    institute = relationship("Institute", back_populates="admins")
    reset_tokens = relationship("PasswordResetToken", back_populates="admin", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    roll_number = Column(String(100), nullable=False)
    department = Column(String(255), nullable=False)
    institute_id = Column(Integer, ForeignKey('institutes.id', ondelete='CASCADE'), nullable=False)
    face_encoding = Column(Text, nullable=False)
    photo_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    institute = relationship("Institute", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String(50), default="present")
    face_match = Column(Boolean, default=True)
    dress_code_match = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", back_populates="attendance_records")

class DressCode(Base):
    __tablename__ = "dress_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    institute_id = Column(Integer, ForeignKey('institutes.id', ondelete='CASCADE'), nullable=False)
    dress_type = Column(String(100), nullable=False)
    image_data = Column(Text, nullable=False)  # Base64 encoded image
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    institute = relationship("Institute", back_populates="dress_codes")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey('admins.id', ondelete='CASCADE'), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = relationship("Admin", back_populates="reset_tokens")

class Holiday(Base):
    __tablename__ = "holidays"
    
    id = Column(Integer, primary_key=True, index=True)
    institute_id = Column(Integer, ForeignKey('institutes.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    is_holiday = Column(Boolean, default=True)
    reason = Column(String(255), nullable=True)  # e.g., "Diwali", "Exam Day", "Sports Day"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Ensure one entry per institute per date
    __table_args__ = (
        Index('idx_institute_date', 'institute_id', 'date', unique=True),
    )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()