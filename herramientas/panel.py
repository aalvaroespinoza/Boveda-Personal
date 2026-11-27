"""API local para la bóveda. Iniciar con: python herramientas/panel.py"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import csv
import base64
import binascii
import json
import re
import uuid
from datetime import date, datetime
from decimal import Decimal
import sys
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_HOSTS = {'127.0.0.1:4320', 'localhost:4320', 'alvaro.tail6efed3.ts.net'}
ALLOWED_ORIGINS = {'http://127.0.0.1:4320', 'http://localhost:4320',
                   'https://alvaro.tail6efed3.ts.net'}


def notes(folder):
    result = []
    for path in (ROOT / folder).rglob('*.md'):
        body = path.read_text(encoding='utf-8')
        title = re.search(r'^#\s+(.+)$', body, re.M)
        result.append({'path': path.relative_to(ROOT).as_posix(),
                       'title': title.group(1) if title else path.stem,
                       'updated': path.stat().st_mtime})
    return sorted(result, key=lambda x: x['updated'], reverse=True)


def rows(path):
    with (ROOT / path).open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def amount_cents(value, allow_zero=False):
    raw = str(value).strip()
    if not re.fullmatch(r'\d+(?:[.,]\d{1,2})?', raw):
        raise ValueError('Importe inválido: usá pesos y hasta dos decimales')
    cents = int(Decimal(raw.replace(',', '.')) * 100)
    if cents < 0 or (cents == 0 and not allow_zero):
        raise ValueError('El importe debe ser positivo')
    return cents


def field(body, name):
    match = re.search(rf'^{re.escape(name)}:[ \t]*(.*)$', body, re.M)
    raw = match.group(1).strip() if match else ''
    if raw.startswith('"'):
        try:
            return json.loads(raw)
        except ValueError:
            pass
    return raw


def clean_text_preview(body, max_len=220):
    if not body:
        return ''
    t = re.sub(r'^---\s*\n[\s\S]*?\n---\s*', '', body)
    t = re.sub(r'^#+\s+.*$', '', t, flags=re.M)
    t = re.sub(r'\[![^\]]+\]\s*', '', t)
    t = re.sub(r'!\[.*?\](?:\(.*?\)|\[.*?\])', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'[*_`#>]', '', t)
    lines = []
    for line in t.split('\n'):
        s = line.strip()
        if not s:
            continue
        if s.startswith(('Inicio', 'Mis días', 'http://', 'https://')) and len(s) < 80:
            continue
        lines.append(s)
    clean = ' '.join(lines)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:max_len]


def clean_link(val):
    if not val:
        return ''
    m = re.search(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', str(val))
    return m.group(1).split('/')[-1] if m else str(val).split('/')[-1].replace('.md', '')


def extract_aliases(body):
    match = re.search(r'^aliases:\s*(\[.*?\]|.+)$', body, re.M)
    if not match:
        return []
    raw = match.group(1).strip()
    if raw.startswith('[') and raw.endswith(']'):
        raw = raw[1:-1]
    items = [a.strip().strip('"\'') for a in raw.split(',') if a.strip()]
    return items[:3]


def section(body, heading):
    match = re.search(rf'^##[ \t]+{re.escape(heading)}[ \t]*\n(.*?)(?=^##[ \t]+|\Z)', body, re.M | re.S)
    if not match:
        return ''
    return clean_text_preview(match.group(1), max_len=400)


def project_notes():
    result = []
    for path in (ROOT / '02 Proyectos').rglob('*.md'):
        if path.name in ('Proyectos.md', 'AGENTS.md'):
            continue
        body = path.read_text(encoding='utf-8')
        title = re.search(r'^#\s+(.+)$', body, re.M)
        result.append({'path': path.relative_to(ROOT).as_posix(),
                       'title': title.group(1) if title else path.stem,
                       'status': field(body, 'estado') or 'activo',
                       'area': clean_link(field(body, 'area')),
                       'current': section(body, 'Estado actual'),
                       'next_step': section(body, 'Próximo paso'),
                       'result': section(body, 'Resultado buscado'),
                       'updated': path.stat().st_mtime})
    return sorted(result, key=lambda x: (x['status'] != 'activo', -x['updated']))


def task_notes():
    result = []
    for path in (ROOT / '06 Tareas').glob('*.md'):
        body = path.read_text(encoding='utf-8')
        title = re.search(r'^#\s+(.+)$', body, re.M)
        status = field(body, 'estado')
        result.append({'id': path.stem, 'title': title.group(1) if title else path.stem,
                       'status': status, 'due': field(body, 'fecha'),
                       'priority': field(body, 'prioridad'),
                       'project': field(body, 'proyecto'),
                       'context': body.split('Contexto:', 1)[-1].strip()[:500] if 'Contexto:' in body else '',
                       'path': path.relative_to(ROOT).as_posix()})
    return sorted(result, key=lambda x: (x['status'] == 'completada', x['due'] or '9999', x['title'].casefold()))


def balances(openings, moves, through=None):
    result = {r['cuenta']: int(r['saldo_centavos']) for r in openings}
    for row in moves:
        if through and row['fecha'] > through:
            continue
        source, amount = row['cuenta_origen'], int(row['importe_centavos'])
        if source not in result:
            continue
        result[source] += amount if row['tipo'] == 'ingreso' else -amount
        if row['tipo'] == 'transferencia' and row['cuenta_destino'] in result:
            result[row['cuenta_destino']] += amount
    return result


def study_notes():
    result = []
    for folder in ('Hacking/Temas', 'Hacking/Cursos', '04 Conocimiento'):
        target = ROOT / folder
        if not target.exists():
            continue
        for file_path in target.rglob('*.md'):
            if file_path.name in ('AGENTS.md',) or 'Fuentes' in file_path.parts:
                continue
            try:
                body = file_path.read_text(encoding='utf-8')
                title_match = re.search(r'^#\s+(.+)$', body, re.M)
                title = title_match.group(1) if title_match else file_path.stem
                topic = file_path.parent.name
                aliases = extract_aliases(body)
                preview = clean_text_preview(body)
                result.append({
                    'path': file_path.relative_to(ROOT).as_posix(),
                    'title': title,
                    'topic': topic,
                    'aliases': aliases,
                    'updated': file_path.stat().st_mtime,
                    'preview': preview
                })
            except Exception:
                pass
    return sorted(result, key=lambda x: -x['updated'])[:30]


def recent_notes():
    result = []
    skip_dirs = {'.obsidian', 'herramientas', 'Plantillas', 'tests', 'supabase', 'web'}
    for p in ROOT.rglob('*.md'):
        if any(part in skip_dirs or part.startswith('.') for part in p.parts):
            continue
        if p.name in ('AGENTS.md',):
            continue
        try:
            result.append({
                'path': p.relative_to(ROOT).as_posix(),
                'title': p.stem,
                'updated': p.stat().st_mtime,
                'folder': p.parent.relative_to(ROOT).as_posix()
            })
        except Exception:
            pass
    return sorted(result, key=lambda x: -x['updated'])[:20]


def dashboard():
    projects = project_notes()
    tasks = task_notes() if (ROOT / '06 Tareas').exists() else []
    inbox = [n for n in notes('01 Entrada') if not n['path'].endswith('/Entrada.md')]
    openings = rows('datos/saldos_iniciales.csv')
    moves = rows('datos/movimientos.csv')
    balance = balances(openings, moves)
    reconciliations = rows('datos/conciliaciones.csv') if (ROOT / 'datos' / 'conciliaciones.csv').exists() else []
    last_reconciliation = {}
    for row in reconciliations:
        last_reconciliation[row['cuenta']] = {'fecha': row['fecha'], 'estado': row['estado'],
                                              'diferencia': f"{Decimal(row['diferencia_centavos']) / 100:.2f}"}
    captures = sorted((ROOT / '08 Automatizacion' / 'Entradas').glob('*.json'), reverse=True) if (ROOT / '08 Automatizacion' / 'Entradas').exists() else []
    latest = json.loads(captures[0].read_text(encoding='utf-8')) if captures else None
    return {'projects': projects, 'tasks': tasks, 'inbox': inbox,
            'study_notes': study_notes(),
            'recent_notes': recent_notes(),
            'vault_name': 'Boveda Personal',
            'study_stage': {
                'course': 'Introducción al Hacking',
                'stage': '03 / Reconocimiento',
                'current_topic': 'Nmap',
                'note_path': 'Hacking/Cursos/Hack4u/Introducción al Hacking · Mi apunte.md',
                'machete_path': 'Hacking/Temas/Reconocimiento/Nmap - Comandos.md',
                'home_path': 'Hacking/00_Ciberseguridad.md'
            },
            'finance': {k: f'{Decimal(v) / 100:.2f}' for k, v in balance.items()},
            'reconciliation': last_reconciliation,
            'movements': len(moves),
            'external': latest.get('data', {}) if latest else {},
            'external_capture': {'captured': latest.get('captured'),
                                 'counts': {k: len(v) for k, v in latest.get('data', {}).items()},
                                 'errors': latest.get('errors', {})} if latest else None}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # pythonw.exe no tiene stderr; el registro predeterminado cortaría la respuesta.
        pass

    def send(self, status, data, content_type='application/json; charset=utf-8'):
        body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(body)

    def allowed_request(self):
        host = self.headers.get('Host', '').lower()
        if host not in ALLOWED_HOSTS:
            return False
        if self.headers.get('Sec-Fetch-Site', '').lower() == 'cross-site':
            return False
        origin = self.headers.get('Origin', '')
        return not origin or origin in ALLOWED_ORIGINS

    def do_GET(self):
        if not self.allowed_request():
            return self.send(403, {'error': 'Origen no permitido'})
        path = urlparse(self.path).path
        if path == '/api/health':
            return self.send(200, {'ok': True})
        if path == '/api/dashboard':
            return self.send(200, dashboard())
        if path == '/api/note':
            query = parse_qs(urlparse(self.path).query)
            note_path = query.get('path', [''])[0].strip()
            if not note_path or '..' in note_path:
                return self.send(400, {'error': 'Ruta de nota inválida'})
            target = (ROOT / note_path).resolve()
            if not str(target).startswith(str(ROOT)) or not target.exists() or not target.is_file():
                return self.send(404, {'error': 'Nota no encontrada'})
            try:
                content = target.read_text(encoding='utf-8')
                return self.send(200, {
                    'path': note_path,
                    'title': target.stem,
                    'content': content,
                    'updated': target.stat().st_mtime
                })
            except Exception as e:
                return self.send(500, {'error': f'Error al leer nota: {e}'})
        static_files = {
            '/': ('panel.html', 'text/html; charset=utf-8'),
            '/panel.html': ('panel.html', 'text/html; charset=utf-8'),
            '/panel.css': ('panel.css', 'text/css; charset=utf-8'),
            '/panel.js': ('panel.js', 'application/javascript; charset=utf-8'),
            '/animaciones.js': ('animaciones.js', 'application/javascript; charset=utf-8'),
            '/anime.min.js': ('anime.min.js', 'application/javascript; charset=utf-8'),
            '/marked.min.js': ('marked.min.js', 'application/javascript; charset=utf-8'),
        }
        if path in static_files:
            filename, ctype = static_files[path]
            target = ROOT / 'herramientas' / filename
            if target.exists():
                return self.send(200, target.read_bytes(), ctype)
        return self.send(404, {'error': 'No encontrado'})

    def do_POST(self):
        if not self.allowed_request():
            return self.send(403, {'error': 'Origen no permitido'})
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.send(400, {'error': 'Longitud inválida'})
        limit = 12 * 1024 * 1024 if path in ('/api/attachment', '/api/note') else 65536
        if length < 0 or length > limit:
            return self.send(413, {'error': 'Contenido demasiado grande'})
        try:
            data = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeDecodeError):
            return self.send(400, {'error': 'JSON inválido'})
        if not isinstance(data, dict):
            return self.send(400, {'error': 'Objeto JSON requerido'})
        if path == '/api/note':
            note_path = str(data.get('path', '')).strip()
            content = str(data.get('content', ''))
            if not note_path or '..' in note_path:
                return self.send(400, {'error': 'Ruta inválida'})
            target = (ROOT / note_path).resolve()
            if not str(target).startswith(str(ROOT)):
                return self.send(403, {'error': 'Acceso no permitido fuera de la bóveda'})
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8')
            return self.send(200, {'ok': True, 'path': note_path})
        if path == '/api/scratchpad':
            content = str(data.get('content', '')).strip()
            if not content:
                return self.send(400, {'error': 'El apunte no puede estar vacío'})
            ts = datetime.now()
            first_line = content.split('\n', 1)[0].replace('#', '').strip()[:50]
            clean_title = re.sub(r'[\\/*?:"<>|]', '', first_line) or 'Apunte rápido'
            filename = f"{clean_title} · {ts.strftime('%Y-%m-%d %H%M')}.md"
            target = ROOT / '01 Entrada' / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            note_body = f"---\ntipo: apunte_rapido\ncreado: {ts.astimezone().isoformat()}\norigen: scratchpad\n---\n# {clean_title}\n\n{content}\n"
            target.write_text(note_body, encoding='utf-8')
            return self.send(201, {'ok': True, 'path': target.relative_to(ROOT).as_posix(), 'title': clean_title})
        if path == '/api/study-note':
            title = str(data.get('title', '')).strip()
            topic = str(data.get('topic', 'Estudio')).strip()
            source_url = str(data.get('url', '')).strip()
            channel = str(data.get('channel', '')).strip()
            notes_body = str(data.get('notes', '')).strip()
            if not title:
                return self.send(400, {'error': 'Título de apunte requerido'})
            clean_title = re.sub(r'[\\/*?:"<>|]', '', title)[:70]
            target = ROOT / '04 Conocimiento' / f"{clean_title}.md"
            target.parent.mkdir(parents=True, exist_ok=True)
            now_iso = datetime.now().astimezone().isoformat()
            note_content = (
                f"---\n"
                f"tipo: apunte_estudio\n"
                f"tema: {json.dumps(topic, ensure_ascii=False)}\n"
                f"fuente: {json.dumps(source_url, ensure_ascii=False)}\n"
                f"canal: {json.dumps(channel, ensure_ascii=False)}\n"
                f"creado: {now_iso}\n"
                f"---\n"
                f"# {clean_title}\n\n"
                f"> **Fuente de estudio:** [{channel or 'Video/Artículo'}]({source_url})\n\n"
                f"## Apuntes y conceptos clave\n\n"
                f"{notes_body or '- '}\n\n"
                f"## Comandos y práctica\n\n"
                f"```bash\n# Comandos o notas prácticas\n```\n\n"
                f"## Conexiones\n\n"
                f"- [[Hacking/00_Ciberseguridad|Mi espacio de estudio]]\n"
            )
            target.write_text(note_content, encoding='utf-8')
            return self.send(201, {'ok': True, 'path': target.relative_to(ROOT).as_posix(), 'title': clean_title})
        if path == '/api/attachment':
            return self.attachment(data)
        if path.startswith('/api/task/') and path.endswith('/complete'):
            task_id = path.split('/')[3]
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', task_id):
                return self.send(400, {'error': 'Identificador inválido'})
            target = ROOT / '06 Tareas' / (task_id + '.md')
            if not target.exists():
                return self.send(404, {'error': 'Tarea no encontrada'})
            body = target.read_text(encoding='utf-8')
            target.write_text(re.sub(r'^estado:.*$', 'estado: pendiente_sincronizacion', body, count=1, flags=re.M), encoding='utf-8')
            return self.send(200, {'path': target.relative_to(ROOT).as_posix(), 'estado': 'pendiente_sincronizacion'})
        if path == '/api/movement':
            return self.movement(data)
        if path == '/api/opening':
            return self.opening(data)
        if path == '/api/reconciliation':
            return self.reconciliation(data)
        title = str(data.get('title', '')).strip()
        if not title or len(title) > 200 or '\n' in title or '\r' in title:
            return self.send(400, {'error': 'Título de una línea requerido (máximo 200 caracteres)'})
        name = str(uuid.uuid4()) + '.md'
        if path == '/api/inbox':
            folder = ROOT / '01 Entrada'
            source = str(data.get('source', 'Otra')).strip()
            if source not in ('WhatsApp', 'Instagram', 'YouTube', 'Gmail', 'Otra'):
                return self.send(400, {'error': 'Origen inválido'})
            content = f'---\ntipo: entrada\norigen: {source}\nestado: pendiente\n---\n# {title}\n\n{str(data.get("body", ""))[:8000]}\n'
        elif path == '/api/task':
            folder = ROOT / '06 Tareas'
            project = str(data.get('project', '')).strip()
            if project and project not in {p['path'] for p in project_notes()}:
                return self.send(400, {'error': 'Proyecto no encontrado'})
            due = str(data.get('due', '')).strip()
            if due:
                try:
                    date.fromisoformat(due)
                except ValueError:
                    return self.send(400, {'error': 'Fecha inválida'})
            priority = str(data.get('priority', 'normal')).strip()
            if priority not in ('alta', 'normal', 'baja'):
                return self.send(400, {'error': 'Prioridad inválida'})
            project_link = f'[[{project[:-3]}]]' if project else ''
            content = f'---\ntipo: tarea\ntask_id: {name[:-3]}\ngoogle_id:\nestado: pendiente\nfecha: {due}\nprioridad: {priority}\nproyecto: {json.dumps(project, ensure_ascii=False)}\n---\n# {title}\n\nProyecto: {project_link}\n\nContexto: {str(data.get("context", ""))[:1000]}\n'
        elif path == '/api/project':
            folder = ROOT / '02 Proyectos'
            area = str(data.get('area', '')).strip()
            if len(area) > 80 or '\n' in area or '\r' in area:
                return self.send(400, {'error': 'Área inválida'})
            result = str(data.get('result', '')).strip()[:2000]
            current = str(data.get('current', '')).strip()[:2000]
            next_step = str(data.get('next_step', '')).strip()[:1000]
            content = f'---\ntipo: proyecto\nestado: activo\narea: {json.dumps(area, ensure_ascii=False)}\nfecha_revision:\n---\n# {title}\n\n## Resultado buscado\n\n{result}\n\n## Estado actual\n\n{current}\n\n## Próximo paso\n\n{next_step}\n\n## Decisiones\n\n## Fuentes y archivos\n\n## Historial breve\n'
        else:
            return self.send(404, {'error': 'No encontrado'})
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / name
        target.write_text(content, encoding='utf-8')
        return self.send(201, {'path': target.relative_to(ROOT).as_posix()})

    def attachment(self, data):
        title = str(data.get('title', '')).strip()
        if not title or len(title) > 200 or '\n' in title or '\r' in title:
            return self.send(400, {'error': 'Título de una línea requerido'})
        project = str(data.get('project', '')).strip()
        if project and project not in {p['path'] for p in project_notes()}:
            return self.send(400, {'error': 'Proyecto no encontrado'})
        try:
            content = base64.b64decode(str(data.get('content_base64', '')), validate=True)
        except (ValueError, binascii.Error):
            return self.send(400, {'error': 'Archivo inválido'})
        if not content or len(content) > 8 * 1024 * 1024:
            return self.send(413, {'error': 'Archivo vacío o mayor que 8 MB'})
        if content.startswith(b'\xff\xd8\xff'):
            ext = 'jpg'
        elif content.startswith(b'\x89PNG\r\n\x1a\n'):
            ext = 'png'
        elif content.startswith(b'%PDF-'):
            ext = 'pdf'
        elif len(content) > 12 and content[4:12] in (b'ftypheic', b'ftypheix', b'ftypmif1'):
            ext = 'heic'
        else:
            return self.send(400, {'error': 'Usá JPG, PNG, HEIC o PDF'})
        folder = ROOT / '07 Adjuntos' / 'Entrada'
        folder.mkdir(parents=True, exist_ok=True)
        file_path = folder / f'{uuid.uuid4()}.{ext}'
        file_path.write_bytes(content)
        note_folder = ROOT / '01 Entrada'
        note_folder.mkdir(parents=True, exist_ok=True)
        note_path = note_folder / f'{uuid.uuid4()}.md'
        project_link = f'[[{project[:-3]}]]' if project else ''
        note = f'---\ntipo: apunte_manuscrito\nestado: pendiente\ntranscripcion: pendiente\n---\n# {title}\n\nProyecto: {project_link}\n\nOriginal: ![[{file_path.relative_to(ROOT).as_posix()}]]\n\n## Texto revisado\n\n## Dudas de transcripción\n'
        try:
            note_path.write_text(note, encoding='utf-8')
        except OSError:
            file_path.unlink()
            raise
        return self.send(201, {'note': note_path.relative_to(ROOT).as_posix(),
                               'attachment': file_path.relative_to(ROOT).as_posix()})

    def opening(self, data):
        account = str(data.get('cuenta', '')).strip()
        if not account or len(account) > 80 or any(ord(ch) < 32 for ch in account):
            return self.send(400, {'error': 'Nombre de cuenta inválido'})
        if data.get('confirmado') is not True:
            return self.send(400, {'error': 'Confirmá el saldo real de apertura'})
        try:
            cents = amount_cents(data.get('saldo', ''), allow_zero=True)
        except ValueError as exc:
            return self.send(400, {'error': str(exc)})
        filename = ROOT / 'datos' / 'saldos_iniciales.csv'
        with filename.open(newline='', encoding='utf-8') as file:
            columns = next(csv.reader(file))
        if account.casefold() in {r['cuenta'].casefold() for r in rows('datos/saldos_iniciales.csv')}:
            return self.send(409, {'error': 'La cuenta ya tiene saldo de apertura'})
        row = {'cuenta': account, 'fecha': '2026-12-01', 'moneda': 'ARS',
               'saldo_centavos': cents, 'verificado': 'si'}
        with filename.open('a', newline='', encoding='utf-8') as file:
            csv.DictWriter(file, fieldnames=columns).writerow(row)
        return self.send(201, {'cuenta': account})

    def movement(self, data):
        kind = data.get('tipo')
        source = str(data.get('cuenta_origen', '')).strip()
        destination = str(data.get('cuenta_destino', '')).strip()
        accounts = {r['cuenta'] for r in rows('datos/saldos_iniciales.csv')}
        if kind not in ('ingreso', 'gasto', 'transferencia') or source not in accounts:
            return self.send(400, {'error': 'Tipo o cuenta inválida'})
        if (kind == 'transferencia' and (destination not in accounts or destination == source)) or (kind != 'transferencia' and destination):
            return self.send(400, {'error': 'Destino inválido'})
        if data.get('confirmado') is not True:
            return self.send(400, {'error': 'Confirmá importe, cuenta y fecha contra el original'})
        try:
            cents = amount_cents(data.get('importe', ''))
        except ValueError as exc:
            return self.send(400, {'error': str(exc)})
        filename = ROOT / 'datos' / 'movimientos.csv'
        with filename.open(newline='', encoding='utf-8') as file:
            columns = next(csv.reader(file))
        row = {'id': str(uuid.uuid4()), 'fecha': str(data.get('fecha', '')),
               'tipo': kind, 'cuenta_origen': source, 'cuenta_destino': destination,
               'importe_centavos': cents, 'categoria': str(data.get('categoria', 'Sin categoría'))[:100],
               'descripcion': str(data.get('descripcion', ''))[:500],
               'comprobante': str(data.get('comprobante', ''))[:500], 'estado': 'revisado'}
        try:
            date.fromisoformat(row['fecha'])
        except ValueError:
            return self.send(400, {'error': 'Fecha inválida'})
        with filename.open('a', newline='', encoding='utf-8') as file:
            csv.DictWriter(file, fieldnames=columns).writerow(row)
        return self.send(201, {'id': row['id']})

    def reconciliation(self, data):
        account = str(data.get('cuenta', '')).strip()
        day = str(data.get('fecha', ''))
        try:
            date.fromisoformat(day)
        except ValueError:
            return self.send(400, {'error': 'Fecha inválida'})
        if data.get('confirmado') is not True:
            return self.send(400, {'error': 'Confirmá el saldo real consultado'})
        try:
            actual = amount_cents(data.get('saldo_real', ''), allow_zero=True)
        except ValueError as exc:
            return self.send(400, {'error': str(exc)})
        expected = balances(rows('datos/saldos_iniciales.csv'), rows('datos/movimientos.csv'), day)
        if account not in expected:
            return self.send(400, {'error': 'Cuenta sin saldo inicial'})
        difference = actual - expected[account]
        filename = ROOT / 'datos' / 'conciliaciones.csv'
        with filename.open(newline='', encoding='utf-8') as file:
            columns = next(csv.reader(file))
        row = {'id': str(uuid.uuid4()), 'fecha': day, 'cuenta': account,
               'saldo_calculado_centavos': expected[account], 'saldo_real_centavos': actual,
               'diferencia_centavos': difference,
               'estado': 'cuadrado' if difference == 0 else 'diferencia'}
        with filename.open('a', newline='', encoding='utf-8') as file:
            csv.DictWriter(file, fieldnames=columns).writerow(row)
        return self.send(201, {'cuenta': account, 'diferencia_centavos': difference, 'estado': row['estado']})


if __name__ == '__main__':
    if sys.stdout:
        print('Panel local: http://127.0.0.1:4320')
    ThreadingHTTPServer(('127.0.0.1', 4320), Handler).serve_forever()
