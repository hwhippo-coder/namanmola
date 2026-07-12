'use server';

import { google } from 'googleapis';

export interface KidEvent {
  id: string;
  category: string;       // B열: 구분
  title: string;          // C열: 프로그램명
  region: string;         // D열: 진행지역
  targetAudience: string; // E열: 참가대상
  location: string;       // F열: 행사 장소
  targetAge: string;      // G열: 대상연령
  ageGroup: string;       // H열: 대상분류
  minAge: number;         // I열: minAge
  maxAge: number;         // J열: maxAge
  applyStart: string;     // K열: 접수시작일
  applyEnd: string;       // L열: 접수마감일
  eventStart: string;     // M열: 행사기간(시작)
  eventEnd: string;       // N열: 행사기간(종료)
  cost: string;           // O열: 참가비용
  organizer: string;      // P열: 주관기관
  link: string;           // Q열: 상세링크
  status: string;         // R열: 상태
  description: string;    // S열: 행사내용
}

export async function getEvents(): Promise<KidEvent[]> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // S열(행사내용)까지 전체 데이터를 안정적으로 긁어옵니다.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: '시트1!A2:S', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row, index) => {
      // 💡 대표님 시트의 열 위치에 정확하게 맞춘 매칭 Index (0부터 시작)
      const minAgeNum = Number(row[8]);
      const maxAgeNum = Number(row[9]);

      return {
        id: row[0] || String(index + 1),          // A열 (0)
        category: row[1] || '',                   // B열 (1)
        title: row[2] || '',                      // C열 (2)
        region: row[3] || '',                     // D열 (3)
        targetAudience: row[4] || '',             // E열 (4)
        location: row[5] || '',                   // F열 (5)
        targetAge: row[6] || '',                  // G열 (6)
        ageGroup: row[7] || '',                   // H열 (7)
        minAge: isNaN(minAgeNum) || row[8] === undefined ? 5 : minAgeNum,   // I열 (8)
        maxAge: isNaN(maxAgeNum) || row[9] === undefined ? 19 : maxAgeNum,  // J열 (9)
        applyStart: row[10] || '',                // K열 (10)
        applyEnd: row[11] || '',                  // L열 (11)
        eventStart: row[12] || '',                // M열 (12)
        eventEnd: row[13] || '',                  // N열 (13)
        cost: row[14] || '',                      // O열 (14)
        organizer: row[15] || '',                 // P열 (15)
        link: row[16] || '',                      // Q열 (16)
        status: row[17] || '접수대기',             // R열 (17)
        description: row[18] || '',               // S열 (18)
      };
    });
  } catch (error) {
    console.error('구글 시트 연동 에러:', error);
    return [];
  }
}