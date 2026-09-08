// Perguntas frequentes da landing, em módulo próprio por um motivo de SEO e não de organização:
// o mesmo conteúdo alimenta a seção visível E o JSON-LD FAQPage renderizado em app/page.tsx.
// O Google exige que dado estruturado de FAQ corresponda ao que o usuário vê na página —
// duplicar o texto em dois lugares faria as duas versões divergirem na primeira edição, e
// FAQ estruturado que não bate com a tela é motivo de penalidade, não de destaque.
export const LANDING_FAQ = [
  { q: 'De quais laboratórios funciona?', a: 'De qualquer um. Você envia o PDF ou a foto do laudo e nós padronizamos os resultados — então Fleury, Frischmann Aisengart, Unimed ou o laboratório do seu bairro caem todos no mesmo histórico comparável.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Seu histórico é só seu: não vendemos seus dados e você pode apagar seus exames ou a conta inteira quando quiser.' },
  { q: 'Consigo ver o laudo original do laboratório?', a: 'Sim. O arquivo que o laboratório emitiu fica guardado junto do exame: você abre na tela ou baixa quando quiser, exatamente como veio. O histórico organizado é uma leitura a mais, não um substituto do documento original.' },
  { q: 'Preciso de médico para usar?', a: 'Não. O ExCenter organiza e mostra a evolução dos seus exames — é uma ferramenta de acompanhamento, não substitui avaliação médica. Ele deixa sua consulta mais produtiva: você chega com o histórico pronto.' },
  { q: 'Meu médico pode acessar meus exames pelo ExCenter?', a: 'Pode, se você autorizar. O médico passa por verificação profissional e você escolhe o que compartilhar: quais exames, se inclui o histórico anterior e se os próximos exames que você enviar também vão para ele. O acesso é de leitura e você encerra quando quiser. Pagar por uma conta não dá acesso aos exames de outra pessoa.' },
  { q: 'Posso cancelar quando quiser?', a: 'A qualquer momento, em um clique. Sem multa. E mesmo depois de cancelar, seu histórico continua seu — você pode exportar tudo.' },
  { q: 'Como funciona o plano grátis?', a: 'Você guarda até 3 envios de exames com histórico de 90 dias e gráficos básicos, sem cartão. Quando quiser envios ilimitados e o histórico completo, é só assinar.' },
  { q: 'O que conta como um "envio de exame"?', a: 'Cada laudo que você manda para o ExCenter — um PDF, um exame. Não importa quantos parâmetros ele traga: um hemograma com 25 linhas conta como um envio, igual a um exame de glicose sozinho.' },
  { q: 'Tenho uma clínica / casa de apoio — como funciona para equipes?', a: 'Você contrata um pacote de contas (5 ilimitadas + 3 Pessoal na Clínica; 10 ilimitadas + 5 Pessoal na Casa de Apoio), convida cada pessoa, e cada uma tem a própria conta — privada como qualquer outra. As contas Pessoal existem para quem acompanha menos de perto e não precisa de envios ilimitados. O pagamento fica centralizado com você. Precisa de outra quantidade? Fale com a gente e montamos sob medida.' },
] as const;
