from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProjectCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str
    project_code: str
    apply_code: str
    apply_code2: Optional[str] = ""
    status: Optional[str] = "进行中"
    trial_leader: Optional[str] = ""
    process_leader: Optional[str] = ""
    assembly_leader: Optional[str] = ""


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: Optional[str] = None
    project_code: Optional[str] = None
    apply_code: Optional[str] = None
    apply_code2: Optional[str] = None
    status: Optional[str] = None
    trial_leader: Optional[str] = None
    process_leader: Optional[str] = None
    assembly_leader: Optional[str] = None