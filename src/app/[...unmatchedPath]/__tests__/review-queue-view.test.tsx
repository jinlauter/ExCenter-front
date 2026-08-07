import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewQueueView } from '../review-queue-view';
import type { ReviewQueueEntry } from '../types';

function makeEntry(overrides: Partial<ReviewQueueEntry> = {}): ReviewQueueEntry {
  return {
    termId: 7,
    normalizedName: 'hematocrito',
    normalizedUnit: '%',
    sampleOriginalName: 'Hematócrito',
    sampleOriginalUnit: '%',
    sampleMaterial: 'Sangue Total',
    samplePanelName: 'Hemograma com Contagem de Plaquetas',
    sampleLaboratoryName: 'FRISCHMANN AISENGART',
    timesObserved: 17,
    status: 'AwaitingHumanReview',
    stabilityGatePassed: false,
    unitGatePassed: null,
    materialGatePassed: null,
    firstPassChosenAnalyteId: 5221,
    secondPassChosenAnalyteId: 1834,
    candidatesOffered: [
      {
        canonicalAnalyteId: 5221,
        position: 1,
        loincName: 'Hematocrit',
        nameInPortuguese: 'Hematócrito',
        displayName: null,
        bestDisplayName: 'Hematócrito',
      },
      {
        canonicalAnalyteId: 1834,
        position: 2,
        loincName: 'Hematocrit.automated',
        nameInPortuguese: null,
        displayName: null,
        bestDisplayName: 'Hematocrit.automated',
      },
    ],
    ...overrides,
  };
}

const okAction = () => vi.fn().mockResolvedValue({ ok: true });

describe('ReviewQueueView — o cartão de decisão', () => {
  it('mostra o termo, o contexto e o motivo da parada em português claro', () => {
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText('Hematócrito')).toBeInTheDocument();
    expect(screen.getByText(/material: Sangue Total/)).toBeInTheDocument();
    expect(screen.getByText(/visto 17×/)).toBeInTheDocument();
    expect(screen.getByText(/duas passadas da IA escolheram analitos diferentes/)).toBeInTheDocument();
  });

  it('marca qual candidato cada passada da IA escolheu', () => {
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText(/escolha da 1ª passada/)).toBeInTheDocument();
    expect(screen.getByText(/escolha da 2ª passada/)).toBeInTheDocument();
  });

  it('portão de unidade reprovado tem frase própria', () => {
    render(
      <ReviewQueueView
        initialEntries={[makeEntry({ stabilityGatePassed: true, unitGatePassed: false })]}
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText(/a unidade do laudo não aparece no perfil/)).toBeInTheDocument();
  });

  it('mapear por candidato chama a ação com o termo e o analito certos e remove o cartão', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapear' })[0]!);

    await waitFor(() => expect(mapAction).toHaveBeenCalledWith(7, 5221));
    await waitFor(() => expect(screen.queryByText('Hematócrito')).not.toBeInTheDocument());
  });

  // O poder que a IA não tem: mapear para um analito FORA dos oferecidos — o caso VCM.
  it('mapear por id manual usa o id digitado', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.change(screen.getByPlaceholderText(/Mapear para outro id/), { target: { value: '6912' } });
    fireEvent.click(screen.getByRole('button', { name: /Mapear por id/ }));

    await waitFor(() => expect(mapAction).toHaveBeenCalledWith(7, 6912));
  });

  it('ignorar exige confirmação e só então chama a ação', async () => {
    const ignoreAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={okAction()} ignoreAction={ignoreAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Não é analito/ }));
    expect(ignoreAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ignorar termo' }));

    await waitFor(() => expect(ignoreAction).toHaveBeenCalledWith(7));
  });

  it('falha da ação mantém o cartão e mostra a mensagem', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: false, message: 'Analito inexistente no dicionário.' });
    render(<ReviewQueueView initialEntries={[makeEntry()]} mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapear' })[0]!);

    expect(await screen.findByText('Analito inexistente no dicionário.')).toBeInTheDocument();
    expect(screen.getByText('Hematócrito')).toBeInTheDocument();
  });

  it('termo sem candidato mostra a orientação de mapear por id ou ignorar', () => {
    render(
      <ReviewQueueView
        initialEntries={[makeEntry({ status: 'NoCandidateFound', candidatesOffered: [], firstPassChosenAnalyteId: null })]}
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText(/provável exame que o dicionário não cobre/)).toBeInTheDocument();
  });

  it('fila vazia diz que a cascata está dando conta', () => {
    render(<ReviewQueueView initialEntries={[]} mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText(/a cascata está dando conta sozinha/)).toBeInTheDocument();
  });
});
