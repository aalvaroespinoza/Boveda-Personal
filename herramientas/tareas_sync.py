"""Concilia notas de 06 Tareas con Google Tasks; nunca borra tareas."""
import hashlib
import json
import re
import os
from pathlib import Path
from urllib.parse import quote

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '06 Tareas'
PRIVATE = Path(os.environ.get('OBSIDIAN_PERSONAL_STATE_DIR', str(Path.home() / 'AppData' / 'Local' / 'ObsidianPersonalSync')))
STATE = PRIVATE / 'state.json'
TOKEN = PRIVATE / 'token.json'
CLIENT = PRIVATE / 'client_secret.json'
SCOPE = ['https://www.googleapis.com/auth/tasks']
API = 'https://tasks.googleapis.com/tasks/v1'
MARKER = 'Obsidian Personal:'


def prop(body, name):
    match = re.search(rf'^{re.escape(name)}:[ \t]*(.*)$', body, re.M)
    return match.group(1).strip().strip('"') if match else ''


def setprop(body, name, value):
    pattern = rf'^{re.escape(name)}:.*$'
    line = f'{name}: {value}'
    return re.sub(pattern, line, body, count=1, flags=re.M) if re.search(pattern, body, re.M) else body.replace('---\n', f'---\n{line}\n', 1)


def local_data(path):
    body = path.read_text(encoding='utf-8')
    title = re.search(r'^# (.+)$', body, re.M)
    return {'title': title.group(1) if title else path.stem,
            'status': 'completed' if prop(body, 'estado') in ('completada', 'pendiente_sincronizacion') else 'needsAction',
            'due': prop(body, 'fecha'), 'path': str(path.relative_to(ROOT)).replace('\\', '/'),
            'google_id': prop(body, 'google_id'), 'body': body}


def comparable(task):
    return {key: task.get(key, '') for key in ('title', 'status', 'due')}


def digest(task):
    return hashlib.sha256(json.dumps(comparable(task), sort_keys=True).encode()).hexdigest()


def auth():
    PRIVATE.mkdir(parents=True, exist_ok=True)
    if not CLIENT.exists():
        raise SystemExit(f'Falta {CLIENT}. Crear credenciales OAuth de aplicación de escritorio para Google Tasks API.')
    creds = Credentials.from_authorized_user_file(TOKEN, SCOPE) if TOKEN.exists() else None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds = InstalledAppFlow.from_client_secrets_file(CLIENT, SCOPE).run_local_server(port=0)
        TOKEN.write_text(creds.to_json(), encoding='utf-8')
    return AuthorizedSession(creds)


def request(session, method, url, **kwargs):
    response = session.request(method, url, timeout=30, **kwargs)
    response.raise_for_status()
    return response.json() if response.content else {}


def all_tasks(session, list_id):
    items, page = [], None
    while True:
        params = {'showCompleted': 'true', 'showHidden': 'true', 'showDeleted': 'false', 'maxResults': 100}
        if page:
            params['pageToken'] = page
        result = request(session, 'GET', f'{API}/lists/{quote(list_id)}/tasks', params=params)
        items.extend(result.get('items', []))
        page = result.get('nextPageToken')
        if not page:
            return items


def remote_data(item):
    return {'title': item.get('title', ''), 'status': item.get('status', 'needsAction'),
            'due': item.get('due', '')[:10]}


def linked_notes(existing, path):
    marker = f'{MARKER} {path}'
    if marker in existing:
        return existing
    result = existing.rstrip() + ('\n\n' if existing.strip() else '') + marker
    if len(result) > 8192:
        raise ValueError('Las notas de Google Tasks son demasiado largas para añadir el vínculo de Obsidian')
    return result


def remote_payload(local, existing_notes=''):
    payload = {'title': local['title'], 'status': local['status'],
               'notes': linked_notes(existing_notes, local['path']), 'due': None}
    if local['due']:
        payload['due'] = local['due'] + 'T12:00:00.000Z'
    return payload


def update_local(path, item):
    old = path.read_text(encoding='utf-8')
    body = setprop(old, 'google_id', item['id'])
    body = setprop(body, 'estado', 'completada' if item.get('status') == 'completed' else 'pendiente')
    body = setprop(body, 'fecha', item.get('due', '')[:10])
    title = item.get('title', path.stem).replace('\r', ' ').replace('\n', ' ')
    body = re.sub(r'^# .+$', lambda _: '# ' + title, body, count=1, flags=re.M)
    if body != old:
        path.write_text(body, encoding='utf-8')


def main():
    LOCAL.mkdir(exist_ok=True)
    session = auth()
    lists = request(session, 'GET', f'{API}/users/@me/lists').get('items', [])
    selected = next((item for item in lists if item['title'] == 'Obsidian Personal'), None)
    if not selected:
        selected = request(session, 'POST', f'{API}/users/@me/lists', json={'title': 'Obsidian Personal'})
    list_id = selected['id']
    url = f'{API}/lists/{quote(list_id)}/tasks'
    remote = {item['id']: item for item in all_tasks(session, list_id)}
    old_state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    new_state = dict(old_state)
    conflicts = []
    paths = list(LOCAL.glob('*.md'))
    seen = set()
    for path in paths:
        local = local_data(path)
        gid = local['google_id']
        if not gid:
            created = request(session, 'POST', url, json=remote_payload(local))
            update_local(path, created)
            new_state[created['id']] = comparable(local)
            seen.add(created['id'])
            continue
        seen.add(gid)
        item = remote.get(gid)
        if not item:
            conflicts.append(f'{path.name}: la tarea vinculada no aparece en Google; revisar manualmente')
            continue
        before = old_state.get(gid)
        local_cmp, remote_cmp = comparable(local), remote_data(item)
        if before is None:
            if local_cmp != remote_cmp:
                conflicts.append(f'{path.name}: versiones iniciales diferentes')
            else:
                new_state[gid] = local_cmp
            continue
        changed_local = {k for k in local_cmp if local_cmp[k] != before.get(k, '')}
        changed_remote = {k for k in remote_cmp if remote_cmp[k] != before.get(k, '')}
        if changed_local & changed_remote:
            conflicts.append(f"{path.name}: conflicto en {', '.join(sorted(changed_local & changed_remote))}; local={local_cmp}; Google={remote_cmp}")
            continue
        merged = dict(before)
        merged.update({k: local_cmp[k] for k in changed_local})
        merged.update({k: remote_cmp[k] for k in changed_remote})
        if merged != remote_cmp:
            payload = remote_payload({**local, **merged}, item.get('notes', ''))
            item = request(session, 'PATCH', f'{url}/{quote(gid)}', json=payload)
        if merged != local_cmp:
            update_local(path, item)
        new_state[gid] = merged
    for gid, item in remote.items():
        if gid in seen:
            continue
        notes = item.get('notes', '')
        if MARKER in notes:
            conflicts.append(f'{gid}: falta la nota local vinculada; revisar manualmente')
            continue
        title = item.get('title', 'Tarea').replace('\r', ' ').replace('\n', ' ')
        path = LOCAL / f'{gid}.md'
        if path.exists():
            conflicts.append(f'{gid}: ya existe una nota local con ese nombre; revisar manualmente')
            continue
        try:
            annotated_notes = linked_notes(notes, path.relative_to(ROOT).as_posix())
        except ValueError as exc:
            conflicts.append(f'{gid}: {exc}')
            continue
        body = f"---\ntipo: tarea\ntask_id: {gid}\ngoogle_id: {gid}\nestado: {'completada' if item.get('status') == 'completed' else 'pendiente'}\nfecha: {item.get('due', '')[:10]}\nproyecto:\n---\n# {title}\n\nContexto: {notes.strip()}\n"
        path.write_text(body, encoding='utf-8')
        try:
            request(session, 'PATCH', f'{url}/{quote(gid)}', json={'notes': annotated_notes})
        except Exception:
            path.unlink()
            raise
        new_state[gid] = remote_data(item)
    STATE.write_text(json.dumps(new_state, ensure_ascii=False, indent=2), encoding='utf-8')
    report = ROOT / '08 Automatizacion' / 'Conflictos de tareas.md'
    report.parent.mkdir(parents=True, exist_ok=True)
    if conflicts:
        report.write_text('# Conflictos de tareas\n\n' + '\n'.join('- ' + x for x in conflicts) + '\n', encoding='utf-8')
        print(f'{len(conflicts)} conflictos; ver {report}')
    else:
        report.write_text('# Conflictos de tareas\n\nSin conflictos pendientes en la última conciliación.\n', encoding='utf-8')
        print('Tareas conciliadas sin conflictos')


if __name__ == '__main__':
    main()
