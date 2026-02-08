import { CityConfig } from "@/types/weather";

export const CITIES: CityConfig[] = [
    {
        id: 'CHI',
        name: 'Chicago',
        file: '/chicago_weather_v86.csv',
        title: 'KORD Intelligence',
        subtitle: "Climate Data for Chicago O'Hare",
        lat: 41.9742,
        lng: -87.9073,
        timezone: 'America/Chicago',
        minSnowThreshold: 10.0
    },
    {
        id: 'NYC',
        name: 'New York',
        file: '/api/secure-weather?cityId=NYC',
        title: 'JFK Intelligence',
        subtitle: "Climate Data for New York City",
        lat: 40.7128,
        lng: -74.0060,
        timezone: 'America/New_York',
        minSnowThreshold: 10.0
    },
    {
        id: 'MIA',
        name: 'Miami',
        file: '/api/secure-weather?cityId=MIA',
        title: 'MIA Intelligence',
        subtitle: "Climate Data for Miami Int'l",
        lat: 25.7617,
        lng: -80.1918,
        timezone: 'America/New_York',
        minSnowThreshold: 100.0 // Snow impossible
    },
    {
        id: 'LAX',
        name: 'Los Angeles',
        file: '/api/secure-weather?cityId=LAX',
        title: 'LAX Intelligence',
        subtitle: "Climate Data for Los Angeles",
        lat: 34.0522,
        lng: -118.2437,
        timezone: 'America/Los_Angeles',
        minSnowThreshold: 100.0 // Snow impossible
    },
    {
        id: 'DEN',
        name: 'Denver',
        file: '/api/secure-weather?cityId=DEN',
        title: 'DEN Intelligence',
        subtitle: "Climate Data for Denver Int'l",
        lat: 39.7392,
        lng: -104.9903,
        timezone: 'America/Denver',
        minSnowThreshold: 10.0
    },
    {
        id: 'PHX',
        name: 'Phoenix',
        file: '/api/secure-weather?cityId=PHX',
        title: 'PHX Intelligence',
        subtitle: "Climate Data for Phoenix Sky Harbor",
        lat: 33.4484,
        lng: -112.0740,
        timezone: 'America/Phoenix',
        minSnowThreshold: 100.0 // Snow impossible
    },
    {
        id: 'PAR',
        name: 'Parrish, FL',
        file: '/api/secure-weather?cityId=PAR',
        title: 'Parrish Intelligence',
        subtitle: "Climate Data for Parrish, FL",
        lat: 27.5815,
        lng: -82.4220,
        timezone: 'America/New_York',
        minSnowThreshold: 100.0 // Snow impossible
    },
    {
        id: 'APT',
        name: 'Aptos, CA',
        file: '/api/secure-weather?cityId=APT',
        title: 'Aptos Intelligence',
        subtitle: "Climate Data for Aptos, CA",
        lat: 36.9772,
        lng: -121.9078,
        timezone: 'America/Los_Angeles',
        minSnowThreshold: 100.0 // Snow impossible
    }
];
