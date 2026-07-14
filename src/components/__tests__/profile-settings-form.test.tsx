import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettingsForm } from '@/components/profile-settings-form';
import type { UserProfileResponse } from '@/types/api';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const baseProfile: UserProfileResponse = {
  userId: 'user-1',
  username: 'Fulano de Tal',
  email: 'fulano@teste.dev',
  dateOfBirth: '1990-05-20T00:00:00Z',
  bloodType: null,
  biologicalSex: null,
  preferredLanguage: 'pt-BR',
  avatarUpdatedAt: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe('ProfileSettingsForm', () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('exibe o email como somente leitura, sem campo editável', () => {
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    expect(screen.getByText('fulano@teste.dev')).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('salva informações pessoais e atualiza a sessão do server', async () => {
    const updated = { ...baseProfile, username: 'Novo Nome' };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    const user = userEvent.setup();
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Novo Nome');
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]!);

    await waitFor(() => expect(screen.getByText('Informações pessoais atualizadas.')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/personal-info',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('mostra a mensagem de erro do back ao falhar salvar informações pessoais', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'Nome deve ter entre 1 e 100 caracteres.' }, 400));
    const user = userEvent.setup();
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'x');
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]!);

    expect(await screen.findByText('Nome deve ter entre 1 e 100 caracteres.')).toBeInTheDocument();
  });

  it('bloqueia troca de senha quando a confirmação não bate, sem chamar a API', async () => {
    const user = userEvent.setup();
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    await user.type(screen.getByLabelText('Senha atual'), 'senhaAtual123');
    await user.type(screen.getByLabelText('Nova senha'), 'senhaNova123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outraSenha123');

    // Existem 3 seções com botão "Salvar" — pega a da senha, que é a última.
    const saveButtons = screen.getAllByRole('button', { name: 'Salvar' });
    await user.click(saveButtons[saveButtons.length - 1]!);

    expect(await screen.findByText('A confirmação não bate com a nova senha.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('troca a senha com sucesso e limpa os campos', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined } as Response);
    const user = userEvent.setup();
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    await user.type(screen.getByLabelText('Senha atual'), 'senhaAtual123');
    await user.type(screen.getByLabelText('Nova senha'), 'senhaNova123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'senhaNova123');
    const saveButtons = screen.getAllByRole('button', { name: 'Salvar' });
    await user.click(saveButtons[saveButtons.length - 1]!);

    expect(await screen.findByText('Senha atualizada.')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('');
  });

  it('bloqueia foto acima de 4MB no client, sem chamar a API', async () => {
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    const bigFile = new File([new Uint8Array(5 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input, bigFile);

    expect(await screen.findByText('A foto deve ter no máximo 4 MB.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mostra o motivo específico quando o back rejeita a foto (arquivo inválido)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'O arquivo enviado não é uma imagem válida.' }, 400));
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    const smallInvalidFile = new File([new Uint8Array(10)], 'nao-imagem.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input, smallInvalidFile);

    expect(await screen.findByText('O arquivo enviado não é uma imagem válida.')).toBeInTheDocument();
  });

  it('em sucesso, atualiza o perfil e mostra o botão de remover foto', async () => {
    const updated = { ...baseProfile, avatarUpdatedAt: '2026-07-14T12:00:00Z' };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(updated));
    render(<ProfileSettingsForm initialProfile={baseProfile} />);

    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument();

    const validFile = new File([new Uint8Array(10)], 'foto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.setup().upload(input, validFile);

    expect(await screen.findByText('Foto de perfil atualizada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('remove a foto com sucesso', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined } as Response);
    const user = userEvent.setup();
    render(<ProfileSettingsForm initialProfile={{ ...baseProfile, avatarUpdatedAt: '2026-07-14T12:00:00Z' }} />);

    await user.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(await screen.findByText('Foto de perfil removida.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument();
  });
});
