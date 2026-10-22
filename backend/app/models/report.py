from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class ReportJob(Base):
    __tablename__ = "report_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # health, uptime, latency, incidents, environment_comparison
    status = Column(String(50), default="completed", nullable=False)  # pending, completed, failed
    format = Column(String(20), default="csv", nullable=False)  # csv, json
    date_from = Column(DateTime, nullable=True)
    date_to = Column(DateTime, nullable=True)
    parameters_json = Column(Text, nullable=True)
    file_path = Column(String(1024), nullable=True)
    file_content = Column(Text, nullable=True)  # Stored directly for immediate export download
    row_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="reports")
