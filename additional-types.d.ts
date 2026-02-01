/// <reference types="styled-jsx" />
import React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'kord-feedback-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

declare module 'react' {
    interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
        jsx?: boolean;
        global?: boolean;
    }
}
