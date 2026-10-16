
const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const TEMPO_CACHE_MS = 10 * 60 * 1000;
const TEMPO_LIMITE_MS = 10000;
const MAX_CURSOS_POR_FONTE = 8;

app.use(cors());
app.use(express.json());

const fontes = [
  {
    instituicao: "ETEC",
    url: "https://vestibulinho.etec.sp.gov.br/lp/",
    categoria: "tecnico",
    descricao: "Vestibulinho das Escolas Técnicas Estaduais de São Paulo."
  },
  {
    instituicao: "FATEC",
    url: "https://vestibular.fatec.sp.gov.br/",
    categoria: "vestibular",
    descricao: "Vestibular das Faculdades de Tecnologia de São Paulo."
  },
  {
    instituicao: "SENAI-SP",
    url: "https://www.sp.senai.br/cursos-tecnicos-comunidade",
    categoria: "tecnico",
    descricao: "Cursos técnicos e oportunidades do SENAI-SP."
  },
  {
    instituicao: "IFSP",
    url: "https://www.ifsp.edu.br/",
    categoria: "tecnico",
    descricao: "Processos seletivos do Instituto Federal de São Paulo."
  },
  {
    instituicao: "SENAC-SP",
    url: "https://www.sp.senac.br/cursos-tecnicos",
    categoria: "tecnico",
    descricao: "Cursos técnicos do Senac São Paulo."
  }
];

// Oportunidades verificadas em fontes oficiais.
// Os prazos são conferidos novamente a cada atualização do cache.
const oportunidadesVerificadas = [
  {
    id: "etec-vestibulinho-2027-1",
    titulo: "Vestibulinho Etec — 1º semestre de 2027",
    instituicao: "ETEC",
    categoria: "tecnico",
    tipo: "processo_seletivo",
    status: "inscricoes_abertas",
    descricao:
      "Processo seletivo para cursos técnicos, ensino médio e outras modalidades oferecidas pelas Etecs.",
    detalhes:
      "Inscrições até 03/11/2026 às 20h. Taxa de inscrição de R$ 50,00. Os cursos são gratuitos.",
    requisitos: null,
    cargaHoraria: null,
    modalidade: null,
    dataPublicacao: null,
    dataEncerramento: "2026-11-03",
    gratuito: true,
    url: "https://vestibulinho.etec.sp.gov.br/",
    fonte: "https://vestibulinho.etec.sp.gov.br/calendario/",
    dadosConfirmados: true
  },
  {
    id: "fatec-vestibular-2027-1",
    titulo: "Vestibular Fatec — 1º semestre de 2027",
    instituicao: "FATEC",
    categoria: "vestibular",
    tipo: "processo_seletivo",
    status: "inscricoes_abertas",
    descricao:
      "Processo seletivo para cursos superiores de tecnologia das Fatecs.",
    detalhes:
      "Inscrições até 06/11/2026 às 20h. Taxa integral de inscrição de R$ 90,00, com possibilidade de isenção ou redução para candidatos elegíveis.",
    requisitos:
      "Para matrícula regular, é necessário ter concluído o ensino médio até a data da matrícula.",
    cargaHoraria: null,
    modalidade: null,
    dataPublicacao: null,
    dataEncerramento: "2026-11-06",
    gratuito: true,
    url: "https://vestibular.fatec.sp.gov.br/",
    fonte: "https://vestibular.fatec.sp.gov.br/calendario/",
    dadosConfirmados: true
  }
];

let cache = {
  atualizadoEm: null,
  oportunidades: [],
  fontes: []
};

let ultimaConsulta = 0;
let consultaEmAndamento = null;

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function textoLimpo(texto = "") {
  return String(texto).replace(/\s+/g, " ").trim();
}

function validarUrl(valor, base) {
  try {
    const url = new URL(valor, base);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function extrairMeta($, seletores) {
  for (const seletor of seletores) {
    const elemento = $(seletor).first();
    const valor = elemento.attr("content") || elemento.text();

    if (valor && textoLimpo(valor)) {
      return textoLimpo(valor);
    }
  }

  return "";
}

function criarPortal(fonte) {
  return {
    instituicao: fonte.instituicao,
    url: fonte.url,
    status: "consultada",
    totalEncontrado: 0
  };
}

function ehTituloGenerico(titulo) {
  const texto = normalizar(titulo);

  return [
    /^conferir pesquisa$/,
    /^conheca a pesquisa/,
    /^pesquisa senac/,
    /^conheca nossos cursos$/,
    /^cursos tecnicos$/,
    /^cursos livres$/,
    /^cursos$/,
    /^saiba mais$/,
    /^inscreva-se$/,
    /^inscricao$/,
    /^inscricoes$/,
    /^bolsas de estudo$/,
    /^processo seletivo$/,
    /^vestibular$/,
    /^vestibulinho$/,
    /^inicio$/,
    /^home$/,
    /^menu$/,
    /^clique aqui$/,
    /^ver mais$/,
    /^acesse aqui$/
  ].some(regra => regra.test(texto));
}

function classificarTipo(titulo, url) {
  const texto = normalizar(`${titulo} ${url}`);

  if (
    /edital|processo seletivo|vestibular|vestibulinho|ingresso/.test(
      texto
    )
  ) {
    return "processo_seletivo";
  }

  if (
    /aprendizagem industrial|aprendiz senai|jovem aprendiz/.test(texto)
  ) {
    return "aprendizagem";
  }

  if (/pos graduacao|especializacao|mba/.test(texto)) {
    return "pos_graduacao";
  }

  if (
    /graduacao|bacharelado|licenciatura|curso superior|tecnologo/.test(
      texto
    )
  ) {
    return "graduacao";
  }

  if (
    /curso tecnico|cursos tecnicos|tecnico em|tecnico de|ensino medio tecnico/.test(
      texto
    )
  ) {
    return "tecnico";
  }

  if (/curso|capacitacao|formacao profissional/.test(texto)) {
    return "curso";
  }

  return "portal";
}

function ehCursoIndividual(fonte, titulo, destino) {
  const tituloNormalizado = normalizar(titulo);
  const caminho = normalizar(destino.pathname);

  if (ehTituloGenerico(titulo)) {
    return false;
  }

  if (fonte.instituicao === "SENAC-SP") {
    const caminhoDeCurso =
      /\/curso-de-[^/]+/.test(caminho) ||
      /\/curso-tecnico-[^/]+/.test(caminho) ||
      /\/tecnico-em-[^/]+/.test(caminho) ||
      /\/ensino-medio-tecnico\/[^/]+/.test(caminho);

    const tituloDeCurso =
      /^(tecnico em |tecnico de |ensino medio tecnico em )/.test(
        tituloNormalizado
      );

    return caminhoDeCurso || tituloDeCurso;
  }

  return /curso|tecnico|aprendizagem|vestibular|vestibulinho|processo seletivo|edital|inscricao|bolsa/.test(
    normalizar(`${titulo} ${destino.pathname}`)
  );
}

function converterData(dia, mes, ano) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCDate() !== dia ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCFullYear() !== ano
  ) {
    return null;
  }

  return data;
}

const meses = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12
};

function extrairPrazoExplicito(texto) {
  const conteudo = normalizar(texto);

  const marcadores = [
    /\binscricoes abertas\b/g,
    /\binscricoes ate\b/g,
    /\binscricoes vao ate\b/g,
    /\bperiodo de inscricao\b/g
  ];

  let posicoes = [];

  for (const marcador of marcadores) {
    for (const match of conteudo.matchAll(marcador)) {
      posicoes.push(match.index);
    }
  }

  posicoes = [...new Set(posicoes)].sort((a, b) => a - b);

  for (const posicao of posicoes) {
    const trecho = conteudo.slice(posicao, posicao + 250);

    const numerica = trecho.match(
      /\b(?:ate(?:\s+o)?(?:\s+dia)?|encerramento em|termina em)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
    );

    if (numerica) {
      const data = converterData(
        Number(numerica[1]),
        Number(numerica[2]),
        Number(numerica[3])
      );

      if (data) return data;
    }

    const porExtenso = trecho.match(
      /\b(?:ate(?:\s+o)?(?:\s+dia)?|encerramento em|termina em)\s*(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})\b/
    );

    if (porExtenso) {
      const data = converterData(
        Number(porExtenso[1]),
        meses[porExtenso[2]],
        Number(porExtenso[3])
      );

      if (data) return data;
    }
  }

  return null;
}

function detectarStatusInscricao(texto, hoje = new Date()) {
  const conteudo = normalizar(texto);

  const encerrada =
    /\binscricoes encerradas\b|\binscricoes fechadas\b|\bprazo de inscricao encerrado\b|\bperiodo de inscricao encerrado\b|\bprocesso seletivo encerrado\b|\bvagas esgotadas\b/.test(
      conteudo
    );

  if (encerrada) {
    return {
      status: "encerradas",
      dataEncerramento: null,
      dadosConfirmados: false
    };
  }

  if (!/\binscricoes abertas\b/.test(conteudo)) {
    return {
      status: "nao_confirmado",
      dataEncerramento: null,
      dadosConfirmados: false
    };
  }

  const prazo = extrairPrazoExplicito(conteudo);

  if (!prazo) {
    return {
      status: "nao_confirmado",
      dataEncerramento: null,
      dadosConfirmados: false
    };
  }

  const hojeUTC = Date.UTC(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  if (prazo.getTime() < hojeUTC) {
    return {
      status: "encerradas",
      dataEncerramento: prazo.toISOString().slice(0, 10),
      dadosConfirmados: false
    };
  }

  return {
    status: "inscricoes_abertas",
    dataEncerramento: prazo.toISOString().slice(0, 10),
    dadosConfirmados: true
  };
}

function extrairInformacoesPagina($) {
  const titulo =
    textoLimpo($("h1").first().text()) ||
    extrairMeta($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ]) ||
    textoLimpo($("title").first().text());

  const descricaoMeta = extrairMeta($, [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]'
  ]);

  const seletoresDescricao = [
    "main article p",
    "main .descricao p",
    "main .description p",
    "main p",
    "article p",
    '[itemprop="description"]',
    ".descricao-curso",
    ".description"
  ];

  let descricaoConteudo = "";

  for (const seletor of seletoresDescricao) {
    const candidato = textoLimpo($(seletor).first().text());

    if (candidato.length >= 40) {
      descricaoConteudo = candidato;
      break;
    }
  }

  const descricao =
    descricaoMeta.length >= 30
      ? descricaoMeta
      : descricaoConteudo;

  const textoPagina = textoLimpo(
    $("main").text() || $("body").text()
  );

  const requisitosEncontrados = textoPagina.match(
    /(?:requisitos?|pré-requisitos?|quem pode participar|escolaridade mínima)\s*[:\-]?\s*([^.!?]{15,300})/i
  );

  const cargaHorariaEncontrada = textoPagina.match(
    /\b\d{1,4}\s*(?:horas|hora)\b/i
  );

  let modalidade = null;

  if (/\bpresencial\b/i.test(textoPagina)) {
    modalidade = "Presencial";
  } else if (
    /\b(?:ead|ensino a distancia|educacao a distancia|online|on-line)\b/i.test(
      textoPagina
    )
  ) {
    modalidade = "EAD";
  }

  return {
    titulo,
    descricao: descricao ? descricao.slice(0, 700) : null,
    detalhes: textoPagina ? textoPagina.slice(0, 1500) : null,
    textoCompleto: textoPagina,
    requisitos: requisitosEncontrados
      ? textoLimpo(requisitosEncontrados[1])
      : null,
    cargaHoraria: cargaHorariaEncontrada
      ? cargaHorariaEncontrada[0]
      : null,
    modalidade
  };
}

async function buscarPagina(url) {
  const resposta = await fetch(url, {
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FuturoEmConstrucao/1.0)",
      Accept: "text/html,application/xhtml+xml"
    }
  });

  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status}`);
  }

  const tipoConteudo = resposta.headers.get("content-type") || "";

  if (
    !tipoConteudo.includes("text/html") &&
    !tipoConteudo.includes("application/xhtml+xml")
  ) {
    throw new Error("A resposta não é uma página HTML.");
  }

  return resposta.text();
}

async function consultarDetalheCurso(url, tituloDoLink) {
  try {
    const html = await buscarPagina(url);
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe, svg").remove();

    const informacoes = extrairInformacoesPagina($);

    const tituloEspecifico =
      informacoes.titulo &&
      !ehTituloGenerico(informacoes.titulo);

    const titulo = tituloEspecifico
      ? informacoes.titulo
      : tituloDoLink;

    if (!titulo || ehTituloGenerico(titulo)) {
      return null;
    }

    const tipo = classificarTipo(titulo, url);

    if (tipo === "portal") {
      return null;
    }

    const statusInscricao = detectarStatusInscricao(
      informacoes.textoCompleto
    );

    return {
      ...informacoes,
      ...statusInscricao,
      titulo,
      tipo,
      url
    };
  } catch {
    return null;
  }
}

async function consultarFonte(fonte) {
  try {
    const html = await buscarPagina(fonte.url);
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe, svg").remove();

    const dominioFonte = new URL(fonte.url).hostname;
    const candidatos = new Map();

    $("a[href]").each((_, elemento) => {
      const link = $(elemento);

      const titulo = textoLimpo(
        link.attr("aria-label") ||
        link.attr("title") ||
        link.text()
      );

      const href = link.attr("href");

      if (
        !href ||
        titulo.length < 5 ||
        titulo.length > 180 ||
        ehTituloGenerico(titulo)
      ) {
        return;
      }

      const destino = validarUrl(href, fonte.url);

      if (!destino || destino.hostname !== dominioFonte) {
        return;
      }

      if (!ehCursoIndividual(fonte, titulo, destino)) {
        return;
      }

      if (destino.href === fonte.url) {
        return;
      }

      candidatos.set(destino.href, {
        titulo,
        url: destino.href
      });
    });

    const selecionados = [...candidatos.values()].slice(
      0,
      MAX_CURSOS_POR_FONTE
    );

    const resultados = await Promise.all(
      selecionados.map(async candidato => {
        const detalhe = await consultarDetalheCurso(
          candidato.url,
          candidato.titulo
        );

        if (
          !detalhe ||
          detalhe.status !== "inscricoes_abertas" ||
          detalhe.dadosConfirmados !== true
        ) {
          return null;
        }

        return {
          id: `${normalizar(fonte.instituicao)}-${candidato.url}`
            .replace(/[^a-z0-9-]+/g, "-")
            .slice(0, 180),
          titulo: detalhe.titulo,
          instituicao: fonte.instituicao,
          categoria:
            detalhe.tipo === "aprendizagem"
              ? "aprendizagem"
              : detalhe.tipo,
          tipo: detalhe.tipo,
          status: detalhe.status,
          descricao: detalhe.descricao,
          detalhes: detalhe.detalhes,
          requisitos: detalhe.requisitos,
          cargaHoraria: detalhe.cargaHoraria,
          modalidade: detalhe.modalidade,
          dataPublicacao: null,
          dataEncerramento: detalhe.dataEncerramento,
          gratuito: null,
          url: candidato.url,
          fonte: fonte.url,
          dadosConfirmados: true
        };
      })
    );

    const oportunidades = resultados.filter(Boolean);

    return {
      oportunidades,
      fonte: {
        instituicao: fonte.instituicao,
        url: fonte.url,
        status: "consultada",
        totalEncontrado: oportunidades.length
      }
    };
  } catch (erro) {
    return {
      oportunidades: [],
      fonte: {
        instituicao: fonte.instituicao,
        url: fonte.url,
        status: "indisponivel",
        erro:
          erro.name === "TimeoutError"
            ? "Tempo limite excedido"
            : erro.message,
        totalEncontrado: 0
      }
    };
  }
}

function prazoAindaVigente(item, hojeUTC) {
  if (
    item.status !== "inscricoes_abertas" ||
    item.dadosConfirmados !== true ||
    !item.dataEncerramento
  ) {
    return false;
  }

  const prazo = new Date(
    `${item.dataEncerramento}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(prazo.getTime()) &&
    prazo.getTime() >= hojeUTC
  );
}

async function atualizarCache(forcar = false) {
  if (
    !forcar &&
    cache.atualizadoEm &&
    Date.now() - ultimaConsulta < TEMPO_CACHE_MS
  ) {
    return cache;
  }

  if (consultaEmAndamento) {
    return consultaEmAndamento;
  }

  consultaEmAndamento = (async () => {
    const resultados = await Promise.all(
      fontes.map(consultarFonte)
    );

    const todas = resultados.flatMap(
      resultado => resultado.oportunidades
    );

    const unicas = [
      ...new Map(
        todas.map(item => [item.url, item])
      ).values()
    ];

    const hoje = new Date();

    const hojeUTC = Date.UTC(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

    const oportunidadesAutomaticas = unicas.filter(
      item => prazoAindaVigente(item, hojeUTC)
    );

    const oportunidadesManuais = oportunidadesVerificadas.filter(
      item => prazoAindaVigente(item, hojeUTC)
    );

    const oportunidadesAtivas = [
      ...oportunidadesManuais,
      ...oportunidadesAutomaticas.filter(
        item => !oportunidadesManuais.some(
          manual => manual.url === item.url
        )
      )
    ];

    cache = {
      atualizadoEm: new Date().toISOString(),
      oportunidades: oportunidadesAtivas,
      fontes: resultados.map(resultado => resultado.fonte)
    };

    ultimaConsulta = Date.now();

    return cache;
  })();

  try {
    return await consultaEmAndamento;
  } finally {
    consultaEmAndamento = null;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mensagem: "API Futuro em Construção funcionando",
    fontesConfiguradas: fontes.length,
    cacheAtualizadoEm: cache.atualizadoEm
  });
});

app.get("/api/oportunidades", async (req, res) => {
  try {
    const dados = await atualizarCache(
      req.query.atualizar === "1"
    );

    const termo = normalizar(req.query.q || "");
    const categoria = normalizar(
      req.query.categoria || "todos"
    );
    const instituicao = normalizar(
      req.query.instituicao || "todas"
    );

    const oportunidades = dados.oportunidades.filter(item => {
      const texto = normalizar([
        item.titulo,
        item.instituicao,
        item.categoria,
        item.tipo,
        item.descricao,
        item.detalhes,
        item.requisitos,
        item.modalidade
      ].filter(Boolean).join(" "));

      return (
        item.status === "inscricoes_abertas" &&
        item.dadosConfirmados === true &&
        (!termo || texto.includes(termo)) &&
        (
          categoria === "todos" ||
          normalizar(item.categoria) === categoria
        ) &&
        (
          instituicao === "todas" ||
          normalizar(item.instituicao) === instituicao
        )
      );
    });

    res.json({
      atualizadoEm: dados.atualizadoEm,
      total: oportunidades.length,
      oportunidades,
      fontes: dados.fontes,
      aviso:
        "São exibidas oportunidades com prazo vigente e status confirmado. Confira as condições e os requisitos no portal oficial antes de se inscrever."
    });
  } catch (erro) {
    res.status(500).json({
      erro: "Não foi possível consultar as oportunidades.",
      detalhe:
        process.env.NODE_ENV === "development"
          ? erro.message
          : undefined
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `API Futuro em Construção disponível em http://localhost:${PORT}`
    );
  });
}

module.exports = app;
