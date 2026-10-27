"""Teste ponta a ponta opcional (Playwright para Python).
Uso: python3 tests/e2e.py   (na raiz do projeto; sobe um servidor local em subcaminho, como no GitHub Pages)"""
import http.server, socketserver, threading, os, json, sys, tempfile, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT, NAME = os.path.dirname(ROOT), os.path.basename(ROOT)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=PARENT)
handler.log_message = lambda *a, **k: None
srv = socketserver.TCPServer(("127.0.0.1", 0), handler); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/{NAME}/"
results = []
def check(name, cond):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(accept_downloads=True)
    page = ctx.new_page()
    errors, requests = [], []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("request", lambda r: requests.append(r.url))
    page.goto(URL)
    check("tela inicial em português", "Faça simulados" in page.inner_text("h1"))

    # arquivo errado e erro de importação
    tmp = tempfile.mkdtemp()
    bad = os.path.join(tmp, "x.txt"); open(bad, "w").write("oi")
    page.set_input_files("#file-input", bad)
    page.wait_for_selector("[role=alert]:has-text('não aceito')")
    check("rejeita tipo de arquivo", True)
    badcsv = os.path.join(tmp, "q.csv"); open(badcsv, "w", encoding="utf-8").write("id;enunciado\nQ1;x")
    page.set_input_files("#file-input", [badcsv, os.path.join(ROOT, "examples/gabarito-exemplo.json")])
    page.wait_for_selector("[role=alert]:has-text('Colunas obrigatórias')")
    check("mostra erro de colunas ausentes", "Colunas obrigatórias" in page.inner_text("[role=alert]"))
    page.click("text=Cancelar importação")

    # codificação inválida
    latin = os.path.join(tmp, "l.csv"); open(latin, "wb").write("id;enunciado\nQ1;caf\xe9".encode("latin-1"))
    page.set_input_files("#file-input", latin)
    page.wait_for_selector("[role=alert]:has-text('UTF-8')")
    check("detecta codificação incompatível", True)

    # exemplo válido
    page.click("text=Carregar exemplo")
    page.wait_for_selector("text=Simulado pronto para começar")
    txt = page.inner_text("#app")
    check("resumo com título, 6 questões e 8,5 pontos", "Simulado de Demonstração" in txt and "8,5" in txt)
    page.click("text=Iniciar prova")

    body = page.inner_text("#app")
    check("sem gabarito/explicação durante a prova", "Explicação" not in body and "Gabarito" not in body and "Brasília é a capital federal" not in body)
    html = page.content()
    check("gabarito não aparece no DOM da prova", "defunto autor" not in html)
    page.check("#opt-B")            # Q1 correta
    page.click("text=Próxima"); page.check("#opt-A")   # Q2 errada
    page.click("text=Marcar para revisão")
    check("marcação para revisão", page.get_attribute("#flag-btn", "aria-pressed") == "true")
    page.click("button[aria-label^='Questão 5']"); page.check("#opt-C")  # Q5 correta (peso 2)
    check("enunciado multilinha preservado", "Penso; logo" in page.inner_text(".q-statement"))
    page.reload(); page.wait_for_selector("text=Continuar")
    page.click("button:has-text('Continuar')")
    check("recupera progresso após recarregar", "3 respondidas" in page.inner_text("#prog-l"))
    page.click("text=Finalizar prova")
    check("aviso de questões em branco", "em branco" in page.inner_text("[role=alert]"))
    page.click("text=Voltar à prova")
    page.click("text=Finalizar prova"); page.click("text=Confirmar envio definitivo")
    page.wait_for_selector("text=Resultado —")
    r = page.inner_text("#app")
    # 1 + 2 = 3 pontos de 8,5 => 3,5 e 35,3%
    check("nota 3,5 e 35,3%", "3,5" in r and "35,3%" in r and "3 / 8,5" in r)
    check("explicação aparece só nos resultados", "Brasília é a capital federal" in r)
    page.click("button:has-text('Erradas')")
    check("filtro de erradas", page.locator("article.q-result").count() == 1)
    page.click("button:has-text('Não respondidas')")
    check("filtro de não respondidas", page.locator("article.q-result").count() == 3)
    page.click("button:has-text('Todas')")
    check("lista completa", page.locator("article.q-result").count() == 6)
    with page.expect_download() as dl:
        page.click("text=Exportar resultado em JSON")
    data = json.load(open(dl.value.path(), encoding="utf-8"))
    check("exportação JSON", data["score"]["obtained"] == 3 and data["totals"] == {"questions": 6, "correct": 2, "wrong": 1, "blank": 3})
    page.click("text=Voltar à tela inicial")
    check("histórico lista a prova", "Provas recentes" in page.inner_text("#app"))
    page.click("button:has-text('Ver resultado')"); page.wait_for_selector("text=Resultado —")
    page.click("text=Refazer simulado"); check("refazer inicia nova tentativa", "Questão 1 de 6" in page.inner_text("#prog-l"))
    page.click("text=Salvar e sair")
    page.click("button:has-text('Apagar todo o histórico')")
    page.click("dialog >> text=Apagar tudo")
    page.wait_for_function("!document.body.innerText.includes('Provas recentes')")
    check("apagar histórico", "Provas recentes" not in page.inner_text("#app"))

    # XSS: texto importado nunca vira HTML
    xs = os.path.join(tmp, "xss.csv"); xg = os.path.join(tmp, "xss.json")
    open(xs, "w", encoding="utf-8").write('id;enunciado;alternativa_A;alternativa_B;alternativa_C;alternativa_D;alternativa_E\nX1;"<img src=x onerror=window.__pwn=1>";"<b>a</b>";"b";"";"";""\n')
    json.dump({"schema_version": "1.0", "exam_id": "xss", "title": "<i>t</i>", "questions": [{"id": "X1", "correct_answer": "A"}]}, open(xg, "w"))
    page.set_input_files("#file-input", [xs, xg]); page.click("text=Iniciar prova")
    check("HTML importado não é executado", page.evaluate("window.__pwn === undefined") and page.locator("#app img").count() == 0)

    # offline com Service Worker
    page2 = ctx.new_page(); page2.goto(URL)
    page2.evaluate("navigator.serviceWorker.ready.then(() => 1)")
    page2.wait_for_timeout(1500); page2.reload(); page2.wait_for_timeout(500)
    ctx.set_offline(True)
    page2.reload(); page2.wait_for_selector("text=Carregar exemplo")
    page2.click("text=Carregar exemplo"); page2.wait_for_selector("text=Simulado pronto para começar")
    page2.click("text=Iniciar prova"); page2.check("#opt-B")
    check("funciona sem rede após o primeiro carregamento", "1 respondida" in page2.inner_text("#prog-l"))
    ctx.set_offline(False)

    external = [u for u in requests if not u.startswith(f"http://127.0.0.1:{port}")]
    check("nenhuma requisição externa", not external)
    check("sem erros de console", not errors)
    if errors: print(errors)
    b.close()
srv.shutdown()
bad = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} verificações passaram")
sys.exit(1 if bad else 0)
