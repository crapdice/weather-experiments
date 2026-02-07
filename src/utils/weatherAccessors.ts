import { WeatherRecord } from '../types/weather';

export const getMaxTemp = (d: WeatherRecord): number => d['Max Temp (°F)'];
export const getMinTemp = (d: WeatherRecord): number => d['Min Temp (°F)'];
export const getAvgTemp = (d: WeatherRecord): number => d['Avg Temp (°F)'];
export const getPrecipitation = (d: WeatherRecord): number => d['Precipitation (in)'];
export const getSnowfall = (d: WeatherRecord): number => d['Snowfall (in)'];
export const getMaxWindSpeed = (d: WeatherRecord): number => d['Max Wind Speed (mph)'];
export const getMaxWindGust = (d: WeatherRecord): number => d['Max Wind Gust (mph)'];

export const getDate = (d: WeatherRecord): Date => d.Date;
export const getYear = (d: WeatherRecord): number => d.Year;
export const getDayOfYear = (d: WeatherRecord): number => d.DayOfYear;
