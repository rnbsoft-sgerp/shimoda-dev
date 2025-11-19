/**
 * Apps Script 환경에서 실행되는 백엔드 코드입니다.
 * 스프레드시트와의 상호작용 및 데이터 CRUD 로직을 처리합니다.
 * clasp push 테스트 => 취소 => 작성
 */

// --- 환경 설정 상수 ---
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const HEADER_ROW_INDEX = 1; // 시트에서 헤더가 위치한 행 (1-based)
const CONFIG_SHEET_NAME = 'SHEET_DATA';

// ⭐️ [수정] 노출여부 필드 추가
const CONFIG_HEADERS = ['시트 이름', '탭 표시 이름', '헤더 목록', '탭 순서', '노출여부'];
const CONFIG_KEYS = ['sheetName', 'title', 'headersStr', 'order', 'exposure'];
const CONFIG_COLUMN_COUNT = 5; // ⭐️ [수정] 컬럼 수 4 -> 5로 업데이트

// --- 템플릿 서비스 (HTML 렌더링) ---

/**
 * HTML UI를 사용자에게 제공합니다.
 */
function doGet() {
  try {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Google Sheet CRUD 관리 도구')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  } catch (e) {
    Logger.log('Error in doGet: ' + e.toString());
    return HtmlService.createHtmlOutput('<h1>시스템 오류 발생</h1><p>관리자에게 문의하십시오: ' + e.message + '</p>');
  }
}

// --- SHEET_DATA 구성 관리 함수 ---

/**
 * SHEET_DATA 시트를 가져오거나, 없으면 생성하고 헤더를 설정합니다.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} CONFIG_SHEET_NAME에 해당하는 시트 객체
 */
function getConfigSheet() {
  let sheet = SPREADSHEET.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = SPREADSHEET.insertSheet(CONFIG_SHEET_NAME, 0);
    // CONFIG_HEADERS로 헤더 설정
    sheet.getRange(HEADER_ROW_INDEX, 1, 1, CONFIG_HEADERS.length).setValues([CONFIG_HEADERS]);
    sheet.setFrozenRows(HEADER_ROW_INDEX);
  }
  return sheet;
}

/**
 * 모든 시트 구성 정보를 읽어와 프론트엔드로 전달합니다.
 * @returns {Array<Object>} 시트 구성 정보 객체 배열
 */
function getSheetConfigs() {
  try {
    const configSheet = getConfigSheet();
    const lastRow = configSheet.getLastRow();

    // 헤더 행 이후에 데이터가 없는 경우 빈 배열 반환
    if (lastRow <= HEADER_ROW_INDEX) {
      return [];
    }

    // 데이터 범위 읽기 (헤더 제외)
    // getLastColumn() 대신 CONFIG_COLUMN_COUNT를 사용하여 정확하게 5개 컬럼만 읽도록 보장
    const values = configSheet.getRange(HEADER_ROW_INDEX + 1, 1, lastRow - HEADER_ROW_INDEX, CONFIG_COLUMN_COUNT).getValues();

    // 읽어온 데이터를 CONFIG_KEYS를 사용하여 객체로 변환
    const configs = values.map(row => {
      const config = {};
      CONFIG_KEYS.forEach((key, index) => {
        config[key] = row[index];
      });
      // 'order'는 숫자 타입으로 강제 변환
      config.order = parseInt(config.order, 10) || 9999;
      return config;
    });

    return configs;
  } catch (e) {
    Logger.log('getSheetConfigs Error: ' + e.toString());
    return { error: e.message };
  }
}

/**
 * 새로운 시트 구성을 등록하고 실제 시트를 생성합니다.
 * @param {Object} configData - 프론트엔드에서 전달된 구성 정보 (sheetName, title, headers, order, exposure)
 * @returns {Object} 성공 또는 오류 메시지
 */
function createSheetConfig(configData) {
  try {
    
    const headersArray = configData.headers;

    // ⭐️ [수정] 방어 로직 추가: headersArray가 유효한 배열인지 확인
    if (!Array.isArray(headersArray) || headersArray.length === 0) {
        Logger.log('Validation Error: headersArray is not a valid array or is empty.');
        return { success: false, message: '헤더 목록이 유효하지 않거나 비어 있습니다. (headersArray 에러)' };
    }

    const configSheet = getConfigSheet();
    
    // 1. 중복 시트 이름 검사 (SHEET_DATA에 이미 등록된 시트인지 확인)
    const existingConfigs = getSheetConfigs();
    if (existingConfigs.some(c => c.sheetName === configData.sheetName)) {
      return { success: false, message: '이미 등록된 시트 이름입니다. 다른 이름을 사용하십시오.' };
    }

    // 2. 새로운 시트 생성 및 헤더 설정
    let newSheet = SPREADSHEET.getSheetByName(configData.sheetName);
    if (!newSheet) {
      newSheet = SPREADSHEET.insertSheet(configData.sheetName);
    }
    
    // headers는 배열로 넘어왔으므로, 문자열로 변환하여 저장
    newSheet.getRange(HEADER_ROW_INDEX, 1, 1, headersArray.length).setValues([headersArray]);
    newSheet.setFrozenRows(HEADER_ROW_INDEX);

    // 3. SHEET_DATA에 구성 정보 추가 (headers 배열을 쉼표 구분 문자열로 변환)
    const rowData = [
      configData.sheetName,
      configData.title,
      headersArray.join(', '), // 쉼표 구분 문자열로 저장
      configData.order || 9999,
      configData.exposure || 'Y' // ⭐️ [추가] 노출여부 값 추가
    ];
    
    configSheet.appendRow(rowData);

    return { success: true, message: `시트 [${configData.title}] 구성 및 시트 생성이 완료되었습니다.` };

  } catch (e) {
    Logger.log('createSheetConfig Error: ' + e.toString());
    return { success: false, message: '시트 구성 등록 중 오류가 발생했습니다: ' + e.message };
  }
}

// --- 데이터 CRUD 함수 ---

/**
 * 특정 시트의 모든 데이터를 읽어와 프론트엔드로 전달합니다.
 * @param {string} sheetName - 데이터를 읽을 시트 이름
 * @param {Array<string>} keys - 데이터 객체 키 배열
 * @param {string} searchQuery - 검색어 (선택 사항)
 * @returns {Array<Object>} 데이터 객체 배열 (rowIndex 포함)
 */
function getSpreadsheetData(sheetName, keys, searchQuery = '') {
  try {
    const sheet = SPREADSHEET.getSheetByName(sheetName);
    if (!sheet) {
      return { error: '시트를 찾을 수 없습니다: ' + sheetName };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= HEADER_ROW_INDEX || lastCol === 0) {
      return []; // 데이터 없음
    }

    // 헤더 행 이후의 모든 데이터 읽기
    const dataValues = sheet.getRange(HEADER_ROW_INDEX + 1, 1, lastRow - HEADER_ROW_INDEX, lastCol).getValues();
    const headers = sheet.getRange(HEADER_ROW_INDEX, 1, 1, lastCol).getValues()[0];

    const data = dataValues.map((row, index) => {
      const record = { rowIndex: HEADER_ROW_INDEX + 1 + index }; // 1-based 인덱스
      row.forEach((value, colIndex) => {
        const key = keys[colIndex] || headers[colIndex];
        
        // ⭐️ [수정] Google Apps Script의 Date 객체를 YYYY-MM-DD 문자열로 변환하여 조회 오류 방지
        if (value instanceof Date) {
            // 스프레드시트의 시간대를 사용하여 YYYY-MM-DD 형식으로 변환
            try {
                value = Utilities.formatDate(value, SPREADSHEET.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            } catch (e) {
                Logger.log('Date Formatting Error: ' + e.toString());
                // 변환 실패 시 toString()으로 대체하여 최소한의 값을 유지
                value = value.toString(); 
            }
        }
        
        record[key] = value;
      });
      return record;
    });

    // 검색어 필터링
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery) {
      return data.filter(record => {
        return Object.values(record).some(value =>
          value && String(value).toLowerCase().includes(trimmedQuery)
        );
      });
    }

    return data;
  } catch (e) {
    Logger.log('getSpreadsheetData Error: ' + e.toString());
    return { error: e.message };
  }
}

/**
 * 새로운 레코드를 시트에 추가합니다.
 * @param {string} sheetName - 데이터를 추가할 시트 이름
 * @param {Array<string>} keys - 데이터 객체 키 배열
 * @param {Object} record - 추가할 레코드 객체
 * @returns {Object} 성공 또는 오류 메시지
 */
function createRecord(sheetName, keys, record) {
  try {
    const sheet = SPREADSHEET.getSheetByName(sheetName);
    if (!sheet) {
      return { error: '시트를 찾을 수 없습니다: ' + sheetName };
    }

    // 키 순서에 맞춰 값 배열 생성
    const rowData = keys.map(key => record[key]);
    sheet.appendRow(rowData);

    return { message: '새 레코드가 성공적으로 등록되었습니다.', error: null };
  } catch (e) {
    Logger.log('createRecord Error: ' + e.toString());
    return { error: e.message };
  }
}

/**
 * 기존 레코드를 시트에서 수정합니다.
 * @param {string} sheetName - 데이터를 수정할 시트 이름
 * @param {Array<string>} keys - 데이터 객체 키 배열
 * @param {number} rowIndex - 수정할 행 인덱스 (1-based)
 * @param {Object} record - 수정된 레코드 객체
 * @returns {Object} 성공 또는 오류 메시지
 */
function updateRecord(sheetName, keys, rowIndex, record) {
  try {
    const sheet = SPREADSHEET.getSheetByName(sheetName);
    if (!sheet) {
      return { error: '시트를 찾을 수 없습니다: ' + sheetName };
    }

    // 키 순서에 맞춰 값 배열 생성
    const rowData = keys.map(key => record[key]);

    // rowIndex는 헤더(1행) 이후의 데이터 행 인덱스
    const targetRange = sheet.getRange(rowIndex, 1, 1, rowData.length);
    targetRange.setValues([rowData]);

    return { message: '레코드가 성공적으로 수정되었습니다.', error: null };
  } catch (e) {
    Logger.log('updateRecord Error: ' + e.toString());
    return { error: e.message };
  }
}

/**
 * 기존 레코드를 시트에서 삭제합니다.
 * @param {string} sheetName - 데이터를 삭제할 시트 이름
 * @param {number} rowIndex - 삭제할 행 인덱스 (1-based)
 * @returns {Object} 성공 또는 오류 메시지
 */
function deleteRecord(sheetName, rowIndex) {
  try {
    const sheet = SPREADSHEET.getSheetByName(sheetName);
    if (!sheet) {
      return { error: '시트를 찾을 수 없습니다: ' + sheetName };
    }

    // rowIndex가 1보다 크고 유효한 범위 내에 있는지 확인 (헤더 행은 삭제하지 않음)
    if (rowIndex <= HEADER_ROW_INDEX || rowIndex > sheet.getLastRow()) {
      return { error: '유효하지 않은 행 번호입니다.' };
    }

    sheet.deleteRow(rowIndex);

    return { message: '레코드가 성공적으로 삭제되었습니다.', error: null };
  } catch (e) {
    Logger.log('deleteRecord Error: ' + e.toString());
    return { error: e.message };
  }
}