# Simulados — aplicativo local de simulados

Aplicativo web para fazer simulados personalizados: você importa as questões (CSV) e o gabarito (JSON), responde à prova e recebe correção automática e relatório de desempenho. Tudo roda **no navegador**: sem backend, sem banco de dados, sem APIs externas, sem telemetria e sem dependências.

## Recursos

- Importação de CSV + JSON com validação completa e mensagens de erro em português (com linha ou questão).
- Prova com navegador numérico, marcação para revisão, resumo e confirmação antes de enviar.
- Resultados com nota (0–10), pontuação bruta, percentual, filtros, explicações, exportação em JSON e impressão/PDF.
- Progresso salvo no `localStorage` (continuar tentativa, histórico, apagar).
- Tema claro/escuro automático, navegação por teclado, foco visível e textos/ícones além de cores.
- Funciona offline após o primeiro carregamento (Service Worker, em `localhost` e HTTPS).

## Estrutura

```text
aplicativo-simulados/
├── index.html · styles.css · app.js        interface
├── modules/
│   ├── csv-parser.js                       parser CSV (aspas, BOM, quebras de linha)
│   ├── exam-validator.js                   validação do CSV/JSON e cruzamento por ID
│   ├── exam-engine.js                      estado da tentativa
│   ├── grading.js                          correção e cálculo da nota
│   ├── storage.js                          localStorage com tratamento de falhas
│   └── results.js                          filtros e exportação
├── examples/                               simulado-exemplo.csv · gabarito-exemplo.json
├── docs/FORMATO_SIMULADOS.md               especificação dos arquivos
├── INSTRUCOES_IA.md                        instruções para IAs gerarem simulados
├── tests/                                  app.test.mjs (Node) · e2e.py (navegador, opcional)
├── sw.js · manifest.webmanifest · icon.svg offline/PWA
└── LICENSE
```

## Como usar

1. Abra o aplicativo, clique em **Selecionar arquivos** e escolha o `.csv` e o `.json` (ou arraste-os). Para testar, use **Carregar exemplo**.
2. Confira o resumo (título, quantidade de questões e pontuação total) e clique em **Iniciar prova**.
3. Responda, marque questões para revisão e clique em **Finalizar prova**.
4. Confirme o envio. Veja o resultado, filtre as questões e exporte ou imprima o relatório.

Para criar seus simulados com uma IA, envie a ela o arquivo [`INSTRUCOES_IA.md`](INSTRUCOES_IA.md) junto com o tema, a quantidade e o nível desejados. Ela deve devolver dois arquivos prontos para importar. O formato está detalhado em [`docs/FORMATO_SIMULADOS.md`](docs/FORMATO_SIMULADOS.md).

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (por exemplo, `aplicativo-simulados`), público para o plano gratuito.
2. Envie os arquivos do projeto para a raiz do repositório (`index.html` na raiz), pelo botão **Add file > Upload files** ou com `git push`.
3. No repositório, abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch principal (`main`) e a pasta **/ (root)**, e clique em **Save**.
6. Aguarde alguns minutos até a publicação terminar (a página mostra o status).
7. Abra o endereço gerado, no formato `https://SEU-USUARIO.github.io/aplicativo-simulados/`.
8. Para atualizar, envie as alterações para a branch principal e aguarde a nova publicação. Se o navegador mostrar a versão antiga, recarregue com Ctrl+F5; para forçar a atualização do cache offline, altere o valor de `CACHE` em `sw.js` (por exemplo, `simulados-v2`).

Todos os caminhos são relativos, então o app funciona em qualquer subcaminho, e não há GitHub Actions nem etapa de compilação.

## Usar localmente

- **Mais simples:** abra `index.html` no navegador. A leitura de arquivos pelo seletor funciona normalmente. O botão **Carregar exemplo** e o modo offline persistente podem não funcionar em `file://`, pois navegadores bloqueiam essas leituras; use o seletor com os arquivos da pasta `examples/`.
- **Recomendado:** sirva a pasta por um servidor local, por exemplo `python3 -m http.server 8000` na raiz do projeto, e abra `http://localhost:8000/`. Nesse modo, o Service Worker mantém o app disponível offline depois do primeiro carregamento.

## Testes

```bash
node --test                 # testes unitários e de fluxo (Node 18+; sem dependências)
python3 tests/e2e.py        # opcional: teste em navegador real (requer Playwright para Python)
```

Os testes unitários cobrem parsing de CSV, validação, associação por ID, correção, pesos, nota e percentual, armazenamento (salvar, recuperar, apagar, dados corrompidos, falhas) e exportação. O teste de navegador percorre o fluxo completo (importar, responder, finalizar, corrigir, exportar), verifica que o gabarito não aparece durante a prova, que HTML importado não é executado, que não há requisições externas nem erros de console, e que o app funciona sem rede depois do primeiro carregamento.

## Privacidade e limites

- Os arquivos são lidos localmente; nada é enviado a servidor algum.
- O gabarito importado fica no navegador, e o `localStorage` **não é criptografado**. O aplicativo é para uso pessoal, **não** para avaliações supervisionadas ou antifraude.
- Para poder continuar uma prova interrompida, a tentativa salva guarda uma cópia do simulado (com o gabarito) dentro do próprio registro, em uma única chave. Use "Apagar todo o histórico" para remover tudo.
- Se o armazenamento estiver indisponível (por exemplo, navegação privada restrita), a prova funciona na sessão atual, mas o progresso não é preservado, e o aplicativo avisa.
- Não há penalização por questões em branco. Um sistema de penalização é uma possível evolução futura e não está implementado.

## Licença

MIT. Veja [`LICENSE`](LICENSE).
