import json
import os
from google import genai
from google.genai import types
from pydantic import BaseModel

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "hackathon26bloomhacks")
LOCATION = "us-east4"
MAX_LOG_CHARS = 12000

client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)


class Finding(BaseModel):
    code: str
    title: str
    severity: str   # LOW | MEDIUM | HIGH | CRITICAL
    evidence: str


class Verdict(BaseModel):
    status: str         # SAFE | CAUTION | COMPROMISED
    risk: int           # 0-100
    recommendation: str
    findings: list[Finding]


SYSTEM_PROMPT = """You are an EV-charging cybersecurity analyst. You are given the raw
event log (CSV) of a single EVerest / ISO 15118 charging session. Detect anomalies that
indicate a security problem or a compromised/misbehaving charger.

Look for: authorization missing or occurring AFTER power delivery; SLAC/PLC pairing
failures; incomplete ISO 15118 request/response pairs; high rates of unanswered
CurrentDemand requests; downgrade to unencrypted transport; repeated invalid RFID or
replay patterns; tamper events; protocol errors; timeouts; sessions that never finish.

Scoring:
- risk: integer 0-100 (0 = clean, 100 = definitely compromised)
- status: "SAFE" if risk < 25, "CAUTION" if 25-59, "COMPROMISED" if >= 60
- recommendation: one sentence a driver can act on
- findings: each real anomaly with a short code, title, severity, and the evidence you
  actually saw in the log.

If the log is a normal, complete, authorized session, return status SAFE, risk 0, an
empty findings list, and a reassuring recommendation. Base every finding on evidence
present in the log. Do not invent CVE numbers."""


def detect_anomalies(csv_text: str) -> dict:
    if len(csv_text) > MAX_LOG_CHARS:
        half = MAX_LOG_CHARS // 2
        csv_text = csv_text[:half] + "\n...[truncated]...\n" + csv_text[-half:]

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{SYSTEM_PROMPT}\n\nEVENT LOG:\n{csv_text}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Verdict,
            temperature=0,
        ),
    )
    if response.parsed is not None:
        return response.parsed.model_dump()
    return Verdict(**json.loads(response.text)).model_dump()
