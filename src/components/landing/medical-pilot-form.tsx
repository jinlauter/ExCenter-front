'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

export const MEDICAL_PILOT_EMAIL = 'jin_lauter@hotmail.com';

export function MedicalPilotForm() {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [prepared, setPrepared] = useState(false);

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const body = `Olá! Tenho interesse no piloto médico do ExCenter.\n\nNome: ${name.trim()}\nÁrea de atuação: ${specialty.trim() || 'Não informada'}\n\nGostaria de conversar sobre o piloto e os próximos passos.`;
    window.location.href = `mailto:${MEDICAL_PILOT_EMAIL}?subject=${encodeURIComponent('Interesse no piloto médico do ExCenter')}&body=${encodeURIComponent(body)}`;
    setPrepared(true);
  }

  const fieldClass =
    'mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <form onSubmit={prepareEmail} className="space-y-5">
      <div>
        <label htmlFor="pilot-name" className="text-sm font-medium">
          Seu nome
        </label>
        <input
          id="pilot-name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="pilot-specialty" className="text-sm font-medium">
          Área de atuação <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="pilot-specialty"
          name="specialty"
          maxLength={120}
          value={specialty}
          onChange={(event) => setSpecialty(event.target.value)}
          className={fieldClass}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Este formulário prepara uma mensagem no seu aplicativo de e-mail. Você revisa e envia por
        lá. Não inclua exames ou dados de pacientes.
      </p>
      <Button type="submit" size="lg" className="w-full">
        Abrir e-mail para enviar
      </Button>
      {prepared && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          O envio ainda depende de você confirmar no aplicativo de e-mail. Se ele não abriu, escreva
          para o endereço abaixo.
        </p>
      )}
      <p className="break-words text-sm text-muted-foreground">
        Prefere escrever diretamente?{' '}
        <a
          className="underline underline-offset-4 hover:text-primary"
          href={`mailto:${MEDICAL_PILOT_EMAIL}`}
        >
          {MEDICAL_PILOT_EMAIL}
        </a>
      </p>
    </form>
  );
}
