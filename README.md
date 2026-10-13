# HORA TEDDE

> Controle de ponto simples, verde e responsivo — funciona no celular, calcula horas extras e guarda fotos do relógio de ponto.

**HORA TEDDE** é um app para registrar a jornada de trabalho do dia a dia: entrada, almoço, retorno e saída. Ele soma as horas trabalhadas, calcula a hora extra automaticamente, deixa marcar folgas e tira foto do relógio de ponto na hora do registro, com data e hora gravadas na imagem.

Feito para quem precisa provar as próprias horas — sem planilha, sem servidor, sem cadastro.

---

## ✨ Funcionalidades

- ➕ **Adicionar dia** — cria um registro com data, entrada, almoço, retorno e saída
- 🌴 **Folga** — marca o dia como folga, sem horários
- 📷 **Foto do ponto** — abre a câmera do celular, comprime a imagem e carimba data/hora
- 🕐 **Cálculo automático** — horas trabalhadas e hora extra comparadas à jornada configurável
- 📊 **Exportar Excel** — planilha `.xlsx` com todos os dias e a linha de totais
- 📄 **Exportar PDF** — relatório em tabela, pronto para imprimir ou enviar
- 🖨️ **Imprimir** — layout de impressão sem os botões
- 🧹 **Limpar tudo** — apaga dias e fotos depois de confirmar
- 🌙 **Tema claro e escuro** — preferência salva entre sessões
- 📱 **Responsivo** — tela principal pensada para o celular; instalável como app (PWA)

## 📸 Fotos do relógio de ponto

Cada dia tem o botão **📷 Foto do ponto**. No celular ele aciona a câmera traseira direto. A foto é reduzida para caber no aparelho, recebe o carimbo `HORA TEDDE • data e hora` e fica guardada no navegador (IndexedDB), vinculada àquele dia. Toque na miniatura para ampliar, use ⬇ para baixar ou ✕ para apagar.

## 🗂️ Armazenamento

Tudo fica **no próprio aparelho**:

| Dado | Onde |
| --- | --- |
| Dias e jornada | `localStorage` (`hora-tedde-dias`, `hora-tedde-jornada`, `hora-tedde-tema`) |
| Fotos | IndexedDB (`hora-tedde-logo.png`) |

Nada sai para a internet e não há cadastro. Se você limpar os dados do navegador, os registros somem — exporte em Excel ou PDF antes.

## 🚀 Como rodar

### Versão web (este repositório)

```sh
git clone <url-deste-repositorio>
cd <nome-do-repositorio>
npm install
npm run dev
```

Abra o endereço mostrado no terminal (geralmente `http://localhost:8080`).

### Versão HTML, CSS e JavaScript separados

Na pasta `hora-tedde/` estão três arquivos independentes, sem dependências nem build:

```
hora-tedde/
├── index.html   # estrutura da página
├── styles.css   # visual, temas claro/escuro e impressão
└── script.js    # estado, cálculos, fotos, Excel, PDF
```

Abra `index.html` no navegador — ou a pasta no VS Code — e está funcionando.

## 🧱 Tecnologias

| Camada | Usada |
| --- | --- |
| Web app | TanStack Start (React 19), TypeScript, Vite |
| Estilo | Tailwind CSS v4 com tokens semânticos em `oklch` |
| Versão simples | HTML + CSS + JavaScript puro |
| Exportação | SheetJS (`xlsx`), jsPDF + jspdf-autotable |
| Fotos | Canvas (compressão e carimbo) + IndexedDB |
| Instalação | PWA com `manifest.webmanifest` e ícones |

## 📱 Usar por outras pessoas

Publique o app (ou hospede a pasta `hora-tedde/` em qualquer hospedagem estática) e mande o link. Cada pessoa usa no próprio celular, com os próprios registros — os dados não se misturam.

## 📄 Licença

MIT — use, copie e adapte à vontade.
