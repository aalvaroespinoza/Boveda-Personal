"""Registro financiero local. Los importes se guardan como centavos enteros."""
import argparse
import csv
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'datos'
BALANCES = DATA / 'saldos_iniciales.csv'
MOVES = DATA / 'movimientos.csv'


def read(path):
    with path.open(newline='', encoding='utf-8') as file:
        return list(csv.DictReader(file))


def append(path, row):
    with path.open(newline='', encoding='utf-8') as file:
        fields = next(csv.reader(file))
    with path.open('a', newline='', encoding='utf-8') as file:
        csv.DictWriter(file, fieldnames=fields).writerow(row)


def cents(value):
    try:
        amount = Decimal(value.replace(',', '.'))
    except InvalidOperation as exc:
        raise ValueError('Importe inválido') from exc
    if amount < 0 or amount.as_tuple().exponent < -2:
        raise ValueError('Usar un importe positivo con hasta dos decimales')
    return int(amount * 100)


def money(value):
    return f'{Decimal(value) / 100:.2f}'


def main():
    parser = argparse.ArgumentParser(description='Finanzas de la bóveda, ARS')
    sub = parser.add_subparsers(dest='command', required=True)
    opening = sub.add_parser('apertura')
    opening.add_argument('cuenta')
    opening.add_argument('saldo')
    move = sub.add_parser('agregar')
    move.add_argument('tipo', choices=['ingreso', 'gasto', 'transferencia'])
    move.add_argument('cuenta_origen')
    move.add_argument('importe')
    move.add_argument('--destino', default='')
    move.add_argument('--categoria', default='Sin categoría')
    move.add_argument('--descripcion', default='')
    move.add_argument('--comprobante', default='')
    move.add_argument('--fecha', default=date.today().isoformat())
    sub.add_parser('saldos')
    args = parser.parse_args()

    if args.command == 'apertura':
        if any(row['cuenta'].casefold() == args.cuenta.casefold() for row in read(BALANCES)):
            parser.error('La cuenta ya tiene saldo de apertura')
        append(BALANCES, dict(cuenta=args.cuenta, fecha='2026-12-01', moneda='ARS',
                              saldo_centavos=cents(args.saldo), verificado='si'))
        print('Saldo inicial registrado')
    elif args.command == 'agregar':
        date.fromisoformat(args.fecha)
        accounts = {row['cuenta'] for row in read(BALANCES)}
        if args.cuenta_origen not in accounts:
            parser.error('La cuenta no tiene saldo inicial')
        if args.tipo == 'transferencia' and (args.destino not in accounts or args.destino == args.cuenta_origen):
            parser.error('La transferencia requiere otra cuenta existente')
        if args.tipo != 'transferencia' and args.destino:
            parser.error('Solo una transferencia puede tener destino')
        amount = cents(args.importe)
        if amount == 0:
            parser.error('El importe debe ser mayor que cero')
        row = dict(id=str(uuid.uuid4()), fecha=args.fecha, tipo=args.tipo,
                   cuenta_origen=args.cuenta_origen, cuenta_destino=args.destino,
                   importe_centavos=amount, categoria=args.categoria,
                   descripcion=args.descripcion, comprobante=args.comprobante, estado='revisado')
        append(MOVES, row)
        print('Movimiento registrado:', row['id'])
    else:
        totals = {row['cuenta']: int(row['saldo_centavos']) for row in read(BALANCES)}
        for row in read(MOVES):
            amount = int(row['importe_centavos'])
            source = row['cuenta_origen']
            if row['tipo'] == 'ingreso':
                totals[source] += amount
            else:
                totals[source] -= amount
            if row['tipo'] == 'transferencia':
                totals[row['cuenta_destino']] += amount
        for account, value in sorted(totals.items()):
            print(f'{account}: ARS {money(value)}')


if __name__ == '__main__':
    main()
