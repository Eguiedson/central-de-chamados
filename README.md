# Central de Chamados

Fila de chamados de TI com prioridade, prazo de SLA e painel de indicadores. Roda no navegador, sem servidor e sem instalação.

**Abrir:** https://eguiedson.github.io/central-de-chamados/

## Por que fiz

Por dois anos atendi chamados no ServiceNow e no GLPI. Aqui reconstruí o núcleo desse processo do zero, para entender por dentro o que essas ferramentas fazem: abertura, triagem por prioridade, prazo de atendimento e acompanhamento do SLA.

## O que faz

- Abre chamado com resumo, solicitante, área, categoria e prioridade.
- Calcula o prazo de SLA pela prioridade:

  | Prioridade | Quando usar | SLA |
  |---|---|---|
  | P1 · Crítica | para a operação | 4 h |
  | P2 · Alta | afeta um setor | 8 h |
  | P3 · Média | afeta uma pessoa | 24 h |
  | P4 · Baixa | dúvida ou pedido | 72 h |

- Ordena a fila por quem vence primeiro e marca em amarelo o que está perto de vencer (menos de 25% do prazo) e em vermelho o que estourou.
- Fluxo de status: Aberto → Em atendimento → Resolvido, com opção de reabrir.
- Indicadores: chamados em aberto, SLA estourado, resolvidos e percentual resolvido no prazo, além de um gráfico por categoria.
- Busca e filtro por status. Os dados ficam no `localStorage` do navegador.
- O botão **Carregar exemplos** cria chamados com horários variados, para ver todas as situações de SLA.

## Como é feito

HTML, CSS e JavaScript puro, sem framework. A lógica está toda em [`app.js`](app.js):

- `situacaoSla()` decide se o chamado está no prazo, perto de vencer ou estourado.
- `desenhar()` monta a fila e os indicadores a partir da lista de chamados.
- O texto digitado é escapado antes de ir para a tela (`esc()`), para não executar HTML vindo do usuário.

Desenvolvido com apoio do Claude Code.

## Próximos passos

- SLA em horas úteis (hoje são horas corridas).
- Exportar a fila para CSV.
- Versão em Power Apps com lista do SharePoint e notificação por Power Automate.
