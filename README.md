# Futuro em Ação

Plataforma de oportunidades educacionais para quem deseja construir seu futuro por meio da educação, da qualificação profissional e do acesso a novas oportunidades.

## Sobre o projeto

O **Futuro em Ação** tem como objetivo reunir informações sobre vestibulares, cursos técnicos, bolsas de estudo e cursos gratuitos em um único lugar. A plataforma busca facilitar a pesquisa por oportunidades educacionais e ajudar os usuários a identificar caminhos para continuar os estudos e ingressar no mercado de trabalho.

O projeto reúne informações de instituições e programas como ENEM, ETEC, FATEC, SENAI, Escola Virtual e ProUni, priorizando o acesso às fontes oficiais.

## Funcionalidades

### Implementadas ou previstas na estrutura atual

- **Catálogo de oportunidades:** exibição de oportunidades educacionais em cards.
- **Busca:** pesquisa por oportunidades disponíveis.
- **Filtros:** organização das oportunidades para facilitar a navegação.
- **Cursos gratuitos:** seção dedicada à divulgação de cursos gratuitos.
- **API de oportunidades:** disponibilização de dados por meio de uma API desenvolvida com Node.js e Express.
- **Monitoramento da API:** endpoint para verificar o estado de funcionamento do backend.
- **Layout responsivo:** estrutura visual voltada para diferentes tamanhos de tela, com ajustes de navegação para dispositivos móveis.

> A disponibilidade e o funcionamento de cada recurso devem ser conferidos na versão atual do projeto.

## Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização e responsividade |
| JavaScript | Interatividade e integração com a API |
| Node.js | Execução do backend |
| Express | Criação dos endpoints da API |
| Vercel | Hospedagem e publicação do projeto |

## Estrutura do projeto

A organização pode variar conforme a versão atual do repositório. A estrutura geral é composta pelo frontend e pelo backend.

```text
futuro-em-acao/
├── public/
│   ├── style/
│   │   └── index.css
│   └── ...
├── server.js
├── package.json
└── README.md
```

- `public/`: arquivos públicos do site, incluindo estilos e recursos do frontend.
- `server.js`: servidor Node.js e configuração das rotas da API.
- `package.json`: dependências e scripts do projeto.
- `README.md`: documentação do projeto.

## Como executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.
- npm, incluído na instalação do Node.js.
- Git, caso deseje clonar o repositório.

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>
```

Substitua os valores pelos dados reais do repositório.

### 2. Instalar as dependências

```bash
npm install
```

### 3. Iniciar o servidor

Se o projeto não possuir um script de inicialização configurado no `package.json`, execute:

```bash
node server.js
```

Caso exista um script `start`, também poderá ser utilizado:

```bash
npm start
```

Consulte o `package.json` para confirmar o comando correto e a porta utilizada pelo servidor.

### 4. Acessar a aplicação

Abra no navegador o endereço local correspondente à porta configurada no backend, normalmente no formato:

```text
http://localhost:3000
```

O endereço acima é apenas um exemplo e deve corresponder à configuração atual do projeto.

## API

O backend disponibiliza endpoints para consulta e monitoramento.

| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/api/health` | Verificar o estado do servidor |
| GET | `/api/oportunidades` | Consultar as oportunidades educacionais |

### Exemplo de consulta

```bash
curl http://localhost:3000/api/health
```

Para consultar as oportunidades:

```bash
curl http://localhost:3000/api/oportunidades
```

Os exemplos pressupõem que o servidor esteja em execução na porta `3000`. Ajuste a URL conforme a configuração local ou de produção.

## Publicação

O projeto possui uma versão publicada na Vercel:

**Site:** https://futuro-em-construcao.vercel.app

Antes de considerar a publicação totalmente funcional, é necessário verificar se o frontend utiliza o endereço correto da API de produção, se as rotas estão acessíveis e se a configuração de acesso da Vercel permite que os visitantes utilizem o site.

## Próximas etapas

As seguintes melhorias podem ampliar a plataforma:

- [ ] Implementar um banco de dados para armazenar oportunidades e informações administrativas.
- [ ] Criar um painel administrativo para cadastrar, editar e remover oportunidades.
- [ ] Permitir a atualização das informações sem precisar alterar manualmente os arquivos do site.
- [ ] Melhorar a atualização e a validação dos dados obtidos de fontes oficiais.
- [ ] Corrigir eventuais falhas de acesso às fontes externas.
- [ ] Finalizar e testar a navegação em dispositivos móveis.
- [ ] Validar a integração entre o frontend publicado e a API de produção.
- [ ] Implementar mecanismos de proteção para as rotas administrativas, caso sejam adicionadas.

As etapas acima representam possibilidades de evolução e não necessariamente funcionalidades já disponíveis.

## Contribuição

Para contribuir com o projeto:

1. Crie uma branch para sua alteração.
2. Faça as modificações necessárias.
3. Teste o frontend e os endpoints afetados.
4. Envie suas alterações por meio de um pull request.

## Objetivo

O Futuro em Ação busca tornar as oportunidades educacionais mais acessíveis, centralizando informações e facilitando a descoberta de cursos, processos seletivos e programas de bolsas.

**A proposta é ajudar cada pessoa a encontrar oportunidades para estudar, se qualificar e construir seu futuro.**
