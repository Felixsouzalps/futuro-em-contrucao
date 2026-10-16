
/* =========================================
   FUTURO EM CONSTRUÇÃO
   Interações e carregamento de oportunidades
========================================= */

(() => {
    "use strict";

    // API relativa: funciona localmente e no Vercel.
    const API_URL = "/api/oportunidades";

    const pesquisa = document.getElementById("campoPesquisa");
    const filtros = document.querySelectorAll(".filtro");

    const cardsOriginais = document.querySelectorAll(
        "#listaOportunidades .oportunidade-card"
    );

    const resultados = document.getElementById("resultadosEditais");
    const status = document.getElementById("statusEditais");
    const atualizacao = document.getElementById("atualizacaoEditais");
    const botaoAtualizar = document.getElementById("atualizarEditais");
    const mensagemVaziaEditais = document.getElementById(
        "mensagemVaziaEditais"
    );
    const listaFontes = document.getElementById("fontesEditais");

    const contador = document.getElementById("contadorResultados");
    const mensagemVaziaOriginal = document.getElementById("mensagemVazia");
    const limparPesquisa = document.getElementById("limparPesquisa");
    const limparTudo = document.getElementById("limparTudo");

    let oportunidades = [];
    let carregando = false;
    let filtroAtivo = "todos";
    let erroApi = false;

    /* =========================================
       UTILITÁRIOS
    ========================================= */

    function normalizar(texto) {
        return String(texto ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR");
    }

    function elemento(tag, classe, texto) {
        const node = document.createElement(tag);

        if (classe) {
            node.className = classe;
        }

        if (texto !== undefined) {
            node.textContent = texto;
        }

        return node;
    }

    function formatarData(valor) {
        if (!valor) {
            return "Data não informada";
        }

        const texto = String(valor);
        const data = new Date(
            /^\d{4}-\d{2}-\d{2}$/.test(texto)
                ? `${texto}T12:00:00`
                : texto
        );

        return Number.isNaN(data.getTime())
            ? texto
            : data.toLocaleDateString("pt-BR");
    }

    function correspondeCategoria(categorias) {
        const lista = Array.isArray(categorias)
            ? categorias
            : String(categorias || "").split(/[\s,]+/);

        const cats = lista.map(normalizar);

        if (filtroAtivo === "todos") {
            return true;
        }

        if (filtroAtivo === "gratuito") {
            return cats.includes("gratuito");
        }

        return cats.includes(normalizar(filtroAtivo));
    }

    function correspondePesquisa(texto) {
        const termo = normalizar(pesquisa?.value || "");
        return normalizar(texto).includes(termo);
    }

    /* =========================================
       FILTROS DOS CARDS ORIGINAIS
    ========================================= */

    function filtrarOriginais() {
        let quantidade = 0;

        cardsOriginais.forEach((card) => {
            const texto = [
                card.dataset.pesquisa || "",
                card.textContent || ""
            ].join(" ");

            const categorias = card.dataset.categorias || "";

            const visivel =
                correspondePesquisa(texto) &&
                correspondeCategoria(categorias);

            card.hidden = !visivel;

            if (visivel) {
                quantidade++;
            }
        });

        if (mensagemVaziaOriginal) {
            mensagemVaziaOriginal.hidden = quantidade > 0;
        }

        return quantidade;
    }

    /* =========================================
       CRIAÇÃO DOS CARDS DINÂMICOS
    ========================================= */

    function criarCard(item) {
        const card = elemento(
            "article",
            "oportunidade-card edital-card"
        );

        const tituloTexto =
            item.titulo ||
            item.title ||
            "Oportunidade";

        const instituicaoTexto =
            item.instituicao ||
            item.fonte ||
            "Instituição não informada";

        const categorias = [
            item.categoria || "",
            item.gratuito ? "gratuito" : ""
        ].filter(Boolean);

        card.dataset.categorias = categorias.join(" ");

        card.dataset.pesquisa = normalizar([
            tituloTexto,
            instituicaoTexto,
            item.descricao || "",
            item.fonte || "",
            item.categoria || ""
        ].join(" "));

        const topo = elemento("div", "card-topo");

        topo.append(
            elemento("span", "card-numero", "OPORTUNIDADE"),
            elemento("span", "card-icone", "↗")
        );

        const corpo = elemento("div", "card-corpo");

        corpo.append(
            elemento(
                "span",
                "card-categoria",
                instituicaoTexto.toLocaleUpperCase("pt-BR")
            ),
            elemento("h3", "", tituloTexto),
            elemento(
                "p",
                "",
                item.descricao ||
                    "Consulte os detalhes e requisitos na página oficial."
            )
        );

        if (item.dataPublicacao) {
            corpo.append(
                elemento(
                    "p",
                    "",
                    `Publicado em: ${formatarData(item.dataPublicacao)}`
                )
            );
        }

        if (item.dataEncerramento) {
            corpo.append(
                elemento(
                    "p",
                    "",
                    `Inscrições até: ${formatarData(item.dataEncerramento)}`
                )
            );
        }

        if (item.status) {
            corpo.append(
                elemento(
                    "p",
                    "",
                    `Status: ${String(item.status).replaceAll("_", " ")}`
                )
            );
        }

        card.append(topo, corpo);

        // Só cria links HTTP ou HTTPS válidos.
        const endereco = item.url || item.link;

        if (endereco) {
            try {
                const url = new URL(endereco);

                if (["https:", "http:"].includes(url.protocol)) {
                    const link = elemento(
                        "a",
                        "card-link",
                        "Consultar no site oficial ↗"
                    );

                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";

                    card.append(link);
                }
            } catch {
                // Não exibe um link inválido.
            }
        }

        return card;
    }

    /* =========================================
       RENDERIZAÇÃO DOS EDITAIS
    ========================================= */

    function renderizarEditais() {
        if (!resultados) {
            return 0;
        }

        resultados.replaceChildren();

        const filtradas = oportunidades.filter((item) => {
            const texto = [
                item.titulo,
                item.title,
                item.instituicao,
                item.descricao,
                item.fonte,
                item.categoria
            ].join(" ");

            const categorias = [
                item.categoria || "",
                item.gratuito ? "gratuito" : ""
            ].join(" ");

            return (
                correspondePesquisa(texto) &&
                correspondeCategoria(categorias)
            );
        });

        filtradas.forEach((item) => {
            resultados.append(criarCard(item));
        });

        if (mensagemVaziaEditais) {
            mensagemVaziaEditais.hidden = filtradas.length > 0;
        }

        return filtradas.length;
    }

    /* =========================================
       CONTADORES E ESTADO DOS FILTROS
    ========================================= */

    function aplicarFiltros() {
        const quantidadeOriginal = filtrarOriginais();
        const quantidadeEditais = renderizarEditais();

        filtros.forEach((botao) => {
            const ativo =
                (botao.dataset.filtro || "todos") === filtroAtivo;

            botao.classList.toggle("ativo", ativo);
            botao.setAttribute("aria-pressed", String(ativo));
        });

        if (contador) {
            const total = quantidadeOriginal + quantidadeEditais;

            contador.textContent =
                `${String(total).padStart(2, "0")} oportunidade(s)`;
        }

        if (status && !erroApi) {
            status.textContent =
                `${quantidadeEditais} edital(is) encontrado(s) na busca automática.`;
        }
    }

    /* =========================================
       FONTES CONSULTADAS PELA API
    ========================================= */

    function renderizarFontes(fontes) {
        if (!listaFontes) {
            return;
        }

        listaFontes.replaceChildren();

        (Array.isArray(fontes) ? fontes : []).forEach((fonte) => {
            const item = document.createElement("li");

            const nome =
                fonte.instituicao ||
                fonte.nome ||
                fonte.fonte ||
                "Fonte";

            const estado =
                fonte.status === "consultada"
                    ? "consultada"
                    : "consulta indisponível";

            item.append(
                document.createTextNode(`${nome} — ${estado}`)
            );

            if (fonte.url) {
                try {
                    const url = new URL(fonte.url);

                    if (["https:", "http:"].includes(url.protocol)) {
                        const link = elemento("a", "", " Abrir fonte");

                        link.href = url.href;
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";

                        item.append(link);
                    }
                } catch {
                    // Mantém o nome da fonte mesmo sem link válido.
                }
            }

            listaFontes.append(item);
        });
    }

    /* =========================================
       CARREGAMENTO DA API
    ========================================= */

    async function carregar(forcarAtualizacao = false) {
        if (carregando || !resultados || !status) {
            return;
        }

        carregando = true;
        erroApi = false;

        if (botaoAtualizar) {
            botaoAtualizar.disabled = true;
        }

        status.textContent = "Buscando oportunidades...";

        try {
            const url = new URL(
                API_URL,
                window.location.origin
            );

            if (forcarAtualizacao) {
                url.searchParams.set("atualizar", "1");
            }

            const resposta = await fetch(url, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status}`);
            }

            const dados = await resposta.json();

            oportunidades = Array.isArray(dados.oportunidades)
                ? dados.oportunidades
                : [];

            renderizarFontes(dados.fontes);

            if (atualizacao) {
                const data = new Date(dados.atualizadoEm);

                atualizacao.textContent =
                    !dados.atualizadoEm ||
                    Number.isNaN(data.getTime())
                        ? "Data da atualização não informada."
                        : `Última atualização: ${data.toLocaleString("pt-BR")}`;
            }

            aplicarFiltros();
        } catch (erro) {
            console.error("Erro ao carregar editais:", erro);

            erroApi = true;

            status.textContent =
                "Não foi possível consultar os editais. Os cards originais continuam disponíveis.";

            aplicarFiltros();
        } finally {
            carregando = false;

            if (botaoAtualizar) {
                botaoAtualizar.disabled = false;
            }
        }
    }

    /* =========================================
       EVENTOS
    ========================================= */

    pesquisa?.addEventListener("input", aplicarFiltros);

    filtros.forEach((botao) => {
        botao.addEventListener("click", () => {
            filtroAtivo = botao.dataset.filtro || "todos";
            aplicarFiltros();
        });
    });

    limparPesquisa?.addEventListener("click", () => {
        if (pesquisa) {
            pesquisa.value = "";
            pesquisa.focus();
        }

        aplicarFiltros();
    });

    limparTudo?.addEventListener("click", () => {
        if (pesquisa) {
            pesquisa.value = "";
        }

        filtroAtivo = "todos";
        aplicarFiltros();
    });

    botaoAtualizar?.addEventListener("click", () => {
        carregar(true);
    });

    /* =========================================
       INICIALIZAÇÃO
    ========================================= */

    aplicarFiltros();
    carregar();
})();
/* =========================================
   EVENTOS
========================================= */


/* =========================================
   MENU DE NAVEGAÇÃO
========================================= */

const menuBotao = document.getElementById("menuBotao");
const menuNavegacao = document.getElementById("menuNavegacao");


function fecharMenuNavegacao() {
    if (!menuBotao || !menuNavegacao) return;

    menuBotao.setAttribute("aria-expanded", "false");
    menuBotao.setAttribute("aria-label", "Abrir menu");
    menuNavegacao.classList.remove("aberto");
}


if (menuBotao && menuNavegacao) {
    menuBotao.addEventListener("click", () => {
        const aberto =
            menuBotao.getAttribute("aria-expanded") === "true";

        menuBotao.setAttribute("aria-expanded", String(!aberto));
        menuBotao.setAttribute(
            "aria-label",
            aberto ? "Abrir menu" : "Fechar menu"
        );

       menuNavegacao.classList.toggle("aberto", !aberto);
    });

    menuNavegacao.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", fecharMenuNavegacao);
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            fecharMenuNavegacao();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            fecharMenuNavegacao();
        }
    });
} else {
    console.error("Não foi possível encontrar o botão ou o menu.");
}
