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


def explain_charger(charger):

    prompt = f"""
You are an EV charging cybersecurity expert.

The following charger has already been analyzed.

DO NOT change the risk score.

DO NOT change the recommendation.

Simply explain the findings in language an everyday EV driver would understand.

Return only 2-3 sentences.

Security Report:

{json.dumps(charger, indent=2)}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text