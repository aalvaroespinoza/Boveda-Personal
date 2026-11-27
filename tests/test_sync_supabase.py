"""Pruebas del sincronizador local ↔ Supabase.

No tocan la bóveda real: cada prueba crea una bóveda temporal y un remoto falso
en memoria. Tampoco hacen red.
"""
import importlib.util
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNC_PATH = ROOT / 'herramientas' / 'sync_supabase.py'
SPEC = importlib.util.spec_from_file_location('sync_supabase', SYNC_PATH)
sync = importlib.util.module_from_spec(SPEC)
sys.modules['sync_supabase'] = sync
SPEC.loader.exec_module(sync)

NOW = datetime(2026, 11, 26, 15, 0, tzinfo=timezone.utc)
USER_ID = '11111111-1111-4111-8111-111111111111'

TASK_NOTE = """---
tipo: tarea
task_id: 780c8a59-e7e2-49dc-97ca-27431b16ac60
google_id: M1VkNnFvaUNsTFNEUjVoSg
estado: pendiente
fecha: 2026-12-01
prioridad: alta
proyecto: "[[02 Proyectos/Proyecto de prueba]]"
---

# Revisar el apunte de Nmap

Proyecto: [[02 Proyectos/Proyecto de prueba]]

Contexto: Abrir el apunte y anotar los puertos vistos.
"""

PROJECT_NOTE = """---
id: pro-proyecto-de-prueba
tipo: proyecto
estado: activo
area: "[[00 Sistema/Plan maestro]]"
creado: 2026-11-26
origen: "Prueba"
revisado: 2026-11-26
fuentes:
  - "[[00 Sistema/Plan maestro]]"
---
# Proyecto de prueba

## Resultado buscado

Que la sincronización sea verificable.

## Estado actual

En pruebas.

## Próximo paso

Correr la prueba de ida y vuelta.

## Decisiones

## Fuentes y archivos

## Historial breve
"""


class FakeRemote:
    """Remoto en memoria con la misma interfaz que usa SyncEngine."""

    def __init__(self):
        self.tables = {
            'projects': {},
            'tasks': {},
            'inbox_items': {},
            'sync_conflicts': {},
            'sync_operations': {},
            'activity_entries': {},
        }
        self._counter = 0

    def _next_id(self):
        self._counter += 1
        return f'00000000-0000-4000-8000-{self._counter:012d}'

    def get_all(self, table):
        if table == 'sync_conflicts':
            return [dict(row) for row in self.tables[table].values()]
        return [
            dict(row)
            for row in self.tables[table].values()
            if not row.get('deleted_at')
        ]

    def insert(self, table, row):
        row = dict(row)
        if table in ('projects', 'tasks', 'inbox_items'):
            if row['id'] in self.tables[table]:
                raise sync.ConflictError('duplicate key value')
            row.setdefault('version', 1)
            row.setdefault('created_at', NOW.isoformat())
            row.setdefault('updated_at', NOW.isoformat())
            row.setdefault('deleted_at', None)
            self.tables[table][row['id']] = row
            return dict(row)

        row.setdefault('id', self._next_id())
        row.setdefault('created_at', NOW.isoformat())
        self.tables[table][row['id']] = row
        return dict(row)

    def update(self, table, row_id, expected_version, values):
        row = self.tables[table].get(row_id)
        if row is None or row.get('version') != expected_version:
            return None
        row.update(values)
        row['version'] = expected_version + 1
        row['updated_at'] = NOW.isoformat()
        return dict(row)

    def insert_operation(self, row):
        self.insert('sync_operations', row)

    def insert_conflict(self, row):
        self.insert('sync_conflicts', row)

    def insert_activity(self, row):
        self.insert('activity_entries', row)


class VaultTestCase(unittest.TestCase):
    def setUp(self):
        self._temp = tempfile.TemporaryDirectory()
        self.root = Path(self._temp.name)
        for folder in (
            '01 Entrada',
            '02 Proyectos',
            '06 Tareas',
            '04 Conocimiento',
            '08 Automatizacion/Actividad',
        ):
            (self.root / folder).mkdir(parents=True, exist_ok=True)
        self.state_path = self.root / 'state' / 'sync_state.json'
        self.remote = FakeRemote()

    def tearDown(self):
        self._temp.cleanup()

    def write(self, rel_path, text):
        path = self.root / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        return path

    def engine(self, dry_run=False):
        return sync.SyncEngine(
            root=self.root,
            remote=self.remote,
            user_id=USER_ID,
            state_path=self.state_path,
            dry_run=dry_run,
            now=NOW,
        )


class SerializationTests(VaultTestCase):
    def test_task_markdown_maps_to_remote_and_back(self):
        self.write('02 Proyectos/Proyecto de prueba.md', PROJECT_NOTE)
        self.write('06 Tareas/tarea.md', TASK_NOTE)

        engine = self.engine()
        raw = engine.scan_local_raw()
        path_to_project, _ = engine.build_project_maps(raw['project'], {})
        local = engine.build_local(raw, path_to_project)

        task = next(iter(local['task'].values()))
        payload = task.payload

        self.assertEqual(payload['id'], '780c8a59-e7e2-49dc-97ca-27431b16ac60')
        self.assertEqual(payload['title'], 'Revisar el apunte de Nmap')
        self.assertEqual(payload['status'], 'pending')
        self.assertEqual(payload['priority'], 'high')
        self.assertEqual(payload['due_date'], '2026-12-01')
        self.assertEqual(payload['google_id'], 'M1VkNnFvaUNsTFNEUjVoSg')
        self.assertEqual(
            payload['context'], 'Abrir el apunte y anotar los puertos vistos.'
        )
        self.assertIsNotNone(payload['project_id'])

        # Ida y vuelta: remoto → nota → mismo payload (sin perder campos).
        remote_row = {
            **payload,
            'version': 3,
        }
        rendered = sync.render_note('task', remote_row, {})
        meta, body = sync.parse_frontmatter(rendered)
        again = sync.note_payload(
            'task',
            '06 Tareas/tarea.md',
            meta,
            body,
            path_to_project,
            USER_ID,
        )

        self.assertEqual(again['title'], payload['title'])
        self.assertEqual(again['status'], payload['status'])
        self.assertEqual(again['due_date'], payload['due_date'])
        self.assertEqual(again['priority'], payload['priority'])
        self.assertEqual(again['context'], payload['context'])
        self.assertEqual(again['google_id'], payload['google_id'])
        self.assertEqual(again['id'], payload['id'])

    def test_project_sections_survive_round_trip(self):
        self.write('02 Proyectos/Proyecto de prueba.md', PROJECT_NOTE)

        engine = self.engine()
        raw = engine.scan_local_raw()
        project = next(iter(raw['project'].values()))
        payload = sync.note_payload(
            'project',
            project.rel_path,
            project.meta,
            project.body,
            {},
            USER_ID,
        )

        self.assertEqual(payload['status'], 'active')
        self.assertEqual(payload['result'], 'Que la sincronización sea verificable.')
        self.assertEqual(payload['current_state'], 'En pruebas.')
        self.assertEqual(payload['next_step'], 'Correr la prueba de ida y vuelta.')

        rendered = sync.render_note('project', {**payload, 'version': 1}, {})
        meta, body = sync.parse_frontmatter(rendered)
        again = sync.note_payload(
            'project',
            project.rel_path,
            meta,
            body,
            {},
            USER_ID,
        )
        self.assertEqual(again['result'], payload['result'])
        self.assertEqual(again['current_state'], payload['current_state'])
        self.assertEqual(again['next_step'], payload['next_step'])

    def test_non_uuid_google_id_gets_stable_uuid(self):
        note = """---
tipo: tarea
task_id: V1VoR0ZxNW11YnJnbmRIbA
google_id: V1VoR0ZxNW11YnJnbmRIbA
estado: pendiente
fecha:
---
# Prueba

Contexto: sin UUID real.
"""
        self.write('06 Tareas/prueba.md', note)

        first = self.engine().scan_local_raw()['task']
        second = self.engine().scan_local_raw()['task']

        first_id = next(iter(first))
        self.assertEqual(first_id, next(iter(second)))
        # UUIDv5 estable y válido, no el google_id original.
        self.assertNotEqual(first_id, 'V1VoR0ZxNW11YnJnbmRIbA')
        self.assertEqual(sync.valid_uuid(first_id), first_id)


class PushTests(VaultTestCase):
    def test_local_task_creates_outbox_operation(self):
        self.write('06 Tareas/tarea.md', TASK_NOTE)

        summary = self.engine().run('push')

        self.assertEqual(summary['pushed'], 1)
        self.assertEqual(summary['errors'], [])
        self.assertEqual(len(self.remote.tables['tasks']), 1)

        operations = list(self.remote.tables['sync_operations'].values())
        self.assertEqual(len(operations), 1)
        operation = operations[0]
        self.assertEqual(operation['entity'], 'task')
        self.assertEqual(operation['operation'], 'upsert')
        self.assertEqual(operation['origin'], 'pc_sync')
        self.assertEqual(
            operation['entity_id'], '780c8a59-e7e2-49dc-97ca-27431b16ac60'
        )
        self.assertIsNotNone(operation['processed_at'])

        # El estado de sync queda fuera de las carpetas de la bóveda.
        self.assertTrue(self.state_path.exists())
        state = sync.json.loads(self.state_path.read_text(encoding='utf-8'))
        self.assertIn(
            '780c8a59-e7e2-49dc-97ca-27431b16ac60',
            state['entities']['task'],
        )

    def test_dry_run_writes_nothing(self):
        task_path = self.write('06 Tareas/tarea.md', TASK_NOTE)

        summary = self.engine(dry_run=True).run('push')

        self.assertEqual(summary['pushed'], 1)
        self.assertEqual(self.remote.tables['tasks'], {})
        self.assertEqual(self.remote.tables['sync_operations'], {})
        self.assertFalse(self.state_path.exists())
        self.assertEqual(task_path.read_text(encoding='utf-8'), TASK_NOTE)
        activity = self.root / '08 Automatizacion' / 'Actividad' / '2026-11.md'
        self.assertFalse(activity.exists())


class ConflictTests(VaultTestCase):
    def test_both_sides_changed_creates_visible_conflict(self):
        task_path = self.write('06 Tareas/tarea.md', TASK_NOTE)

        self.engine().run('push')
        task_id = '780c8a59-e7e2-49dc-97ca-27431b16ac60'
        remote_task = self.remote.tables['tasks'][task_id]

        # Cambia el remoto (como si se editara en la web).
        self.remote.update(
            'tasks',
            task_id,
            remote_task['version'],
            {'title': 'Título cambiado en la web'},
        )

        # Cambia el local (como si se editara en Obsidian).
        local_text = task_path.read_text(encoding='utf-8').replace(
            'Revisar el apunte de Nmap', 'Título cambiado en la PC'
        )
        task_path.write_text(local_text, encoding='utf-8')

        summary = self.engine().run('sync')

        self.assertEqual(summary['conflicts'], 1)
        conflicts = list(self.remote.tables['sync_conflicts'].values())
        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0]['entity'], 'task')
        self.assertEqual(conflicts[0]['entity_id'], task_id)
        self.assertEqual(conflicts[0]['status'], 'pending')

        # Ninguna versión se sobrescribió en silencio.
        self.assertIn(
            'Título cambiado en la PC', task_path.read_text(encoding='utf-8')
        )
        self.assertEqual(
            self.remote.tables['tasks'][task_id]['title'],
            'Título cambiado en la web',
        )


class PullTests(VaultTestCase):
    def test_pull_does_not_delete_unrelated_notes(self):
        unrelated = self.write(
            '04 Conocimiento/idea.md', '# Idea\n\nNota que no se sincroniza.\n'
        )
        no_type = self.write(
            '06 Tareas/sin-tipo.md', '# Sin tipo\n\nNo debe tocarse.\n'
        )
        index = self.write('01 Entrada/Entrada.md', '# Entrada\n\nÍndice.\n')

        self.remote.insert(
            'tasks',
            {
                'id': '22222222-2222-4222-8222-222222222222',
                'user_id': USER_ID,
                'title': 'Tarea que llega de la web',
                'status': 'pending',
                'due_date': None,
                'priority': 'normal',
                'project_id': None,
                'context': 'Creada en la web.',
                'google_id': None,
                'source_path': None,
                'origin': 'web',
            },
        )

        summary = self.engine().run('pull')

        self.assertEqual(summary['pulled'], 1)
        created = self.root / '06 Tareas' / '22222222-2222-4222-8222-222222222222.md'
        self.assertTrue(created.exists())
        self.assertIn('Tarea que llega de la web', created.read_text(encoding='utf-8'))

        # Nada no relacionado se borró ni se modificó.
        self.assertTrue(unrelated.exists())
        self.assertTrue(no_type.exists())
        self.assertTrue(index.exists())
        self.assertEqual(
            unrelated.read_text(encoding='utf-8'),
            '# Idea\n\nNota que no se sincroniza.\n',
        )
        self.assertEqual(
            index.read_text(encoding='utf-8'), '# Entrada\n\nÍndice.\n'
        )


if __name__ == '__main__':
    unittest.main()
