export interface CityConfig {
    id: string;
    name: string;
    file: string;
    title: string;
    subtitle: string;
    lat: number;
    lng: number;
    timezone?: string;
}

export interface SeasonalRank {
    rank: number;
    totalYears: number;
    value: number;
    percentile: number;
    seasonName: string;
}

export interface WeatherRecord {
    Date: Date;
    'Max Temp (°F)': number;
    'Min Temp (°F)': number;
    'Avg Temp (°F)': number;
    'Precipitation (in)': number;
    'Snowfall (in)': number;
    'Max Wind Speed (mph)': number;
    'Max Wind Gust (mph)': number;
    DayOfYear: number;
    Year: number;
    SMA7?: number;
    ROC1y?: number;
    MeanHigh?: number;
    MeanLow?: number;
    HDD?: number;
    GDD?: number;
    Sunrise?: Date;
    Sunset?: Date;
    MoonPhase?: number;
    Rain?: number;
    Snow?: number;
}

export interface SeasonalComparison {
    metric: string;
    currentValue: number;
    rank: number;
    totalYears: number;
    percentile: number;
    historicalBest: { year: number; value: number };
    historicalWorst: { year: number; value: number };
    unit: string;
    higherIsBetter: boolean;
}

export interface ClimateStats {
    maxTemp: number;
    maxTempDate: Date;
    minTemp: number;
    minTempDate: Date;
    pulseDelta: number;
    frostDays: number;
    heatDays: number;
    volatility: number;
    decadalDelta: number;
    lastUpdate: Date;
    currentTemp?: number;
    currentPrecip?: number;
    currentTempTime?: Date;
    todayMax?: number;
    todayMin?: number;
    todayRain?: number;
    todaySnow?: number;
    currentWind?: number;
    currentGust?: number;
    todayPercentile?: number;
    lastSimilarDate?: Date;
    zScore?: number;
    currentStreak?: { count: number, startDate: Date, type: string };
    yoyStreak?: { count: number, type: 'above' | 'below' };

    analogYear?: { year: number, similarityScore: number };
    analogForecast?: { date: string, high: number, low: number, avg: number }[];
    seasonalRain?: SeasonalRank;
    seasonalSnow?: SeasonalRank;
    seasonalComparisons?: SeasonalComparison[];
    lookbackYoY?: { period: string, current: number, previous: number, delta: number }[];
    dailyNormal?: { high: number, low: number, avg: number };
    seasonalMedians?: { snow: number, rain: number };
    sunrise?: string;
    sunset?: string;
}

export interface WeatherFetchResult {
    temp: number;
    precip: number;
    wind: number;
    gust: number;
    time: Date;
    todayMax: number;
    todayMin: number;
    todayRain: number;
    todaySnow: number;
    recentHistory: WeatherRecord[];
}
