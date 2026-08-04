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
 * USO TÍPICO
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
   * Inicia o rastreamento de uma execução para a aba informada.
   * Retorna um objeto com success()/error()/cancelled() para fechar o evento.
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

  function merge_(a, b) {
    var result = {};
    for (var k in a) result[k] = a[k];
    for (var k2 in b) result[k2] = b[k2];
    return result;
  }

  return {
    startExecution: startExecution,
  };
})();
