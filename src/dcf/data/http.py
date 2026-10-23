"""Small rate-limited HTTP helper shared by the loaders."""

from __future__ import annotations

import os
import time

import requests

# SEC asks automated clients to identify themselves and stay under 10 requests/second.
# Override with the SEC_USER_AGENT environment variable (e.g. "Name email@example.com").
DEFAULT_USER_AGENT = os.environ.get(
    "SEC_USER_AGENT", "Mozilla/5.0 (ParBproject DCF research; Par Bahrae portfolio)"
)


class RateLimiter:
    def __init__(self, min_interval: float) -> None:
        self.min_interval = min_interval
        self._last = float("-inf")

    def wait(self) -> None:
        delta = time.monotonic() - self._last
        if delta < self.min_interval:
            time.sleep(self.min_interval - delta)
        self._last = time.monotonic()


_SEC_LIMITER = RateLimiter(0.2)  # <= 5 req/s, well under SEC's 10 req/s guidance


def get(
    url: str, *, limiter: RateLimiter | None = _SEC_LIMITER, timeout: float = 30.0, retries: int = 3
) -> requests.Response:
    headers = {"User-Agent": DEFAULT_USER_AGENT, "Accept-Encoding": "gzip, deflate"}
    last_exc: Exception | None = None
    for attempt in range(retries):
        if limiter is not None:
            limiter.wait()
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"{resp.status_code} for {url}")
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:  # pragma: no cover - exercised live
            last_exc = exc
            if (
                isinstance(exc, requests.HTTPError)
                and exc.response is not None
                and exc.response.status_code == 403
            ):
                raise
            time.sleep(1.5 * (attempt + 1))
    assert last_exc is not None
    raise last_exc
