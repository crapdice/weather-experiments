
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

export default async function CityPage({ params }: Props) {
    const resolvedParams = await Promise.resolve(params); // Future-proof
    const cityId = resolvedParams.id.toUpperCase();

    return (
        <>
            <Dashboard initialCityId={cityId} />
            {React.createElement('kord-feedback-widget')}
        </>
    );
}
