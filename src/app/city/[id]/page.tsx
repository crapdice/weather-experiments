
import React from 'react';
import { Dashboard } from '@/components/Dashboard';
import { CITIES } from '@/utils/cityConfig';
import { Metadata } from 'next';

type Props = {
    params: { id: string }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    // Await params if using Next.js 15+ async params, but for 14 it's synchronous usually.
    // To be safe in newer Next versions:
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id.toUpperCase();
    const city = CITIES.find((c) => c.id === id);

    if (!city) {
        return {
            title: 'Unknown City | KORD Intel',
        };
    }

    return {
        title: `${city.title} | ${city.subtitle}`,
        description: `Real-time weather intelligence and climate analytics for ${city.name}. Explore 80+ years of historical data.`,
        alternates: {
            canonical: `/city/${resolvedParams.id.toLowerCase()}`,
        }
    };
}

export function generateStaticParams() {
    return CITIES.map((city) => ({
        id: city.id.toLowerCase(),
    }));
}

import { loadServerWeatherData } from '@/utils/serverWeatherData';

export default async function CityPage({ params }: Props) {
    const resolvedParams = await Promise.resolve(params); // Future-proof
    const cityId = resolvedParams.id.toUpperCase();
    const city = CITIES.find(c => c.id === cityId);

    let initialData = { data: [], stats: null };

    // Only attempt server load for static-optimized cities (CHI) or reliable APIs
    if (city && city.id === 'CHI') {
        try {
            initialData = await loadServerWeatherData(city.id, city);
        } catch (e) {
            console.error("Failed to load server data for", cityId, e);
        }
    }

    return (
        <>
            <Dashboard
                initialCityId={cityId}
                initialStats={initialData.stats}
                initialDataSummary={initialData.data.slice(-7)} // Pass just a tiny bit for initial render if needed
            />
            {React.createElement('kord-feedback-widget')}
        </>
    );
}
