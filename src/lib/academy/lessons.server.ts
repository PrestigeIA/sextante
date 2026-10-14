/**
 * Lesson bodies (server-only — served by `getLesson` after the plan check).
 * Numbers in the examples are illustrative and use 1 contract = 100 shares.
 */

export type Block =
  | { p: string }
  | { h: string }
  | { ul: string[] }
  | { tip: string }
  | { warn: string }
  | { table: { caption: string; rows: [string, string][] } };

export const LESSONS: Record<string, Block[]> = {
  // ------------------------------------------------------------------ Trilha 1
  "o-que-e-uma-opcao": [
    { p: "Uma opção é um contrato entre duas partes. Quem compra paga um valor (o prêmio) e recebe um direito. Quem vende recebe o prêmio e assume uma obrigação." },
    { ul: [
      "Call: direito de COMPRAR a ação a um preço combinado (o strike) até uma data (o vencimento).",
      "Put: direito de VENDER a ação ao strike até o vencimento.",
      "No mercado americano, 1 contrato corresponde a 100 ações. Um prêmio de $2,00 custa $200 por contrato.",
    ] },
    { h: "Por que alguém compra uma call?" },
    { p: "Para ganhar com a alta usando menos capital. Se a ação está em $100 e você compra uma call de strike $100 por $2, gasta $200 em vez dos $10.000 necessários para comprar 100 ações." },
    { table: { caption: "Call strike $100, prêmio $2, no vencimento", rows: [
      ["Ação a $95", "−$200 (a call vence sem valor)"],
      ["Ação a $102", "$0 (empate)"],
      ["Ação a $110", "+$800 ($10 de valor − $2 pagos) × 100"],
    ] } },
    { tip: "A perda máxima de quem compra uma opção é o prêmio pago. O ganho pode ser grande, mas a probabilidade de ganhar costuma ser menor do que parece." },
  ],
  "strike-vencimento-premio": [
    { p: "O prêmio de uma opção tem duas partes: o valor intrínseco e o valor extrínseco (também chamado de valor no tempo)." },
    { ul: [
      "Valor intrínseco: quanto a opção valeria se vencesse agora. Uma call de strike $100 com a ação a $104 tem $4 de valor intrínseco.",
      "Valor extrínseco: todo o resto. É o preço da possibilidade de a opção valer mais até o vencimento. Ele depende do tempo restante e da volatilidade.",
    ] },
    { h: "Dentro, no e fora do dinheiro" },
    { ul: [
      "ITM (in the money): tem valor intrínseco. Call com strike abaixo do preço da ação; put com strike acima.",
      "ATM (at the money): strike perto do preço atual. É onde o valor extrínseco é maior.",
      "OTM (out of the money): sem valor intrínseco. O prêmio é 100% extrínseco.",
    ] },
    { p: "No vencimento, o valor extrínseco vai a zero. Por isso o tempo é inimigo de quem compra e aliado de quem vende." },
    { tip: "No simulador, aumente os dias até o vencimento e veja o prêmio justo subir. Aumente a volatilidade implícita e veja o mesmo efeito." },
  ],
  "comprar-ou-vender": [
    { p: "Opções são um jogo de soma zero antes dos custos: cada dólar que um lado ganha, o outro perde. Depois de comissões e do spread entre compra e venda, a soma fica negativa." },
    { table: { caption: "As quatro posições básicas", rows: [
      ["Comprar call", "Ganha se a ação subir acima do strike + prêmio"],
      ["Comprar put", "Ganha se a ação cair abaixo do strike − prêmio"],
      ["Vender call", "Fica com o prêmio se a ação ficar abaixo do strike"],
      ["Vender put", "Fica com o prêmio se a ação ficar acima do strike"],
    ] } },
    { h: "Quem ganha de forma recorrente?" },
    { ul: [
      "Market makers: ganham o spread entre compra e venda e neutralizam o risco. Exige escala e tecnologia.",
      "Vendedores de volatilidade: a volatilidade implícita costuma ser maior que a que se realiza depois, porque investidores pagam caro por proteção. Quem vende atua como seguradora e recebe esse prêmio, assumindo o risco de perdas raras e grandes.",
      "Quem tem informação ou modelo melhor: possível, mas difícil de provar.",
    ] },
    { warn: "Vender uma opção sem proteção (descoberta) pode gerar perdas muito maiores que o prêmio recebido. No Sextante, as estratégias de venda têm risco definido ou garantia em dinheiro/ações." },
  ],
  "exercicio-e-liquidacao": [
    { p: "Exercer é usar o direito da opção. Assignment é o outro lado: quem vendeu é designado para cumprir a obrigação." },
    { ul: [
      "Estilo americano (ações e ETFs como SPY e QQQ): pode ser exercida a qualquer momento até o vencimento. Quem vende pode receber assignment antes da data, principalmente perto de dividendos.",
      "Estilo europeu (índices como SPX e XSP): só pode ser exercida no vencimento. Não há assignment antecipado.",
    ] },
    { h: "Entrega física ou em dinheiro" },
    { ul: [
      "Ações e ETFs: entrega física. Uma put vendida exercida faz você comprar 100 ações por contrato.",
      "Índices (SPX, XSP): liquidação em dinheiro. Você recebe ou paga só a diferença, sem ações envolvidas.",
    ] },
    { tip: "Para quem está começando com estratégias vendidas, opções de índice europeias como o XSP eliminam o risco de assignment no meio da operação e simplificam a automação." },
    { p: "Tributação nos EUA: opções de índices amplos como SPX e XSP costumam se enquadrar na Section 1256 (60% longo prazo, 40% curto prazo), enquanto opções de SPY são tributadas como ganho de curto prazo. Confirme sua situação com um contador." },
  ],
  "break-even": [
    { p: "Antes de qualquer operação, três números precisam estar claros: quanto você pode ganhar, quanto pode perder e em que preço empata." },
    { table: { caption: "Covered call: 100 ações a $100, call vendida strike $105 por $2", rows: [
      ["Lucro máximo", "+$700: ($105 − $100 + $2) × 100"],
      ["Break-even", "$98: o prêmio reduz o custo das ações"],
      ["Perda máxima", "−$9.800 se a ação for a zero"],
      ["Ação a $110 no vencimento", "+$700. Você não perde: só deixa de ganhar acima de $105"],
    ] } },
    { p: "Um erro comum é tratar a covered call como perda quando a ação dispara. O resultado continua positivo. O que você perde é o ganho que teria acima do strike, ou seja, um custo de oportunidade." },
    { tip: "Abra a Covered Call no simulador e arraste o strike. Veja como o lucro máximo e o break-even mudam juntos." },
  ],

  // ------------------------------------------------------------------ Trilha 2
  delta: [
    { p: "Delta mede quanto o preço da opção muda quando a ação sobe $1. Uma call com delta 0,40 ganha cerca de $0,40 por ação, ou $40 por contrato." },
    { ul: [
      "Calls têm delta entre 0 e 1. Puts têm delta entre −1 e 0.",
      "Opções no dinheiro têm delta perto de 0,50. Muito dentro do dinheiro, perto de 1. Muito fora, perto de 0.",
      "O delta da posição é a soma dos deltas das pernas. Ele diz a quantas ações sua posição equivale agora.",
    ] },
    { tip: "Traders usam o delta como uma estimativa grosseira da chance de a opção terminar dentro do dinheiro. É uma aproximação, não uma probabilidade exata." },
  ],
  gamma: [
    { p: "Gamma mede quanto o delta muda quando a ação anda $1. É a aceleração da posição." },
    { p: "Perto do vencimento, opções no dinheiro têm gamma muito alto: o delta pode pular de 0,2 para 0,8 em poucos minutos. Para quem vendeu, isso significa que o prejuízo acelera justamente quando há menos tempo para reagir." },
    { warn: "É por isso que estratégias vendidas que vencem no mesmo dia (0DTE) são perigosas para iniciantes e para sistemas automáticos: uma operação pode ir do lucro máximo à perda máxima em minutos." },
  ],
  theta: [
    { p: "Theta é quanto a opção perde de valor a cada dia que passa, com tudo o mais constante." },
    { ul: [
      "Quem compra opções tem theta negativo: o tempo corrói o prêmio pago.",
      "Quem vende tem theta positivo: recebe o desgaste diário.",
      "O desgaste acelera nas últimas semanas antes do vencimento.",
    ] },
    { p: "Exemplo: uma call com theta de −$0,05 perde cerca de $5 por contrato por dia, mesmo que a ação fique parada." },
    { tip: "Theta positivo não é dinheiro grátis. É o pagamento por assumir o risco de gamma e de movimentos grandes." },
  ],
  "vega-volatilidade": [
    { p: "Vega mede quanto o prêmio muda quando a volatilidade implícita (IV) sobe 1 ponto percentual." },
    { p: "Volatilidade implícita é a expectativa de oscilação que o mercado embute no preço da opção. Volatilidade realizada é quanto a ação de fato oscilou depois. A diferença entre as duas é a principal fonte de ganho de quem vende opções." },
    { ul: [
      "IV alta: opções caras. Melhor momento relativo para vender prêmio, mas costuma coincidir com mercados nervosos.",
      "IV baixa: opções baratas. Comprar fica relativamente mais barato, vender paga pouco.",
      "Depois de eventos como balanços, a IV costuma desabar (o chamado IV crush). Quem comprou antes pode perder mesmo acertando a direção.",
    ] },
    { tip: "No simulador, o campo \"Sua previsão de volatilidade\" é o que muda o valor esperado. Se você prevê a mesma volatilidade que o mercado, o VE fica perto de zero menos os custos. Uma vantagem só existe se sua previsão estiver certa e diferente da do mercado." },
  ],

  // ------------------------------------------------------------------ Trilha 3
  "covered-call": [
    { p: "Você tem 100 ações e vende uma call acima do preço atual. Recebe o prêmio agora e aceita vender as ações no strike se elas subirem até lá." },
    { ul: [
      "Funciona melhor com ações que você manteria de qualquer jeito.",
      "Reduz um pouco o risco de queda (o prêmio amortece), mas não protege de quedas fortes.",
      "Limita o ganho na alta: acima do strike, o ganho extra fica com quem comprou a call.",
    ] },
    { p: "Evidência histórica: o índice BXM da Cboe, que vende calls mensais no dinheiro contra o S&P 500, teve volatilidade menor que o índice ao longo de décadas, mas ficou para trás nos períodos de alta forte." },
  ],
  "cash-secured-put": [
    { p: "Você vende uma put e deixa reservado o dinheiro para comprar 100 ações no strike. Se a ação ficar acima do strike, você fica com o prêmio. Se cair abaixo, compra as ações pelo strike, com o custo reduzido pelo prêmio." },
    { ul: [
      "Capital necessário: strike × 100 por contrato. Uma put de strike $450 exige $45.000.",
      "O risco é parecido com o de comprar a ação, só que com um desconto (o prêmio) e com o ganho limitado.",
      "Faz sentido apenas em ativos que você aceitaria ter na carteira.",
    ] },
    { p: "O índice PUT da Cboe, que vende puts mensais do S&P 500 com garantia em dinheiro, teve retorno parecido com o do índice e volatilidade menor desde 1986, mas com quedas de mais de 30% no pior momento. Os números são brutos, sem custos nem impostos." },
  ],
  "credit-spreads": [
    { p: "Um credit spread vende uma opção e compra outra mais distante do mesmo tipo, com o mesmo vencimento. A opção comprada limita a perda." },
    { table: { caption: "Put credit spread 660/655, crédito $0,80", rows: [
      ["Lucro máximo", "+$80 se a ação ficar acima de $660"],
      ["Perda máxima", "−$420: ($5 de largura − $0,80) × 100"],
      ["Break-even", "$659,20"],
      ["Capital em risco", "$420 por contrato"],
    ] } },
    { p: "Perceba a assimetria: arrisca $420 para ganhar $80. Para empatar no longo prazo, a operação precisa dar certo em pelo menos 84% das vezes, antes dos custos." },
    { tip: "Spreads mais largos recebem mais crédito, mas arriscam mais. O que importa é a relação entre o crédito e o preço justo, não a largura." },
  ],
  "iron-condor": [
    { p: "O iron condor combina um put credit spread abaixo do preço atual com um call credit spread acima. Você ganha se a ação terminar entre os dois strikes vendidos." },
    { ul: [
      "Recebe dois créditos, mas só um dos lados pode dar prejuízo no vencimento.",
      "A perda máxima é a largura de um dos spreads menos o crédito total.",
      "São quatro pernas: os custos de execução pesam mais que em um spread simples.",
    ] },
    { warn: "Iron condors costumam ter alta probabilidade de lucro e perdas raras mas grandes. Avalie sempre pelo valor esperado depois dos custos, nunca só pela taxa de acerto." },
  ],

  // ------------------------------------------------------------------ Trilha 4
  "valor-esperado": [
    { p: "Valor esperado (VE) é o resultado médio de uma operação se você pudesse repeti-la muitas vezes. É a métrica que decide se uma estratégia vale a pena." },
    { p: "VE = (probabilidade de ganho × ganho médio) − (probabilidade de perda × perda média) − custos." },
    { table: { caption: "Put credit spread: crédito $80, perda máxima $420, 80% de acerto", rows: [
      ["Ganhos", "0,80 × $80 = +$64"],
      ["Perdas", "0,20 × $420 = −$84"],
      ["VE antes dos custos", "−$20 por operação"],
      ["Acerto necessário para empatar", "$420 ÷ ($80 + $420) = 84%"],
    ] } },
    { p: "Ou seja: 80% de acerto, aqui, é uma máquina de perder dinheiro devagar. O exemplo simplifica (só dois resultados possíveis), mas a lição vale para qualquer estratégia." },
    { tip: "No simulador, o Sextante calcula o VE integrando todos os preços possíveis no vencimento, não só os dois extremos, e já desconta comissões e slippage." },
  ],
  "tamanho-de-posicao": [
    { p: "Uma boa estratégia com tamanho errado quebra a conta. O tamanho da posição decide se você sobrevive à sequência de perdas que inevitavelmente vai acontecer." },
    { ul: [
      "Regra prática comum: arriscar no máximo 1% a 2% do capital por operação (risco = perda máxima).",
      "Com $25.000 e limite de 2%, a perda máxima por operação fica em $500: um spread de $5 de largura, não dez.",
      "Drawdown é a maior queda do capital entre um pico e o fundo seguinte. Recuperar uma queda de 50% exige ganhar 100%.",
    ] },
    { warn: "Estratégias vendidas tendem a ter perdas concentradas: vários meses de ganhos pequenos e um mês ruim que devolve tudo. Dimensione pensando no pior mês, não no mês médio." },
  ],
  "amostra-e-backtest": [
    { p: "Um resultado bom em poucas operações não prova nada. Dez operações vencedoras seguidas acontecem por acaso com frequência em estratégias de 80% de acerto." },
    { ul: [
      "Amostra: avalie só depois de pelo menos 30 operações encerradas, e de preferência em condições de mercado diferentes.",
      "Overfitting: testar centenas de combinações e escolher a melhor garante um backtest bonito e um resultado real fraco.",
      "Custos: backtests que executam no preço médio entre compra e venda escondem o custo real. Um iron condor paga o spread em quatro pernas.",
      "Crises: um período de teste sem eventos como fevereiro de 2018, março de 2020 ou agosto de 2024 esconde o risco de cauda.",
    ] },
    { tip: "O Diário do Sextante mostra quantas operações faltam para a amostra mínima e só chama um resultado de conclusivo depois disso." },
  ],
};
