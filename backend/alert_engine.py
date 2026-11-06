"""
Alert State Machine & Persistence Engine.
Implements the 60-second persistence requirements:
1. Zone must remain over threshold for 60s continuously before generating an 'active' alert.
2. Zone must remain below threshold for 60s continuously before automatically 'resolving' an active alert.
3. Review-first escalation logging + SMTP email dispatch to allow-listed control room addresses.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
import json
import logging

from backend.config import (
    SITE_NAME,
    VIEWPOINT_NAME,
    ALERT_TRIGGER_PERSISTENCE_SECONDS,
    ALERT_RESOLVE_PERSISTENCE_SECONDS
)
from backend.database import SessionLocal, Alert, Zone, WebhookConfig
from backend.email_service import send_escalation_alert_email

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger("crowd_monitor.alert_engine")


def dispatch_webhooks_async(alert_id: int, zone_id: int, count: int, density: float, critical_threshold: int):
    """Dispatches webhook JSON payloads asynchronously to all registered active webhook URLs."""
    import threading

    def _worker():
        if not requests:
            return
        db = SessionLocal()
        try:
            webhooks = db.query(WebhookConfig).filter(WebhookConfig.is_active == True).all()
            if not webhooks:
                return

            zone = db.query(Zone).filter(Zone.id == zone_id).first()
            zone_name = zone.name if zone else f"Zone #{zone_id}"

            payload = {
                "event": "PERSISTENT_ALERT_TRIGGERED",
                "camera_id": "TSQ-CAM-01",
                "alert_id": alert_id,
                "zone_name": zone_name,
                "trigger_count": count,
                "density_per_sqm": round(density, 2),
                "threshold": critical_threshold,
                "severity": "CRITICAL",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "snapshot_image": f"/api/frame",
                "details": f"Continuous crowd surge in {zone_name} exceeded threshold ({count} >= {critical_threshold}) for >60 seconds."
            }

            for wh in webhooks:
                try:
                    if wh.target_type == "Slack":
                        formatted_data = {"text": f"🚨 *CRITICAL CROWD ALERT*: {zone_name} count={count} (Density: {density:.2f}/m²)"}
                    elif wh.target_type == "Telegram":
                        formatted_data = {"text": f"🚨 CRITICAL CROWD ALERT: {zone_name}\nCount: {count} pax"}
                    else:
                        formatted_data = payload

                    res = requests.post(wh.url, json=formatted_data, timeout=3.0)
                    logger.info("✓ [WEBHOOK DISPATCH] Alert #%d sent to '%s' (%s) -> HTTP %d", alert_id, wh.name, wh.url, res.status_code)
                except Exception as ex:
                    logger.warning("Failed to dispatch webhook '%s' (%s): %s", wh.name, wh.url, ex)
        except Exception as e:
            logger.error("Error in webhook worker thread: %s", e)
        finally:
            db.close()

    t = threading.Thread(target=_worker, daemon=True)
    t.start()


class ZonePersistenceTracker:
    def __init__(self):
        # zone_id -> {
        #   "over_since": datetime | None,
        #   "below_since": datetime | None,
        #   "pending_alert_id": int | None,
        #   "active_alert_id": int | None,
        #   "last_count": int,
        #   "last_density": float
        # }
        self._states: Dict[int, Dict[str, Any]] = {}

    def get_state(self, zone_id: int) -> Dict[str, Any]:
        if zone_id not in self._states:
            self._states[zone_id] = {
                "over_since": None,
                "below_since": None,
                "pending_alert_id": None,
                "active_alert_id": None,
                "last_count": 0,
                "last_density": 0.0,
            }
        return self._states[zone_id]

    def process_reading(
        self,
        zone_id: int,
        count: int,
        density: float,
        critical_threshold: int,
        timestamp: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates reading against the 60s persistence state machine.
        Returns a dict describing any state transition triggered.
        """
        now = timestamp or datetime.now(timezone.utc)
        state = self.get_state(zone_id)
        state["last_count"] = count
        state["last_density"] = density

        transition = None

        db = SessionLocal()
        try:
            # Check existing active or confirmed alert in database if not tracked in memory
            if state["active_alert_id"] is None:
                existing_alert = (
                    db.query(Alert)
                    .filter(Alert.zone_id == zone_id, Alert.status.in_(["active", "confirmed"]))
                    .order_by(Alert.id.desc())
                    .first()
                )
                if existing_alert:
                    state["active_alert_id"] = existing_alert.id

            is_over = count >= critical_threshold

            if is_over:
                # Clear recovery timer since it's over threshold again
                state["below_since"] = None

                if state["over_since"] is None:
                    state["over_since"] = now
                    # Create a pending alert record
                    if state["active_alert_id"] is None:
                        new_pending = Alert(
                            zone_id=zone_id,
                            status="pending",
                            count=count,
                            density=density,
                            threshold=critical_threshold,
                            triggered_at=now,
                            notes="Evaluating 60s persistence requirement"
                        )
                        db.add(new_pending)
                        db.commit()
                        db.refresh(new_pending)
                        state["pending_alert_id"] = new_pending.id
                        transition = {
                            "event": "PENDING_STARTED",
                            "alert_id": state["pending_alert_id"],
                            "zone_id": zone_id,
                            "seconds_elapsed": 0
                        }

                else:
                    elapsed = (now - state["over_since"]).total_seconds()

                    # If 60s persistence reached and not yet active -> promote to 'active'
                    if elapsed >= ALERT_TRIGGER_PERSISTENCE_SECONDS and state["active_alert_id"] is None:
                        if state["pending_alert_id"]:
                            pending_alert = db.query(Alert).filter(Alert.id == state["pending_alert_id"]).first()
                            if pending_alert:
                                pending_alert.status = "active"
                                pending_alert.count = count
                                pending_alert.density = density
                                pending_alert.notes = f"Threshold breached for >{ALERT_TRIGGER_PERSISTENCE_SECONDS}s continuously."
                                db.commit()
                                state["active_alert_id"] = pending_alert.id
                                state["pending_alert_id"] = None
                        else:
                            new_active = Alert(
                                zone_id=zone_id,
                                status="active",
                                count=count,
                                density=density,
                                threshold=critical_threshold,
                                triggered_at=now,
                                notes=f"Breached for >{ALERT_TRIGGER_PERSISTENCE_SECONDS}s continuously."
                            )
                            db.add(new_active)
                            db.commit()
                            db.refresh(new_active)
                            state["active_alert_id"] = new_active.id

                        transition = {
                            "event": "ALERT_ACTIVATED",
                            "alert_id": state["active_alert_id"],
                            "zone_id": zone_id,
                            "seconds_elapsed": elapsed
                        }

                        # Trigger asynchronous external webhook notifications
                        if state["active_alert_id"]:
                            dispatch_webhooks_async(
                                alert_id=state["active_alert_id"],
                                zone_id=zone_id,
                                count=count,
                                density=density,
                                critical_threshold=critical_threshold
                            )

            else:
                # Count dropped below critical threshold
                state["over_since"] = None

                # If it was only pending and dropped before 60s, dismiss it
                if state["pending_alert_id"] is not None and state["active_alert_id"] is None:
                    pending_alert = db.query(Alert).filter(Alert.id == state["pending_alert_id"]).first()
                    if pending_alert:
                        pending_alert.status = "dismissed"
                        pending_alert.notes = "Transient surge: subsided before 60s persistence threshold."
                        db.commit()
                    transition = {
                        "event": "PENDING_DISMISSED",
                        "alert_id": state["pending_alert_id"],
                        "zone_id": zone_id
                    }
                    state["pending_alert_id"] = None

                # If there is an active or confirmed alert, check 60s resolution timer
                if state["active_alert_id"] is not None:
                    if state["below_since"] is None:
                        state["below_since"] = now
                    else:
                        recovery_elapsed = (now - state["below_since"]).total_seconds()
                        if recovery_elapsed >= ALERT_RESOLVE_PERSISTENCE_SECONDS:
                            active_alert = db.query(Alert).filter(Alert.id == state["active_alert_id"]).first()
                            if active_alert:
                                active_alert.status = "resolved"
                                active_alert.resolved_at = now
                                active_alert.notes = "Crowd density remained below threshold for >60s."
                                db.commit()

                            transition = {
                                "event": "ALERT_RESOLVED",
                                "alert_id": state["active_alert_id"],
                                "zone_id": zone_id,
                                "recovery_seconds": recovery_elapsed
                            }
                            state["active_alert_id"] = None
                            state["below_since"] = None

        except Exception as e:
            logger.error("Error evaluating persistence state machine: %s", e)
            db.rollback()
        finally:
            db.close()

        return transition

    def get_over_threshold_seconds(self, zone_id: int) -> int:
        state = self.get_state(zone_id)
        if state["over_since"]:
            return int((datetime.now(timezone.utc) - state["over_since"]).total_seconds())
        return 0


# Singleton persistence tracker instance
alert_engine = ZonePersistenceTracker()


def generate_and_log_escalation(alert_id: int, operator_notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes Phase 3 Review-First Escalation:
    1. Updates alert status to 'escalated' in database.
    2. Generates Escalation Summary JSON payload.
    3. Prints payload cleanly to terminal logger.
    4. Dispatches formatted alert email to allow-listed control room addresses via SMTP service.
    """
    db = SessionLocal()
    try:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError(f"Alert with ID {alert_id} not found")

        zone = db.query(Zone).filter(Zone.id == alert.zone_id).first()
        if not zone:
            raise ValueError(f"Zone for Alert ID {alert_id} not found")

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Update alert in DB
        alert.status = "escalated"
        alert.escalated_at = now
        if operator_notes:
            alert.notes = operator_notes
        db.commit()

        escalation_payload = {
            "site_name": SITE_NAME,
            "viewpoint": VIEWPOINT_NAME,
            "alert_id": alert_id,
            "zone_code": zone.code,
            "zone_name": zone.name,
            "current_count": alert.count,
            "density_per_sqm": round(alert.density, 2),
            "critical_threshold": zone.critical_threshold,
            "exceeded_by": max(0, alert.count - zone.critical_threshold),
            "timestamp": now_iso,
            "operator_notes": operator_notes or "Immediate crowd dispersal dispatch recommended",
            "recommended_measures": [
                "Dispatch Plaza Safety Team to redirect pedestrian flow at main corridor",
                "Activate digital signage warning: Area temporarily restricted for congestion management",
                "Notify Transit Police and Security Sector if pedestrian aggregation exceeds 120%"
            ]
        }

        # Terminal output
        separator = "=" * 70
        print("\n" + separator)
        print("🚨 [CROWD MONITOR ESCALATION SUMMARY] DISPATCH LOG 🚨")
        print(separator)
        print(json.dumps(escalation_payload, indent=2))
        print(separator + "\n", flush=True)

        # Dispatch real SMTP email to allow-listed control room addresses
        email_result = send_escalation_alert_email(escalation_payload)
        escalation_payload["email_dispatch"] = email_result

        return escalation_payload

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
