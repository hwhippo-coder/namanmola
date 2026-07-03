'use server';

import { google } from 'googleapis';

export interface KidEvent {
  id: string;
  category: string;     // B열: 구분
  title: string;        // C열: 프로그램명
  region: string;       // D열: 진행지역
  targetAudience: string; // E열: 참가대상 (서울시민 등 제약)
  location: string;     // F열: 행사 장소
  targetAge: string;    // G열: 대상연령
  ageGroup: string;     // H열: 대상분류 (수식 결과)
  applyStart: string;   // I열: 접수시작일
  applyEnd: string;     // J열: 접수마감일
  eventStart: string;   // K열: 행사기간(시작)
  eventEnd: string;     // L열: 행사기간(종료)
  cost: string;         // M열: 참가비용
  organizer: string;    // N열: 주관기관
  link: string;         // O열: 상세링크
  status: string;       // P열: 상태
  description: string;  // Q열: 행사 내용 (새로 추가)
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
    
    // Q열까지 가져오기 위해 범위를 A2:Q로 수정합니다.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: '시트1!A2:Q', 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row, index) => ({
      id: row[0] || String(index + 1),
      category: row[1] || '',
      title: row[2] || '',
      region: row[3] || '',
      targetAudience: row[4] || '', 
      location: row[5] || '',
      targetAge: row[6] || '',
      ageGroup: row[7] || '',
      applyStart: row[8] || '',
      applyEnd: row[9] || '',
      eventStart: row[10] || '',
      eventEnd: row[11] || '',
      cost: row[12] || '',
      organizer: row[13] || '',
      link: row[14] || '',
      status: row[15] || '접수대기',
      description: row[16] || '', // Q열 매핑
    }));
  } catch (error) {
    console.error('구글 시트 연동 에러:', error);
    return [];
  }
}