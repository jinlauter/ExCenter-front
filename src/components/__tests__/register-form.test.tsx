import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/components/register-form';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome completo'), 'Fulano de Tal');
  await user.type(screen.getByLabelText('Data de nascimento'), '1990-05-20');
  await user.type(screen.getByLabelText('E-mail'), 'fulano@teste.dev');
  await user.type(screen.getByLabelText('Senha'), 'SenhaValida123');
  await user.type(screen.getByLabelText('Confirmar senha'), 'SenhaValida123');
}

describe('RegisterForm', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('mantém "Criar conta" desabilitado até todos os campos serem preenchidos', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const submit = screen.getByRole('button', { name: 'Criar conta' });
    expect(submit).toBeDisabled();

    await fillValidForm(user);
    expect(submit).toBeEnabled();
  });

  it('bloqueia o envio quando as senhas não coincidem, sem chamar a API', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Confirmar senha'));
    await user.type(screen.getByLabelText('Confirmar senha'), 'outraSenha123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('em sucesso, redireciona pra /home e atualiza a sessão do server', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    expect(refresh).toHaveBeenCalled();
  });

  it('mostra a mensagem específica do back quando o cadastro falha (ex: email duplicado)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Este email já está cadastrado.' }),
    } as Response);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Este email já está cadastrado.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('mostra mensagem de rate limit (429)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Muitas tentativas. Aguarde 1 minuto e tente novamente.')).toBeInTheDocument();
  });

  it('mostra fallback genérico quando a falha não vem com mensagem', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    } as unknown as Response);
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Não foi possível criar a conta. Tente novamente em instantes.')).toBeInTheDocument();
  });

  it('mostra mensagem de falha de rede quando o fetch rejeita', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Falha de rede. Verifique sua conexão e tente novamente.')).toBeInTheDocument();
  });
});
