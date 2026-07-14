import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Campo de senha com botão de olho pra alternar entre oculto (••••••••, padrão)
// e visível (texto puro). Ícone reflete o ESTADO atual, não a ação do clique:
// olho fechado = oculto agora; olho aberto = visível agora.
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className="pr-9" {...props} />
      <button
        type="button"
        tabIndex={-1}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}
