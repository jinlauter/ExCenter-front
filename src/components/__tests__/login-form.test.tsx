import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/login-form';

const replace = vi.fn();
const refresh = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
    searchParams = new URLSearchParams();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('mantém o botão "Entrar" desabilitado até preencher email e senha', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submit = screen.getByRole('button', { name: 'Entrar' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Senha'), 'senha123');
    expect(submit).toBeEnabled();
  });

  it('habilita o botão "Entrar" quando o browser autopreenche os campos, sem precisar de clique', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('E-mail') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: 'Entrar' });

    expect(submit).toBeDisabled();

    // Cenário REAL do Chrome: no autofill em page-load, o valor é preenchido visualmente mas fica
    // MASCARADO pro JS (input.value === '') até o primeiro gesto do usuário. Só a animação CSS de
    // :autofill dispara. Por isso NÃO setamos value aqui — simulamos o valor escondido — e mesmo
    // assim o botão tem que habilitar (via autofillDetected), sem depender de ler o valor.
    fireEvent.animationStart(emailInput, { animationName: 'autofill-detect' });
    fireEvent.animationStart(passwordInput, { animationName: 'autofill-detect' });

    expect(submit).toBeEnabled();
  });

  it('no submit após autofill, lê o valor real via ref (exposto pelo gesto) mesmo com value mascarado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('E-mail') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: 'Entrar' });

    // autofill detectado (animação) habilita o botão, mas o state React continua vazio
    fireEvent.animationStart(emailInput, { animationName: 'autofill-detect' });
    fireEvent.animationStart(passwordInput, { animationName: 'autofill-detect' });
    expect(submit).toBeEnabled();

    // O clique do usuário é o gesto que "libera" os valores autopreenchidos pro JS — simulamos
    // isso setando o value no DOM logo antes de submeter. handleSubmit deve lê-los via ref.
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeValueSetter.call(emailInput, 'auto@teste.dev');
    nativeValueSetter.call(passwordInput, 'autoSenha1');
    fireEvent.click(submit);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.username).toBe('auto@teste.dev');
    expect(body.password).toBe('autoSenha1');
  });

  it('bloqueia submit com campos realmente vazios, mesmo com o botão habilitado por autofill', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('E-mail') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: 'Entrar' });

    // autofill detectado habilita o botão, mas os campos seguem vazios de verdade (nenhum value)
    fireEvent.animationStart(emailInput, { animationName: 'autofill-detect' });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    expect(await screen.findByText('Preencha e-mail e senha.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignora animações que não são de detecção de autofill', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('E-mail') as HTMLInputElement;
    const submit = screen.getByRole('button', { name: 'Entrar' });

    fireEvent.animationStart(emailInput, { animationName: 'outra-animacao-qualquer' });

    expect(submit).toBeDisabled();
  });

  it('em sucesso, redireciona pra "from" validado e atualiza a sessão do server', async () => {
    searchParams = new URLSearchParams({ from: '/historico' });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/historico'));
    expect(refresh).toHaveBeenCalled();
  });

  it('rejeita um "from" externo e cai no fallback /home (open redirect)', async () => {
    searchParams = new URLSearchParams({ from: 'https://site-malicioso.com' });
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'));
  });

  it('mostra mensagem específica para credenciais inválidas (401)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senhaerrada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciais inválidas. Verifique e-mail e senha.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('mostra mensagem de rate limit (429)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Muitas tentativas. Aguarde 1 minuto e tente novamente.')).toBeInTheDocument();
  });

  it('mostra mensagem de falha de rede quando o fetch rejeita', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Falha de rede. Verifique sua conexão e tente novamente.')).toBeInTheDocument();
  });

  it('exibe erro inicial vindo do callback OAuth (?error=google)', () => {
    searchParams = new URLSearchParams({ error: 'google' });
    render(<LoginForm />);

    expect(screen.getByText('Não foi possível entrar com o Google. Tente novamente.')).toBeInTheDocument();
  });

  it('desabilita os botões Google/Microsoft quando o provider não está habilitado', () => {
    render(<LoginForm googleEnabled={false} microsoftEnabled={false} />);

    expect(screen.getByRole('button', { name: /Google/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Microsoft/ })).toBeDisabled();
  });

  it('habilita o botão do provider quando ele está configurado', () => {
    render(<LoginForm googleEnabled microsoftEnabled={false} />);

    expect(screen.getByRole('button', { name: /Google/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Microsoft/ })).toBeDisabled();
  });

  it('o campo de senha tem o botão de mostrar/ocultar', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(senha).toHaveAttribute('type', 'text');
  });

  it('envia remember=false por padrão (checkbox desmarcado)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.remember).toBe(false);
  });

  it('envia remember=true quando "Lembrar de mim" está marcado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'user@teste.dev');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByLabelText('Lembrar de mim'));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.remember).toBe(true);
  });
});
