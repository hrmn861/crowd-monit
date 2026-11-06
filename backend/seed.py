"""
Standalone database seeding script for Crowd Monitor.
Initializes tables, seeds the 4 Times Square viewpoint zones,
and populates the last 15 minutes of readings plus demo alert states.
"""

from datetime import datetime, timedelta, timezone
import random
from backend.database import init_db, seed_zones, get_db_connection
from backend.config import DEFAULT_ZONES

def seed_historical_telemetry():
    """Generates 15 minutes of realistic per-minute and per-3s readings."""
    init_db()
    seed_zones()

    now = datetime.now(timezone.utc)
    print("Seeding 15-minute historical telemetry for single-camera viewpoint...")

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, code, area_sqm, capacity, critical_threshold FROM zones")
        zones = cur.fetchall()

        # Insert historical readings going back 15 minutes (at 15-second intervals)
        for i in range(60, 0, -1):
            ts = (now - timedelta(seconds=i * 15)).isoformat()
            # Simulate a surge in Z1 (Lower Stairs) and moderate activity in other zones
            for z in zones:
                zone_code = z["code"]
                area = z["area_sqm"]

                if zone_code == "Z1":
                    # Lower Stairs: ramp up from 40 to 68 over time to simulate alert buildup
                    surge_factor = (60 - i) / 60.0
                    base_count = 38 + int(surge_factor * 32) + random.randint(-2, 3)
                elif zone_code == "Z2":
                    base_count = random.randint(22, 36)
                elif zone_code == "Z3":
                    base_count = random.randint(45, 68)
                else:  # Z4
                    base_count = random.randint(35, 52)

                density = round(base_count / area, 2)
                # Model hysteresis check: if count >= 45 use DM-Count, else YOLO
                model_used = "DM-Count" if base_count >= 45 else "YOLO"

                cur.execute("""
                    INSERT INTO count_readings (zone_id, count, density, model_used, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (z["id"], base_count, density, model_used, ts))

        # Seed an initial active alert on Z1 (Lower Stairs) so reviewer can test immediately
        z1 = next(z for z in zones if z["code"] == "Z1")
        alert_ts = (now - timedelta(seconds=85)).isoformat()
        cur.execute("""
            INSERT INTO alerts (zone_id, status, count, density, threshold, triggered_at, notes)
            VALUES (?, 'active', 70, 1.56, ?, ?, 'Congestion surge detected: stairs capacity reached 87.5% for >60s')
        """, (z1["id"], z1["critical_threshold"], alert_ts))

        conn.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_historical_telemetry()
