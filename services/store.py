from contextlib import contextmanager
from dataclasses import dataclass, field
from threading import RLock
from typing import Generic, TypeVar
from uuid import uuid4

T = TypeVar("T")


class OntologyNotFound(KeyError):
    pass


@dataclass
class _Entry(Generic[T]):
    value: T
    lock: RLock = field(default_factory=RLock)


class OntologyStore(Generic[T]):
    def __init__(self):
        self._entries: dict[str, _Entry[T]] = {}
        self._lock = RLock()

    def add(self, value: T) -> str:
        oid = str(uuid4())
        with self._lock:
            self._entries[oid] = _Entry(value)
        return oid

    def ids(self) -> list[str]:
        with self._lock:
            return list(self._entries)

    @contextmanager
    def locked(self, oid: str):
        with self._lock:
            entry = self._entries.get(oid)
        if entry is None:
            raise OntologyNotFound(oid)
        with entry.lock:
            with self._lock:
                if self._entries.get(oid) is not entry:
                    raise OntologyNotFound(oid)
            yield entry.value

    def delete(self, oid: str):
        with self.locked(oid):
            with self._lock:
                del self._entries[oid]


ONTOLOGIES = OntologyStore()
NEURAL_ONTOLOGIES = OntologyStore()
