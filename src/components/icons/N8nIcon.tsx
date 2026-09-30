import React from 'react';

interface N8nIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const N8nIcon: React.FC<N8nIconProps> = ({ size = 24, ...props }) => (
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
    <circle cx="5" cy="12" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="M7 12h4l4-6h2M11 12l4 6h2" />
  </svg>
);

export default N8nIcon;
