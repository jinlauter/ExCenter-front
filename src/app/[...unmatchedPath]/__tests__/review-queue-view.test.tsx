import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewQueueView } from '../review-queue-view';
import type { ReviewQueueEntry, ReviewQueuePage } from '../types';

function makePage(entries: ReviewQueueEntry[], overrides: Partial<ReviewQueuePage> = {}): ReviewQueuePage {
  return { entries, totalPendingCount: entries.length, page: 1, pageSize: 5, ...overrides };
}

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
        loincPartCode: 'LP15101-6',
        propertyClass: 'VFr',
        commonTestRank: 28,
        materialProfiles: [{ material: 'WholeBlood', exampleUcumUnits: ['%'] }],
      },
      {
        canonicalAnalyteId: 1834,
        position: 2,
        loincName: 'Hematocrit.automated',
        nameInPortuguese: null,
        displayName: null,
        bestDisplayName: 'Hematocrit.automated',
        loincPartCode: 'LP15102-4',
        propertyClass: 'VFr',
        commonTestRank: 6416,
        materialProfiles: [{ material: 'WholeBlood', exampleUcumUnits: ['%'] }],
      },
    ],
    ...overrides,
  };
}

const okAction = () => vi.fn().mockResolvedValue({ ok: true });

describe('ReviewQueueView — o cartão de decisão', () => {
  it('mostra o termo, o contexto e o motivo da parada em português claro', () => {
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText('Hematócrito')).toBeInTheDocument();
    expect(screen.getByText(/material: Sangue Total/)).toBeInTheDocument();
    expect(screen.getByText(/visto 17×/)).toBeInTheDocument();
    expect(screen.getByText(/duas passadas da IA escolheram analitos diferentes/)).toBeInTheDocument();
  });

  it('marca qual candidato cada passada da IA escolheu', () => {
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText(/escolha da 1ª passada/)).toBeInTheDocument();
    expect(screen.getByText(/escolha da 2ª passada/)).toBeInTheDocument();
  });

  it('portão de unidade reprovado tem frase própria', () => {
    render(
      <ReviewQueueView
        queuePage={makePage([makeEntry({ stabilityGatePassed: true, unitGatePassed: false })])}
        basePath="/zk7q"
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText(/a unidade do laudo não aparece no perfil/)).toBeInTheDocument();
  });

  it('mapear por candidato chama a ação com o termo e o analito certos e remove o cartão', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapear' })[0]!);

    await waitFor(() => expect(mapAction).toHaveBeenCalledWith(7, 5221));
    await waitFor(() => expect(screen.queryByText('Hematócrito')).not.toBeInTheDocument());
  });

  // O poder que a IA não tem: mapear para um analito FORA dos oferecidos — o caso VCM.
  it('mapear por id manual usa o id digitado', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.change(screen.getByPlaceholderText(/Mapear para outro id/), { target: { value: '6912' } });
    fireEvent.click(screen.getByRole('button', { name: /Mapear por id/ }));

    await waitFor(() => expect(mapAction).toHaveBeenCalledWith(7, 6912));
  });

  it('ignorar exige confirmação e só então chama a ação', async () => {
    const ignoreAction = vi.fn().mockResolvedValue({ ok: true });
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={okAction()} ignoreAction={ignoreAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Não é analito/ }));
    expect(ignoreAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ignorar termo' }));

    await waitFor(() => expect(ignoreAction).toHaveBeenCalledWith(7));
  });

  it('falha da ação mantém o cartão e mostra a mensagem', async () => {
    const mapAction = vi.fn().mockResolvedValue({ ok: false, message: 'Analito inexistente no dicionário.' });
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={mapAction} ignoreAction={okAction()} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mapear' })[0]!);

    expect(await screen.findByText('Analito inexistente no dicionário.')).toBeInTheDocument();
    expect(screen.getByText('Hematócrito')).toBeInTheDocument();
  });

  it('termo sem candidato mostra a orientação de mapear por id ou ignorar', () => {
    render(
      <ReviewQueueView
        queuePage={makePage([makeEntry({ status: 'NoCandidateFound', candidatesOffered: [], firstPassChosenAnalyteId: null })])}
        basePath="/zk7q"
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText(/provável exame que o dicionário não cobre/)).toBeInTheDocument();
  });

  it('fila vazia diz que a cascata está dando conta', () => {
    render(<ReviewQueueView queuePage={makePage([])} basePath="/zk7q" mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText(/a cascata está dando conta sozinha/)).toBeInTheDocument();
  });
});

// Fatia C: o contexto completo nos candidatos e a paginação server-driven.
describe('ReviewQueueView — contexto rico e paginação', () => {
  it('cada candidato mostra código LOINC, classe, rank e perfis de material/unidade', () => {
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.getByText(/LP15101-6/)).toBeInTheDocument();
    expect(screen.getAllByText(/classe VFr/).length).toBeGreaterThan(0);
    expect(screen.getByText(/rank 28/)).toBeInTheDocument();
    expect(screen.getAllByText(/WholeBlood \(%\)/).length).toBeGreaterThan(0);
  });

  // A informação que faltava para decidir em segundos: no veto de unidade, a frase inclui o
  // que o perfil do escolhido ACEITA.
  it('veto de unidade mostra as unidades que o perfil aceita', () => {
    render(
      <ReviewQueueView
        queuePage={makePage([makeEntry({ stabilityGatePassed: true, unitGatePassed: false })])}
        basePath="/zk7q"
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText(/O perfil aceita: WholeBlood \(%\)/)).toBeInTheDocument();
  });

  it('com mais de uma página, mostra navegação com âncoras server-driven', () => {
    render(
      <ReviewQueueView
        queuePage={makePage([makeEntry()], { totalPendingCount: 33, page: 3, pageSize: 5 })}
        basePath="/zk7q"
        mapAction={okAction()}
        ignoreAction={okAction()}
      />,
    );

    expect(screen.getByText('Página 3 de 7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute('href', '/zk7q?page=2');
    expect(screen.getByRole('link', { name: /Próxima/ })).toHaveAttribute('href', '/zk7q?page=4');
  });

  it('página única não mostra navegação', () => {
    render(<ReviewQueueView queuePage={makePage([makeEntry()])} basePath="/zk7q" mapAction={okAction()} ignoreAction={okAction()} />);

    expect(screen.queryByText(/Página 1 de/)).not.toBeInTheDocument();
  });
});
