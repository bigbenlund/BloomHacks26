import json
import os

from google import genai

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "hackathon26bloomhacks")
LOCATION = "us-east4"

client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)


def explain_charger(charger: dict) -> str:
    prompt = f"""You are explaining an EV charger's security status to an everyday driver with no technical background. Given this charger's findings and recommendation, write 2-3 short sentences explaining why it is or isn't safe to use, in plain language. Do not change the risk score or recommendation. Do not use jargon or CVE numbers. Return only the sentences.

Findings: {json.dumps(charger.get("findings", []), indent=2)}
Recommendation: {charger.get("recommendation", "No specific recommendation.")}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text.strip()