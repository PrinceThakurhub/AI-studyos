import os
import json
import re

from dotenv import load_dotenv
from groq import Groq

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        ".env"
    )
)


class AIError(Exception):
    pass


def _client():
    key = os.getenv("GROQ_API_KEY")

    if not key:
        raise AIError("Groq API key not configured. Add GROQ_API_KEY to .env")

    return Groq(api_key=key)


def ask(system, user, max_tokens=1500):
    client = _client()

    model = os.getenv(
        "AI_MODEL",
        "openai/gpt-oss-20b"
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": system
                },
                {
                    "role": "user",
                    "content": user
                }
            ],
            max_completion_tokens=max_tokens,
            temperature=0.3
        )

        answer = response.choices[0].message.content

        if not answer:
            raise AIError("Groq returned an empty response.")

        return answer

    except AIError:
        raise

    except Exception as e:
        print("GROQ ERROR:", repr(e))
        raise AIError(
            "Groq AI service is temporarily unavailable. Please try again."
        ) from e


# ---------- Tutor ----------

TUTOR_DOC = (
    "You are a friendly study tutor. "
    "Answer ONLY from the SOURCE material. "
    "If the source does not contain the answer, clearly say so. "
    "Format your response as:\n"
    "Answer\n"
    "Key Points (bullets)\n"
    "Formula (if any)"
)

TUTOR_GEN = (
    "You are a friendly study tutor. "
    "No study material was provided, so answer using general knowledge. "
    "Format your response as:\n"
    "Answer\n"
    "Key Points (bullets)\n"
    "Formula (if any)"
)


def tutor(question, source=None):

    if source:
        return ask(
            TUTOR_DOC,
            f"SOURCE:\n{source[:12000]}\n\nQUESTION: {question}"
        )

    return ask(
        TUTOR_GEN,
        f"QUESTION: {question}"
    )


# ---------- Quiz ----------

def quiz(subject, topic, difficulty, n, source=None):

    system = (
        'Return ONLY valid JSON. '
        'Do not use markdown fences. '
        'Format exactly like this: '
        '{"questions":[{"question":"string",'
        '"options":["string","string","string","string"],'
        '"correct":0,'
        '"explanation":"string"}]}. '
        f"Create exactly {n} MCQs. "
        f"Difficulty: {difficulty}."
    )

    user = f"Subject: {subject}\nTopic: {topic}"

    if source:
        user += f"\n\nBase the questions on this study material:\n{source[:10000]}"

    for _ in range(2):

        raw = ask(
            system,
            user,
            3000
        )

        try:
            match = re.search(
                r"\{.*\}",
                raw,
                re.S
            )

            if not match:
                continue

            data = json.loads(match.group())

            qs = [
                q
                for q in data.get("questions", [])
                if (
                    isinstance(q.get("question"), str)
                    and isinstance(q.get("options"), list)
                    and len(q["options"]) == 4
                    and q.get("correct") in (0, 1, 2, 3)
                )
            ]

            if qs:
                return [
                    {
                        **q,
                        "explanation": q.get("explanation", "")
                    }
                    for q in qs[:n]
                ]

        except Exception as e:
            print("QUIZ JSON ERROR:", repr(e))

    raise AIError(
        "AI returned an invalid quiz. Please try again."
    )