from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.report import ReportJob
from app.schemas.analytics import ReportJobCreate, ReportJobResponse
from app.services.reports import generate_report

router = APIRouter()


@router.post("", response_model=ReportJobResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: ReportJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generate a new downloadable report (health, uptime, latency, incidents)."""
    job = ReportJob(
        user_id=current_user.id,
        title=report_in.title,
        report_type=report_in.report_type,
        format=report_in.format,
        date_from=report_in.date_from,
        date_to=report_in.date_to,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Process report generation
    generate_report(db, job)
    return job


@router.get("", response_model=List[ReportJobResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List previously generated reports."""
    query = db.query(ReportJob)
    if current_user.role != "admin":
        query = query.filter(ReportJob.user_id == current_user.id)
    return query.order_by(ReportJob.created_at.desc()).all()


@router.get("/{report_id}", response_model=ReportJobResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get report metadata and generation status."""
    job = db.query(ReportJob).filter(ReportJob.id == report_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return job


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Download the generated report file as CSV or JSON."""
    job = db.query(ReportJob).filter(ReportJob.id == report_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not job.file_content:
        raise HTTPException(status_code=400, detail="Report content is not ready")

    media_type = "text/csv" if job.format == "csv" else "application/json"
    filename = f"pulsecloud_{job.report_type}_{job.id}.{job.format}"

    return Response(
        content=job.file_content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
