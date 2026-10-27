# Formato dos arquivos de simulado

Todo simulado é composto por **dois arquivos**, ambos em **UTF-8** (com ou sem BOM):

1. `*.csv` — questões e alternativas.
2. `*.json` — gabarito, pesos e explicações.

A ligação entre os dois é feita **somente pelo `id`** da questão, nunca pela posição.

## 1. CSV de questões

Delimitador padrão: ponto e vírgula (`;`). Vírgula também é aceita quando o cabeçalho usa vírgulas e nenhum ponto e vírgula.

Cabeçalho exato:

```csv
id;enunciado;alternativa_A;alternativa_B;alternativa_C;alternativa_D;alternativa_E
```

Regras:

- `id`: obrigatório e único (ex.: `Q001`). Espaços nas pontas são removidos.
- `enunciado`: obrigatório.
- `alternativa_A` a `alternativa_E`: pelo menos **duas** preenchidas; as demais podem ficar vazias (`""`). A ordem original é preservada.
- Campos com `;`, aspas ou quebras de linha devem ficar entre aspas duplas. Aspas dentro do campo são escritas em dobro (`""`).
- Cada linha deve ter exatamente 7 campos.

## 2. JSON de gabarito

```json
{
  "schema_version": "1.0",
  "exam_id": "matematica-basica-001",
  "title": "Simulado de Matemática Básica",
  "description": "Opcional.",
  "subject": "Opcional.",
  "default_points": 1,
  "questions": [
    { "id": "Q001", "correct_answer": "B", "points": 1, "explanation": "Opcional." }
  ]
}
```

| Campo | Obrigatório | Regra |
|---|---|---|
| `schema_version` | sim | Deve ser `"1.0"`. |
| `exam_id` | sim | Texto não vazio que identifica o simulado. |
| `title` | sim | Texto não vazio. |
| `description`, `subject` | não | Texto. |
| `default_points` | não | Número finito maior que zero. Padrão: `1`. |
| `questions[].id` | sim | Único; deve existir no CSV. |
| `questions[].correct_answer` | sim | Letra `A`–`E` (maiúscula ou minúscula) de uma alternativa **preenchida** no CSV. |
| `questions[].points` | não | Número finito maior que zero. Se omitido, usa `default_points`. |
| `questions[].explanation` | não | Texto exibido apenas nos resultados. |

## 3. Validação na importação

O aplicativo bloqueia o início da prova e lista os problemas (em português, com linha ou questão) quando encontra: CSV ou JSON vazio ou malformado, colunas ausentes, IDs duplicados, IDs presentes em apenas um arquivo, menos de duas alternativas, resposta apontando para alternativa vazia, pontuação negativa, zero, não numérica ou infinita, e arquivos fora de UTF-8.

## 4. Cálculo da nota

- Questão correta: pontuação integral. Errada ou em branco: zero (**sem penalização**).
- Pontuação máxima = soma dos pesos.
- `percentual = obtida / máxima × 100` e `nota = obtida / máxima × 10`. Se a máxima for zero, ambos valem 0.
- O arredondamento acontece apenas na exibição.

## 5. Armazenamento local

Tentativas (em andamento e finalizadas) ficam em uma única chave do `localStorage` (`simulados:v1:tentativas`). Para permitir **continuar** uma prova interrompida, o registro da tentativa contém uma cópia do simulado importado, incluindo o gabarito. O `localStorage` **não é criptografado** e pode ser inspecionado por qualquer pessoa com acesso ao navegador: o aplicativo é para estudo pessoal, não para avaliações supervisionadas.

## 6. Exportação do resultado

O botão "Exportar resultado em JSON" gera um arquivo com `export_version`, `exam_id`, `title`, datas, `score` (`obtained`, `max`, `percent`, `grade_10`), `totals` e a lista `questions` com resposta marcada, gabarito, status e pontuação.
