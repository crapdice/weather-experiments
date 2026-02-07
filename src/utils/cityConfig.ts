import { CityConfig } from "@/types/weather";

export const CITIES: CityConfig[] = [
    {
        id: 'CHI',
        name: 'Chicago',
        file: '/api/secure-weather?cityId=CHI',
        title: 'KORD Intelligence',
        subtitle: "Climate Data for Chicago O'Hare",
        lat: 41.9742,
        lng: -87.9073
    },
    {
        id: 'NYC',
        name: 'New York',
        file: '/api/secure-weather?cityId=NYC',
        title: 'JFK Intelligence',
        subtitle: "Climate Data for New York City",
        lat: 40.7128,
        lng: -74.0060
    },
    {
        id: 'MIA',
        name: 'Miami',
        file: '/api/secure-weather?cityId=MIA',
        title: 'MIA Intelligence',
        subtitle: "Climate Data for Miami Int'l",
        lat: 25.7617,
        lng: -80.1918
    },
    {
        id: 'LAX',
        name: 'Los Angeles',
        file: '/api/secure-weather?cityId=LAX',
        title: 'LAX Intelligence',
        subtitle: "Climate Data for Los Angeles",
        lat: 34.0522,
        lng: -118.2437
    },
    {
        id: 'DEN',
        name: 'Denver',
        file: '/api/secure-weather?cityId=DEN',
        title: 'DEN Intelligence',
        subtitle: "Climate Data for Denver Int'l",
        lat: 39.7392,
        lng: -104.9903
    },
    {
        id: 'PHX',
        name: 'Phoenix',
        file: '/api/secure-weather?cityId=PHX',
        title: 'PHX Intelligence',
        subtitle: "Climate Data for Phoenix Sky Harbor",
        lat: 33.4484,
        lng: -112.0740
    },
    {
        id: 'PAR',
        name: 'Parrish, FL',
        file: '/api/secure-weather?cityId=PAR',
        title: 'Parrish Intelligence',
        subtitle: "Climate Data for Parrish, FL",
        lat: 27.5815,
        lng: -82.4220
    }
];
