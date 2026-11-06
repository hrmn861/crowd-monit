"""
Database configuration and SQLAlchemy ORM models for Crowd Monitor.
Supports PostgreSQL (production & Docker) with seamless SQLite fallback for local development.
Models: User, Video, Zone, CountReading (CountMetrics), and Alert.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Generator, List, Dict, Any, Optional

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

from backend.config import DEFAULT_ZONES, SITE_NAME, VIEWPOINT_ID, VIEWPOINT_NAME

logger = logging.getLogger("crowd_monitor.database")

# ----------------------------------------------------------------------------
# 1. Database Connection Engine Setup
# ----------------------------------------------------------------------------
# Format for PostgreSQL: postgresql://postgres:postgres@localhost:5432/crowdmonitor
# Fallback for local dev: sqlite:///./crowd_monitor.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crowd_monitor.db")

# Fix Heroku/Railway postgres:// URL scheme to postgresql:// if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
    )
except Exception as e:
    logger.warning("Could not connect to configured DATABASE_URL: %s. Falling back to local SQLite.", e)
    DATABASE_URL = "sqlite:///./crowd_monitor.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ----------------------------------------------------------------------------
# 2. SQLAlchemy ORM Models
# ----------------------------------------------------------------------------
class User(Base):
    """Operators and administrators managing video feeds and zones."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), default="OPERATOR")  # 'ADMIN', 'OPERATOR', 'ANALYST'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    videos = relationship("Video", back_populates="owner", cascade="all, delete-orphan")


class Video(Base):
    """Uploaded camera feeds and screen recordings processed by vision workers."""
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    first_frame_path = Column(String(512), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=30.0)
    width = Column(Integer, default=960)
    height = Column(Integer, default=720)
    is_active = Column(Boolean, default=False, index=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="videos")
    zones = relationship("Zone", back_populates="video", cascade="all, delete-orphan")


class Zone(Base):
    """Dynamic polygon zones defined for a video (or default viewpoint)."""
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=True, index=True)
    code = Column(String(32), nullable=False)  # Z1, Z2, Z3, Z4...
    name = Column(String(128), nullable=False)
    description = Column(String(255), default="")
    area_sqm = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    warning_threshold = Column(Integer, nullable=False)
    critical_threshold = Column(Integer, nullable=False)
    polygon_json = Column(Text, nullable=False)  # JSON serialized [[x, y], ...]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    video = relationship("Video", back_populates="zones")
    readings = relationship("CountReading", back_populates="zone", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="zone", cascade="all, delete-orphan")


class CountReading(Base):
    """Timeseries counts and density observations (CountMetrics)."""
    __tablename__ = "count_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    count = Column(Integer, nullable=False)
    density = Column(Float, nullable=False)
    model_used = Column(String(32), nullable=False)  # 'YOLO' or 'DM-Count'
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    zone = relationship("Zone", back_populates="readings")


class Alert(Base):
    """60-second persistence crowd surge alerts."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False, index=True)  # pending, active, confirmed, escalated, dismissed, resolved
    count = Column(Integer, nullable=False)
    density = Column(Float, nullable=False)
    threshold = Column(Integer, nullable=False)
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    confirmed_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    zone = relationship("Zone", back_populates="alerts")


class CameraTelemetry(Base):
    """Historical telemetry aggregated periodically (e.g., every 5s) for analytics & trends."""
    __tablename__ = "camera_telemetry"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(String(64), default="TSQ-CAM-01", index=True, nullable=False)
    pax_count = Column(Integer, default=0, nullable=False)
    active_model_used = Column(String(32), default="YOLO", nullable=False)  # 'YOLO' or 'DM-Count'
    alert_triggered = Column(Boolean, default=False, nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="SET NULL"), nullable=True, index=True)
    count_yolo = Column(Integer, default=0)
    count_dmcount = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    active_model = Column(String(32), default="YOLO")  # Synced alias
    alert_status = Column(String(32), default="NORMAL")  # 'NORMAL', 'WARNING', 'CRITICAL'
    fps = Column(Float, default=30.0)
    inference_latency_ms = Column(Float, default=12.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)



class WebhookConfig(Base):
    """User-configured external Webhook URLs for alert dispatch."""
    __tablename__ = "webhook_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    url = Column(String(512), nullable=False)
    target_type = Column(String(32), default="REST")  # 'REST', 'Slack', 'Telegram'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Create composite indices for fast query lookups
Index("idx_readings_zone_time", CountReading.zone_id, CountReading.timestamp)
Index("idx_alerts_zone_status", Alert.zone_id, Alert.status)
Index("idx_telemetry_time", CameraTelemetry.timestamp)



# ----------------------------------------------------------------------------
# 3. Database Session Dependency & Lifecycle
# ----------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a thread-safe SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initializes all tables and seeds default user and zones if empty."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified (Engine: %s)", engine.name)
    seed_initial_data()


def seed_initial_data() -> None:
    """Seeds default demo operator, default Times Square video, and 4 baseline zones."""
    db = SessionLocal()
    try:
        # 1. Seed Demo Users if users table is empty
        user_count = db.query(User).count()
        if user_count == 0:
            from backend.auth import hash_password
            demo_admin = User(
                username="admin",
                email="admin@crowdmonitor.io",
                hashed_password=hash_password("Admin123!"),
                role="ADMIN",
                is_active=True
            )
            demo_operator = User(
                username="operator",
                email="operator@crowdmonitor.io",
                hashed_password=hash_password("Operator123!"),
                role="OPERATOR",
                is_active=True
            )
            demo_analyst = User(
                username="analyst",
                email="analyst@crowdmonitor.io",
                hashed_password=hash_password("Analyst123!"),
                role="ANALYST",
                is_active=True
            )
            db.add_all([demo_admin, demo_operator, demo_analyst])
            db.commit()
            logger.info("✓ Seeded default RBAC users: admin (ADMIN), operator (OPERATOR), analyst (ANALYST)")

        # 2. Seed Default Active Video if empty
        video_count = db.query(Video).count()
        default_video = None
        if video_count == 0:
            default_video = Video(
                filename="Screen Recording 2026-11-03 221109.mp4",
                original_name="Times Square North View (Screen Recording 2026-11-03 221109.mp4)",
                file_path="Screen Recording 2026-11-03 221109.mp4",
                first_frame_path="backend/standby.jpg",
                duration_seconds=120.0,
                fps=30.0,
                width=960,
                height=720,
                is_active=True
            )
            db.add(default_video)
            db.commit()
            db.refresh(default_video)
            logger.info("✓ Seeded default video record: '%s'", default_video.original_name)
        else:
            default_video = db.query(Video).filter(Video.is_active == True).first()

        # 3. Seed Default 4 Times Square Zones if empty
        zone_count = db.query(Zone).count()
        if zone_count == 0:
            vid_id = default_video.id if default_video else None
            for z_cfg in DEFAULT_ZONES:
                new_zone = Zone(
                    video_id=vid_id,
                    code=z_cfg["code"],
                    name=z_cfg["name"],
                    description=z_cfg["description"],
                    area_sqm=z_cfg["area_sqm"],
                    capacity=z_cfg["capacity"],
                    warning_threshold=z_cfg["warning_threshold"],
                    critical_threshold=z_cfg["critical_threshold"],
                    polygon_json=json.dumps(z_cfg.get("polygon", []))
                )
                db.add(new_zone)
            db.commit()
            logger.info("✓ Seeded 4 default viewpoint zones for Times Square.")

    except Exception as e:
        logger.error("Error during seed_initial_data: %s", e)
        db.rollback()
    finally:
        db.close()
