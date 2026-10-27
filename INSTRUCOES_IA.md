# Instruções para IAs: como gerar simulados compatíveis

Você (Claude, ChatGPT ou outra IA) deve produzir **dois arquivos de dados** prontos para importar no Aplicativo de Simulados. Siga este documento ao pé da letra.

## Entrega

- Forneça **dois artefatos separados**, com nomes claros: `simulado-<tema>-<numero>.csv` e `gabarito-<tema>-<numero>.json`. Se não houver suporte a artefatos/arquivos, use dois blocos de código separados, cada um identificado apenas pelo nome do arquivo acima dele.
- **Proibido** dentro dos arquivos: comentários, texto introdutório ou explicativo, cercas de Markdown (```), numeração extra, linhas em branco no início. O conteúdo do arquivo deve começar direto no cabeçalho (CSV) ou em `{` (JSON).
- Codificação UTF-8. Use acentuação normal do português.

## CSV

Cabeçalho exato (primeira linha):

```
id;enunciado;alternativa_A;alternativa_B;alternativa_C;alternativa_D;alternativa_E
```

- Delimitador: ponto e vírgula `;`.
- **Todos os campos de texto entre aspas duplas**, inclusive alternativas. Aspas internas viram `""`. Quebras de linha dentro do campo são permitidas apenas entre aspas.
- Toda linha tem exatamente 7 campos. Alternativa não usada = `""`.
- Mínimo de duas alternativas preenchidas por questão; padrão recomendado: cinco (A–E), com uma única correta.
- Não escreva "A)", "B)" etc. dentro do texto das alternativas. A letra vem da coluna.
- Não revele a resposta no enunciado nem nas alternativas.

## IDs

- Obrigatórios e únicos. Padrão: `Q001`, `Q002`, … (com zeros à esquerda), sem espaços.
- O mesmo ID deve existir no CSV e no JSON. A ligação é só por ID.

## JSON

```json
{
  "schema_version": "1.0",
  "exam_id": "tema-nivel-001",
  "title": "Título do simulado",
  "description": "Descrição curta (opcional).",
  "subject": "Disciplina (opcional).",
  "default_points": 1,
  "questions": [
    { "id": "Q001", "correct_answer": "B", "points": 1, "explanation": "Por que B está correta." }
  ]
}
```

- `schema_version` sempre `"1.0"`. `exam_id`: minúsculas, hífens, sem espaços, único por simulado.
- `correct_answer`: uma letra `A`–`E` que exista (preenchida) no CSV para aquele ID.
- Pesos (`points`): números maiores que zero; inteiros ou decimais com ponto (`1.5`). Omita para usar `default_points`. Nunca use negativos, texto ou `null`.
- Explicações: 1 a 3 frases, objetivas, justificando a alternativa correta (e, se útil, por que uma tentação comum está errada). Não referencie "a alternativa anterior"; a ordem é fixa, mas seja autoexplicativo.
- JSON estrito: aspas duplas, sem vírgula sobrando, sem comentários.

## Exemplo completo e válido

`simulado-exemplo-001.csv`

```
id;enunciado;alternativa_A;alternativa_B;alternativa_C;alternativa_D;alternativa_E
Q001;"Quanto é 2 + 2?";"3";"4";"5";"6";"7"
Q002;"Qual é a capital do Brasil?";"São Paulo";"Brasília";"Salvador";"Recife";"Curitiba"
Q003;"Qual destes números é primo?";"9";"15";"17";"21";"27"
```

`gabarito-exemplo-001.json`

```json
{
  "schema_version": "1.0",
  "exam_id": "exemplo-001",
  "title": "Simulado de Exemplo",
  "default_points": 1,
  "questions": [
    { "id": "Q001", "correct_answer": "B", "explanation": "2 + 2 é igual a 4." },
    { "id": "Q002", "correct_answer": "B", "points": 2, "explanation": "Brasília é a capital federal do Brasil." },
    { "id": "Q003", "correct_answer": "C", "explanation": "17 possui apenas dois divisores positivos: 1 e 17." }
  ]
}
```

## Como variar disciplina, quantidade e dificuldade

- Siga exatamente a quantidade pedida; se não for informada, pergunte ou use 10 questões.
- Distribua o gabarito de forma equilibrada entre A–E (evite padrões e evite concentrar em uma letra).
- Dificuldade: use `points` maiores (2 ou 3) para questões mais difíceis só se o usuário pedir pesos; caso contrário, deixe todos iguais via `default_points`.
- Distratores plausíveis, de tamanho parecido com a resposta correta; evite "todas as anteriores" e "nenhuma das anteriores".
- Disciplinas com fórmulas: escreva em texto simples (`x^2`, `raiz de 9`, `3/4`); não use HTML nem LaTeX.
- Questões baseadas em texto: inclua o trecho dentro do enunciado (entre aspas duplas, com `""` para citações).
- Não invente fatos; em temas factuais, prefira conteúdo verificável e, quando houver dúvida, escolha outra questão.

## Checklist antes de entregar

1. O CSV começa exatamente pelo cabeçalho e todas as linhas têm 7 campos?
2. Os IDs são únicos e idênticos nos dois arquivos? Nenhum ID sobrando ou faltando?
3. Cada `correct_answer` aponta para uma alternativa preenchida?
4. Há pelo menos duas alternativas preenchidas em cada questão?
5. Todos os pesos são números maiores que zero?
6. O JSON é válido e `schema_version` é `"1.0"`?
7. Nenhum comentário, texto extra ou cerca de Markdown dentro dos arquivos?
8. As explicações estão presentes (recomendado) e corretas?
