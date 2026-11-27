'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mutate } from '@/lib/offline';

export default function ProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [result, setResult] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNote('');
    setError('');

    if (!title.trim()) {
      setError('Escribí el nombre del proyecto.');
      return;
    }

    setBusy(true);
    try {
      const resultRequest = await mutate(
        '/api/projects',
        'POST',
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          area: area.trim(),
          result: result.trim(),
          current_state: currentState.trim(),
          next_step: nextStep.trim(),
        },
        `Nuevo proyecto: ${title.trim()}`,
      );

      setTitle('');
      setArea('');
      setResult('');
      setCurrentState('');
      setNextStep('');

      if (resultRequest.queued) {
        setNote('Guardado en este dispositivo; se enviará al reconectar.');
      } else {
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el proyecto',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        <label className="wide">
          Nombre
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nombre del proyecto"
            maxLength={200}
          />
        </label>

        <label className="wide">
          Área
          <input
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder="Trabajo, estudio, personal…"
            maxLength={80}
          />
        </label>

        <label className="wide">
          Resultado buscado
          <textarea
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Qué tendría que ser cierto para darlo por terminado"
            rows={2}
          />
        </label>

        <label className="wide">
          Estado actual
          <textarea
            value={currentState}
            onChange={(event) => setCurrentState(event.target.value)}
            placeholder="Dónde quedó"
            rows={2}
          />
        </label>

        <label className="wide">
          Próximo paso
          <textarea
            value={nextStep}
            onChange={(event) => setNextStep(event.target.value)}
            placeholder="La siguiente acción concreta y visible"
            rows={2}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="action" disabled={busy}>
          {busy ? 'Guardando…' : 'Crear proyecto'}
        </button>
      </div>

      {note ? (
        <p className="form-note" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
