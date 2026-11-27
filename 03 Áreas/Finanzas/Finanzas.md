# Finanzas

Inicio: **1 de diciembre de 2026**. Moneda: **ARS**.

1. Registrar saldos iniciales de Mercado Pago, ARQ, otras billeteras y efectivo en `datos/saldos_iniciales.csv`.
2. Guardar cada comprobante en `07 Adjuntos/Finanzas` y capturarlo desde [[01 Entrada/Entrada]].
3. Revisar y registrar el movimiento en `datos/movimientos.csv` usando `python herramientas/finanzas.py agregar`.
4. Registrar el efectivo manualmente. Las transferencias entre cuentas propias llevan tipo `transferencia`, no ingreso o gasto.
5. Conciliar semanalmente con los saldos reales desde el panel. Cada comparación queda en `datos/conciliaciones.csv`; una diferencia se investiga y no ajusta el saldo calculado automáticamente. Revisar presupuesto, vencimientos y objetivos mensualmente.

[[03 Áreas/Finanzas/Presupuesto 2026-12|Presupuesto de diciembre]] · [[03 Áreas/Finanzas/Cierre 2026-12|Cierre de diciembre]]
