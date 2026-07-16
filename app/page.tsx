'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getEvents, KidEvent } from './actions/getEvents';

// 🎓 숫자를 다시 학부모용 학년 이름으로 바꾸어주는 매칭 함수
function getAgeLabel(value: number): string {
  if (value === 7) return '미취학';
  if (value >= 8 && value <= 13) return `초등 ${value - 7}학년`;
  if (value >= 14 && value <= 16) return `중등 ${value - 13}학년`;
  if (value >= 17 && value <= 19) return `고등 ${value - 16}학년`;
  return '';
}

// 👶 최저~최고 숫자를 조합하여 심플한 문구로 만드는 함수
function formatAgeRange(minAge: number, maxAge: number, targetAge: string): string {
  if (targetAge.includes('구분없음') || targetAge.includes('제한없음') || (minAge === 5 && maxAge === 19)) {
    return '👥 연령: 전연령 대상';
  }
  
  const minLabel = getAgeLabel(minAge);
  const maxLabel = getAgeLabel(maxAge);

  if ((minAge === 5 || !minLabel) && maxLabel) {
    return `👥 연령: ${maxLabel} 이하`;
  }
  if ((maxAge === 19 || !maxLabel) && minLabel) {
    return `👥 연령: ${minLabel} 이상`;
  }
  if (minLabel && maxLabel) {
    if (minLabel === maxLabel) return `👥 연령: ${minLabel}`;
    return `👥 연령: ${minLabel} ~ ${maxLabel}`;
  }
  return `👥 연령: ${targetAge || '구분 없음'}`;
}

// ⏱️ 실시간 시간 계산 헬퍼 함수
function calculateDday(applyStart: string, now: Date) {
  if (!applyStart) return null;
  const safeDateStr = applyStart.replace(' ', 'T');
  const targetDate = new Date(safeDateStr);

  if (isNaN(targetDate.getTime())) return null; 

  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return null; 

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isToday =
    targetDate.getDate() === now.getDate() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getFullYear() === now.getFullYear();

  if (diffMins < 60) {
    return { text: `🚨 오픈 임박: ${diffMins}분 전!`, style: 'bg-red-100 text-red-700 border border-red-200 animate-pulse' };
  } else if (isToday) {
    return { text: `🔥 오늘 ${targetDate.getHours()}시 오픈!`, style: 'bg-orange-100 text-orange-700 border border-orange-200' };
  } else if (diffHours < 24 && !isToday) {
    return { text: `⏳ 내일 ${targetDate.getHours()}시 오픈`, style: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
  } else if (diffDays <= 3) {
    return { text: `📅 D-${diffDays}`, style: 'bg-indigo-50 text-indigo-600 border border-indigo-100' };
  }
  return null;
}

// 🎓 학년 및 매칭 숫자 정의 배열
const AGE_OPTIONS = [
  { label: '전체', value: 0 },
  { label: '미취학(5~7세)', value: 7 },
  { label: '초등 1학년', value: 8 },
  { label: '초등 2학년', value: 9 },
  { label: '초등 3학년', value: 10 },
  { label: '초등 4학년', value: 11 },
  { label: '초등 5학년', value: 12 },
  { label: '초등 6학년', value: 13 },
  { label: '중등 1학년', value: 14 },
  { label: '중등 2학년', value: 15 },
  { label: '중등 3학년', value: 16 },
  { label: '고등 1학년', value: 17 },
  { label: '고등 2학년', value: 18 },
  { label: '고등 3학년', value: 19 },
];

// 🛠️ 타임라인 내부에서 중복 프로그램을 하나로 합쳐주는 헬퍼 함수
function groupTimelineEvents(events: KidEvent[], type: string) {
  const groups: { [key: string]: { baseEvent: KidEvent; count: number; times: string[] } } = {};

  events.forEach(e => {
    const cleanTitle = e.title.trim();
    const shortKey = cleanTitle.substring(0, 10); 

    const timeStr = type === 'apply' ? (e.applyStart.split(' ')[1] || '00:00') : '';

    if (!groups[shortKey]) {
      groups[shortKey] = {
        baseEvent: e,
        count: 1,
        times: [timeStr]
      };
    } else {
      groups[shortKey].count += 1;
      if (timeStr && !groups[shortKey].times.includes(timeStr)) {
        groups[shortKey].times.push(timeStr);
      }
    }
  });

  return Object.values(groups).map(g => {
    let displayTitle = g.baseEvent.title;
    if (g.count > 1) {
      const delimiters = ['-', '(', '1차', '2차', '1기', '2기'];
      for (const d of delimiters) {
        if (displayTitle.includes(d)) {
          displayTitle = displayTitle.split(d)[0].trim();
          break;
        }
      }
      displayTitle = `${displayTitle} 외 ${g.count - 1}건`;
    }

    return {
      ...g.baseEvent,
      displayTitle,
      displayTime: g.times.sort().join(', '),
      isGrouped: g.count > 1,
      groupKey: g.baseEvent.title.trim().substring(0, 10) 
    };
  });
}

// 🖼️ 세로형 포스터 최적화 이미지 슬라이더 컴포넌트 (스크롤 탐색 + 안내 배지 추가)
function ImageCarousel({ urls, onImageClick }: { urls: string[]; onImageClick: (url: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!urls || urls.length === 0) return null;

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  return (
    <div className="relative w-full h-72 bg-gray-50 rounded-2xl overflow-hidden mb-4 group/carousel border border-gray-100/80 shadow-inner">
      {/* 💡 [핵심 효과] hover-scroll: 마우스를 올리면 포스터 하단까지 부드럽게 스크롤링되는 액션 */}
      <div 
        onClick={() => onImageClick(urls[currentIndex].trim())}
        className="w-full h-full cursor-zoom-in overflow-hidden relative"
      >
        <img
          src={urls[currentIndex].trim()}
          alt="행사 홍보 포스터"
          className="w-full absolute top-0 left-0 transition-all duration-[2.5s] ease-in-out hover:translate-y-[calc(-100%+18rem)] object-cover object-top origin-top"
          style={{ height: 'auto' }} // 원본 종횡비를 유지하면서 스크롤되도록 설정
        />
      </div>
      
      {/* 🔍 [안내 배지] 우측 하단 포스터 크게 보기 유도 가이드 아이콘 */}
      <div 
        onClick={() => onImageClick(urls[currentIndex].trim())}
        className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm pointer-events-auto cursor-pointer hover:bg-black/80 transition-all"
      >
        <span>🔍</span>
        <span>포스터 크게보기</span>
      </div>

      {urls.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 text-xs hover:bg-black/70 transition opacity-0 group-hover/carousel:opacity-100 z-10"
          >
            ◀
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 text-xs hover:bg-black/70 transition opacity-0 group-hover/carousel:opacity-100 z-10"
          >
            ▶
          </button>
          <div className="absolute bottom-3 left-3 bg-black/40 text-[10px] text-white px-2 py-0.5 rounded-full font-bold z-10">
            {currentIndex + 1} / {urls.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [allEvents, setAllEvents] = useState<KidEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedCost, setSelectedCost] = useState('전체');
  
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  
  // 💡 포스터 확대를 위한 라이트박스(Modal) 모달 팝업 상태 추가
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  
  const [minAgeFilter, setMinAgeFilter] = useState(0); 
  const [maxAgeFilter, setMaxAgeFilter] = useState(0); 

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getEvents();
        setAllEvents(data);
      } catch (err) {
        console.error('데이터 바인딩 실패:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoClick = () => {
    setSearchTerm('');
    setSelectedRegion('전체');
    setSelectedCost('전체');
    setSelectedTimelineDate(null);
    setSelectedGroupKey(null);
    setMinAgeFilter(0);
    setMaxAgeFilter(0);
    setIsFilterOpen(false);
  };

  const timelineDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 10 }, (_, i) => {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      
      const year = nextDate.getFullYear();
      const month = nextDate.getMonth() + 1;
      const date = nextDate.getDate();
      const monthStr = String(month).padStart(2, '0');
      const dateStr = String(date).padStart(2, '0');
      const fullIsoDate = `${year}-${monthStr}-${dateStr}`;
      
      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = dayLabels[nextDate.getDay()];
      
      return {
        fullDate: fullIsoDate,
        label: i === 0 ? `오늘 (${month}/${date})` : `${month}/${date} (${dayName})`,
        isToday: i === 0,
        dayName: dayName
      };
    });
  }, []);

  const baseFilteredEvents = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === '전체' || event.region.includes(selectedRegion);
      
      let matchesAge = true;
      const eventMin = event.minAge || 5;   
      const eventMax = event.maxAge || 19;  

      if (minAgeFilter !== 0 && maxAgeFilter !== 0) {
        matchesAge = eventMin <= maxAgeFilter && eventMax >= minAgeFilter;
      } else if (minAgeFilter !== 0) {
        matchesAge = eventMax >= minAgeFilter;
      } else if (maxAgeFilter !== 0) {
        matchesAge = eventMin <= maxAgeFilter;
      }
      
      let matchesCost = true;
      if (selectedCost === '무료') matchesCost = event.cost.includes('무료') || event.cost === '0' || event.cost === '';
      if (selectedCost === '유료') matchesCost = !event.cost.includes('무료') && event.cost !== '0' && event.cost !== '';

      let isNotEnded = true;
      const endStr = event.eventEnd || event.eventStart;
      if (endStr) {
        const endDate = new Date(endStr);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < todayDate) isNotEnded = false;
      }

      return matchesSearch && matchesRegion && matchesAge && matchesCost && isNotEnded;
    });
  }, [allEvents, searchTerm, selectedRegion, minAgeFilter, maxAgeFilter, selectedCost]);

  const finalFilteredEvents = useMemo(() => {
    return baseFilteredEvents.filter(event => {
      if (!selectedTimelineDate) return true;

      const applyDatePart = event.applyStart.split(' ')[0];
      const start = new Date(event.eventStart);
      const end = new Date(event.eventEnd || event.eventStart);
      const target = new Date(selectedTimelineDate);
      
      const isApplyDate = applyDatePart === selectedTimelineDate;
      const isEventPeriod = target >= start && target <= end;

      const applyStartDay = new Date(event.applyStart.split(' ')[0]);
      const applyEndDay = event.applyEnd ? new Date(event.applyEnd.split(' ')[0]) : null;
      const isApplyPeriod = applyEndDay ? (target >= applyStartDay && target <= applyEndDay) : (target >= applyStartDay);

      return isApplyDate || isEventPeriod || isApplyPeriod;
    });
  }, [baseFilteredEvents, selectedTimelineDate]);

  const sortedFilteredEvents = useMemo(() => {
    const now = currentTime || new Date();

    return [...finalFilteredEvents].sort((a, b) => {
      if (selectedGroupKey) {
        const aMatch = a.title.trim().substring(0, 10) === selectedGroupKey;
        const bMatch = b.title.trim().substring(0, 10) === selectedGroupKey;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }

      const getPriority = (event: KidEvent) => {
        const isApplyStarted = event.applyStart ? new Date(event.applyStart.replace(' ', 'T')) <= now : false;
        const categoryStr = (event as any).category || '';
        const isEduExperience = categoryStr.includes('교육') || categoryStr.includes('체험');
        const isFestival = categoryStr.includes('축제');

        const hasNoApplyEnd = !event.applyEnd || event.applyEnd.trim() === '';
        const isFlexibleApplying = isApplyStarted && hasNoApplyEnd && event.status !== '접수마감' && isEduExperience;
        const isEventOngoing = event.eventStart ? new Date(event.eventStart) <= now : false;
        const isFieldChanceAge = isEduExperience && (event.status === '접수마감' || !isFlexibleApplying) && isEventOngoing;

        if (event.status === '접수대기' || (event.applyStart && !isApplyStarted)) return 1;
        if (event.status === '접수중' || isFlexibleApplying) return 2;
        if (isFieldChanceAge || !event.applyStart || isFestival) return 3;
        return 4;
      };

      const prioA = getPriority(a);
      const prioB = getPriority(b);

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      if (a.applyStart && b.applyStart) {
        return new Date(a.applyStart.replace(' ', 'T')).getTime() - new Date(b.applyStart.replace(' ', 'T')).getTime();
      }

      return 0;
    });
  }, [finalFilteredEvents, selectedGroupKey, currentTime]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        🔄 나만몰랐어? 실시간 데이터 로딩 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">
      <header className="bg-white border-b border-gray-100 py-5 px-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div onClick={handleLogoClick} className="cursor-pointer group select-none">
            <h1 className="text-xl font-extrabold text-indigo-600 tracking-tight group-hover:text-indigo-700 transition">나만몰랐어?</h1>
            <p className="text-xs text-gray-400 hidden sm:block mt-0.5">선착순 교육·체험 정보 마감 알리미</p>
          </div>
          
          <div className="w-full sm:w-72 relative">
            <input 
              type="text" 
              placeholder="프로그램명, 체험장소 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border-0 pl-4 pr-10 py-2 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none"
            />
            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">

        <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gray-700">필터 설정</h2>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition"
            >
              {isFilterOpen ? '상세 필터 접기 🔼' : '상세 필터 열기 🔽'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 w-10 shrink-0">지역</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['전체', '서울', '경기', '인천', '강원', '대전', '세종', '충남', '충북', '부산', '대구', '울산', '경남', '경북', '광주', '전남', '전북', '제주', '온라인'].map((loc) => (
                <button key={loc} onClick={() => setSelectedRegion(loc)} className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap transition ${selectedRegion === loc ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{loc}</button>
              ))}
            </div>
          </div>

          {isFilterOpen && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-10 shrink-0">연령</span>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs w-full sm:w-auto">
                  <select 
                    value={minAgeFilter} 
                    onChange={(e) => setMinAgeFilter(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 font-semibold text-gray-700 outline-none focus:border-indigo-500"
                  >
                    {AGE_OPTIONS.map(opt => (
                      <option key={`min-${opt.value}`} value={opt.value}>{opt.label === '전체' ? '최저 학년 (전체)' : opt.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold">부터 ~</span>
                  <select 
                    value={maxAgeFilter} 
                    onChange={(e) => setMaxAgeFilter(Number(e.target.value))}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 font-semibold text-gray-700 outline-none focus:border-indigo-500"
                  >
                    {AGE_OPTIONS.map(opt => (
                      <option key={`max-${opt.value}`} value={opt.value}>{opt.label === '전체' ? '최고 학년 (전체)' : opt.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-medium">까지</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-10 shrink-0">비용</span>
                <div className="flex gap-2">
                  {['전체', '무료', '유료'].map((price) => (
                    <button key={price} onClick={() => setSelectedCost(price)} className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition ${selectedCost === price ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{price}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 📅 향후 10일 타임라인 영역 */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <h2 className="text-base font-bold flex items-center gap-2 mb-2">🗓️ 향후 10일 타임라인</h2>
              {selectedTimelineDate && (
                <button 
                  onClick={() => {
                    setSelectedTimelineDate(null);
                    setSelectedGroupKey(null);
                  }}
                  className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md"
                >
                  날짜 필터 해제 ✖
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="flex items-center gap-1 text-red-600"><span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>🔴 오픈 예정 (선착순 대기)</span>
              <span className="flex items-center gap-1 text-amber-600"><span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>🟡 접수중 (마감여부 확인)</span>
              <span className="flex items-center gap-1 text-blue-600"><span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>🔵 즉시 참여 (접수 없음)</span>
              <span className="flex items-center gap-1 text-purple-600"><span className="inline-block w-2 h-2 rounded-full bg-purple-400"></span>🟣 행사중 (현장접수 확인)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">특정 프로그램을 클릭하면 하단에서 해당 프로그램을 먼저 보여줍니다.</p>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-thin">
            {timelineDates.map((dayObj) => {
              const isSelected = selectedTimelineDate === dayObj.fullDate;
              const targetDate = new Date(dayObj.fullDate);
              
              const rawApplyEvents = baseFilteredEvents.filter(e => e.applyStart.split(' ')[0] === dayObj.fullDate && e.category.includes('교육/체험'));
              
              const rawActiveApplyEvents = baseFilteredEvents.filter(e => {
                if (e.status === '접수마감' || e.category.includes('축제')) return false;
                const applyStartPart = e.applyStart.split(' ')[0];
                if (applyStartPart === dayObj.fullDate) return false; 
                
                const startDay = new Date(applyStartPart);
                const endDay = e.applyEnd ? new Date(e.applyEnd.split(' ')[0]) : null;
                return endDay ? (targetDate >= startDay && targetDate <= endDay) : (targetDate >= startDay);
              });

              const rawNoApplyEvents = baseFilteredEvents.filter(e => {
                if (!e.category.includes('축제') && e.applyStart) return false;
                const start = new Date(e.eventStart);
                const end = new Date(e.eventEnd || e.eventStart);
                return targetDate >= start && targetDate <= end;
              });

              const rawOngoingEvents = baseFilteredEvents.filter(e => {
                if (e.category.includes('축제') || !e.applyStart) return false; 
                const start = new Date(e.eventStart);
                const end = new Date(e.eventEnd || e.eventStart);
                return targetDate >= start && targetDate <= end;
              });

              const applyEvents = groupTimelineEvents(rawApplyEvents, 'apply');
              const activeApplyEvents = groupTimelineEvents(rawActiveApplyEvents, 'activeApply');
              const noApplyEvents = groupTimelineEvents(rawNoApplyEvents, 'noApply');
              const ongoingEvents = groupTimelineEvents(rawOngoingEvents, 'ongoing');
              
              const totalCount = applyEvents.length + activeApplyEvents.length + noApplyEvents.length + ongoingEvents.length;
              
              return (
                <div 
                  key={dayObj.fullDate}
                  onClick={() => {
                    setSelectedTimelineDate(isSelected ? null : dayObj.fullDate);
                    setSelectedGroupKey(null);
                  }}
                  className={`w-[220px] flex-shrink-0 flex flex-col rounded-xl border p-4 cursor-pointer snap-start transition-all ${
                    isSelected ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500' :
                    dayObj.isToday ? 'border-red-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <span className={`font-bold text-sm ${dayObj.isToday ? 'text-white bg-red-500 px-2.5 py-0.5 rounded-full' : 'text-gray-700'}`}>
                      {dayObj.label} 
                    </span>
                    {totalCount > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold">{totalCount}건</span>}
                  </div>

                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin">
                    {applyEvents.map(ev => (
                      <div 
                        key={`apply-${ev.id}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineDate(dayObj.fullDate);
                          setSelectedGroupKey(ev.groupKey);
                        }}
                        className={`p-2 rounded border transition cursor-pointer ${selectedGroupKey === ev.groupKey ? 'bg-red-100 border-red-300 ring-1 ring-red-400' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-red-600 font-bold mb-1">
                          <span>⏰ {ev.displayTime} 오픈</span>
                          <span className="bg-red-100 px-1.5 py-0.5 rounded text-[9px] font-extrabold max-w-[50px] truncate">{ev.region}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug break-keep">{ev.displayTitle}</h4>
                      </div>
                    ))}

                    {activeApplyEvents.map(ev => (
                      <div 
                        key={`active-apply-${ev.id}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineDate(dayObj.fullDate);
                          setSelectedGroupKey(ev.groupKey);
                        }}
                        className={`p-2 rounded border transition cursor-pointer ${selectedGroupKey === ev.groupKey ? 'bg-amber-100 border-amber-300 ring-1 ring-amber-400' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-amber-700 font-bold mb-1">
                          <span>🔍 마감여부 확인</span>
                          <span className="bg-amber-100 px-1.5 py-0.5 rounded text-[9px] font-extrabold max-w-[50px] truncate">{ev.region}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug break-keep">{ev.displayTitle}</h4>
                      </div>
                    ))}

                    {noApplyEvents.map(ev => (
                      <div 
                        key={`no-apply-${ev.id}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineDate(dayObj.fullDate);
                          setSelectedGroupKey(ev.groupKey);
                        }}
                        className={`p-2 rounded border transition cursor-pointer ${selectedGroupKey === ev.groupKey ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-400' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-blue-600 font-bold mb-1">
                          <span>🎈 사전접수 없음</span>
                          <span className="bg-blue-100 px-1.5 py-0.5 rounded text-[9px] font-extrabold max-w-[50px] truncate">{ev.region}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug break-keep">{ev.displayTitle}</h4>
                      </div>
                    ))}

                    {ongoingEvents.map(ev => (
                      <div 
                        key={`ongoing-${ev.id}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimelineDate(dayObj.fullDate);
                          setSelectedGroupKey(ev.groupKey);
                        }}
                        className={`p-2 rounded border transition cursor-pointer ${selectedGroupKey === ev.groupKey ? 'bg-purple-100 border-purple-300 ring-1 ring-purple-400' : 'bg-purple-50/70 border-purple-100 hover:bg-purple-100'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-purple-700 font-bold mb-1">
                          <span>📢 현장접수 확인</span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[9px] font-extrabold max-w-[50px] truncate">{ev.region}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-gray-700 line-clamp-2 leading-snug break-keep">{ev.displayTitle}</h4>
                      </div>
                    ))}
                    
                    {totalCount === 0 && (
                      <div className="text-center py-6 text-xs font-medium text-gray-400">일정 없음</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 📇 검색 결과 카드 영역 */}
        <section className="space-y-3">
          <div className="flex justify-between items-center pl-1">
            <h2 className="text-sm font-bold text-gray-500">검색 결과 ({sortedFilteredEvents.length}건)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedFilteredEvents.map((event) => {
              const ddayBadge = currentTime ? calculateDday(event.applyStart, currentTime) : null;

              const isApplyStarted = event.applyStart ? new Date(event.applyStart.replace(' ', 'T')) <= (currentTime || new Date()) : false;
              const hasNoApplyEnd = !event.applyEnd || event.applyEnd.trim() === '';
              
              const isFlexibleApplying = isApplyStarted && hasNoApplyEnd && event.status !== '접수마감' && (event.category || '').includes('교육/체험');
              
              const isEventOngoing = event.eventStart ? new Date(event.eventStart) <= (currentTime || new Date()) : false;
              const isFieldChanceAge = (event.category || '').includes('교육/체험') && (event.status === '접수마감' || !isFlexibleApplying) && isEventOngoing;

              const isHighlighted = selectedGroupKey && event.title.trim().substring(0, 10) === selectedGroupKey;

              // 💡 구글 시트 T열에 기재한 이미지 주소들을 쉼표(,) 기준으로 분리 파싱
              const rawImageUrl = (event as any).imageUrl || '';
              const imageArray = rawImageUrl.trim() ? rawImageUrl.split(',').filter((url: string) => url.trim() !== '') : [];

              return (
                <div 
                  key={event.id} 
                  className={`bg-white rounded-2xl border ${
                    isHighlighted ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'
                  } p-5 flex flex-col justify-between transition-all duration-300`}
                >
                  <div>
                    {/* 🖼️ [대표님 반영 ⭐️] 홍보 포스터 이미지 슬라이더 영역 추가 */}
                    {imageArray.length > 0 && (
                      <ImageCarousel urls={imageArray} onImageClick={(url) => setModalImageUrl(url)} />
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2.5 py-1 rounded-md">{event.region}</span>
                        {event.targetAudience && (
                          <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 animate-pulse">🎯 대상한정: {event.targetAudience}</span>
                        )}
                      </div>
                      
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isFieldChanceAge
                          ? 'bg-purple-100 text-purple-800'
                          : isFlexibleApplying 
                          ? 'bg-orange-100 text-orange-800 animate-pulse' 
                          : event.status === '접수중' ? 'bg-green-100 text-green-800' 
                          : event.status === '접수대기' ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isFieldChanceAge ? '행사중 (현장확인)' : isFlexibleApplying ? '접수중 (확인 필요)' : event.status}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2 leading-tight break-keep">
                      {event.title}
                    </h3>

                    {ddayBadge && !isFlexibleApplying && !isFieldChanceAge && (
                      <div className="mb-4">
                        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-md shadow-sm inline-flex items-center ${ddayBadge.style}`}>
                          {ddayBadge.text}
                        </span>
                      </div>
                    )}

                    {isFlexibleApplying && (
                      <div className="mb-4 bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700 font-medium leading-relaxed break-keep flex items-start gap-1.5">
                        <span>💡</span>
                        <span>마감일이 지정되지 않은 선착순 행사입니다. 접수가 마감되었을 수 있으니 하단 버튼을 눌러 확인해 보세요!</span>
                      </div>
                    )}

                    {isFieldChanceAge && (
                      <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700 font-medium leading-relaxed break-keep flex items-start gap-1.5">
                        <span>📢</span>
                        <span>사전 온라인 예약은 마감되었으나, 당일 취소분 발생 시 **현장 선착순 추가 접수** 기회가 있을 수 있습니다. 주관기관 안내를 확인해 보세요!</span>
                      </div>
                    )}

                    {event.description && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600 leading-relaxed border border-gray-100 break-keep">
                        <p className="font-bold text-gray-500 mb-1.5">💡 행사 내용</p>
                        <p className="line-clamp-3">{event.description}</p>
                      </div>
                    )}
                    
                    <div className="space-y-1.5 text-sm text-gray-600 font-medium border-t border-gray-50 pt-4 mt-2">
                      <p>📍 장소: <span className="text-gray-800 break-keep">{event.location}</span></p>
                      <p className="text-gray-600 font-medium">
                        <span className="text-gray-800">{formatAgeRange(event.minAge, event.maxAge, event.targetAge)}</span>
                      </p>
                      <p>⏰ 접수시작: <span className="text-gray-800">{event.applyStart || '사전접수 없음'}</span></p>
                      <p>📅 행사기간: <span className="text-gray-800">{event.eventStart} {event.eventEnd ? `~ ${event.eventEnd}` : '(당일)'}</span></p>
                      <p>💰 비용: <span className={`${event.cost.includes('무료') || event.cost === '0' || event.cost === '' ? 'text-indigo-600 font-extrabold' : 'text-gray-800'}`}>{event.cost || '무료'}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <button 
                      onClick={() => {
                        const searchQuery = encodeURIComponent(event.title);
                        window.open(`https://search.naver.com/search.naver?query=${searchQuery}`, '_blank');
                      }}
                      className="w-1/3 bg-[#03C75A] text-white text-[13px] font-bold py-3.5 rounded-xl hover:bg-[#02b351] transition shadow-sm flex items-center justify-center gap-1"
                    >
                      🔍 네이버검색
                    </button>
                    
                    <button 
                      onClick={() => window.open(event.link, '_blank')}
                      className={`w-2/3 text-white text-[13px] font-bold py-3.5 rounded-xl transition shadow-sm ${
                        isFieldChanceAge
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
                          : isFlexibleApplying 
                          ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' 
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                      }`}
                    >
                      {isFieldChanceAge ? '현장 참여 및 공지 확인' : '신청 페이지로 이동'}
                    </button>
                  </div>
                </div>
              );
            })}
            {sortedFilteredEvents.length === 0 && (
              <div className="col-span-full bg-white text-center py-16 text-sm text-gray-400 rounded-2xl border border-dashed border-gray-200">
                🔍 선택하신 필터와 조건에 매칭되는 프로그램이 없습니다.
              </div>
            )}
          </div>
        </section>

      </div>

      <a 
        href="https://forms.gle/PvR1E3HDBkTPRkkH6" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:bg-gray-800 hover:-translate-y-1 transition-all flex items-center justify-center group z-50 border border-gray-700"
      >
        <span className="text-xl">💡</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out text-sm font-bold">
          개선 및 오류 제보
        </span>
      </a>

      {/* 🖼️ 이미지 원본 팝업 모달창 (Lightbox Modal) */}
      {modalImageUrl && (
        <div 
          onClick={() => setModalImageUrl(null)}
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full h-full flex flex-col justify-center">
            <img
              src={modalImageUrl}
              alt="홍보 포스터 원본 확대보기"
              className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg shadow-2xl"
            />
            <p className="text-white/70 text-center text-xs mt-3 font-semibold">
              바깥 화면을 터치하시면 닫힙니다 ✖
            </p>
          </div>
        </div>
      )}

    </main>
  );
}