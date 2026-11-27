"""Captura de Calendar, Gmail y YouTube con privacidad y curaduría explícitas."""
import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path(os.environ.get('OBSIDIAN_PERSONAL_STATE_DIR', str(Path.home() / 'AppData' / 'Local' / 'ObsidianPersonalSync')))
CLIENT = PRIVATE / 'client_secret.json'
TOKEN = PRIVATE / 'google_read_token.json'
RULES = ROOT / 'herramientas' / 'reglas_gmail.json'
CHANNELS = ROOT / '04 Conocimiento' / 'Fuentes' / 'Canales aprobados.md'
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/youtube.readonly']

def configuration():
    defaults = {'guardar_detalle_gmail': False, 'minutos_minimos_youtube': 10, 'reglas_gmail': []}
    return {**defaults, **json.loads(RULES.read_text(encoding='utf-8'))} if RULES.exists() else defaults

def classify_mail(sender, subject, rules):
    text = (sender + ' ' + subject).casefold()
    for rule in rules:
        if any(term.casefold() in text for term in rule.get('contiene', [])):
            return rule['categoria'], rule.get('motivo', 'Regla revisable')
    return 'revisar', 'Sin regla coincidente'

def session():
    PRIVATE.mkdir(parents=True, exist_ok=True)
    if not CLIENT.exists():
        raise SystemExit(f'Falta el cliente OAuth: {CLIENT}')
    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES) if TOKEN.exists() else None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds = InstalledAppFlow.from_client_secrets_file(CLIENT, SCOPES).run_local_server(port=0)
        TOKEN.write_text(creds.to_json(), encoding='utf-8')
    return AuthorizedSession(creds)

def get(s, url, **params):
    response = s.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()

def escape(value):
    return str(value or '').replace('\\', '\\\\').replace('\n', ' ').replace('\r', ' ').replace('|', '\\|').replace('[', '\\[').replace(']', '\\]')

def calendar(s, now):
    events = get(s, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', timeMin=now.isoformat(), timeMax=(now + timedelta(days=7)).isoformat(), singleEvents='true', orderBy='startTime', maxResults=100).get('items', [])
    return [{'title': e.get('summary', '(sin título)'), 'start': e.get('start', {}).get('dateTime', e.get('start', {}).get('date', '')), 'url': e.get('htmlLink', ''), 'id': e['id']} for e in events if e.get('status') != 'cancelled']

def gmail(s, config):
    ids = get(s, 'https://gmail.googleapis.com/gmail/v1/users/me/messages', q='is:unread in:inbox -category:promotions', maxResults=40).get('messages', [])
    messages = []
    for ref in ids:
        m = get(s, f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{ref["id"]}', format='metadata', metadataHeaders=['From', 'Subject', 'Date'])
        headers = {h['name'].lower(): h['value'] for h in m.get('payload', {}).get('headers', [])}
        category, reason = classify_mail(headers.get('from', ''), headers.get('subject', ''), config['reglas_gmail'])
        item = {'id': m['id'], 'categoria_sugerida': category, 'motivo': reason}
        if config['guardar_detalle_gmail']:
            item.update({'from': headers.get('from', ''), 'subject': headers.get('subject', ''), 'date': headers.get('date', '')})
        messages.append(item)
    return messages

def approved_channels():
    if not CHANNELS.exists():
        return []
    rows = [line.strip().strip('|').split('|') for line in CHANNELS.read_text(encoding='utf-8').splitlines() if line.strip().startswith('|')]
    channels = []
    for row in rows[2:]:
        if len(row) >= 6 and row[4].strip().casefold() == 'aprobado' and row[1].strip():
            channels.append({'canal': row[0].strip(), 'canal_id': row[1].strip(), 'tema': row[2].strip(), 'motivo': row[3].strip()})
    return channels

def iso_seconds(value):
    match = re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', value or '')
    return 0 if not match else sum(int(part or 0) * factor for part, factor in zip(match.groups(), (3600, 60, 1)))

def youtube(s, config):
    found, seen = [], set()
    for channel in approved_channels():
        items = get(s, 'https://www.googleapis.com/youtube/v3/search', part='snippet', type='video', channelId=channel['canal_id'], maxResults=10, order='date').get('items', [])
        ids = [item.get('id', {}).get('videoId') for item in items if item.get('id', {}).get('videoId')]
        details = get(s, 'https://www.googleapis.com/youtube/v3/videos', part='contentDetails', id=','.join(ids)).get('items', []) if ids else []
        duration = {item['id']: iso_seconds(item.get('contentDetails', {}).get('duration')) for item in details}
        for item in items:
            video_id = item.get('id', {}).get('videoId')
            if not video_id or video_id in seen or duration.get(video_id, 0) < config['minutos_minimos_youtube'] * 60:
                continue
            seen.add(video_id)
            found.append({'id': video_id, 'topic': channel['tema'], 'title': item['snippet']['title'], 'channel': item['snippet']['channelTitle'], 'published': item['snippet']['publishedAt'], 'url': 'https://www.youtube.com/watch?v=' + video_id, 'approved': True, 'duration_seconds': duration[video_id]})
    return found

def append_activity(now, results, errors):
    folder = ROOT / '08 Automatizacion' / 'Actividad'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{now:%Y-%m}.md'
    if not path.exists():
        path.write_text(f'# Actividad de automatizaciones · {now:%Y-%m}\n', encoding='utf-8')
    outcome = 'sin errores' if not errors else 'errores: ' + ', '.join(sorted(errors))
    with path.open('a', encoding='utf-8') as log:
        log.write(f'\n- {now.isoformat(timespec="seconds")} · google_collect.py · Calendar {len(results.get("calendar", []))}, Gmail {len(results.get("gmail", []))}, YouTube {len(results.get("youtube", []))}; {outcome}. Datos: 08 Automatizacion/Entradas. Revisión: pendiente.\n')

def main():
    now, config, s = datetime.now().astimezone(), configuration(), session()
    results, errors = {}, {}
    for name, fn in [('calendar', lambda: calendar(s, now)), ('gmail', lambda: gmail(s, config)), ('youtube', lambda: youtube(s, config))]:
        try:
            results[name] = fn()
        except Exception as exc:
            errors[name] = f'{type(exc).__name__}: {exc}'
    stamp = now.strftime('%Y-%m-%d-%H%M%S')
    folder = ROOT / '08 Automatizacion' / 'Entradas'
    folder.mkdir(parents=True, exist_ok=True)
    payload = {'captured': now.isoformat(), 'privacy': {'gmail_details': config['guardar_detalle_gmail']}, 'data': results, 'errors': errors}
    (folder / f'{stamp}.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    lines = [f'# Entradas externas · {stamp}', '', 'Datos capturados mediante API; no equivalen a recomendaciones verificadas.', '', '## Agenda · próximos 7 días', '']
    lines += [f'- {escape(e["start"])} · [{escape(e["title"])}]({e["url"]})' for e in results.get('calendar', [])]
    lines += ['', '## Gmail · pendientes de lectura', '']
    lines += [f'- **{escape(m["categoria_sugerida"])}** · [Abrir en Gmail](https://mail.google.com/mail/u/0/#all/{m["id"]}) · Regla: {escape(m["motivo"])}' for m in results.get('gmail', [])]
    lines += ['', '## YouTube · fuentes aprobadas', '']
    lines += [f'- {escape(v["topic"])} · [{escape(v["title"])}]({v["url"]}) · {escape(v["channel"])}' for v in results.get('youtube', [])]
    if errors:
        lines += ['', '## Errores', ''] + [f'- {name}: {escape(error)}' for name, error in errors.items()]
    (folder / f'{stamp}.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    append_activity(now, results, errors)
    print(json.dumps({'captured': now.isoformat(), 'counts': {k: len(v) for k, v in results.items()}, 'errors': errors}, ensure_ascii=False))

if __name__ == '__main__':
    main()
