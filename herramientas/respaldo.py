"""Crea un ZIP recuperable fuera de la bóveda."""
from datetime import datetime
from pathlib import Path
import os

try:
    import pyzipper
except ImportError as exc:
    raise SystemExit('Falta pyzipper. Instalalo desde herramientas/requirements.txt antes de crear un respaldo cifrado.') from exc

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT.parent / 'Respaldos Boveda Personal'
DEST.mkdir(exist_ok=True)
name = DEST / f'boveda-{datetime.now():%Y%m%d-%H%M%S}.zip'
password = os.environ.get('BOVEDA_BACKUP_PASSWORD', '').encode('utf-8')
if len(password) < 12:
    raise SystemExit('Definí BOVEDA_BACKUP_PASSWORD (mínimo 12 caracteres) fuera de la bóveda.')
SENSITIVE_FILES = {
    'panel_token.md',
    '.obsidian/plugins/remotely-save/data.json',
}
with pyzipper.AESZipFile(name, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as archive:
    archive.setpassword(password)
    for path in ROOT.rglob('*'):
        if not path.is_file() or '__pycache__' in path.parts:
            continue
        relative = path.relative_to(ROOT)
        if relative.as_posix().casefold() in SENSITIVE_FILES:
            continue
        archive.write(path, relative)
with pyzipper.AESZipFile(name) as archive:
    archive.setpassword(password)
    bad = archive.testzip()
    if bad:
        raise SystemExit(f'ZIP dañado: {bad}')
print(name)
