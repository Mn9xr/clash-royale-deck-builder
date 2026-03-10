"""Thin Ollama API client used by server chat route."""

from __future__ import annotations

from typing import Any

import requests


class OllamaServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _base_url(value: str | None) -> str:
    base = str(value or "http://127.0.0.1:11434").strip()
    if not base:
        base = "http://127.0.0.1:11434"
    return base.rstrip("/")


def call_ollama_chat(
    *,
    messages: list[dict[str, str]],
    model: str,
    timeout_seconds: float,
    base_url: str | None = None,
) -> dict[str, Any]:
    if not isinstance(messages, list) or not messages:
        raise OllamaServiceError("Ollama messages are missing.", 500)

    model_name = str(model or "").strip()
    if not model_name:
        raise OllamaServiceError("Ollama model is not configured.", 500)

    url = f"{_base_url(base_url)}/api/chat"
    payload = {
        "model": model_name,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.35,
        },
    }

    try:
        response = requests.post(url, json=payload, timeout=timeout_seconds)
    except requests.Timeout as exc:
        raise OllamaServiceError("Ollama request timed out.", 504) from exc
    except requests.RequestException as exc:
        raise OllamaServiceError(
            "Could not reach Ollama. Start Ollama and verify OLLAMA_BASE_URL.",
            503,
        ) from exc

    body: dict[str, Any] = {}
    try:
        body = response.json()
    except ValueError:
        body = {}

    if response.status_code == 404:
        raise OllamaServiceError(
            f"Ollama model '{model_name}' was not found. Run: ollama pull {model_name}",
            502,
        )

    if not response.ok:
        detail = str(body.get("error") or "Ollama returned an unexpected response.")
        raise OllamaServiceError(detail[:220], 502)

    message = body.get("message") if isinstance(body.get("message"), dict) else {}
    content = str(message.get("content") or "").strip()

    if not content:
        raise OllamaServiceError("Ollama returned an empty reply.", 502)

    return {
        "content": content,
        "model": str(body.get("model") or model_name),
        "done": bool(body.get("done", True)),
        "raw": body,
    }
