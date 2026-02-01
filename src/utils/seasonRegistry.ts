
export type SeasonType = 'Winter' | 'Spring' | 'Summer' | 'Fall' | 'SnowYear';

export interface SeasonDefinition {
    name: SeasonType;
    startMonth: number; // 0-indexed (July = 6, Dec = 11)
    startDay: number;
    endMonth: number;   // 0-indexed
    endDay: number;
    isAcrossYear: boolean;
}

export const SEASONS: Record<SeasonType, SeasonDefinition> = {
    'Winter': { name: 'Winter', startMonth: 11, startDay: 1, endMonth: 1, endDay: 28, isAcrossYear: true },
    'Spring': { name: 'Spring', startMonth: 2, startDay: 1, endMonth: 4, endDay: 31, isAcrossYear: false },
    'Summer': { name: 'Summer', startMonth: 5, startDay: 1, endMonth: 7, endDay: 31, isAcrossYear: false },
    'Fall': { name: 'Fall', startMonth: 8, startDay: 1, endMonth: 10, endDay: 30, isAcrossYear: false },
    'SnowYear': { name: 'SnowYear', startMonth: 6, startDay: 1, endMonth: 5, endDay: 30, isAcrossYear: true }
};

/**
 * Calculates a unique, year-independent index for a date within a specific season.
 * Index 0 = Start of season.
 */
export function getSeasonDayIndex(date: Date, type: SeasonType): number {
    const def = SEASONS[type];
    const year = date.getFullYear();

    let startYear = year;
    if (def.isAcrossYear && date.getMonth() < def.startMonth) {
        startYear = year - 1;
    }

    const startDate = new Date(startYear, def.startMonth, def.startDay);
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 ? diffDays : -1; // -1 if date is before season start
}

/**
 * Returns the effective "Season Year" for grouping.
 * For Winter (Dec-Feb), Dec 2023 is part of Season Year 2024.
 */
export function getEffectiveSeasonYear(date: Date, type: SeasonType): number {
    const def = SEASONS[type];
    const month = date.getMonth();
    const year = date.getFullYear();

    if (def.isAcrossYear && month >= def.startMonth) {
        return year + 1;
    }
    return year;
}

export function getSeasonNameByDate(date: Date): SeasonType {
    const month = date.getMonth();
    if (month === 11 || month <= 1) return 'Winter';
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    return 'Fall';
}
