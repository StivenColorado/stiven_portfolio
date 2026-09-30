import React from 'react';

interface NestJSIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const NestJSIcon: React.FC<NestJSIconProps> = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 3c-2 0-3 1.5-3 3 0 1 .5 2 1.5 2.5" />
    <path d="M10.5 8.5C7 8 4 10 4 13.5 4 17 7 20 11 20c1.5 0 3-.5 4-1.5" />
    <path d="M15 18.5c3-1 5-3.5 5-6 0-2.5-1.5-4.5-4-4.5-1 0-2 .5-2.5 1.5" />
    <circle cx="14" cy="5" r="1" />
  </svg>
);

export default NestJSIcon;
