from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CheckResultResponse(BaseModel):
    id: int
    endpoint_id: int
    timestamp: datetime
    duration_ms: float
    status_code: Optional[int] = None
    is_success: bool
    outcome: str
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    response_size_bytes: int
    resolved_ip: Optional[str] = None
    source: str

    class Config:
        from_attributes = True


class CheckHistoryPaginated(BaseModel):
    items: List[CheckResultResponse]
    total: int
    page: int
    limit: int
    pages: int
