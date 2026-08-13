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

vi.mock('@/lib/credentials', () => ({
  storePasswordCredential: vi.fn().mockResolvedValue(undefined),
}));

// Roteia o fetch por URL: o portão (/api/register/verify) e a efetivação (/api/register) têm
// respostas independentes por teste.
function mockFetchRoutes(routes: Record<string, Response | (() => Response)>) {
  return vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const match = Object.entries(routes).find(([path]) => String(url).endsWith(path));
      if (!match) throw new Error(`fetch inesperado: ${url}`);
      const value = match[1];
      return typeof value === 'function' ? value() : value.clone();
    }),
  );
}

const verifyOk = () => new Response(JSON.stringify({ valid: true }), { status: 200 });
const verifyFail = () => new Response(JSON.stringify({ valid: false }), { status: 200 });
const registerOk = () => new Response(JSON.stringify({}), { status: 200 });

async function passGate(user: ReturnType<typeof userEvent.setup>, email = 'fulano@teste.dev') {
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Código do convite'), 'a7kx2m');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByLabelText('Nome completo');
}

async function fillPersonalData(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{ fullName: string; dateOfBirth: string; password: string; confirm: string }> = {},
) {
  await user.type(screen.getByLabelText('Nome completo'), overrides.fullName ?? 'Fulano de Tal');
  await user.type(screen.getByLabelText('Data de nascimento'), overrides.dateOfBirth ?? '1990-05-20');
  await user.type(screen.getByLabelText('Senha'), overrides.password ?? 'SenhaValida123');
  await user.type(screen.getByLabelText('Confirmar senha'), overrides.confirm ?? overrides.password ?? 'SenhaValida123');
}

describe('RegisterForm — etapa 1, o portão', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
  });

  it('só mostra e-mail e código — nenhum dado pessoal antes do convite conferir', () => {
    mockFetchRoutes({});
    render(<RegisterForm />);

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Código do convite')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
  });

  it('"Continuar" fica desabilitado até e-mail e código preenchidos', async () => {
    mockFetchRoutes({});
    const user = userEvent.setup();
    render(<RegisterForm />);

    const submit = screen.getByRole('button', { name: 'Continuar' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('E-mail'), 'fulano@teste.dev');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Código do convite'), 'A7KX2M');
    expect(submit).toBeEnabled();
  });

  it('convite inválido mostra a mensagem genérica e NÃO avança', async () => {
    mockFetchRoutes({ '/api/register/verify': verifyFail });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('E-mail'), 'fulano@teste.dev');
    await user.type(screen.getByLabelText('Código do convite'), 'ERRADO');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(/Convite inválido/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
  });

  it('convite válido avança para a efetivação', async () => {
    mockFetchRoutes({ '/api/register/verify': verifyOk });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user);

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });
});

describe('RegisterForm — etapa 2, a efetivação', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
  });

  // O pedido central: o e-mail verificado fica TRAVADO — exibido em campo desabilitado, sem
  // como divergir do convite.
  it('o e-mail vem travado, exibindo o valor verificado', async () => {
    mockFetchRoutes({ '/api/register/verify': verifyOk });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user, 'convidada@teste.dev');

    const emailField = screen.getByLabelText('E-mail');
    expect(emailField).toBeDisabled();
    expect(emailField).toHaveValue('convidada@teste.dev');
  });

  it('"Usar outro e-mail" volta ao portão', async () => {
    mockFetchRoutes({ '/api/register/verify': verifyOk });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user);
    await user.click(screen.getByRole('button', { name: 'Usar outro e-mail' }));

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
  });

  it.each([
    [{ fullName: 'Jo' }, 'Nome completo precisa de pelo menos 3 letras.'],
    [{ dateOfBirth: '2090-01-01' }, 'Data de nascimento não pode ser no futuro.'],
    [{ dateOfBirth: '1890-01-01' }, 'Data de nascimento inválida.'],
    [{ password: 'curta12', confirm: 'curta12' }, 'A senha deve ter no mínimo 8 caracteres.'],
    [{ password: 'SenhaValida123', confirm: 'Diferente123' }, 'As senhas não coincidem.'],
  ])('valida os campos antes de enviar: %o', async (overrides, mensagem) => {
    mockFetchRoutes({ '/api/register/verify': verifyOk, '/api/register': registerOk });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user);
    await fillPersonalData(user, overrides);
    await user.click(screen.getByRole('button', { name: 'Concluir primeiro acesso' }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    // a validação barrou ANTES do envio — só o verify do portão foi pra rede
    expect(vi.mocked(fetch).mock.calls.filter(([u]) => String(u).endsWith('/api/register')).length).toBe(0);
  });

  it('sucesso envia o e-mail e o código verificados (código em maiúsculas) e vai pra home', async () => {
    mockFetchRoutes({ '/api/register/verify': verifyOk, '/api/register': registerOk });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user, 'convidada@teste.dev');
    await fillPersonalData(user);
    await user.click(screen.getByRole('button', { name: 'Concluir primeiro acesso' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
    const registerCall = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith('/api/register'))!;
    const body = JSON.parse(String((registerCall[1] as RequestInit).body));
    expect(body.email).toBe('convidada@teste.dev');
    expect(body.inviteCode).toBe('A7KX2M');
  });

  it('falha do back na efetivação mostra a mensagem e mantém a tela', async () => {
    mockFetchRoutes({
      '/api/register/verify': verifyOk,
      '/api/register': () =>
        new Response(JSON.stringify({ message: 'Convite inválido. Confira o e-mail e o código com quem te convidou.' }), { status: 400 }),
    });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await passGate(user);
    await fillPersonalData(user);
    await user.click(screen.getByRole('button', { name: 'Concluir primeiro acesso' }));

    expect(await screen.findByText(/Convite inválido/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });
});
