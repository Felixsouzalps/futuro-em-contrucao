
const API_EDITAIS = "http://localhost:3000/api/oportunidades";

const $ = (id) => document.getElementById(id);

function formatarData(data) {
    if (!data) return "";

    const dataObj = new Date(`${data}`.length === 10 ? `${data}T12:00:00` : data);

    if (Number.isNaN(dataObj.getTime())) return "";

    return dataObj.toLocaleDateString("pt-BR");
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarCard(edital, indice) {
    const card = criarElemento("article", "oportunidade-card edital-card");
    const tituloTexto = edital.titulo || edital.title || "Oportunidade educacional";
    const instituicaoTexto = edital.instituicao || edital.fonte || "Instituição";
    const categoria = edital.categoria || "tecnico";

    card.dataset.categorias = categoria;
    card.dataset.pesquisa =
        `${tituloTexto} ${instituicaoTexto} ${categoria} ${edital.fonte || ""}`
            .toLocaleLowerCase("pt-BR");

    const topo = criarElemento("div", "card-topo");
    topo.append(
        criarElemento("span", "card-numero", `EDITAL / ${String(indice + 1).padStart(2, "0")}`),
        criarElemento("span", "card-icone", "↗")
    );

    const corpo = criarElemento("div", "card-corpo");
    corpo.append(
        criarElemento("span", "card-categoria", instituicaoTexto.toUpperCase()),
        criarElemento("h3", "", tituloTexto)
    );

    if (edital.descricao) {
        corpo.append(criarElemento("p", "", edital.descricao));
    } else {
        corpo.append(
            criarElemento("p", "", "Consulte as informações e os requisitos no portal oficial.")
        );
    }

    const dataPublicacao = formatarData(edital.dataPublicacao);
    const dataEncerramento = formatarData(edital.dataEncerramento);

    if (dataPublicacao) {
        corpo.append(criarElemento("p", "edital-data", `Publicado em: ${dataPublicacao}`));
    }

    if (dataEncerramento) {
        corpo.append(criarElemento("p", "edital-prazo", `Inscrições até: ${dataEncerramento}`));
    }

    if (edital.status) {
        corpo.append(criarElemento("p", "edital-status", edital.status.replaceAll("_", " ")));
    }

    const url = edital.url || edital.link;

    if (url) {
        try {
            const destino = new URL(url);

            if (destino.protocol === "https:" || destino.protocol === "http:") {
                const link = criarElemento("a", "card-link", "Consultar no site oficial ↗");
                link.href = destino.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                card.append(topo, corpo, link);
                return card;
            }
        } catch {
            // Não exibe links inválidos.
        }
    }

    card.append(topo, corpo);
    return card;
}

function renderizarFontes(fontes) {
    const lista = $("fontesEditais");
    if (!lista) return;

    lista.replaceChildren();

    (fontes || []).forEach((fonte) => {
        const item = document.createElement("li");
        const nome = fonte.nome || fonte.instituicao || fonte.fonte || "Fonte oficial";
        const situacao = fonte.status || "consultada";

        item.textContent = `${nome}: ${situacao}`;

        if (fonte.erro) {
            item.textContent += ` — ${fonte.erro}`;
        }

        if (fonte.url) {
            try {
                const destino = new URL(fonte.url);
                if (["https:", "http:"].includes(destino.protocol)) {
                    const link = document.createElement("a");
                    link.href = destino.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = " Abrir fonte";
                    item.append(link);
                }
            } catch {
                // Ignora endereços inválidos.
            }
        }

        lista.append(item);
    });
}

async function carregarEditais(atualizar = false) {
    const resultados = $("resultadosEditais");
    const status = $("statusEditais");
    const vazio = $("mensagemVaziaEditais");
    const dataAtualizacao = $("atualizacaoEditais");
    const botao = $("atualizarEditais");

    if (!resultados || !status) {
        console.error("Não encontrei a área de resultados dos editais no HTML.");
        return;
    }

    status.textContent = atualizar
        ? "Atualizando oportunidades..."
        : "Carregando oportunidades...";

    if (botao) botao.disabled = true;
    if (vazio) vazio.hidden = true;

    try {
        const url = new URL(API_EDITAIS);
        if (atualizar) url.searchParams.set("atualizar", "1");

        const resposta = await fetch(url);
        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();
        const editais = Array.isArray(dados.oportunidades)
            ? dados.oportunidades
            : [];

        resultados.replaceChildren();

        editais.forEach((edital, indice) => {
            resultados.append(criarCard(edital, indice));
        });

        renderizarFontes(dados.fontes);

        if (dataAtualizacao && dados.atualizadoEm) {
            const data = new Date(dados.atualizadoEm);
            dataAtualizacao.textContent = Number.isNaN(data.getTime())
                ? ""
                : `Consulta atualizada em ${data.toLocaleString("pt-BR")}`;
        }

        status.textContent = editais.length
            ? `${editais.length} oportunidades encontradas nas fontes consultadas.`
            : "Nenhuma oportunidade encontrada na consulta atual.";

        if (vazio) vazio.hidden = editais.length > 0;

    } catch (erro) {
        console.error("Falha ao carregar editais:", erro);
        status.textContent =
            "Não foi possível carregar as oportunidades. Confira se a API está funcionando em localhost:3000.";
    } finally {
        if (botao) botao.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarEditais();

    const botao = $("atualizarEditais");
    if (botao) {
        botao.addEventListener("click", () => carregarEditais(true));
    }
});
