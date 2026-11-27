"""Sincroniza notas operativas de la bóveda con Supabase.

Alcance deliberado:
  * Solo lee notas con frontmatter `tipo: tarea`, `tipo: proyecto` o `tipo: entrada`.
  * Nunca toca Hacking, datos financieros, adjuntos originales ni capturas de Gmail.
  * Nunca borra notas locales ni filas remotas. Las desapariciones se tratan como
    conflicto visible para una persona.
  * Si local y remoto cambiaron desde el último sync, no aplica nada: registra
    el conflicto en `sync_conflicts`.

Modos:
  python herramientas/sync_supabase.py --mode push
  python herramientas/sync_supabase.py --mode pull
  python herramientas/sync_supabase.py --mode sync --dry-run

Variables de entorno (fuera de la bóveda):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  (o SUPABASE_SECRET_KEY)
  BOVEDA_USER_ID             (UUID del usuario en auth.users)
  BOVEDA_SYNC_STATE          (opcional; ruta del estado local)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:  # pragma: no cover - se valida en main()
    requests = None


ROOT = Path(__file__).resolve().parents[1]

ENTITY_CONFIG: dict[str, dict[str, Any]] = {
    'project': {
        'folder': '02 Proyectos',
        'table': 'projects',
        'tipo': 'proyecto',
        'exclude': {'Proyectos.md', 'AGENTS.md'},
    },
    'task': {
        'folder': '06 Tareas',
        'table': 'tasks',
        'tipo': 'tarea',
        'exclude': {'AGENTS.md'},
    },
    'inbox': {
        'folder': '01 Entrada',
        'table': 'inbox_items',
        'tipo': 'entrada',
        'exclude': {'Entrada.md', 'AGENTS.md'},
    },
}
ENTITY_ORDER = ('project', 'task', 'inbox')

TASK_STATUS_TO_REMOTE = {
    'pendiente': 'pending',
    'pendiente_sincronizacion': 'pending_sync',
    'completada': 'completed',
    'en_espera': 'waiting',
    'bloqueada': 'blocked',
}
TASK_STATUS_TO_LOCAL = {value: key for key, value in TASK_STATUS_TO_REMOTE.items()}

PROJECT_STATUS_TO_REMOTE = {
    'activo': 'active',
    'en_espera': 'waiting',
    'pausado': 'paused',
    'completado': 'done',
    'archivado': 'archived',
}
PROJECT_STATUS_TO_LOCAL = {
    value: key for key, value in PROJECT_STATUS_TO_REMOTE.items()
}

INBOX_STATUS_TO_REMOTE = {
    'pendiente': 'pending',
    'procesada': 'processed',
    'descartada': 'discarded',
}
INBOX_STATUS_TO_LOCAL = {value: key for key, value in INBOX_STATUS_TO_REMOTE.items()}

PRIORITY_TO_REMOTE = {'alta': 'high', 'normal': 'normal', 'baja': 'low'}
PRIORITY_TO_LOCAL = {value: key for key, value in PRIORITY_TO_REMOTE.items()}

FRONTMATTER_RE = re.compile(
    r'\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n)?', re.S
)


class ConflictError(RuntimeError):
    """La fila remota ya existe o su versión cambió."""


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------


def _unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        if value[0] == '"':
            try:
                return str(json.loads(value))
            except json.JSONDecodeError:
                return value[1:-1]
        return value[1:-1]
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text

    meta: dict[str, Any] = {}
    current_key: str | None = None

    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue

        if line[:1] in (' ', '\t') and current_key:
            item = line.strip()
            if item.startswith('-'):
                item = item[1:].strip()
            if isinstance(meta.get(current_key), list):
                meta[current_key].append(_unquote(item))
            continue

        if ':' not in line:
            continue

        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()

        if value == '':
            meta[key] = []
            current_key = key
        elif value.startswith('[') and value.endswith(']'):
            inner = value[1:-1].strip()
            meta[key] = (
                [_unquote(item.strip()) for item in inner.split(',') if item.strip()]
                if inner
                else []
            )
            current_key = key
        else:
            meta[key] = _unquote(value)
            current_key = key

    return meta, text[match.end() :]


def scalar(meta: dict[str, Any], key: str, default: str = '') -> str:
    value = meta.get(key, default)
    if isinstance(value, list):
        return default
    return str(value) if value is not None else default


def render_scalar(value: Any) -> str:
    if value is None:
        return ''
    raw = str(value)
    if raw == '':
        return ''
    if re.fullmatch(r'[A-Za-z0-9_./@:+ -]+', raw) and not raw.startswith(
        ('-', '[', '{', '"', "'")
    ):
        return raw
    return json.dumps(raw, ensure_ascii=False)


def set_frontmatter(text: str, values: dict[str, Any]) -> str:
    match = FRONTMATTER_RE.match(text)
    rendered = {
        key: f'{key}: {render_scalar(value)}' for key, value in values.items()
    }

    if not match:
        block = '---\n' + '\n'.join(rendered.values()) + '\n---\n'
        return block + text.lstrip('\n')

    lines = match.group(1).splitlines()
    for key, line in rendered.items():
        index = next(
            (
                position
                for position, existing in enumerate(lines)
                if existing.split(':', 1)[0].strip() == key
            ),
            None,
        )
        if index is None:
            lines.append(line)
        else:
            lines[index] = line

    return '---\n' + '\n'.join(lines) + '\n---\n' + text[match.end() :]


def first_h1(body: str) -> str:
    match = re.search(r'^#\s+(.+)$', body, re.M)
    return match.group(1).strip() if match else ''


def set_h1(body: str, title: str) -> str:
    safe_title = ' '.join(title.replace('\r', ' ').replace('\n', ' ').split())
    if re.search(r'^#\s+.+$', body, re.M):
        return re.sub(
            r'^#\s+.+$', lambda _: '# ' + safe_title, body, count=1, flags=re.M
        )
    return f'# {safe_title}\n\n{body.lstrip()}'


def section(body: str, heading: str) -> str:
    match = re.search(
        rf'^##[ \t]+{re.escape(heading)}[ \t]*\n(.*?)(?=^##[ \t]+|\Z)',
        body,
        re.M | re.S,
    )
    return match.group(1).strip() if match else ''


def set_section(body: str, heading: str, value: str) -> str:
    pattern = re.compile(
        rf'(^##[ \t]+{re.escape(heading)}[ \t]*\n)(.*?)(?=^##[ \t]+|\Z)',
        re.M | re.S,
    )
    clean = value.strip()

    if pattern.search(body):
        return pattern.sub(
            lambda match: match.group(1) + '\n' + clean + '\n\n',
            body,
            count=1,
        )

    return body.rstrip() + f'\n\n## {heading}\n\n{clean}\n'


def context_from_body(body: str) -> str:
    match = re.search(r'^Contexto:[ \t]*(.*)$', body, re.M)
    if match:
        return match.group(1).strip()[:4000]

    without_title = re.sub(r'^#\s+.+$', '', body, count=1, flags=re.M)
    without_project = re.sub(r'^Proyecto:.*$', '', without_title, count=1, flags=re.M)
    return without_project.strip()[:4000]


def set_context(body: str, value: str) -> str:
    line = 'Contexto: ' + ' '.join(value.split())
    if re.search(r'^Contexto:.*$', body, re.M):
        return re.sub(
            r'^Contexto:.*$', lambda _: line, body, count=1, flags=re.M
        )
    return body.rstrip() + '\n\n' + line + '\n'


def normalize_wikilink(value: Any) -> str:
    raw = str(value or '').strip().strip('"').strip("'")
    raw = raw.removeprefix('[[').removesuffix(']]').strip()
    return raw.replace('\\', '/')


def set_project_line(body: str, project_path: str | None) -> str:
    if project_path:
        line = f'Proyecto: [[{project_path.removesuffix(".md")}]]'
    else:
        line = 'Proyecto:'

    if re.search(r'^Proyecto:.*$', body, re.M):
        return re.sub(
            r'^Proyecto:.*$', lambda _: line, body, count=1, flags=re.M
        )
    return body.rstrip() + '\n\n' + line + '\n'


def inbox_body(body: str) -> str:
    without_title = re.sub(r'^#\s+.+$', '', body, count=1, flags=re.M)
    return without_title.strip()[:8000]


def replace_body(text: str, body: str) -> str:
    match = re.search(r'^#\s+.+$', text, re.M)
    if match:
        return text[: match.end()] + '\n\n' + body.strip() + '\n'
    return text.rstrip() + '\n\n' + body.strip() + '\n'


def slugify(value: str) -> str:
    normalized = (
        unicodedata.normalize('NFKD', value)
        .encode('ascii', 'ignore')
        .decode('ascii')
    )
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', normalized).strip('-').lower()
    return slug[:60] or 'nota'


# ---------------------------------------------------------------------------
# Identidad y hash
# ---------------------------------------------------------------------------


def valid_uuid(value: Any) -> str | None:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def stable_id(user_id: str, rel_path: str) -> str:
    return str(
        uuid.uuid5(uuid.NAMESPACE_URL, f'boveda:{user_id}:{rel_path}')
    )


def resolve_id(meta: dict[str, Any], user_id: str, rel_path: str) -> str:
    for key in ('id', 'task_id', 'google_id', 'proyecto_id'):
        candidate = valid_uuid(scalar(meta, key))
        if candidate:
            return candidate
    return stable_id(user_id, rel_path)


def hash_payload(payload: dict[str, Any]) -> str:
    hashable = {
        key: value for key, value in payload.items() if key != 'source_path'
    }
    raw = json.dumps(hashable, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def remote_payload(entity: str, row: dict[str, Any]) -> dict[str, Any]:
    if entity == 'task':
        return {
            'id': row['id'],
            'title': row.get('title', ''),
            'status': row.get('status', 'pending'),
            'due_date': row.get('due_date') or None,
            'priority': row.get('priority', 'normal'),
            'project_id': row.get('project_id'),
            'context': row.get('context') or '',
            'google_id': row.get('google_id'),
            'source_path': row.get('source_path'),
        }
    if entity == 'project':
        return {
            'id': row['id'],
            'title': row.get('title', ''),
            'status': row.get('status', 'active'),
            'area': row.get('area') or '',
            'result': row.get('result') or '',
            'current_state': row.get('current_state') or '',
            'next_step': row.get('next_step') or '',
            'source_path': row.get('source_path'),
        }
    return {
        'id': row['id'],
        'title': row.get('title', ''),
        'body': row.get('body') or '',
        'source': row.get('source') or 'Otra',
        'status': row.get('status', 'pending'),
        'source_path': row.get('source_path'),
    }


# ---------------------------------------------------------------------------
# Modelo local
# ---------------------------------------------------------------------------


@dataclass
class Note:
    entity: str
    id: str
    path: Path
    rel_path: str
    text: str
    meta: dict[str, Any]
    body: str
    payload: dict[str, Any] = field(default_factory=dict)


def note_payload(
    entity: str,
    rel_path: str,
    meta: dict[str, Any],
    body: str,
    path_to_project: dict[str, str],
    user_id: str = '',
) -> dict[str, Any]:
    title = first_h1(body) or Path(rel_path).stem

    if entity == 'task':
        project_path = normalize_wikilink(scalar(meta, 'proyecto'))
        project_id = valid_uuid(scalar(meta, 'proyecto_id'))
        if not project_id and project_path:
            project_id = (
                path_to_project.get(project_path)
                or path_to_project.get(project_path.removesuffix('.md'))
                or path_to_project.get(Path(project_path).stem)
                or path_to_project.get(Path(project_path).name)
            )

        due = scalar(meta, 'fecha').strip()
        return {
            'id': resolve_id(meta, user_id, rel_path),
            'title': title,
            'status': TASK_STATUS_TO_REMOTE.get(
                scalar(meta, 'estado', 'pendiente').strip(), 'pending'
            ),
            'due_date': due or None,
            'priority': PRIORITY_TO_REMOTE.get(
                scalar(meta, 'prioridad', 'normal').strip(), 'normal'
            ),
            'project_id': project_id,
            'context': context_from_body(body),
            'google_id': scalar(meta, 'google_id').strip() or None,
            'source_path': rel_path,
        }

    if entity == 'project':
        return {
            'id': resolve_id(meta, user_id, rel_path),
            'title': title,
            'status': PROJECT_STATUS_TO_REMOTE.get(
                scalar(meta, 'estado', 'activo').strip(), 'active'
            ),
            'area': scalar(meta, 'area'),
            'result': section(body, 'Resultado buscado')[:4000],
            'current_state': section(body, 'Estado actual')[:4000],
            'next_step': section(body, 'Próximo paso')[:2000],
            'source_path': rel_path,
        }

    return {
        'id': resolve_id(meta, user_id, rel_path),
        'title': title,
        'body': inbox_body(body),
        'source': scalar(meta, 'origen', 'Otra') or 'Otra',
        'status': INBOX_STATUS_TO_REMOTE.get(
            scalar(meta, 'estado', 'pendiente').strip(), 'pending'
        ),
        'source_path': rel_path,
    }


def render_note(
    entity: str,
    row: dict[str, Any],
    project_id_to_path: dict[str, str],
) -> str:
    if entity == 'task':
        project_path = project_id_to_path.get(row.get('project_id') or '')
        project_link = (
            f'[[{project_path.removesuffix(".md")}]]' if project_path else ''
        )
        return (
            '---\n'
            f"id: {row['id']}\n"
            'tipo: tarea\n'
            f"task_id: {row['id']}\n"
            f"google_id: {row.get('google_id') or ''}\n"
            f"estado: {TASK_STATUS_TO_LOCAL.get(row.get('status', 'pending'), 'pendiente')}\n"
            f"fecha: {row.get('due_date') or ''}\n"
            f"prioridad: {PRIORITY_TO_LOCAL.get(row.get('priority', 'normal'), 'normal')}\n"
            f"proyecto: {render_scalar(project_path or '')}\n"
            f"proyecto_id: {row.get('project_id') or ''}\n"
            'origen: web\n'
            'revisado:\n'
            '---\n'
            f"# {row.get('title', 'Tarea')}\n\n"
            f'Proyecto: {project_link}\n\n'
            f"Contexto: {row.get('context') or ''}\n"
        )

    if entity == 'project':
        return (
            '---\n'
            f"id: {row['id']}\n"
            'tipo: proyecto\n'
            f"estado: {PROJECT_STATUS_TO_LOCAL.get(row.get('status', 'active'), 'activo')}\n"
            f"area: {render_scalar(row.get('area') or '')}\n"
            f"creado: {datetime.now().strftime('%Y-%m-%d')}\n"
            'origen: web\n'
            'revisado:\n'
            'fuentes: []\n'
            '---\n'
            f"# {row.get('title', 'Proyecto')}\n\n"
            '## Resultado buscado\n\n'
            f"{row.get('result') or ''}\n\n"
            '## Estado actual\n\n'
            f"{row.get('current_state') or ''}\n\n"
            '## Próximo paso\n\n'
            f"{row.get('next_step') or ''}\n\n"
            '## Decisiones\n\n'
            '## Fuentes y archivos\n\n'
            '## Historial breve\n'
        )

    return (
        '---\n'
        f"id: {row['id']}\n"
        'tipo: entrada\n'
        f"origen: {row.get('source') or 'Otra'}\n"
        f"estado: {INBOX_STATUS_TO_LOCAL.get(row.get('status', 'pending'), 'pendiente')}\n"
        f"creado: {datetime.now().strftime('%Y-%m-%d')}\n"
        '---\n'
        f"# {row.get('title', 'Captura')}\n\n"
        f"{row.get('body') or ''}\n"
    )


def apply_remote(
    entity: str,
    text: str,
    row: dict[str, Any],
    project_id_to_path: dict[str, str],
) -> str:
    if entity == 'task':
        project_path = project_id_to_path.get(row.get('project_id') or '')
        text = set_frontmatter(
            text,
            {
                'id': row['id'],
                'estado': TASK_STATUS_TO_LOCAL.get(
                    row.get('status', 'pending'), 'pendiente'
                ),
                'fecha': row.get('due_date') or '',
                'prioridad': PRIORITY_TO_LOCAL.get(
                    row.get('priority', 'normal'), 'normal'
                ),
                'google_id': row.get('google_id') or '',
                'proyecto': project_path or '',
                'proyecto_id': row.get('project_id') or '',
            },
        )
        text = set_h1(text, row.get('title', 'Tarea'))
        text = set_project_line(text, project_path)
        text = set_context(text, row.get('context') or '')
        return text

    if entity == 'project':
        text = set_frontmatter(
            text,
            {
                'id': row['id'],
                'estado': PROJECT_STATUS_TO_LOCAL.get(
                    row.get('status', 'active'), 'activo'
                ),
                'area': row.get('area') or '',
            },
        )
        text = set_h1(text, row.get('title', 'Proyecto'))
        text = set_section(text, 'Resultado buscado', row.get('result') or '')
        text = set_section(text, 'Estado actual', row.get('current_state') or '')
        text = set_section(text, 'Próximo paso', row.get('next_step') or '')
        return text

    text = set_frontmatter(
        text,
        {
            'id': row['id'],
            'origen': row.get('source') or 'Otra',
            'estado': INBOX_STATUS_TO_LOCAL.get(
                row.get('status', 'pending'), 'pendiente'
            ),
        },
    )
    text = set_h1(text, row.get('title', 'Captura'))
    return replace_body(text, row.get('body') or '')


# ---------------------------------------------------------------------------
# Supabase REST
# ---------------------------------------------------------------------------


class SupabaseRest:
    def __init__(self, url: str, key: str, user_id: str, timeout: int = 30):
        self.url = url.rstrip('/')
        self.key = key
        self.user_id = user_id
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                'apikey': key,
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        )

    def _request(
        self,
        method: str,
        table: str,
        params: dict[str, str] | None = None,
        body: Any = None,
        prefer: str | None = None,
    ) -> Any:
        headers = {'Prefer': prefer} if prefer else {}
        response = self.session.request(
            method,
            f'{self.url}/rest/v1/{table}',
            params=params,
            json=body,
            headers=headers,
            timeout=self.timeout,
        )

        if response.status_code == 409:
            raise ConflictError(response.text[:500])

        response.raise_for_status()
        if not response.content:
            return None
        return response.json()

    def get_all(self, table: str) -> list[dict[str, Any]]:
        params = {'select': '*', 'user_id': f'eq.{self.user_id}'}
        if table in ('projects', 'tasks', 'inbox_items'):
            params['deleted_at'] = 'is.null'
        return self._request('GET', table, params=params) or []

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any] | None:
        result = self._request(
            'POST', table, body=row, prefer='return=representation'
        )
        return result[0] if isinstance(result, list) and result else result

    def update(
        self,
        table: str,
        row_id: str,
        expected_version: int,
        values: dict[str, Any],
    ) -> dict[str, Any] | None:
        params = {
            'id': f'eq.{row_id}',
            'version': f'eq.{expected_version}',
            'user_id': f'eq.{self.user_id}',
        }
        result = self._request(
            'PATCH',
            table,
            params=params,
            body=values,
            prefer='return=representation',
        )
        return result[0] if isinstance(result, list) and result else None

    def insert_operation(self, row: dict[str, Any]) -> None:
        self._request(
            'POST', 'sync_operations', body=row, prefer='return=minimal'
        )

    def insert_conflict(self, row: dict[str, Any]) -> None:
        self._request(
            'POST', 'sync_conflicts', body=row, prefer='return=minimal'
        )

    def insert_activity(self, row: dict[str, Any]) -> None:
        self._request(
            'POST', 'activity_entries', body=row, prefer='return=minimal'
        )


# ---------------------------------------------------------------------------
# Motor de sincronización
# ---------------------------------------------------------------------------


class SyncEngine:
    def __init__(
        self,
        root: Path,
        remote: Any,
        user_id: str,
        state_path: Path,
        dry_run: bool = False,
        entities: list[str] | None = None,
        now: datetime | None = None,
    ):
        self.root = Path(root)
        self.remote = remote
        self.user_id = user_id
        self.state_path = Path(state_path)
        self.dry_run = dry_run
        self.entities = entities or list(ENTITY_ORDER)
        self.now = now or datetime.now(timezone.utc)
        self.summary: dict[str, Any] = {
            'pushed': 0,
            'pulled': 0,
            'conflicts': 0,
            'skipped': 0,
            'errors': [],
        }
        self.actions: list[str] = []
        self._pending_conflicts: set[tuple[str, str]] = set()

    # -- estado ------------------------------------------------------------

    def load_state(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return {
                'version': 1,
                'entities': {entity: {} for entity in ENTITY_ORDER},
            }
        try:
            state = json.loads(self.state_path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            return {
                'version': 1,
                'entities': {entity: {} for entity in ENTITY_ORDER},
            }
        state.setdefault('version', 1)
        state.setdefault('entities', {})
        for entity in ENTITY_ORDER:
            state['entities'].setdefault(entity, {})
        return state

    def save_state(self, state: dict[str, Any]) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.state_path.with_suffix('.tmp')
        temp.write_text(
            json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8'
        )
        temp.replace(self.state_path)

    def now_iso(self) -> str:
        return self.now.isoformat()

    # -- lectura local -----------------------------------------------------

    def scan_local_raw(self) -> dict[str, dict[str, Note]]:
        raw: dict[str, dict[str, Note]] = {
            entity: {} for entity in ENTITY_ORDER
        }

        for entity, config in ENTITY_CONFIG.items():
            folder = self.root / config['folder']
            if not folder.exists():
                continue

            for path in folder.rglob('*.md'):
                if path.name in config['exclude']:
                    continue
                try:
                    text = path.read_text(encoding='utf-8')
                except OSError:
                    continue

                meta, body = parse_frontmatter(text)
                if scalar(meta, 'tipo').strip() != config['tipo']:
                    continue

                rel_path = path.relative_to(self.root).as_posix()
                entity_id = resolve_id(meta, self.user_id, rel_path)
                raw[entity][entity_id] = Note(
                    entity=entity,
                    id=entity_id,
                    path=path,
                    rel_path=rel_path,
                    text=text,
                    meta=meta,
                    body=body,
                )

        return raw

    def build_project_maps(
        self,
        raw_projects: dict[str, Note],
        remote_projects: dict[str, dict[str, Any]],
    ) -> tuple[dict[str, str], dict[str, str]]:
        path_to_id: dict[str, str] = {}
        id_to_path: dict[str, str] = {}

        for entity_id, note in raw_projects.items():
            id_to_path[entity_id] = note.rel_path
            for key in (
                note.rel_path,
                note.rel_path.removesuffix('.md'),
                Path(note.rel_path).stem,
                Path(note.rel_path).name,
            ):
                path_to_id[key] = entity_id

        for entity_id, row in remote_projects.items():
            source = row.get('source_path')
            if not source:
                continue
            id_to_path.setdefault(entity_id, source)
            for key in (
                source,
                source.removesuffix('.md'),
                Path(source).stem,
                Path(source).name,
            ):
                path_to_id.setdefault(key, entity_id)

        return path_to_id, id_to_path

    def build_local(
        self,
        raw: dict[str, dict[str, Note]],
        path_to_project: dict[str, str],
    ) -> dict[str, dict[str, Note]]:
        local: dict[str, dict[str, Note]] = {
            entity: {} for entity in ENTITY_ORDER
        }

        for entity in ENTITY_ORDER:
            for entity_id, note in raw[entity].items():
                note.payload = note_payload(
                    entity,
                    note.rel_path,
                    note.meta,
                    note.body,
                    path_to_project,
                    self.user_id,
                )
                local[entity][entity_id] = note

        return local

    def payload_from_text(
        self,
        entity: str,
        rel_path: str,
        text: str,
        path_to_project: dict[str, str],
    ) -> dict[str, Any]:
        meta, body = parse_frontmatter(text)
        return note_payload(
            entity, rel_path, meta, body, path_to_project, self.user_id
        )

    # -- escritura local ---------------------------------------------------

    def safe_target(self, rel_path: str) -> Path | None:
        rel = rel_path.replace('\\', '/').lstrip('/')
        try:
            target = (self.root / rel).resolve()
            target.relative_to(self.root.resolve())
        except (ValueError, OSError):
            return None

        allowed = [
            (self.root / ENTITY_CONFIG[entity]['folder']).resolve()
            for entity in ENTITY_ORDER
        ]
        if not any(target == folder or folder in target.parents for folder in allowed):
            return None
        return target

    def target_path(
        self,
        entity: str,
        row: dict[str, Any],
        project_id_to_path: dict[str, str],
    ) -> Path | None:
        source = row.get('source_path')
        if source:
            safe = self.safe_target(str(source))
            if safe is not None:
                return safe

        folder = self.root / ENTITY_CONFIG[entity]['folder']

        if entity in ('task', 'inbox'):
            return folder / f"{row['id']}.md"

        slug = slugify(row.get('title') or 'proyecto')
        candidate = folder / f'{slug}.md'
        if not candidate.exists():
            return candidate
        return folder / f"{slug}-{str(row['id'])[:8]}.md"

    # -- operaciones -------------------------------------------------------

    def record_operation(
        self,
        entity: str,
        entity_id: str,
        operation: str,
        payload: dict[str, Any],
        processed: bool = True,
        error: str | None = None,
    ) -> None:
        if self.dry_run:
            return

        row = {
            'user_id': self.user_id,
            'entity': entity,
            'entity_id': entity_id,
            'operation': operation,
            'payload': payload,
            'origin': 'pc_sync',
            'processed_at': self.now_iso() if processed else None,
            'error': error,
        }

        try:
            self.remote.insert_operation(row)
        except Exception as exc:  # noqa: BLE001 - se reporta sin romper el sync
            self.summary['errors'].append(
                f'No se pudo registrar operación {entity}/{entity_id}: {exc}'
            )

    def record_conflict(
        self,
        entity: str,
        entity_id: str,
        reason: str,
        local_payload: dict[str, Any] | None,
        remote_row: dict[str, Any] | None,
    ) -> None:
        key = (entity, entity_id)
        if key in self._pending_conflicts:
            return

        self._pending_conflicts.add(key)
        self.summary['conflicts'] += 1
        self.actions.append(f'conflicto {entity} {entity_id}: {reason}')

        if self.dry_run:
            return

        row = {
            'user_id': self.user_id,
            'entity': entity,
            'entity_id': entity_id,
            'local_version': {
                'reason': reason,
                'payload': local_payload,
            },
            'remote_version': {
                'payload': (
                    remote_payload(entity, remote_row) if remote_row else None
                ),
                'version': remote_row.get('version') if remote_row else None,
            },
            'status': 'pending',
        }

        try:
            self.remote.insert_conflict(row)
        except Exception as exc:  # noqa: BLE001
            self.summary['errors'].append(
                f'No se pudo registrar conflicto {entity}/{entity_id}: {exc}'
            )

        self.record_operation(
            entity,
            entity_id,
            'upsert',
            local_payload or {},
            processed=False,
            error=f'conflicto: {reason}',
        )

    def update_state(
        self,
        state: dict[str, Any],
        entity: str,
        entity_id: str,
        path: str,
        local_hash: str,
        remote_hash: str,
        remote_version: int,
    ) -> None:
        state['entities'].setdefault(entity, {})[entity_id] = {
            'path': path,
            'local_hash': local_hash,
            'remote_hash': remote_hash,
            'remote_version': remote_version,
            'last_synced_at': self.now_iso(),
        }

    # -- push --------------------------------------------------------------

    def push_insert(
        self,
        entity: str,
        note: Note,
        state: dict[str, Any],
    ) -> None:
        table = ENTITY_CONFIG[entity]['table']
        local_hash = hash_payload(note.payload)

        if self.dry_run:
            self.actions.append(f'crearía {entity} {note.rel_path}')
            self.summary['pushed'] += 1
            return

        row = {
            **note.payload,
            'user_id': self.user_id,
            'origin': 'pc_sync',
        }

        try:
            created = self.remote.insert(table, row)
        except ConflictError as exc:
            self.record_conflict(
                entity, note.id, 'la fila remota ya existe', note.payload, None
            )
            self.summary['errors'].append(
                f'{entity}/{note.id}: {exc}'
            )
            return
        except Exception as exc:  # noqa: BLE001
            self.summary['errors'].append(
                f'{entity}/{note.id}: no se pudo insertar: {exc}'
            )
            self.record_operation(
                entity,
                note.id,
                'upsert',
                note.payload,
                processed=False,
                error=str(exc),
            )
            return

        remote_version = int((created or {}).get('version') or 1)
        remote_hash = hash_payload(
            remote_payload(entity, created or note.payload)
        )
        self.update_state(
            state,
            entity,
            note.id,
            note.rel_path,
            local_hash,
            remote_hash,
            remote_version,
        )
        self.record_operation(entity, note.id, 'upsert', note.payload)
        self.summary['pushed'] += 1
        self.actions.append(f'empujada {entity} {note.rel_path}')

    def push_update(
        self,
        entity: str,
        note: Note,
        remote_row: dict[str, Any],
        state: dict[str, Any],
    ) -> None:
        table = ENTITY_CONFIG[entity]['table']
        local_hash = hash_payload(note.payload)
        expected_version = int(remote_row.get('version') or 1)

        if self.dry_run:
            self.actions.append(f'actualizaría {entity} {note.rel_path}')
            self.summary['pushed'] += 1
            return

        values = {
            key: value for key, value in note.payload.items() if key != 'id'
        }

        try:
            updated = self.remote.update(
                table, note.id, expected_version, values
            )
        except Exception as exc:  # noqa: BLE001
            self.summary['errors'].append(
                f'{entity}/{note.id}: no se pudo actualizar: {exc}'
            )
            self.record_operation(
                entity,
                note.id,
                'upsert',
                note.payload,
                processed=False,
                error=str(exc),
            )
            return

        if updated is None:
            self.record_conflict(
                entity,
                note.id,
                'la versión remota cambió durante la escritura',
                note.payload,
                remote_row,
            )
            return

        remote_version = int(updated.get('version') or expected_version + 1)
        remote_hash = hash_payload(remote_payload(entity, updated))
        self.update_state(
            state,
            entity,
            note.id,
            note.rel_path,
            local_hash,
            remote_hash,
            remote_version,
        )
        self.record_operation(entity, note.id, 'upsert', note.payload)
        self.summary['pushed'] += 1
        self.actions.append(f'actualizada {entity} {note.rel_path}')

    # -- pull --------------------------------------------------------------

    def pull_create(
        self,
        entity: str,
        row: dict[str, Any],
        state: dict[str, Any],
        path_to_project: dict[str, str],
        project_id_to_path: dict[str, str],
    ) -> None:
        target = self.target_path(entity, row, project_id_to_path)
        if target is None:
            self.record_conflict(
                entity,
                row['id'],
                'ruta remota fuera de las carpetas permitidas',
                None,
                row,
            )
            return

        rel_path = target.relative_to(self.root).as_posix()

        if target.exists():
            self.record_conflict(
                entity,
                row['id'],
                'la ruta local ya está ocupada por otra nota',
                None,
                row,
            )
            return

        text = render_note(entity, row, project_id_to_path)
        remote_hash = hash_payload(remote_payload(entity, row))

        if self.dry_run:
            self.actions.append(f'crearía nota local {rel_path}')
            self.summary['pulled'] += 1
            return

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')

        local_payload = self.payload_from_text(
            entity, rel_path, text, path_to_project
        )
        self.update_state(
            state,
            entity,
            row['id'],
            rel_path,
            hash_payload(local_payload),
            remote_hash,
            int(row.get('version') or 1),
        )
        self.record_operation(entity, row['id'], 'upsert', local_payload)
        self.summary['pulled'] += 1
        self.actions.append(f'creada nota local {rel_path}')

    def pull_update(
        self,
        entity: str,
        note: Note,
        row: dict[str, Any],
        state: dict[str, Any],
        path_to_project: dict[str, str],
        project_id_to_path: dict[str, str],
    ) -> None:
        new_text = apply_remote(
            entity, note.text, row, project_id_to_path
        )
        remote_hash = hash_payload(remote_payload(entity, row))

        if self.dry_run:
            self.actions.append(f'actualizaría nota local {note.rel_path}')
            self.summary['pulled'] += 1
            return

        note.path.write_text(new_text, encoding='utf-8')

        local_payload = self.payload_from_text(
            entity, note.rel_path, new_text, path_to_project
        )
        self.update_state(
            state,
            entity,
            note.id,
            note.rel_path,
            hash_payload(local_payload),
            remote_hash,
            int(row.get('version') or 1),
        )
        self.record_operation(entity, note.id, 'upsert', local_payload)
        self.summary['pulled'] += 1
        self.actions.append(f'actualizada nota local {note.rel_path}')

    # -- ciclo por entidad -------------------------------------------------

    def sync_entity(
        self,
        entity: str,
        state: dict[str, Any],
        local_notes: dict[str, Note],
        remote_rows: dict[str, dict[str, Any]],
        path_to_project: dict[str, str],
        project_id_to_path: dict[str, str],
        mode: str,
    ) -> None:
        entity_state = state['entities'].setdefault(entity, {})
        ids = sorted(set(local_notes) | set(remote_rows))

        for entity_id in ids:
            note = local_notes.get(entity_id)
            remote_row = remote_rows.get(entity_id)
            previous = entity_state.get(entity_id)

            if note and not remote_row:
                if previous and previous.get('remote_version') is not None:
                    self.record_conflict(
                        entity,
                        entity_id,
                        'la fila remota desapareció; no se recrea sola',
                        note.payload,
                        None,
                    )
                elif mode in ('push', 'sync'):
                    self.push_insert(entity, note, state)
                else:
                    self.summary['skipped'] += 1
                continue

            if remote_row and not note:
                if previous and previous.get('local_hash'):
                    self.record_conflict(
                        entity,
                        entity_id,
                        'la nota local desapareció; no se recrea sola',
                        None,
                        remote_row,
                    )
                elif mode in ('pull', 'sync'):
                    self.pull_create(
                        entity,
                        remote_row,
                        state,
                        path_to_project,
                        project_id_to_path,
                    )
                else:
                    self.summary['skipped'] += 1
                continue

            if not note or not remote_row:
                continue

            local_hash = hash_payload(note.payload)
            remote_hash = hash_payload(remote_payload(entity, remote_row))

            if previous is None:
                if local_hash == remote_hash:
                    self.update_state(
                        state,
                        entity,
                        entity_id,
                        note.rel_path,
                        local_hash,
                        remote_hash,
                        int(remote_row.get('version') or 1),
                    )
                else:
                    self.record_conflict(
                        entity,
                        entity_id,
                        'primer encuentro con contenidos distintos',
                        note.payload,
                        remote_row,
                    )
                continue

            local_changed = local_hash != previous.get('local_hash')
            remote_changed = remote_hash != previous.get('remote_hash')

            if not local_changed and not remote_changed:
                self.summary['skipped'] += 1
                continue

            if local_changed and not remote_changed:
                if mode in ('push', 'sync'):
                    self.push_update(entity, note, remote_row, state)
                else:
                    self.summary['skipped'] += 1
                continue

            if remote_changed and not local_changed:
                if mode in ('pull', 'sync'):
                    self.pull_update(
                        entity,
                        note,
                        remote_row,
                        state,
                        path_to_project,
                        project_id_to_path,
                    )
                else:
                    self.summary['skipped'] += 1
                continue

            if local_hash == remote_hash:
                self.update_state(
                    state,
                    entity,
                    entity_id,
                    note.rel_path,
                    local_hash,
                    remote_hash,
                    int(remote_row.get('version') or 1),
                )
                continue

            self.record_conflict(
                entity,
                entity_id,
                'local y remoto cambiaron desde el último sync',
                note.payload,
                remote_row,
            )

    # -- corrida -----------------------------------------------------------

    def run(self, mode: str = 'sync') -> dict[str, Any]:
        state = self.load_state()
        raw = self.scan_local_raw()

        remote: dict[str, dict[str, dict[str, Any]]] = {}
        for entity in ENTITY_ORDER:
            rows = self.remote.get_all(ENTITY_CONFIG[entity]['table'])
            remote[entity] = {row['id']: row for row in rows}

        path_to_project, project_id_to_path = self.build_project_maps(
            raw['project'], remote['project']
        )
        local = self.build_local(raw, path_to_project)

        self._pending_conflicts = {
            (row.get('entity'), row.get('entity_id'))
            for row in self.remote.get_all('sync_conflicts')
            if row.get('status') == 'pending'
        }

        for entity in ENTITY_ORDER:
            if entity not in self.entities:
                continue
            self.sync_entity(
                entity,
                state,
                local[entity],
                remote[entity],
                path_to_project,
                project_id_to_path,
                mode,
            )

        if not self.dry_run:
            self.save_state(state)
            self.append_activity(mode)
            self.push_activity(mode)

        return self.summary

    # -- actividad ---------------------------------------------------------

    def append_activity(self, mode: str) -> None:
        month = self.now.astimezone().strftime('%Y-%m')
        day = self.now.astimezone().strftime('%Y-%m-%d')
        folder = self.root / '08 Automatizacion' / 'Actividad'
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f'{month}.md'

        if not path.exists():
            path.write_text(
                f'# Actividad de automatizaciones · {month}\n\n',
                encoding='utf-8',
            )

        line = (
            f"- {day} · sync_supabase · modo {mode} · "
            f"Empujadas {self.summary['pushed']} · "
            f"Traídas {self.summary['pulled']} · "
            f"Conflictos {self.summary['conflicts']} · "
            f"Omitidas {self.summary['skipped']} · "
            f"Errores {len(self.summary['errors'])} · "
            f"dry-run: {'sí' if self.dry_run else 'no'} · "
            'Revisión: pendiente.\n'
        )

        with path.open('a', encoding='utf-8') as handle:
            handle.write(line)

    def push_activity(self, mode: str) -> None:
        if mode not in ('push', 'sync'):
            return

        month = self.now.astimezone().strftime('%Y-%m')
        source_path = f'08 Automatizacion/Actividad/{month}.md'

        row = {
            'id': str(uuid.uuid4()),
            'user_id': self.user_id,
            'occurred_at': self.now_iso(),
            'agent': 'sync_supabase',
            'action': 'Sincronización PC ↔ Supabase',
            'result': (
                f"Empujadas {self.summary['pushed']} · "
                f"Traídas {self.summary['pulled']} · "
                f"Conflictos {self.summary['conflicts']} · "
                f"Omitidas {self.summary['skipped']}"
            ),
            'files': [source_path],
            'errors': '; '.join(self.summary['errors'])[:2000],
            'review_status': 'pending',
            'source_path': source_path,
            'origin': 'pc_sync',
        }

        try:
            self.remote.insert_activity(row)
        except Exception as exc:  # noqa: BLE001
            self.summary['errors'].append(
                f'No se pudo registrar la actividad en Supabase: {exc}'
            )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def default_state_path() -> Path:
    configured = os.environ.get('BOVEDA_SYNC_STATE')
    if configured:
        return Path(configured)

    private = Path(
        os.environ.get(
            'OBSIDIAN_PERSONAL_STATE_DIR',
            str(Path.home() / 'AppData' / 'Local' / 'ObsidianPersonalSync'),
        )
    )
    return private / 'supabase_sync_state.json'


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Sincroniza notas operativas de la bóveda con Supabase.'
    )
    parser.add_argument(
        '--mode',
        choices=('push', 'pull', 'sync'),
        default='sync',
        help='push: local a remoto; pull: remoto a local; sync: ambos (por defecto).',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Muestra lo que haría sin escribir en Supabase, en la bóveda ni en el estado.',
    )
    parser.add_argument(
        '--entity',
        action='append',
        choices=ENTITY_ORDER,
        help='Limita la corrida a una entidad. Se puede repetir.',
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    url = os.environ.get('SUPABASE_URL', '').strip()
    key = (
        os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        or os.environ.get('SUPABASE_SECRET_KEY')
        or ''
    ).strip()
    user_id = valid_uuid(os.environ.get('BOVEDA_USER_ID', ''))

    missing = []
    if not url:
        missing.append('SUPABASE_URL')
    if not key:
        missing.append('SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY)')
    if not user_id:
        missing.append('BOVEDA_USER_ID (UUID válido)')

    if missing:
        print('Faltan variables de entorno: ' + ', '.join(missing), file=sys.stderr)
        print(
            'Definilas fuera de la bóveda, por ejemplo en el entorno del usuario de Windows.',
            file=sys.stderr,
        )
        print('No se escribió ningún cambio.', file=sys.stderr)
        return 2

    if requests is None:
        print(
            'Falta la dependencia requests. Instalá herramientas/requirements.txt.',
            file=sys.stderr,
        )
        print('No se escribió ningún cambio.', file=sys.stderr)
        return 2

    remote = SupabaseRest(url, key, user_id)
    engine = SyncEngine(
        root=ROOT,
        remote=remote,
        user_id=user_id,
        state_path=default_state_path(),
        dry_run=args.dry_run,
        entities=args.entity,
    )

    print(f"Modo {args.mode} · dry-run: {'sí' if args.dry_run else 'no'}")
    summary = engine.run(args.mode)

    print(
        f"Empujadas: {summary['pushed']} · "
        f"Traídas: {summary['pulled']} · "
        f"Conflictos: {summary['conflicts']} · "
        f"Omitidas: {summary['skipped']}"
    )

    for action in engine.actions:
        print(f'  - {action}')

    for error in summary['errors']:
        print(f'  ! {error}', file=sys.stderr)

    return 0 if not summary['errors'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
