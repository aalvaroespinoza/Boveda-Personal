import importlib.util
import unittest
from pathlib import Path


PANEL = Path(__file__).resolve().parents[1] / 'herramientas' / 'panel.py'
SPEC = importlib.util.spec_from_file_location('panel', PANEL)
panel = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(panel)


class PanelFinanceTests(unittest.TestCase):
    def test_amount_cents_accepts_argentine_decimal_formats(self):
        self.assertEqual(panel.amount_cents('1234,50'), 123450)
        self.assertEqual(panel.amount_cents('2.5'), 250)

    def test_amount_cents_rejects_invalid_or_negative_values(self):
        for value in ('', '-1', '1.234', 'abc'):
            with self.assertRaises(ValueError):
                panel.amount_cents(value)

    def test_balances_handles_income_expense_and_transfer(self):
        openings = [{'cuenta': 'A', 'saldo_centavos': '1000'}, {'cuenta': 'B', 'saldo_centavos': '200'}]
        moves = [
            {'fecha': '2026-12-01', 'tipo': 'ingreso', 'cuenta_origen': 'A', 'cuenta_destino': '', 'importe_centavos': '500'},
            {'fecha': '2026-12-02', 'tipo': 'gasto', 'cuenta_origen': 'A', 'cuenta_destino': '', 'importe_centavos': '300'},
            {'fecha': '2026-12-03', 'tipo': 'transferencia', 'cuenta_origen': 'A', 'cuenta_destino': 'B', 'importe_centavos': '400'},
        ]
        self.assertEqual(panel.balances(openings, moves), {'A': 800, 'B': 600})


if __name__ == '__main__':
    unittest.main()
