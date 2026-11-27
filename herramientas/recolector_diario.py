"""Captura métricas locales verificables sin pasar por un modelo de IA."""
import csv
import re
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def records(path):
    with path.open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def count_md(folder, excluded=()):
    target = ROOT / folder
    return sum(p.name not in excluded for p in target.rglob('*.md')) if target.exists() else 0


def pending_tasks():
    result = []
    for path in (ROOT / '06 Tareas').glob('*.md') if (ROOT / '06 Tareas').exists() else []:
        body = path.read_text(encoding='utf-8')
        def field(name):
            match = re.search(rf'^{re.escape(name)}:[ \t]*(.*)$', body, re.M)
            return match.group(1).strip() if match else ''
        if field('estado') == 'completada':
            continue
        title = re.search(r'^#\s+(.+)$', body, re.M)
        result.append({'titulo': title.group(1) if title else path.stem,
                       'fecha': field('fecha'), 'proyecto': field('proyecto'),
                       'ruta': path.relative_to(ROOT).as_posix()})
    return sorted(result, key=lambda item: (item['fecha'] or '9999', item['titulo'].casefold()))


def main():
    today = date.today().isoformat()
    movements = records(ROOT / 'datos/movimientos.csv')
    pending = pending_tasks()
    metrics = {
        'fecha': today,
        'capturado': datetime.now().astimezone().isoformat(timespec='seconds'),
        'proyectos': count_md('02 Proyectos', ('AGENTS.md', 'Proyectos.md')),
        'tareas_pendientes': len(pending),
        'tareas_vencidas': sum(bool(t['fecha']) and t['fecha'] < today for t in pending),
        'entrada': count_md('01 Entrada', ('Entrada.md',)),
        'movimientos_hoy': sum(m['fecha'] == today and m['estado'] == 'revisado' for m in movements),
    }
    path = ROOT / '08 Automatizacion' / 'Metricas' / f'{today}.md'
    path.parent.mkdir(parents=True, exist_ok=True)
    body = '---\n' + ''.join(f'{k}: {v}\n' for k, v in metrics.items()) + '---\n\n# Datos automáticos · ' + today + '\n\nFuente: archivos locales de la bóveda.\n\n## Próximas acciones\n\n'
    body += '\n'.join(f'- {task["fecha"] or "Sin fecha"} · [[{task["ruta"][:-3]}|{task["titulo"]}]]' + (f' · {task["proyecto"]}' if task['proyecto'] else '') for task in pending[:20])
    body += '\n' if pending else 'Sin tareas pendientes.\n'
    path.write_text(body, encoding='utf-8')
    activity = ROOT / '08 Automatizacion' / 'Actividad' / f'{today[:7]}.md'
    activity.parent.mkdir(parents=True, exist_ok=True)
    if not activity.exists():
        activity.write_text(f'# Actividad de automatizaciones · {today[:7]}\n', encoding='utf-8')
    with activity.open('a', encoding='utf-8') as log:
        log.write(f'\n- {metrics["capturado"]} · recolector_diario.py · métricas locales capturadas; proyectos {metrics["proyectos"]}, tareas pendientes {metrics["tareas_pendientes"]}. Salida: 08 Automatizacion/Metricas/{today}.md. Revisión: pendiente.\n')
    print(path)


if __name__ == '__main__':
    main()
