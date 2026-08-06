/**
 * Biblioteca reutilizável para Apps Script — Central de Monitoramento de Atualizações
 * ---------------------------------------------------------------------------
 * Cole este arquivo em qualquer projeto de Apps Script vinculado a uma
 * planilha monitorada (Extensões → Apps Script → arquivo novo → colar).
 *
 * IMPORTANTE: nenhuma chamada desta biblioteca pode travar ou interromper
 * a atualização real da planilha. Por isso, toda comunicação com o painel
 * é envolvida em try/catch e falhas são apenas registradas no Logger —
 * nunca relançadas. Se o painel estiver fora do ar, seu script continua
 * funcionando normalmente.
 *
 * CONFIGURAÇÃO
 * Preencha as Propriedades do Script (Editor → Configurações do projeto →
 * Propriedades do script) com:
 *   CMA_PANEL_URL    -> ex.: https://central.suaempresa.com
 *   CMA_API_TOKEN    -> token gerado na tela do Projeto ("Tokens de API")
 *   CMA_PROJECT_ID   -> UUID do projeto no painel
 *
 * Existem DOIS jeitos de reportar uma atualização — use o que fizer
 * sentido para cada aba:
 *
 * ---------------------------------------------------------------------
 * MODO 1 — ATIVO: seu código sabe quando a atualização começa/termina
 * ---------------------------------------------------------------------
 * Use isto se a própria atualização da planilha roda via Apps Script
 * (função que você já tem, disparada por trigger ou manualmente).
 *
 *   function atualizarPlanilha() {
 *     var sheet = SpreadsheetApp.getActiveSheet();
 *     var run = CentralMonitoramento.startExecution(sheet);
 *     try {
 *       var linhas = fazerAtualizacao_(); // sua lógica de atualização
 *       run.success(linhas);
 *     } catch (err) {
 *       run.error(err);
 *       throw err; // opcional: propague se quiser que o Apps Script marque falha
 *     }
 *   }
 *
 * Para cancelamento explícito (ex.: usuário interrompeu um fluxo manual):
 *   run.cancelled("Cancelado pelo usuário");
 *
 * Se a atualização é feita por Python, Coalesce ou qualquer outra coisa
 * fora do Apps Script, dá pra chamar `POST /api/v1/updates` diretamente
 * (mesmo endpoint, ver README/docs da API) — não precisa desta biblioteca.
 *
 * ---------------------------------------------------------------------
 * MODO 2 — PASSIVO: você não controla quem atualiza a planilha
 * ---------------------------------------------------------------------
 * Use isto quando a planilha é atualizada por algo que você não
 * consegue (ou não quer) instrumentar com uma chamada de API — por
 * exemplo, um job de Coalesce/Python que só escreve na planilha, sem
 * avisar ninguém. Em vez de esperar ser avisado, este modo roda de
 * tempos em tempos (trigger de tempo do Apps Script) e verifica o
 * resultado sozinho:
 *
 *   1. Se a aba tem uma coluna de data (ex.: "Data", "Atualizado em"),
 *      usa a MAIOR data encontrada nessa coluna como "última
 *      atualização" — reflete quando os dados em si foram gerados, não
 *      quando alguém editou a planilha.
 *   2. Se não tem coluna de data (ou não configurada), cai para a data
 *      de última modificação do ARQUIVO inteiro no Google Drive — menos
 *      preciso (é o arquivo todo, não a aba específica), mas funciona
 *      sem nenhuma configuração.
 *
 * Configuração (edite a lista abaixo com suas abas):
 *
 *   function verificarAbasPassivamente() {
 *     CentralMonitoramento.checkSheet(
 *       SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Vendas"),
 *       { dateColumn: "Data do Pedido" } // nome do cabeçalho da coluna
 *     );
 *     CentralMonitoramento.checkSheet(
 *       SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Estoque")
 *       // sem dateColumn: cai automático para a data do arquivo
 *     );
 *   }
 *
 * Depois, configure um trigger de tempo pra rodar essa função sozinha:
 * Editor do Apps Script → relógio (Triggers) → Adicionar acionador →
 * escolha a função (`verificarAbasPassivamente`) → tipo "Baseado em
 * tempo" → de tempo em tempo (ex.: a cada 30 minutos). A partir daí,
 * roda sozinho, sem precisar abrir a planilha.
 */

var CentralMonitoramento = (function () {
  function getConfig_() {
    var props = PropertiesService.getScriptProperties();
    return {
      panelUrl: props.getProperty("CMA_PANEL_URL"),
      apiToken: props.getProperty("CMA_API_TOKEN"),
      projectId: props.getProperty("CMA_PROJECT_ID"),
    };
  }

  /** Envia um evento ao painel. Nunca lança exceção — apenas loga falhas. */
  function send_(payload) {
    var config = getConfig_();

    if (!config.panelUrl || !config.apiToken || !config.projectId) {
      Logger.log(
        "[CentralMonitoramento] Configuração ausente (CMA_PANEL_URL / CMA_API_TOKEN / " +
          "CMA_PROJECT_ID) — evento não enviado, mas a execução continua normalmente."
      );
      return;
    }

    try {
      var response = UrlFetchApp.fetch(config.panelUrl.replace(/\/$/, "") + "/api/v1/updates", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + config.apiToken },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        followRedirects: true,
      });

      var status = response.getResponseCode();
      if (status >= 400) {
        Logger.log(
          "[CentralMonitoramento] Painel respondeu " + status + ": " + response.getContentText()
        );
      }
    } catch (networkError) {
      // Painel indisponível, DNS falhou, timeout, etc. — nunca propaga.
      Logger.log("[CentralMonitoramento] Falha ao contatar o painel: " + networkError);
    }
  }

  /**
   * MODO 1 (ativo). Inicia o rastreamento de uma execução para a aba
   * informada. Retorna um objeto com success()/error()/cancelled() para
   * fechar o evento.
   */
  function startExecution(sheet, options) {
    options = options || {};
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var executionId = options.executionId || Utilities.getUuid();
    var startedAt = new Date();

    var context = {
      projectId: getConfig_().projectId,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetId: sheet.getSheetId(),
      sheetName: sheet.getName(),
      executionId: executionId,
      startedAt: startedAt.toISOString(),
    };

    send_(merge_(context, { status: "RUNNING" }));

    return {
      executionId: executionId,

      success: function (rowsProcessed) {
        var finishedAt = new Date();
        send_(
          merge_(context, {
            status: "SUCCESS",
            finishedAt: finishedAt.toISOString(),
            duration: finishedAt.getTime() - startedAt.getTime(),
            rowsProcessed: rowsProcessed,
          })
        );
      },

      error: function (err, errorCode) {
        var finishedAt = new Date();
        var message = err && err.message ? err.message : String(err);
        send_(
          merge_(context, {
            status: "ERROR",
            finishedAt: finishedAt.toISOString(),
            duration: finishedAt.getTime() - startedAt.getTime(),
            message: message,
            errorCode: errorCode || undefined,
          })
        );
      },

      cancelled: function (message) {
        var finishedAt = new Date();
        send_(
          merge_(context, {
            status: "CANCELLED",
            finishedAt: finishedAt.toISOString(),
            duration: finishedAt.getTime() - startedAt.getTime(),
            message: message,
          })
        );
      },
    };
  }

  /**
   * MODO 2 (passivo) — versão em lote. Verifica várias abas da planilha
   * ativa de uma vez, a partir de uma lista simples. É a forma mais fácil
   * de copiar este script para outra planilha: cole o arquivo inteiro,
   * ajuste as Propriedades do Script (CMA_PROJECT_ID muda por projeto;
   * CMA_PANEL_URL/CMA_API_TOKEN geralmente são os mesmos) e troque só a
   * lista abaixo pelos nomes das abas desta planilha.
   *
   *   function verificarAbasPassivamente() {
   *     CentralMonitoramento.checkSheets([
   *       { name: "Vendas", dateColumn: "Data do Pedido" },
   *       { name: "Estoque" },              // sem dateColumn -> usa data do arquivo
   *       { name: "Datalake" },
   *     ]);
   *   }
   *
   * Cada item aceita os mesmos campos de `checkSheet` (dateColumn,
   * rowsProcessed). Abas com nome que não existir na planilha são
   * ignoradas (com log), em vez de quebrar as demais.
   */
  function checkSheets(configs) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var results = [];
    for (var i = 0; i < configs.length; i++) {
      var cfg = configs[i] || {};
      var sheet = spreadsheet.getSheetByName(cfg.name);
      if (!sheet) {
        Logger.log("[CentralMonitoramento] Aba não encontrada nesta planilha: " + cfg.name);
        continue;
      }
      results.push(checkSheet(sheet, cfg));
    }
    return results;
  }

  /**
   * MODO 2 (passivo). Verifica uma aba sem depender de ninguém avisar o
   * início/fim de uma atualização.
   *
   * options.dateColumn (opcional):
   *   - nome do cabeçalho da coluna de data (ex.: "Data", "Atualizado em")
   *   - ou a letra da coluna (ex.: "B"), se preferir fixar por posição
   *   - se omitido, tenta achar automaticamente uma coluna com um destes
   *     cabeçalhos: Data, Date, Atualizado em, Última atualização
   *   - se nada for encontrado, cai para a data de modificação do
   *     arquivo inteiro (DriveApp) — sempre funciona, mesmo sem
   *     configuração nenhuma.
   */
  function checkSheet(sheet, options) {
    options = options || {};
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var executionId = options.executionId || Utilities.getUuid();

    var context = {
      projectId: getConfig_().projectId,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetId: sheet.getSheetId(),
      sheetName: sheet.getName(),
      executionId: executionId,
    };

    var detected = detectLastUpdate_(sheet, spreadsheet, options.dateColumn);

    send_(
      merge_(context, {
        status: "SUCCESS",
        startedAt: detected.date.toISOString(),
        finishedAt: detected.date.toISOString(),
        rowsProcessed: options.rowsProcessed || detected.rowsProcessed,
        message: detected.message,
      })
    );

    return detected;
  }

  var DEFAULT_DATE_HEADERS_ = [
    "data",
    "date",
    "atualizado em",
    "ultima atualizacao",
    "última atualização",
  ];

  function detectLastUpdate_(sheet, spreadsheet, dateColumn) {
    var range = sheet.getDataRange();
    var values = range.getValues();
    var lastRow = values.length;

    if (lastRow > 1) {
      var headerRow = values[0];
      var columnIndex = -1;

      if (dateColumn) {
        // Letra de coluna fixa (ex.: "B") tem prioridade se for isso que
        // foi passado; senão, procura pelo nome do cabeçalho.
        if (/^[A-Za-z]{1,2}$/.test(dateColumn)) {
          columnIndex = columnLetterToIndex_(dateColumn);
        } else {
          columnIndex = findHeaderIndex_(headerRow, [dateColumn]);
        }
      } else {
        columnIndex = findHeaderIndex_(headerRow, DEFAULT_DATE_HEADERS_);
      }

      if (columnIndex >= 0) {
        var maxDate = null;
        for (var i = 1; i < lastRow; i++) {
          var cell = values[i][columnIndex];
          var cellDate = cell instanceof Date ? cell : null;
          if (cellDate && (!maxDate || cellDate.getTime() > maxDate.getTime())) {
            maxDate = cellDate;
          }
        }
        if (maxDate) {
          return {
            date: maxDate,
            rowsProcessed: lastRow - 1,
            message:
              "Detectado via coluna de data '" + headerRow[columnIndex] + "' (maior data encontrada)",
          };
        }
        Logger.log(
          "[CentralMonitoramento] Coluna de data encontrada mas sem valores de data válidos — usando data do arquivo."
        );
      }
    }

    // Fallback: nenhuma coluna de data configurada/encontrada/preenchida
    // — usa a última modificação do arquivo inteiro no Drive.
    var file = DriveApp.getFileById(spreadsheet.getId());
    return {
      date: file.getLastUpdated(),
      rowsProcessed: Math.max(lastRow - 1, 0),
      message: "Nenhuma coluna de data encontrada — usando última modificação do arquivo (Drive)",
    };
  }

  function findHeaderIndex_(headerRow, candidates) {
    for (var i = 0; i < headerRow.length; i++) {
      var header = String(headerRow[i] || "").trim().toLowerCase();
      for (var j = 0; j < candidates.length; j++) {
        if (header === String(candidates[j]).trim().toLowerCase()) {
          return i;
        }
      }
    }
    return -1;
  }

  function columnLetterToIndex_(letter) {
    letter = letter.toUpperCase();
    var index = 0;
    for (var i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64);
    }
    return index - 1; // 0-based
  }

  function merge_(a, b) {
    var result = {};
    for (var k in a) result[k] = a[k];
    for (var k2 in b) result[k2] = b[k2];
    return result;
  }

  return {
    startExecution: startExecution,
    checkSheet: checkSheet,
    checkSheets: checkSheets,
  };
})();
