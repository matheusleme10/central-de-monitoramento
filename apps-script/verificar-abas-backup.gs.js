/**
 * Verificação automática de todas as abas "Backup. *"
 * ----------------------------------------------------
 * Complemento da biblioteca `central-monitoramento.gs.js` — cole os dois
 * arquivos no MESMO projeto de Apps Script, vinculado à planilha que tem
 * as abas de backup (Extensões → Apps Script).
 *
 * O que faz `verificarAbasBackup()`:
 *   1. Varre TODAS as abas da planilha atual.
 *   2. Seleciona só as que começam com "Backup. " (prefixo configurável
 *      abaixo; comparação sem diferenciar maiúsculas/minúsculas).
 *   3. Para cada uma, descobre a última atualização usando o Modo 2
 *      (passivo) da biblioteca: coluna de data se existir na aba, senão
 *      a última modificação do arquivo no Drive.
 *   4. Escreve um resumo numa aba chamada "Status Backups", dentro da
 *      própria planilha — pra você visualizar direto, sem precisar abrir
 *      o painel.
 *   5. Também reporta cada aba pro painel central (mesmo endpoint de
 *      sempre), SE `CMA_PANEL_URL` / `CMA_API_TOKEN` / `CMA_PROJECT_ID`
 *      estiverem configurados nas Propriedades do Script. Se não
 *      estiverem, só pula o envio — o resumo na planilha é escrito do
 *      mesmo jeito.
 *
 * CONFIGURAR PARA RODAR SOZINHO:
 *   Editor do Apps Script → ícone de relógio (Acionadores) → Adicionar
 *   acionador → função "verificarAbasBackup" → tipo "Baseado em tempo" →
 *   escolha a frequência (ex.: a cada 1 hora).
 *
 * Se quiser rodar manualmente pra testar: abra o editor, selecione a
 * função "verificarAbasBackup" no menu de funções e clique em Executar.
 */

var PREFIXO_ABAS_BACKUP = "backup. "; // ajuste aqui se o padrão mudar
var ABA_RESUMO_BACKUP = "Status Backups";

function verificarAbasBackup() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();

  var linhas = [["Aba", "Última atualização", "Detectado via", "Verificado em"]];

  sheets.forEach(function (sheet) {
    var nome = sheet.getName();
    if (nome === ABA_RESUMO_BACKUP) return; // não processa a própria aba de resumo

    var comparavel = nome.trim().toLowerCase();
    if (comparavel.indexOf(PREFIXO_ABAS_BACKUP.toLowerCase()) !== 0) return;

    try {
      var resultado = CentralMonitoramento.checkSheet(sheet);
      linhas.push([nome, resultado.date, resultado.message, new Date()]);
    } catch (err) {
      Logger.log("[verificarAbasBackup] Falha ao verificar '" + nome + "': " + err);
      linhas.push([nome, "—", "Erro ao verificar: " + err, new Date()]);
    }
  });

  escreverResumoBackup_(spreadsheet, linhas);
}

function escreverResumoBackup_(spreadsheet, linhas) {
  var aba = spreadsheet.getSheetByName(ABA_RESUMO_BACKUP);
  if (!aba) {
    aba = spreadsheet.insertSheet(ABA_RESUMO_BACKUP);
  } else {
    aba.clearContents();
  }

  if (linhas.length <= 1) {
    aba
      .getRange(1, 1)
      .setValue('Nenhuma aba encontrada com o prefixo "' + PREFIXO_ABAS_BACKUP + '"');
    return;
  }

  var range = aba.getRange(1, 1, linhas.length, linhas[0].length);
  range.setValues(linhas);
  aba.getRange(1, 1, 1, linhas[0].length).setFontWeight("bold");
  aba.getRange(2, 2, linhas.length - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  aba.getRange(2, 4, linhas.length - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  aba.autoResizeColumns(1, linhas[0].length);
}
