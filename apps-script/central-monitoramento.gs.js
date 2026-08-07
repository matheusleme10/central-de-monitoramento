/**
 * Central de Monitoramento — biblioteca para Apps Script.
 *
 * O QUE ISSO FAZ: só LÊ a planilha e AVISA o painel se está atualizada ou
 * não. Não escreve nada, não mexe em fórmulas/dados, não substitui nenhum
 * script/Python/Coefficient que você já tem atualizando a planilha — roda
 * em paralelo, sozinho, num trigger de tempo separado.
 *
 * INSTALAÇÃO (uma vez por planilha):
 *   1. Extensões → Apps Script → cole este arquivo inteiro.
 *   2. Editor → ⚙️ Configurações do projeto → Propriedades do Script → adicione:
 *        CMA_PANEL_URL   = https://seu-painel.vercel.app
 *        CMA_API_TOKEN   = token gerado em Projeto → Tokens de API no painel
 *        CMA_PROJECT_ID  = UUID do projeto (mesma tela)
 *   3. Edite a função `verificarAbasPassivamente` no fim deste arquivo com
 *      os nomes das abas desta planilha (seção "CONFIGURE AQUI").
 *   4. Editor → 🕐 Acionadores → Adicionar acionador → função
 *      `verificarAbasPassivamente` → baseado em tempo → a cada 30 min.
 *
 * Pra copiar pra outra planilha do MESMO projeto: repita os passos 1-4,
 * as Propriedades do Script são as mesmas (CMA_PROJECT_ID não muda) — só
 * troca a lista de abas no passo 3.
 *
 * Como decide "atualizado ou não": pra cada aba configurada, procura uma
 * coluna de data (ex.: "Data", "Atualizado em") e usa a maior data
 * encontrada. Sem coluna de data, usa a data de modificação do arquivo no
 * Drive. Isso funciona com qualquer fonte de atualização — Apps Script,
 * Python, Coefficient, edição manual — porque não depende de quem
 * atualizou, só olha o resultado.
 *
 * Também existe um Modo 1 (ativo), pra quando a própria atualização roda
 * via Apps Script e quer avisar o início/fim exato — ver
 * `CentralMonitoramento.startExecution` no fim do arquivo.
 */

var CentralMonitoramento = (function () {
  // trim_ evita erro bobo de "espaço a mais" ao colar valores nas
  // Propriedades do Script (ex.: CMA_PROJECT_ID com espaço/quebra de linha
  // no fim reprova a validação de UUID no painel).
  function trim_(value) {
    return typeof value === "string" ? value.trim() : value;
  }

  function config_() {
    var p = PropertiesService.getScriptProperties();
    return {
      panelUrl: trim_(p.getProperty("CMA_PANEL_URL")),
      apiToken: trim_(p.getProperty("CMA_API_TOKEN")),
      projectId: trim_(p.getProperty("CMA_PROJECT_ID")),
    };
  }

  // Envia um evento ao painel. Nunca lança erro — só loga falhas, pra
  // nunca travar seu script caso o painel esteja fora do ar.
  function send_(payload) {
    var cfg = config_();
    if (!cfg.panelUrl || !cfg.apiToken || !cfg.projectId) {
      Logger.log("[CentralMonitoramento] Propriedades do Script ausentes — nada enviado.");
      return;
    }
    try {
      var res = UrlFetchApp.fetch(cfg.panelUrl.replace(/\/$/, "") + "/api/v1/updates", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + cfg.apiToken },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() >= 400) {
        Logger.log("[CentralMonitoramento] Painel respondeu " + res.getResponseCode() + ": " + res.getContentText());
      }
    } catch (e) {
      Logger.log("[CentralMonitoramento] Falha ao contatar o painel: " + e);
    }
  }

  function merge_(a, b) {
    var out = {};
    for (var k in a) out[k] = a[k];
    for (var k2 in b) out[k2] = b[k2];
    return out;
  }

  // Verifica uma única aba (objeto Sheet do Apps Script) e reporta o status.
  // options.dateColumn: nome do cabeçalho da coluna de data, ou a letra da
  // coluna (ex.: "B"). Sem isso, tenta achar sozinho (Data/Date/Atualizado
  // em/Última atualização); se não achar, cai pra data do arquivo no Drive.
  function checkSheet(sheet, options) {
    options = options || {};
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var context = {
      projectId: config_().projectId,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetId: sheet.getSheetId(),
      sheetName: sheet.getName(),
      executionId: options.executionId || Utilities.getUuid(),
    };

    var detected = detectLastUpdate_(sheet, spreadsheet, options.dateColumn);
    send_(
      merge_(context, {
        status: "SUCCESS",
        startedAt: detected.date.toISOString(),
        finishedAt: detected.date.toISOString(),
        rowsProcessed: options.rowsProcessed || detected.rowsProcessed,
        message: detected.message,
      }),
    );
    return detected;
  }

  // Verifica uma lista de abas de uma vez — ver `verificarAbasPassivamente`
  // no fim do arquivo pra exemplo de uso.
  function checkSheets(configs) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var results = [];
    for (var i = 0; i < configs.length; i++) {
      var cfg = configs[i] || {};
      var sheet = spreadsheet.getSheetByName(cfg.name);
      if (!sheet) {
        Logger.log("[CentralMonitoramento] Aba não encontrada: " + cfg.name);
        continue;
      }
      results.push(checkSheet(sheet, cfg));
    }
    return results;
  }

  var DATE_HEADERS_ = ["data", "date", "atualizado em", "ultima atualizacao", "última atualização"];

  function detectLastUpdate_(sheet, spreadsheet, dateColumn) {
    var values = sheet.getDataRange().getValues();
    var lastRow = values.length;

    if (lastRow > 1) {
      var header = values[0];
      var col = dateColumn
        ? /^[A-Za-z]{1,2}$/.test(dateColumn)
          ? columnLetterToIndex_(dateColumn)
          : findHeaderIndex_(header, [dateColumn])
        : findHeaderIndex_(header, DATE_HEADERS_);

      if (col >= 0) {
        var maxDate = null;
        for (var i = 1; i < lastRow; i++) {
          var cell = values[i][col];
          if (cell instanceof Date && (!maxDate || cell > maxDate)) maxDate = cell;
        }
        if (maxDate) {
          return {
            date: maxDate,
            rowsProcessed: lastRow - 1,
            message: "Detectado via coluna '" + header[col] + "'",
          };
        }
      }
    }

    // Sem coluna de data (ou vazia) — usa a última modificação do arquivo.
    var file = DriveApp.getFileById(spreadsheet.getId());
    return {
      date: file.getLastUpdated(),
      rowsProcessed: Math.max(lastRow - 1, 0),
      message: "Sem coluna de data — usando última modificação do arquivo",
    };
  }

  function findHeaderIndex_(headerRow, candidates) {
    for (var i = 0; i < headerRow.length; i++) {
      var h = String(headerRow[i] || "").trim().toLowerCase();
      for (var j = 0; j < candidates.length; j++) {
        if (h === String(candidates[j]).trim().toLowerCase()) return i;
      }
    }
    return -1;
  }

  function columnLetterToIndex_(letter) {
    letter = letter.toUpperCase();
    var index = 0;
    for (var i = 0; i < letter.length; i++) index = index * 26 + (letter.charCodeAt(i) - 64);
    return index - 1;
  }

  // Modo 1 (ativo) — use só se a própria atualização roda via Apps Script
  // e você quer marcar início/fim exatos:
  //   var run = CentralMonitoramento.startExecution(sheet);
  //   try { ...sua lógica...; run.success(linhas); }
  //   catch (e) { run.error(e); throw e; }
  function startExecution(sheet, options) {
    options = options || {};
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var startedAt = new Date();
    var context = {
      projectId: config_().projectId,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetId: sheet.getSheetId(),
      sheetName: sheet.getName(),
      executionId: options.executionId || Utilities.getUuid(),
      startedAt: startedAt.toISOString(),
    };
    send_(merge_(context, { status: "RUNNING" }));

    return {
      executionId: context.executionId,
      success: function (rowsProcessed) {
        var t = new Date();
        send_(merge_(context, { status: "SUCCESS", finishedAt: t.toISOString(), duration: t - startedAt, rowsProcessed: rowsProcessed }));
      },
      error: function (err, errorCode) {
        var t = new Date();
        send_(merge_(context, { status: "ERROR", finishedAt: t.toISOString(), duration: t - startedAt, message: err && err.message ? err.message : String(err), errorCode: errorCode }));
      },
      cancelled: function (message) {
        var t = new Date();
        send_(merge_(context, { status: "CANCELLED", finishedAt: t.toISOString(), duration: t - startedAt, message: message }));
      },
    };
  }

  return { checkSheet: checkSheet, checkSheets: checkSheets, startExecution: startExecution };
})();

// ============================================================
// CONFIGURE AQUI — troque pelos nomes das abas desta planilha.
// dateColumn é opcional (sem ele, detecta sozinho ou usa a data do arquivo).
// ============================================================
function verificarAbasPassivamente() {
  CentralMonitoramento.checkSheets([
    { name: "Vendas", dateColumn: "Data do Pedido" },
    { name: "Estoque" },
  ]);
}
