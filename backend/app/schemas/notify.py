from pydantic import BaseModel, Field


class NotifyTicketRequest(BaseModel):
    numero: str = Field(..., description="Número do chamado (ex: CONTIA-160426001).")
    titulo: str = Field(..., description="Título do chamado.")
    status: str = Field(..., description="Novo status após atualização.")
    resposta: str = Field(default="", description="Resposta do suporte.")
    admin_email: str = Field(..., description="E-mail do admin que abriu o chamado.")
    empresa_nome: str = Field(default="", description="Nome da empresa.")
    respondido_por: str = Field(default="Suporte Cont.IA", description="Nome do técnico.")
